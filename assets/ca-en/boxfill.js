/* VoltDrop — Box Fill (NEC 314.16)
   Volume allowance per conductor: Table 314.16(B).
   Standard metal box volumes: Table 314.16(A).
   Counts: each entering insulated conductor = 1; each device = 2;
   all equipment grounds = 1 (largest); internal clamps = 1. */

const VOL_PER_CONDUCTOR = {
  '18 AWG': 1.5, '16 AWG': 1.75, '14 AWG': 2.0, '12 AWG': 2.25,
  '10 AWG': 2.5, '8 AWG': 3.0, '6 AWG': 5.0,
};

const BOXES = [
  // [label, cubic inches] — NEC Table 314.16(A)
  ['Device box 3 × 2 × 1-1/2"', 7.5],
  ['Device box 3 × 2 × 2"', 10.0],
  ['Device box 3 × 2 × 2-1/4"', 10.5],
  ['Device box 3 × 2 × 2-1/2"', 12.5],
  ['Device box 3 × 2 × 2-3/4"', 14.0],
  ['Device box 3 × 2 × 3-1/2"', 18.0],
  ['4" round/octagon × 1-1/4"', 12.5],
  ['4" round/octagon × 1-1/2"', 15.5],
  ['4" round/octagon × 2-1/8"', 21.5],
  ['4" square × 1-1/4"', 18.0],
  ['4" square × 1-1/2"', 21.0],
  ['4" square × 2-1/8"', 30.3],
  ['4-11/16" square × 1-1/4"', 25.5],
  ['4-11/16" square × 1-1/2"', 29.5],
  ['4-11/16" square × 2-1/8"', 42.0],
];

/* CEC Table 22 (Rule 12-3034) — Canadian volume allowances in millilitres.
   VERIFIED 2026-07-25 against Alberta STANDATA 21/24-ECI-012 (verbatim code
   reproduction) + Thomas&Betts Iberville catalog BC1100L. Canadian counting
   differs: bare bonds never counted, NO clamp allowance, marrettes count
   one allowance per PAIR. See docs/research/CEC_VS_NEC.md. */
const CEC_VOL_ML = {
  '14 AWG': 24.6, '12 AWG': 28.7, '10 AWG': 36.9, '8 AWG': 45.1, '6 AWG': 73.7,
};

