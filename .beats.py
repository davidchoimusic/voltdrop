"""Detect tempo + beat grid in a track so the intro animation can be cut to it."""
import subprocess, sys, wave, os
import numpy as np

SRC = sys.argv[1]
TMP = '/tmp/beat-mono.wav'

# normalize to 16-bit mono 22050 so `wave` can read anything ffmpeg can open
subprocess.run(
    ['ffmpeg', '-y', '-loglevel', 'error', '-i', SRC,
     '-ac', '1', '-ar', '22050', '-acodec', 'pcm_s16le', TMP],
    check=True)

with wave.open(TMP, 'rb') as w:
    SR = w.getframerate()
    n = w.getnframes()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32768.0

dur = len(x) / SR
print(f'file      : {os.path.basename(SRC)}')
print(f'duration  : {dur:.2f} s')

# ---------- onset envelope (spectral flux) ----------
HOP, WIN = 256, 1024
frames = 1 + (len(x) - WIN) // HOP
win = np.hanning(WIN)
mag = np.empty((frames, WIN // 2 + 1))
for i in range(frames):
    seg = x[i * HOP: i * HOP + WIN] * win
    mag[i] = np.abs(np.fft.rfft(seg))

logmag = np.log1p(mag * 12)
flux = np.diff(logmag, axis=0)
flux[flux < 0] = 0
onset = flux.sum(axis=1)
onset -= onset.mean()
onset[onset < 0] = 0
if onset.max() > 0:
    onset /= onset.max()
fps_env = SR / HOP

# ---------- tempo via autocorrelation ----------
ac = np.correlate(onset, onset, mode='full')[len(onset) - 1:]
ac[0] = 0
lo = int(fps_env * 60 / 200.0)     # 200 BPM
hi = int(fps_env * 60 / 60.0)      # 60 BPM
band = ac[lo:hi].copy()
lag = lo + int(np.argmax(band))
bpm = 60.0 * fps_env / lag

# phonk sits ~120-170; fold octaves into that window
while bpm < 110: bpm *= 2
while bpm > 180: bpm /= 2
period = 60.0 / bpm
print(f'tempo     : {bpm:.2f} BPM   (beat every {period:.3f} s)')

# ---------- beat phase: slide a pulse train, keep the best-scoring offset ----------
best_off, best_score = 0.0, -1
for off in np.arange(0, period, 0.005):
    ts = np.arange(off, dur, period)
    idx = (ts * fps_env).astype(int)
    idx = idx[idx < len(onset)]
    s = onset[idx].sum() / max(len(idx), 1)
    if s > best_score:
        best_score, best_off = s, off

beats = np.arange(best_off, min(dur, 30.0), period)
print(f'first beat: {best_off:.3f} s')
print('beats     : ' + ' '.join(f'{b:.3f}' for b in beats[:33]))

# ---------- strongest hits (candidate cut points) ----------
thresh = np.percentile(onset[onset > 0], 96) if (onset > 0).any() else 1
peaks = []
for i in range(2, len(onset) - 2):
    if onset[i] >= thresh and onset[i] == max(onset[i-2:i+3]):
        tsec = i / fps_env
        if not peaks or tsec - peaks[-1][0] > 0.12:
            peaks.append((tsec, onset[i]))
peaks.sort(key=lambda q: -q[1])
top = sorted(peaks[:14])
print('big hits  : ' + ' '.join(f'{p:.2f}' for p, _ in top))

# ---------- loudness envelope, 0.5 s buckets (find where it drops in) ----------
b = 0.5
buckets = []
for s in np.arange(0, dur, b):
    seg = x[int(s * SR): int((s + b) * SR)]
    buckets.append(float(np.sqrt((seg ** 2).mean())) if len(seg) else 0.0)
mx = max(buckets) or 1
print('energy    : ' + ''.join('#' if v / mx > .66 else ('+' if v / mx > .33 else '.') for v in buckets))
print('            (each char = 0.5 s, from t=0)')
