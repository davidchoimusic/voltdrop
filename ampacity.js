/* VoltDrop — Ampacity Check
   Data: NEC Table 310.16 (≤3 current-carrying conductors, 30°C ambient),
   columns 60/75/90°C. Small-conductor overcurrent caps per NEC 240.4(D).
   Verdict uses min(table ampacity, 240.4(D) cap) — the practical limit. */

const AMPACITY = {
  cu: {
    '14 AWG': [15, 20, 25], '12 AWG': [20, 25, 30], '10 AWG': [30, 35, 40],
    '8 AWG': [40, 50, 55], '6 AWG': [55, 65, 75], '4 AWG': [70, 85, 95],
    '3 AWG': [85, 100, 115], '2 AWG': [95, 115, 130], '1 AWG': [110, 130, 145],
    '1/0 AWG': [125, 150, 170], '2/0 AWG': [145, 175, 195], '3/0 AWG': [165, 200, 225],
    '4/0 AWG': [195, 230, 260], '250 kcmil': [215, 255, 290], '300 kcmil': [240, 285, 320],
    '350 kcmil': [260, 310, 350], '400 kcmil': [280, 335, 380], '500 kcmil': [320, 380, 430],
  },
  al: {
    '12 AWG': [15, 20, 25], '10 AWG': [25, 30, 35], '8 AWG': [35, 40, 45],
    '6 AWG': [40, 50, 55], '4 AWG': [55, 65, 75], '3 AWG': [65, 75, 85],
    '2 AWG': [75, 90, 100], '1 AWG': [85, 100, 115], '1/0 AWG': [100, 120, 135],
    '2/0 AWG': [115, 135, 150], '3/0 AWG': [130, 155, 175], '4/0 AWG': [150, 180, 205],
    '250 kcmil': [170, 205, 230], '300 kcmil': [195, 230, 260], '350 kcmil': [210, 250, 280],
    '400 kcmil': [225, 270, 305], '500 kcmil': [260, 310, 350],
  },
};

// NEC 240.4(D): max overcurrent device for small conductors.
const SMALL_CAP = {
  cu: { '14 AWG': 15, '12 AWG': 20, '10 AWG': 30 },
  al: { '12 AWG': 15, '10 AWG': 25 },
};

const TEMP_INDEX = { 60: 0, 75: 1, 90: 2 };
const MATERIAL_NAME = { cu: 'copper', al: 'aluminum' };

let material = 'cu';
let temp = 75;

const $ = (id) => document.getElementById(id);

function fillSizes() {
  const sel = $('amp-size');
  const prev = sel.value;
  sel.innerHTML = '';
  Object.keys(AMPACITY[material]).forEach((label) => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    sel.appendChild(opt);
  });
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  else sel.value = '12 AWG';
}

document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.seg');
    group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if ('material' in btn.dataset) { material = btn.dataset.material; fillSizes(); }
    if ('temp' in btn.dataset) temp = Number(btn.dataset.temp);
    if (!$('results').hidden) check();
  });
});

fillSizes();

$('amp-form').addEventListener('submit', (e) => { e.preventDefault(); check(); });

function check() {
  const load = Number($('amp-load').value);
  if (!load) return;
  const label = $('amp-size').value;
  const tableAmps = AMPACITY[material][label][TEMP_INDEX[temp]];
  const cap = (SMALL_CAP[material] || {})[label];
  const rated = cap ? Math.min(tableAmps, cap) : tableAmps;
  const ok = load <= rated;
  const margin = rated - load;

  const verdict = $('verdict');
  verdict.className = 'verdict ' + (ok ? (margin / rated >= 0.2 ? 'good' : 'warn') : 'bad');
  $('verdict-badge').textContent = ok ? (margin / rated >= 0.2 ? 'OK' : 'TIGHT') : 'TOO SMALL';
  $('big-number').textContent = rated + ' A';
  $('big-label').textContent = 'safe limit for ' + label + ' ' + MATERIAL_NAME[material] + ' at ' + temp + '°C';

  const cells = [
    ['Your load', load + ' A'],
    ['Table ampacity', tableAmps + ' A'],
  ];
  if (cap) cells.push(['Breaker cap (small-wire rule)', cap + ' A']);
  cells.push(['Headroom', (margin >= 0 ? margin : 0) + ' A']);
  $('result-grid').innerHTML = cells
    .map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join('');

  $('verdict-note').textContent = ok
    ? (margin / rated >= 0.2
        ? 'This wire can carry your load under normal conditions. Remember: continuous loads (3+ hours) should stay under 80% of the limit — that\'s ' + Math.floor(rated * 0.8) + ' A here.'
        : 'It fits, but barely. For continuous loads (3+ hours), heat, or bundled wires, go up a size — the 80% guideline puts you at ' + Math.floor(rated * 0.8) + ' A.')
    : 'This wire is NOT rated for ' + load + ' A. Go up in size — undersized wire overheats and is a fire risk.';

  $('math-body').innerHTML = `
<p>NEC Table 310.16 lists ${label} ${MATERIAL_NAME[material]} at the ${temp}°C column as <strong>${tableAmps} A</strong> (up to three current-carrying wires in conduit, normal room temperature).</p>
${cap ? `<p>The small-conductor rule (NEC 240.4(D)) caps the breaker for ${label} ${MATERIAL_NAME[material]} at <strong>${cap} A</strong>, so that's the practical limit we compare against.</p>` : ''}
<div class="formula">Safe limit = ${rated} A   vs   your load = ${load} A   →   ${ok ? 'OK' : 'exceeds the limit'}</div>`;

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