let grounds = 1;
let clamps = 0;
const BOX_RESULT_TEXT = {
  mlOption: '{size} ({volume} mL each)',
  cubicInchOption: '{size} ({volume} cu in each)',
  boxOption: '{box} — {volume} cu in',
  needed: '{volume} {unit}',
  neededVsAvailable: 'needed vs {volume} {unit} available',
  countVolume: '{count} × {unit} = {volume}',
  doubleCountVolume: '{count} × 2 × {unit} = {volume}',
  usage: '{percent}%',
  oneCountVolume: '1 × {unit} = {volume}',
  conductorBreakdown: '<span>{count} × {size}</span><span>{count} × {allowance} = {volume} {measure}</span>',
  deviceBreakdown: '<span>{count} {deviceWord} ({size} largest)</span><span>{count} × 2 × {allowance} = {volume} {measure}</span>',
  groundsBreakdown: '<span>grounds ({size} largest)</span><span>1 × {allowance} = {volume} {measure}</span>',
  clampsBreakdown: '<span>clamps ({size} largest)</span><span>1 × {allowance} = {volume} {measure}</span>',
  marretteBreakdown: '<span>{count} {pairWord} ({size} largest)</span><span>{count} × {allowance} = {volume} {measure}</span>',
  totalBreakdown: '<span><strong>TOTAL REQUIRED</strong></span><span><strong>{volume} {measure}</strong></span>',
  caMathMixed: '\n<p>Each conductor row uses its own allowance from CEC Table 22, Rule 12-3034.</p>\n<div class="formula">{breakdown}\n{box}: {available} mL available → {status}</div>\n<p>Canadian fine print: bare bond wires and cable clamps get no allowance. Devices and marrette pairs use the largest listed conductor because those aggregate inputs are not linked to a specific row. Devices deeper than 2.54 cm need an extra deduction of 32 mL per cm of depth, which this simple check does not include.</p>',
  usMathMixed: '\n<p>Each conductor row uses its own allowance from NEC Table 314.16(B).</p>\n<div class="formula">{breakdown}\n{box}: {available} cu in available → {status}</div>\n<p>Fine print: pigtails that stay entirely inside the box do not count, but a wire passing through unbroken counts once. Devices, grounds, and clamps use the largest listed conductor because those aggregate inputs are not linked to a specific row. If more than four ground wires enter the box, each one beyond four adds a ¼ count under the 2020 rule; add roughly one extra wire to stay conservative.</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: 'Cram too many wires into a box and connections get stressed, insulation gets nicked, and heat builds up — a classic cause of failed inspections and flickering circuits. The U.S. electrical code (NEC 314.16) assigns every wire a space allowance based on its size, and the box must have at least that much room.',
    exp2: 'Each hot or neutral entering the box counts at its own size — including wires that pass straight through unbroken. Each device (switch/outlet) counts twice at the allowance of its largest connected conductor. All ground wires together count once at the largest ground size. Built-in cable clamps count once at the largest conductor in the box. Pigtails that live entirely inside the box are free.',
  },
  ca: {
    exp1: 'Cram too many wires into a box and connections get stressed, insulation gets nicked, and heat builds up — a classic cause of failed inspections. The Canadian Electrical Code (Rule 12-3034 with Table 22) assigns every insulated wire a space allowance in millilitres, and the box must have at least that much room.',
    exp2: 'Canadian counting (Rule 12-3034): each insulated wire entering the box counts once at its own size. Bare bond wires are NOT counted. Each device counts twice. Every PAIR of insulated wire connectors (marrettes) counts once. Devices and marrette pairs use the largest listed conductor. Cable clamps get NO allowance in Canada. Pigtails that live entirely inside the box are free.',
  },
};

function applyBfCountry() {
  const ca = bfCountry() === 'ca';
  const fm = $('bf-field-marrettes'), fg = $('bf-field-grounds'), fc = $('bf-field-clamps');
  if (fm) fm.hidden = !ca;
  if (fg) fg.hidden = ca;   // bare bonds aren't counted in Canada; insulated entering wires go in the main count
  if (fc) fc.hidden = ca;   // CEC gives clamps no allowance
  // Every row speaks the local units and (for CA) only Table 22 sizes.
  document.querySelectorAll('#bf-rows .mixed-wire-size').forEach((select) => {
    populateSizeSelect(select, ca);
  });
  const e1 = $('bf-exp-1'), e2 = $('bf-exp-2');
  if (e1) e1.textContent = BF_TEXT[bfCountry()].exp1;
  if (e2) e2.textContent = BF_TEXT[bfCountry()].exp2;
  // Canadian boxes are marked in mL and Canadian box products differ from the
  // US table — CA mode uses the stamped volume (custom) to stay verified-only.
  if (ca) {
    boxSel.value = 'custom';
    $('bf-custom-wrap').hidden = false;
    $('bf-custom').placeholder = 'e.g. 310 (mL, marked in the box)';
  } else {
    $('bf-custom').placeholder = 'e.g. 18';
  }
  if (!$('results').hidden) calc();
}
window.addEventListener('vd:country', applyBfCountry);

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
const fixed = (n, d) => Number(n).toFixed(d);

const boxSel = $('bf-box');
BOXES.forEach(([label, vol], i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = vdFormat(BOX_RESULT_TEXT.boxOption, { box: label, volume: vol });
  boxSel.appendChild(opt);
});
const customOpt = document.createElement('option');
customOpt.value = 'custom';
customOpt.textContent = 'Custom — volume printed in the box';
boxSel.appendChild(customOpt);
boxSel.value = 5; // 3×2×3-1/2 (18 cu in) — the everyday single-gang

boxSel.addEventListener('change', () => {
  $('bf-custom-wrap').hidden = boxSel.value !== 'custom';
  if (!$('results').hidden) calc();
});

