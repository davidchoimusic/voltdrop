#!/bin/bash
# Encode the captured PNG sequence + TURBO into the final intro video.
set -euo pipefail

FRAMEDIR="${FRAMEDIR:-/tmp/voltdrop-frames}"
OUTDIR="$HOME/Desktop/voltdrop-x-images"
SONG="${1:-/Users/davidchoi/Desktop/TURBO-trimmed.wav}"
FPS=30

mkdir -p "$OUTDIR"

# ---- 1. silent master (audio can always be re-muxed onto this) ----
ffmpeg -y -loglevel error \
  -framerate $FPS -i "$FRAMEDIR/%04d.png" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 17 -preset slow \
  -movflags +faststart -r $FPS \
  "$OUTDIR/voltdrop-intro-silent.mp4"
echo "wrote voltdrop-intro-silent.mp4"

# ---- 2. with the track ----
# No fade-out: the track ends on the kick and that IS the ending. Tiny 20 ms
# fade-in only, to avoid a click. Audio is padded with silence so the end card
# holds for a beat after the music stops.
ffmpeg -y -loglevel error \
  -i "$OUTDIR/voltdrop-intro-silent.mp4" \
  -i "$SONG" \
  -filter_complex "[1:a]afade=t=in:st=0:d=0.02,apad,aformat=channel_layouts=stereo[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart \
  "$OUTDIR/voltdrop-intro.mp4"
echo "wrote voltdrop-intro.mp4"

# ---- 3. square 1080x1080 for feeds that prefer it ----
ffmpeg -y -loglevel error -i "$OUTDIR/voltdrop-intro.mp4" \
  -vf "scale=1080:-2,pad=1080:1080:0:(oh-ih)/2:color=#141518" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow \
  -c:a copy -movflags +faststart \
  "$OUTDIR/voltdrop-intro-square.mp4"
echo "wrote voltdrop-intro-square.mp4"

for f in "$OUTDIR"/voltdrop-intro*.mp4; do
  printf '%-46s %s\n' "$(basename "$f")" \
    "$(ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$f")"
done
