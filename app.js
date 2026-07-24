/* ========================================================================
   VoltDrop — voltage drop calculator
   K-factor method (NEC-style): Vd = mult × K × I × L / CM
     mult = 2 for DC and single-phase (round trip), √3 for three-phase
     K    = ohm·cmil/ft (12.9 copper, 21.2 aluminum, ~75°C)
     L    = ONE-WAY length in feet (the mult handles the return path)
     CM   = conductor area in circular mils
   Wire data is a swappable table so metric (mm²/IEC) regions can be
   added later without touching the math or UI logic.
   ======================================================================== */

const WIRE_TABLE = [
  // [label, circular mils]
  ['18 AWG', 1620],
  ['16 AWG', 2580],
  ['14 AWG', 4110],
  ['12 AWG', 6530],
  ['10 AWG', 10380],
  ['8 AWG', 16510],
  ['6 AWG', 26240],
  ['4 AWG', 41740],
  ['3 AWG', 52620],
  ['2 AWG', 66360],
  ['1 AWG', 83690],
  ['1/0 AWG', 105600],
  ['2/0 AWG', 133100],
  ['3/0 AWG', 167800],
  ['4/0 AWG', 211600],
  ['250 kcmil', 250000],
  ['300 kcmil', 300000],
  ['350 kcmil', 350000],
  ['400 kcmil', 400000],
  ['500 kcmil', 500000],
];

const K_FACTOR = { cu: 12.9, al: 21.2 };
const MATERIAL_NAME = { cu: 'copper', al: 'aluminum' };

const SYSTEMS = {
  dc:  { mult: 2,     multLabel: '2',  name: 'DC',
         hint: 'DC: batteries, solar, vehicles, LED strips.' },
  ac1: { mult: 2,     multLabel: '2',  name: 'AC single-phase',
         hint: 'Single-phase: normal household and light commercial circuits.' },
  ac3: { mult: 1.732, multLabel: '√3 (1.732)', name: 'AC three-phase',
         hint: 'Three-phase: commercial and industrial. Voltage is line-to-line.' },
};

// Country editions — same math, different common voltages and code names.
// Future countries (mm²/IEC) additionally swap WIRE_TABLE and units.
const COUNTRIES = {
  us: {
    chip: '🇺🇸 US edition',
    codeName: 'U.S. National Electrical Code (NEC)',
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 277], ac3: [208, 240, 480, 600] },
  },
  ca: {
    chip: '🇨🇦 Canada edition',
    codeName: 'Canadian Electrical Code (CEC)',
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 347], ac3: [208, 480, 600] },
  },
};
const COUNTRY_KEY = 'voltdrop.country';
let country = 'us';
try {
  const saved = localStorage.getItem(COUNTRY_KEY);
  if (saved && COUNTRIES[saved]) country = saved;
} catch (e) { /* private mode — default to US */ }

// ---- state ----
let mode = 'drop';        // drop | size | length
let system = 'dc';
let material = 'cu';
let targetChoice = '3';   // '3' | '5' | 'custom'

// ---- element handles ----
const $ = (id) => document.getElementById(id);
const form = $('calc-form');
const results = $('results');

// ---- populate wire select ----
const awgSelect = $('awg');
WIRE_TABLE.forEach(([label], i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = label;
  awgSelect.appendChild(opt);
});
awgSelect.value = 3; // 12 AWG default — the everyday size

// ---- segmented control wiring ----
function wireSeg(container, attr, onChange) {
  container.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset[attr]);
    });
  });
}

document.querySelectorAll('.seg').forEach((seg) => {
  const first = seg.querySelector('.seg-btn');
  if (!first) return;
  if ('system' in first.dataset) wireSeg(seg, 'system', setSystem);
  else if ('material' in first.dataset) wireSeg(seg, 'material', (v) => { material = v; recalcIfVisible(); });
  else if ('target' in first.dataset) wireSeg(seg, 'target', setTarget);
});