function populateSizeSelect(select, ca = bfCountry() === 'ca') {
  const previous = select.value;
  const source = ca ? CEC_VOL_ML : VOL_PER_CONDUCTOR;
  select.innerHTML = '';
  Object.keys(source).forEach((label) => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = vdFormat(ca ? BOX_RESULT_TEXT.mlOption : BOX_RESULT_TEXT.cubicInchOption, {
      size: label,
      volume: source[label],
    });
    select.appendChild(opt);
  });
  select.value = (previous in source) ? previous : '12 AWG';
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('#bf-rows .mixed-wire-row');
  rows.forEach((row) => {
    row.querySelector('.remove-size-btn').hidden = rows.length === 1;
  });
}

function conductorRows() {
  const source = bfCountry() === 'ca' ? CEC_VOL_ML : VOL_PER_CONDUCTOR;
  return [...document.querySelectorAll('#bf-rows .mixed-wire-row')].map((row) => {
    const size = row.querySelector('.mixed-wire-size').value;
    const count = Math.floor(Number(row.querySelector('.mixed-wire-count').value));
    return { size, count, allowance: source[size] };
  });
}

function renderBreakdown(lines, total) {
  const itemized = $('itemized-breakdown');
  itemized.innerHTML = '';
  lines.forEach((html) => {
    const line = document.createElement('div');
    line.className = 'breakdown-line';
    line.innerHTML = html;
    itemized.appendChild(line);
  });
  const totalLine = document.createElement('div');
  totalLine.className = 'breakdown-line breakdown-total';
  totalLine.innerHTML = total;
  itemized.appendChild(totalLine);
}

populateSizeSelect($('bf-size'), false);

$('bf-add-row').addEventListener('click', () => {
  const fragment = $('bf-row-template').content.cloneNode(true);
  const row = fragment.querySelector('.mixed-wire-row');
  populateSizeSelect(row.querySelector('.mixed-wire-size'));
  $('bf-rows').appendChild(fragment);
  updateRemoveButtons();
  row.querySelector('.mixed-wire-size').focus();
});

$('bf-rows').addEventListener('click', (event) => {
  const button = event.target.closest('.remove-size-btn');
  if (!button) return;
  button.closest('.mixed-wire-row').remove();
  updateRemoveButtons();
  if (!$('results').hidden) calc();
});

document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.seg');
    group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if ('grounds' in btn.dataset) grounds = Number(btn.dataset.grounds);
    if ('clamps' in btn.dataset) clamps = Number(btn.dataset.clamps);
    if (!$('results').hidden) calc();
  });
});

$('bf-form').addEventListener('submit', (e) => { e.preventDefault(); calc(); });

