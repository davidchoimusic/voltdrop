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
const DROP_TEXT = {
  volts: '{volts} V',
  amps: '{amps} A',
  percent: '{percent}%',
  dropLabel: 'voltage drop on {size} {material}',
  limit: '{percent}% = {volts} V',
  actualDrop: '{percent}% ({volts} V)',
  noFitLabel: 'no listed size keeps you under {percent}%',
  noFitNote: 'Even {size} {material} drops more than {percent}% over {feet} one-way feet at {amps} A.',
  smallestWireLabel: 'smallest {material} wire that stays under {percent}%',
  ampacityWarning: 'Heads up: this answers voltage drop only. The wire must ALSO be rated to carry {amps} A safely (ampacity) — check that separately before buying.',
  maxDistanceNote: 'At exactly this distance you hit {percent}% drop. Stay shorter for margin. And remember: the wire must also be rated for {amps} A (ampacity) regardless of distance.',
  feet: '{feet} ft',
  maxRunLabel: 'max one-way run for {size} {material} at {percent}% drop',
  mathIntroRoundTrip: '<p>We use the standard K-factor formula electricians use in the field:</p>\n<div class="formula">Voltage drop = {mult} × K × amps × one-way feet ÷ circular mils</div>\n<p><strong>{mult}</strong> accounts for the round trip — current flows out AND back, so the wire path is twice your one-way distance. <strong>K = {factor}</strong> is the resistance constant for {material} (ohm·cmil/ft at 75°C). <strong>Circular mils</strong> is the wire\'s cross-section area.</p>',
  mathIntroThreePhase: '<p>We use the standard K-factor formula electricians use in the field:</p>\n<div class="formula">Voltage drop = {mult} × K × amps × one-way feet ÷ circular mils</div>\n<p><strong>{mult}</strong> accounts for the three-phase geometry. <strong>K = {factor}</strong> is the resistance constant for {material} (ohm·cmil/ft at 75°C). <strong>Circular mils</strong> is the wire\'s cross-section area.</p>',
  dropMath: '\n<p>With your numbers ({size} = {cm} circular mils):</p>\n<div class="formula">{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} volts dropped\n÷ {source} V source = {percent}%</div>\n<p>Voltage at the load: {source} − {dropped} = <strong>{endVolts} V</strong>.</p>',
  noFitMath: '<p>We checked every size from smallest to largest; none dropped ≤ {maxDrop} V ({percent}% of {source} V).</p>',
  sizeMath: '\n<p>We tested each size, smallest first, until one kept the drop under your {percent}% limit ({maxDrop} V):</p>\n<div class="formula">{size} ({cm} cmil):\n{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} V = {actualPercent}%  ✓ under your limit</div>',
  maxRunMath: '\n<p>We rearranged the formula to solve for distance, with your limit of {percent}% ({maxDrop} V):</p>\n<div class="formula">Max one-way feet = {maxDrop} V × {cm} cmil\n             ÷ ({mult} × {factor} × {amps} A)\n             = {feet} ft</div>',
};