function setSystem(v) {
  system = v;
  $('system-hint').textContent = SYSTEMS[v].hint;
  renderVoltagePresets();
  recalcIfVisible();
}

function setTarget(v) {
  targetChoice = v;
  $('target-custom-wrap').hidden = v !== 'custom';
  recalcIfVisible();
}

// ---- voltage presets ----
function renderVoltagePresets() {
  const row = $('voltage-presets');
  row.innerHTML = '';
  COUNTRIES[country].presets[system].forEach((v) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.textContent = v + ' V';
    if (Number($('voltage').value) === v) btn.classList.add('active');
    btn.addEventListener('click', () => {
      $('voltage').value = v;
      row.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      recalcIfVisible();
    });
    row.appendChild(btn);
  });
}
$('voltage').addEventListener('input', () => {
  document.querySelectorAll('.preset-btn').forEach((b) => {
    b.classList.toggle('active', Number($('voltage').value) === parseFloat(b.textContent));
  });
});

// ---- country edition ----
function applyCountry() {
  $('country-chip').textContent = COUNTRIES[country].chip;
  $('code-name').textContent = COUNTRIES[country].codeName;
  document.querySelectorAll('.country-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.country === country);
  });
  renderVoltagePresets();
  recalcIfVisible();
}

document.querySelectorAll('.country-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    country = btn.dataset.country;
    try { localStorage.setItem(COUNTRY_KEY, country); } catch (e) { /* private mode */ }
    applyCountry();
  });
});

$('country-chip').addEventListener('click', () => {
  $('country-picker').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

applyCountry();

// ---- mode tabs & sidebar tool links ----
function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-tab').forEach((t) => {
    const on = t.dataset.mode === m;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tool-link[data-tool]').forEach((l) => {
    l.classList.toggle('active', l.dataset.tool === m);
  });
  applyMode();
}

document.querySelectorAll('.mode-tab').forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

function applyMode() {
  $('field-size').hidden = mode === 'size';
  $('field-distance').hidden = mode === 'length';
  $('field-target').hidden = mode === 'drop';
  $('distance').required = mode !== 'length';
  results.hidden = true;
  $('calc-btn').textContent = {
    drop: 'Calculate voltage drop',
    size: 'Find smallest wire',
    length: 'Find max distance',
  }[mode];
}

// Each tool page (built by build.mjs) stamps its mode on <body data-mode>.
setMode(document.body.dataset.mode || 'drop');

// ---- core math ----
function dropVolts(cm, amps, feet) {
  return (SYSTEMS[system].mult * K_FACTOR[material] * amps * feet) / cm;
}

function targetPercent() {
  if (targetChoice === 'custom') return Number($('target').value) || 3;
  return Number(targetChoice);
}

// ---- calculate ----
form.addEventListener('submit', (e) => {
  e.preventDefault();
  calculate();
});

function recalcIfVisible() {
  if (!results.hidden) calculate();
}

function calculate() {
  const volts = Number($('voltage').value);
  const amps = Number($('current').value);
  if (!volts || !amps) return;

  if (mode === 'drop') {
    const feet = Number($('distance').value);
    if (!feet) return;
    const idx = Number(awgSelect.value);
    const [label, cm] = WIRE_TABLE[idx];
    const vd = dropVolts(cm, amps, feet);
    const pct = (vd / volts) * 100;
    renderDrop({ label, cm, volts, amps, feet, vd, pct });
  } else if (mode === 'size') {
    const feet = Number($('distance').value);
    if (!feet) return;
    const maxPct = targetPercent();
    const maxVd = (maxPct / 100) * volts;
    let found = null;
    for (let i = 0; i < WIRE_TABLE.length; i++) {
      const [label, cm] = WIRE_TABLE[i];
      const vd = dropVolts(cm, amps, feet);
      if (vd <= maxVd) { found = { label, cm, vd, i }; break; }
    }
    renderSize({ found, volts, amps, feet, maxPct, maxVd });
  } else {
    const idx = Number(awgSelect.value);
    const [label, cm] = WIRE_TABLE[idx];
    const maxPct = targetPercent();
    const maxVd = (maxPct / 100) * volts;
    // Solve Vd = mult·K·I·L/CM for L
    const feet = (maxVd * cm) / (SYSTEMS[system].mult * K_FACTOR[material] * amps);
    renderLength({ label, cm, volts, amps, maxPct, maxVd, feet });
  }
}

