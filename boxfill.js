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

let grounds = 1;
let clamps = 0;

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });

const boxSel = $('bf-box');
BOXES.forEach(([label, vol], i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = `${label} — ${vol} cu in`;
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
  opt.textContent = `${label} (${VOL_PER_CONDUCTOR[label]} cu in each)`;
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

  let boxVol, boxName;
  if (boxSel.value === 'custom') {
    boxVol = Number($('bf-custom').value);
    boxName = 'your box';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const size = sizeSel.value;
  const unit = VOL_PER_CONDUCTOR[size];
  const counts = conductors + devices * 2 + (grounds ? 1 : 0) + (clamps ? 1 : 0);
  const needed = counts * unit;
  const ok = needed <= boxVol;
  const pct = (needed / boxVol) * 100;

  const verdict = $('verdict');
  verdict.className = 'verdict ' + (ok ? (pct <= 90 ? 'good' : 'warn') : 'bad');
  $('verdict-badge').textContent = ok ? (pct <= 90 ? 'FITS' : 'TIGHT') : 'TOO FULL';
  $('big-number').textContent = fmt(needed, 2) + ' cu in';
  $('big-label').textContent = 'needed vs ' + fmt(boxVol, 1) + ' cu in available';

  $('result-grid').innerHTML = [
    ['Wires (hots + neutrals)', conductors + ' × ' + unit + ' = ' + fmt(conductors * unit, 2)],
    ['Devices (count double)', devices + ' × 2 × ' + unit + ' = ' + fmt(devices * 2 * unit, 2)],
    ['Grounds (all = 1)', (grounds ? '1 × ' + unit + ' = ' + fmt(unit, 2) : 'none')],
    ['Clamps', (clamps ? '1 × ' + unit + ' = ' + fmt(unit, 2) : 'none')],
    ['Box usage', fmt(pct, 0) + '%'],
  ].map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = ok
    ? (pct <= 90
        ? 'This box has the room the code requires.'
        : 'Legal, but right at the limit — if you might add a device or another cable later, go bigger now.')
    : 'Over the limit. Use a deeper box, a box extension, or fewer conductors — overfilled boxes are a common inspection failure and a heat risk.';

  $('math-body').innerHTML = `
<p>Each ${size} conductor requires <strong>${unit} cu in</strong> of box space (NEC Table 314.16(B)).</p>
<div class="formula">${conductors} wires + ${devices} device${devices === 1 ? '' : 's'} × 2 + ${grounds ? 'grounds (1)' : 'no grounds (0)'} + ${clamps ? 'clamps (1)' : 'no clamps (0)'}
= ${counts} total counts × ${unit} cu in
= ${fmt(needed, 2)} cu in needed
${boxName}: ${fmt(boxVol, 1)} cu in available → ${ok ? 'FITS' : 'DOES NOT FIT'}</div>
<p>Fine print: pigtails that stay entirely inside the box don't count, but a wire passing through unbroken DOES count once — include it above. If more than four ground wires enter the box, each one beyond four adds a ¼ count (2020 code rule) — add roughly one extra wire to be safe. Mixed wire sizes deserve the full by-size calculation (coming soon); until then, picking your largest size is the safe way to use this tool.</p>`;

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