// Country editions live in common.js (window.VDCountry) — shared with the
// ampacity and conduit tools. Future countries (mm²/IEC) additionally swap
// WIRE_TABLE and units here.

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
  VDCountry.COUNTRIES[VDCountry.get()].presets[system].forEach((v) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.textContent = vdFormat(DROP_TEXT.volts, { volts: v });
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

// ---- country edition (state managed by common.js) ----
window.addEventListener('vd:country', () => {
  renderVoltagePresets();
  recalcIfVisible();
});
renderVoltagePresets();

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

// Keeping this independent of page state lets later tools reuse the electrical
// result without inheriting this page's controls or translated rendering.
function calculateVoltageDrop(
  calculationMode,
  selectedSystem,
  selectedMaterial,
  volts,
  amps,
  feet,
  wireIndex,
  maxPct,
  wireTable,
  kFactors,
  systems,
) {
  const systemData = systems[selectedSystem];
  const factor = kFactors[selectedMaterial];
  const calculationContext = {
    system: selectedSystem,
    material: selectedMaterial,
    mult: systemData.mult,
    factor,
  };
  const voltageDropFor = (cm) =>
    (systemData.mult * factor * amps * feet) / cm;

  if (calculationMode === 'drop') {
    const [label, cm] = wireTable[wireIndex];
    const vd = voltageDropFor(cm);
    const pct = (vd / volts) * 100;
    return {
      ...calculationContext,
      mode: calculationMode,
      label,
      cm,
      volts,
      amps,
      feet,
      vd,
      pct,
      endVolts: volts - vd,
      verdict: pct <= 3 ? 'good' : pct <= 5 ? 'warn' : 'bad',
    };
  }

  const maxVd = (maxPct / 100) * volts;
  if (calculationMode === 'size') {
    let found = null;
    for (let i = 0; i < wireTable.length; i++) {
      const [label, cm] = wireTable[i];
      const vd = voltageDropFor(cm);
      if (vd <= maxVd) {
        const pct = (vd / volts) * 100;
        found = {
          label,
          cm,
          vd,
          wireIndex: i,
          pct,
          endVolts: volts - vd,
          verdict: pct <= 3 ? 'good' : pct <= 5 ? 'warn' : 'bad',
        };
        break;
      }
    }
    return {
      ...calculationContext,
      mode: calculationMode,
      found,
      largestWire: {
        label: wireTable[wireTable.length - 1][0],
        cm: wireTable[wireTable.length - 1][1],
      },
      volts,
      amps,
      feet,
      maxPct,
      maxVd,
    };
  }

  const [label, cm] = wireTable[wireIndex];
  const maxFeet =
    (maxVd * cm) / (systemData.mult * factor * amps);
  return {
    ...calculationContext,
    mode: calculationMode,
    label,
    cm,
    volts,
    amps,
    maxPct,
    maxVd,
    feet: maxFeet,
    endVolts: volts - maxVd,
    verdict: maxPct <= 3 ? 'good' : maxPct <= 5 ? 'warn' : 'bad',
  };
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

  const feet = mode === 'length' ? null : Number($('distance').value);
  if (mode !== 'length' && !feet) return;

  const result = calculateVoltageDrop(
    mode,
    system,
    material,
    volts,
    amps,
    feet,
    Number(awgSelect.value),
    mode === 'drop' ? null : targetPercent(),
    WIRE_TABLE,
    K_FACTOR,
    SYSTEMS,
  );

  if (result.mode === 'drop') renderDrop(result);
  else if (result.mode === 'size') renderSize(result);
  else renderLength(result);
}

// ---- verdict helpers ----
function verdictFor(verdict) {
  if (verdict === 'good') return { cls: 'good', badge: 'GOOD', note: 'Within the 3% guideline. This run should perform well.' };
  if (verdict === 'warn') return { cls: 'warn', badge: 'CAUTION', note: 'Over the 3% guideline but within the 5% outer limit. Fine for some loads; consider one size up for motors, chargers, or long-duty circuits.' };
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

function mathIntro({ system, material, factor }) {
  return vdFormat(
    system === 'ac3' ? DROP_TEXT.mathIntroThreePhase : DROP_TEXT.mathIntroRoundTrip,
    {
      mult: SYSTEMS[system].multLabel,
      factor,
      material: MATERIAL_NAME[material],
    },
  );
}

function renderDrop({
  system, material, factor,
  label, cm, volts, amps, feet, vd, pct, endVolts, verdict,
}) {
  const v = verdictFor(verdict);
  showResults(
    v,
    vdFormat(DROP_TEXT.percent, { percent: fmt(pct) }),
    vdFormat(DROP_TEXT.dropLabel, { size: label, material: MATERIAL_NAME[material] }),
    [
      ['Volts lost in the wire', vdFormat(DROP_TEXT.volts, { volts: fmt(vd) })],
      ['Voltage at the load', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['Started with', vdFormat(DROP_TEXT.volts, { volts: fmt(volts) })],
      ['Guidelines', '3% good · 5% max'],
    ],
    v.note,
    [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.dropMath, {
      size: label,
      cm: cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor,
      amps: fmt(amps),
      feet: fmt(feet, 1),
      dropped: fmt(vd, 3),
      source: fmt(volts),
      percent: fmt(pct),
      endVolts: fmt(endVolts),
    })].join('')
  );
}

function renderSize({
  system, material, factor,
  found, largestWire, volts, amps, feet, maxPct, maxVd,
}) {
  if (!found) {
    showResults(
      { cls: 'bad', badge: 'NO FIT', note: 'No single wire in our table keeps the drop under your limit. Options: shorten the run, raise the voltage, allow a bigger drop, or run parallel conductors (ask an electrician).' },
      '—',
      vdFormat(DROP_TEXT.noFitLabel, { percent: maxPct }),
      [
        ['Your limit', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
        ['Largest size checked', largestWire.label],
      ],
      vdFormat(DROP_TEXT.noFitNote, {
        size: largestWire.label,
        material: MATERIAL_NAME[material],
        percent: fmt(maxPct),
        feet: fmt(feet, 1),
        amps: fmt(amps),
      }),
      [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.noFitMath, {
        maxDrop: fmt(maxVd, 3),
        percent: fmt(maxPct),
        source: fmt(volts),
      })].join('')
    );
    return;
  }
  const v = verdictFor(found.verdict);
  showResults(
    v,
    found.label,
    vdFormat(DROP_TEXT.smallestWireLabel, {
      material: MATERIAL_NAME[material],
      percent: fmt(maxPct),
    }),
    [
      ['Actual drop at this size', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(found.pct), volts: fmt(found.vd) })],
      ['Voltage at the load', vdFormat(DROP_TEXT.volts, { volts: fmt(found.endVolts) })],
      ['Your limit', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['Guidelines', '3% good · 5% max'],
    ],
    vdFormat(DROP_TEXT.ampacityWarning, { amps: fmt(amps) }),
    [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.sizeMath, {
      percent: fmt(maxPct),
      maxDrop: fmt(maxVd, 3),
      size: found.label,
      cm: found.cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor,
      amps: fmt(amps),
      feet: fmt(feet, 1),
      dropped: fmt(found.vd, 3),
      actualPercent: fmt(found.pct),
    })].join('')
  );
}