// ---- verdict helpers ----
function verdictFor(pct) {
  if (pct <= 3) return { cls: 'good', badge: 'GOOD', note: 'Within the 3% guideline. This run should perform well.' };
  if (pct <= 5) return { cls: 'warn', badge: 'CAUTION', note: 'Over the 3% guideline but within the 5% outer limit. Fine for some loads; consider one size up for motors, chargers, or long-duty circuits.' };
  return { cls: 'bad', badge: 'TOO MUCH', note: 'Over the 5% outer limit. Expect real performance problems — go up in wire size, shorten the run, or raise the voltage.' };
}

const fmt = (n, d = 2) => {
  const r = Number(n.toFixed(d));
  return r.toLocaleString('en-US', { maximumFractionDigits: d });
};

// ---- renderers ----
function showResults(v, bigNumber, bigLabel, cells, note, math) {
  const verdict = $('verdict');
  verdict.className = 'verdict ' + v.cls;
  $('verdict-badge').textContent = v.badge;
  $('big-number').textContent = bigNumber;
  $('big-label').textContent = bigLabel;
  $('result-grid').innerHTML = cells
    .map(([k, val]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${val}</div></div>`)
    .join('');
  $('verdict-note').textContent = note;
  $('math-body').innerHTML = math;
  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mathIntro() {
  return `<p>We use the standard K-factor formula electricians use in the field:</p>
<div class="formula">Voltage drop = ${SYSTEMS[system].multLabel} × K × amps × one-way feet ÷ circular mils</div>
<p><strong>${SYSTEMS[system].multLabel}</strong> accounts for the ${system === 'ac3' ? 'three-phase geometry' : 'round trip — current flows out AND back, so the wire path is twice your one-way distance'}. <strong>K = ${K_FACTOR[material]}</strong> is the resistance constant for ${MATERIAL_NAME[material]} (ohm·cmil/ft at 75°C). <strong>Circular mils</strong> is the wire's cross-section area.</p>`;
}

function renderDrop({ label, cm, volts, amps, feet, vd, pct }) {
  const v = verdictFor(pct);
  const endV = volts - vd;
  showResults(
    v,
    fmt(pct) + '%',
    'voltage drop on ' + label + ' ' + MATERIAL_NAME[material],
    [
      ['Volts lost in the wire', fmt(vd) + ' V'],
      ['Voltage at the load', fmt(endV) + ' V'],
      ['Started with', fmt(volts) + ' V'],
      ['Guidelines', '3% good · 5% max'],
    ],
    v.note,
    mathIntro() + `
<p>With your numbers (${label} = ${cm.toLocaleString('en-US')} circular mils):</p>
<div class="formula">${SYSTEMS[system].multLabel} × ${K_FACTOR[material]} × ${fmt(amps)} A × ${fmt(feet, 1)} ft ÷ ${cm.toLocaleString('en-US')}
= ${fmt(vd, 3)} volts dropped
÷ ${fmt(volts)} V source = ${fmt(pct)}%</div>
<p>Voltage at the load: ${fmt(volts)} − ${fmt(vd, 3)} = <strong>${fmt(endV)} V</strong>.</p>`
  );
}

function renderSize({ found, volts, amps, feet, maxPct, maxVd }) {
  if (!found) {
    showResults(
      { cls: 'bad', badge: 'NO FIT', note: 'No single wire in our table keeps the drop under your limit. Options: shorten the run, raise the voltage, allow a bigger drop, or run parallel conductors (ask an electrician).' },
      '—',
      'no listed size keeps you under ' + maxPct + '%',
      [
        ['Your limit', fmt(maxPct) + '% = ' + fmt(maxVd) + ' V'],
        ['Largest size checked', WIRE_TABLE[WIRE_TABLE.length - 1][0]],
      ],
      'Even ' + WIRE_TABLE[WIRE_TABLE.length - 1][0] + ' ' + MATERIAL_NAME[material] + ' drops more than ' + fmt(maxPct) + '% over ' + fmt(feet, 1) + ' one-way feet at ' + fmt(amps) + ' A.',
      mathIntro() + `<p>We checked every size from smallest to largest; none dropped ≤ ${fmt(maxVd, 3)} V (${fmt(maxPct)}% of ${fmt(volts)} V).</p>`
    );
    return;
  }
  const pct = (found.vd / volts) * 100;
  const v = verdictFor(pct);
  showResults(
    v,
    found.label,
    'smallest ' + MATERIAL_NAME[material] + ' wire that stays under ' + fmt(maxPct) + '%',
    [
      ['Actual drop at this size', fmt(pct) + '% (' + fmt(found.vd) + ' V)'],
      ['Voltage at the load', fmt(volts - found.vd) + ' V'],
      ['Your limit', fmt(maxPct) + '% = ' + fmt(maxVd) + ' V'],
      ['Guidelines', '3% good · 5% max'],
    ],
    'Heads up: this answers voltage drop only. The wire must ALSO be rated to carry ' + fmt(amps) + ' A safely (ampacity) — check that separately before buying.',
    mathIntro() + `
<p>We tested each size, smallest first, until one kept the drop under your ${fmt(maxPct)}% limit (${fmt(maxVd, 3)} V):</p>
<div class="formula">${found.label} (${found.cm.toLocaleString('en-US')} cmil):
${SYSTEMS[system].multLabel} × ${K_FACTOR[material]} × ${fmt(amps)} A × ${fmt(feet, 1)} ft ÷ ${found.cm.toLocaleString('en-US')}
= ${fmt(found.vd, 3)} V = ${fmt(pct)}%  ✓ under your limit</div>`
  );
}

function renderLength({ label, cm, volts, amps, maxPct, maxVd, feet }) {
  const v = maxPct <= 3
    ? { cls: 'good', badge: 'MAX RUN', note: '' }
    : maxPct <= 5
      ? { cls: 'warn', badge: 'MAX RUN', note: '' }
      : { cls: 'bad', badge: 'MAX RUN', note: '' };
  v.note = 'At exactly this distance you hit ' + fmt(maxPct) + '% drop. Stay shorter for margin. And remember: the wire must also be rated for ' + fmt(amps) + ' A (ampacity) regardless of distance.';
  showResults(
    v,
    fmt(feet, 0) + ' ft',
    'max one-way run for ' + label + ' ' + MATERIAL_NAME[material] + ' at ' + fmt(maxPct) + '% drop',
    [
      ['Drop at that distance', fmt(maxPct) + '% (' + fmt(maxVd) + ' V)'],
      ['Voltage at the load', fmt(volts - maxVd) + ' V'],
      ['Current', fmt(amps) + ' A'],
      ['Guidelines', '3% good · 5% max'],
    ],
    v.note,
    mathIntro() + `
<p>We rearranged the formula to solve for distance, with your limit of ${fmt(maxPct)}% (${fmt(maxVd, 3)} V):</p>
<div class="formula">Max one-way feet = ${fmt(maxVd, 3)} V × ${cm.toLocaleString('en-US')} cmil
             ÷ (${SYSTEMS[system].multLabel} × ${K_FACTOR[material]} × ${fmt(amps)} A)
             = ${fmt(feet, 1)} ft</div>`
  );
}