function calc() {
  const conductorEntries = conductorRows();
  if (!conductorEntries.length
      || conductorEntries.some((row) => !Number.isFinite(row.count) || row.count < 0)) return;
  const conductors = conductorEntries.reduce((sum, row) => sum + row.count, 0);
  const devices = Math.floor(Number($('bf-devices').value)) || 0;
  const ca = bfCountry() === 'ca';
  const marrettes = ca ? (Math.floor(Number($('bf-marrettes').value)) || 0) : 0;

  let boxVol, boxName;
  if (ca || boxSel.value === 'custom') {
    boxVol = Number($('bf-custom').value);
    boxName = 'your box';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const largest = conductorEntries.reduce((current, row) =>
    row.allowance > current.allowance ? row : current);
  if (largest.allowance === undefined) { alert('For Canadian box fill, use sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
  const conductorVolume = conductorEntries.reduce((sum, row) =>
    sum + row.count * row.allowance, 0);
  const pairs = Math.floor(marrettes / 2);
  const deviceVolume = devices * 2 * largest.allowance;
  const groundVolume = !ca && grounds ? largest.allowance : 0;
  const clampVolume = !ca && clamps ? largest.allowance : 0;
  const marretteVolume = ca ? pairs * largest.allowance : 0;
  const needed = conductorVolume + deviceVolume + groundVolume + clampVolume + marretteVolume;
  const ok = needed <= boxVol;
  const pct = (needed / boxVol) * 100;

  const verdict = $('verdict');
  verdict.className = 'verdict ' + (ok ? (pct <= 90 ? 'good' : 'warn') : 'bad');
  $('verdict-badge').textContent = ok ? (pct <= 90 ? 'FITS' : 'TIGHT') : 'TOO FULL';
  const u = ca ? 'mL' : 'cu in';
  $('big-number').textContent = vdFormat(BOX_RESULT_TEXT.needed, {
    volume: fmt(needed, ca ? 1 : 2),
    unit: u,
  });
  $('big-label').textContent = vdFormat(BOX_RESULT_TEXT.neededVsAvailable, {
    volume: fmt(boxVol, 1),
    unit: u,
  });

  const rows = ca
    ? [
        ['Insulated wires', vdFormat(BOX_RESULT_TEXT.needed, { volume: fmt(conductorVolume, 1), unit: u })],
        ['Devices (count double)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit: largest.allowance, volume: fmt(deviceVolume, 1) })],
        ['Marrette pairs', vdFormat(BOX_RESULT_TEXT.countVolume, { count: pairs, unit: largest.allowance, volume: fmt(marretteVolume, 1) })],
        ['Box usage', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['Wires (hots + neutrals)', vdFormat(BOX_RESULT_TEXT.needed, { volume: fmt(conductorVolume, 2), unit: u })],
        ['Devices (count double)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit: largest.allowance, volume: fmt(deviceVolume, 2) })],
        ['Grounds (all = 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit: largest.allowance, volume: fmt(groundVolume, 2) }) : 'none'],
        ['Clamps', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit: largest.allowance, volume: fmt(clampVolume, 2) }) : 'none'],
        ['Box usage', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ];
  $('result-grid').innerHTML = rows.map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  const breakdown = conductorEntries
    .filter((row) => row.count > 0)
    .map((row) => vdFormat(BOX_RESULT_TEXT.conductorBreakdown, {
      count: row.count,
      size: row.size,
      allowance: fixed(row.allowance, ca ? 1 : 2),
      volume: fixed(row.count * row.allowance, ca ? 1 : 2),
      measure: u,
    }));
  if (devices > 0) breakdown.push(vdFormat(BOX_RESULT_TEXT.deviceBreakdown, {
    count: devices,
    deviceWord: devices === 1 ? 'device' : 'devices',
    size: largest.size,
    allowance: fixed(largest.allowance, ca ? 1 : 2),
    volume: fixed(deviceVolume, ca ? 1 : 2),
    measure: u,
  }));
  if (!ca && grounds) breakdown.push(vdFormat(BOX_RESULT_TEXT.groundsBreakdown, {
    size: largest.size,
    allowance: fixed(largest.allowance, 2),
    volume: fixed(groundVolume, 2),
    measure: u,
  }));
  if (!ca && clamps) breakdown.push(vdFormat(BOX_RESULT_TEXT.clampsBreakdown, {
    size: largest.size,
    allowance: fixed(largest.allowance, 2),
    volume: fixed(clampVolume, 2),
    measure: u,
  }));
  if (ca && pairs > 0) breakdown.push(vdFormat(BOX_RESULT_TEXT.marretteBreakdown, {
    count: pairs,
    pairWord: pairs === 1 ? 'marrette pair' : 'marrette pairs',
    size: largest.size,
    allowance: fixed(largest.allowance, 1),
    volume: fixed(marretteVolume, 1),
    measure: u,
  }));
  renderBreakdown(
    breakdown,
    vdFormat(BOX_RESULT_TEXT.totalBreakdown, {
      volume: fixed(needed, ca ? 1 : 2),
      measure: u,
    }),
  );

  $('verdict-note').textContent = ok
    ? (pct <= 90
        ? 'This box has the room the code requires.'
        : 'Legal, but right at the limit — if you might add a device or another cable later, go bigger now.')
    : 'Over the limit. Use a deeper box, a box extension, or fewer conductors — overfilled boxes are a common inspection failure and a heat risk.';

  const breakdownText = [...$('itemized-breakdown').querySelectorAll('.breakdown-line')]
    .map((line) => line.textContent.trim())
    .join('\n');
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMathMixed : BOX_RESULT_TEXT.usMathMixed, {
    breakdown: breakdownText,
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? 'FITS' : 'DOES NOT FIT',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
