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
  caMath: '\n<p>Each {size} insulated conductor requires <strong>{unit} mL</strong> of box space (CEC Table 22, Rule 12-3034).</p>\n<div class="formula">{conductors} wires + {devices} {deviceWord} × 2 + {pairs} {pairWord}\n= {counts} total counts × {unit} mL\n= {needed} mL needed\n{box}: {available} mL available → {status}</div>\n<p>Canadian fine print: bare bond wires and cable clamps get no allowance (unlike the US); marrettes count one allowance per pair, sized by the largest wire in them (we use your selected size — pick the largest present to be safe); devices deeper than 2.54 cm need an extra deduction of 32 mL per cm of depth, which this simple check doesn\'t include.</p>',
  usMath: '\n<p>Each {size} conductor requires <strong>{unit} cu in</strong> of box space (NEC Table 314.16(B)).</p>\n<div class="formula">{conductors} wires + {devices} {deviceWord} × 2 + {grounds} + {clamps}\n= {counts} total counts × {unit} cu in\n= {needed} cu in needed\n{box}: {available} cu in available → {status}</div>\n<p>Fine print: pigtails that stay entirely inside the box don\'t count, but a wire passing through unbroken DOES count once — include it above. If more than four ground wires enter the box, each one beyond four adds a ¼ count (2020 code rule) — add roughly one extra wire to be safe. Mixed wire sizes deserve the full by-size calculation (coming soon); until then, picking your largest size is the safe way to use this tool.</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: 'Cram too many wires into a box and connections get stressed, insulation gets nicked, and heat builds up — a classic cause of failed inspections and flickering circuits. The U.S. electrical code (NEC 314.16) assigns every wire a space allowance based on its size, and the box must have at least that much room.',
    exp2: 'Each hot or neutral entering the box = 1 count — including wires that pass straight through unbroken (those count once too). Each device (switch/outlet) = 2 counts. All ground wires together = 1 count (with more than four grounds, each extra adds a ¼ count under the 2020 rules). Built-in cable clamps = 1 count. Pigtails that live entirely inside the box are free. Multiply the counts by your wire size\'s space allowance and compare to the box volume — we do exactly that, and show the math.',
  },
  ca: {
    exp1: 'Cram too many wires into a box and connections get stressed, insulation gets nicked, and heat builds up — a classic cause of failed inspections. The Canadian Electrical Code (Rule 12-3034 with Table 22) assigns every insulated wire a space allowance in millilitres, and the box must have at least that much room.',
    exp2: 'Canadian counting (Rule 12-3034): each insulated wire entering the box = 1 count — bare bond wires are NOT counted. Each device (switch/outlet) = 2 counts. Every PAIR of insulated wire connectors (marrettes) = 1 count, sized by the largest wire in them — that\'s a Canadian rule with no US equivalent. Cable clamps get NO allowance in Canada. Pigtails that live entirely inside the box are free. We multiply the counts by Table 22\'s allowance and compare to the box volume in millilitres.',
  },
};

function applyBfCountry() {
  const ca = bfCountry() === 'ca';
  const fm = $('bf-field-marrettes'), fg = $('bf-field-grounds'), fc = $('bf-field-clamps');
  if (fm) fm.hidden = !ca;
  if (fg) fg.hidden = ca;   // bare bonds aren't counted in Canada; insulated entering wires go in the main count
  if (fc) fc.hidden = ca;   // CEC gives clamps no allowance
  // size dropdown speaks the local units and (for CA) only Table 22 sizes
  const prev = sizeSel.value;
  sizeSel.innerHTML = '';
  const src = ca ? CEC_VOL_ML : VOL_PER_CONDUCTOR;
  Object.keys(src).forEach((label) => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = vdFormat(ca ? BOX_RESULT_TEXT.mlOption : BOX_RESULT_TEXT.cubicInchOption, {
      size: label,
      volume: src[label],
    });
    sizeSel.appendChild(opt);
  });
  sizeSel.value = (prev in src) ? prev : '12 AWG';
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

const sizeSel = $('bf-size');
Object.keys(VOL_PER_CONDUCTOR).forEach((label) => {
  const opt = document.createElement('option');
  opt.value = label;
  opt.textContent = vdFormat(BOX_RESULT_TEXT.cubicInchOption, {
    size: label,
    volume: VOL_PER_CONDUCTOR[label],
  });
  sizeSel.appendChild(opt);
});
sizeSel.value = '12 AWG';

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
  const conductors = Math.floor(Number($('bf-conductors').value));
  if (!Number.isFinite(conductors) || conductors < 0) return;
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

  const size = sizeSel.value;
  const unit = ca ? CEC_VOL_ML[size] : VOL_PER_CONDUCTOR[size];
  if (unit === undefined) { alert('For Canadian box fill, use sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
  const counts = ca
    ? conductors + devices * 2 + Math.floor(marrettes / 2)
    : conductors + devices * 2 + (grounds ? 1 : 0) + (clamps ? 1 : 0);
  const needed = counts * unit;
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
        ['Insulated wires', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 1) })],
        ['Devices (count double)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 1) })],
        ['Marrette pairs', vdFormat(BOX_RESULT_TEXT.countVolume, { count: Math.floor(marrettes / 2), unit, volume: fmt(Math.floor(marrettes / 2) * unit, 1) })],
        ['Box usage', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['Wires (hots + neutrals)', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 2) })],
        ['Devices (count double)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 2) })],
        ['Grounds (all = 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : 'none'],
        ['Clamps', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : 'none'],
        ['Box usage', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ];
  $('result-grid').innerHTML = rows.map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = ok
    ? (pct <= 90
        ? 'This box has the room the code requires.'
        : 'Legal, but right at the limit — if you might add a device or another cable later, go bigger now.')
    : 'Over the limit. Use a deeper box, a box extension, or fewer conductors — overfilled boxes are a common inspection failure and a heat risk.';

  const pairs = Math.floor(marrettes / 2);
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMath : BOX_RESULT_TEXT.usMath, {
    size,
    unit,
    conductors,
    devices,
    deviceWord: devices === 1 ? 'device' : 'devices',
    pairs,
    pairWord: pairs === 1 ? 'marrette pair' : 'marrette pairs',
    grounds: grounds ? 'grounds (1)' : 'no grounds (0)',
    clamps: clamps ? 'clamps (1)' : 'no clamps (0)',
    counts,
    needed: fmt(needed, ca ? 1 : 2),
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? 'FITS' : 'DOES NOT FIT',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