function renderLength({
  system, material, factor,
  label, cm, volts, amps, maxPct, maxVd, feet, endVolts, verdict,
}) {
  const v = verdict === 'good'
    ? { cls: 'good', badge: 'MAX RUN', note: '' }
    : verdict === 'warn'
      ? { cls: 'warn', badge: 'MAX RUN', note: '' }
      : { cls: 'bad', badge: 'MAX RUN', note: '' };
  v.note = vdFormat(DROP_TEXT.maxDistanceNote, {
    percent: fmt(maxPct),
    amps: fmt(amps),
  });
  showResults(
    v,
    vdFormat(DROP_TEXT.feet, { feet: fmt(feet, 0) }),
    vdFormat(DROP_TEXT.maxRunLabel, {
      size: label,
      material: MATERIAL_NAME[material],
      percent: fmt(maxPct),
    }),
    [
      ['Drop at that distance', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['Voltage at the load', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['Current', vdFormat(DROP_TEXT.amps, { amps: fmt(amps) })],
      ['Guidelines', '3% good · 5% max'],
    ],
    v.note,
    [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.maxRunMath, {
      percent: fmt(maxPct),
      maxDrop: fmt(maxVd, 3),
      cm: cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor,
      amps: fmt(amps),
      feet: fmt(feet, 1),
    })].join('')
  );
}
