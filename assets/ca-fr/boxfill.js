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
  ['dispositif boîte 3 × 2 × 1-1/2"', 7.5],
  ['dispositif boîte 3 × 2 × 2"', 10.0],
  ['dispositif boîte 3 × 2 × 2-1/4"', 10.5],
  ['dispositif boîte 3 × 2 × 2-1/2"', 12.5],
  ['dispositif boîte 3 × 2 × 2-3/4"', 14.0],
  ['dispositif boîte 3 × 2 × 3-1/2"', 18.0],
  ['4" ronde/octogonale × 1-1/4"', 12.5],
  ['4" ronde/octogonale × 1-1/2"', 15.5],
  ['4" ronde/octogonale × 2-1/8"', 21.5],
  ['4" carré × 1-1/4"', 18.0],
  ['4" carré × 1-1/2"', 21.0],
  ['4" carré × 2-1/8"', 30.3],
  ['4-11/16" carré × 1-1/4"', 25.5],
  ['4-11/16" carré × 1-1/2"', 29.5],
  ['4-11/16" carré × 2-1/8"', 42.0],
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
  mlOption: '{size} ({volume} mL par conducteur)',
  cubicInchOption: '{size} ({volume} cu in par conducteur)',
  boxOption: '{box} — {volume} cu in',
  needed: '{volume} {unit}',
  neededVsAvailable: 'requis par rapport aux {volume} {unit} disponibles',
  countVolume: '{count} × {unit} = {volume}',
  doubleCountVolume: '{count} × 2 × {unit} = {volume}',
  usage: '{percent}%',
  oneCountVolume: '1 × {unit} = {volume}',
  caMath: '\n<p>Chaque conducteur isolé {size} exige <strong>{unit} mL</strong> d’espace dans la boîte (CEC Table 22, Rule 12-3034).</p>\n<div class="formula">{conductors} conducteurs + {devices} {deviceWord} × 2 + {pairs} {pairWord}\n= {counts} comptes au total × {unit} mL\n= {needed} mL requis\n{box} : {available} mL disponibles → {status}</div>\n<p>Détail canadien : les conducteurs de continuité des masses nus et les serre-câbles ne reçoivent aucun volume (contrairement aux US); chaque paire de marrettes compte une fois selon le plus gros conducteur raccordé (nous utilisons le calibre sélectionné; choisissez le plus gros présent pour conserver une marge sécuritaire); les dispositifs de plus de 2.54 cm de profondeur exigent une déduction supplémentaire de 32 mL par cm de profondeur, que cette vérification simple n’inclut pas.</p>',
  usMath: '\n<p>Chaque conducteur {size} exige <strong>{unit} cu in</strong> d’espace dans la boîte (NEC Table 314.16(B)).</p>\n<div class="formula">{conductors} conducteurs + {devices} {deviceWord} × 2 + {grounds} + {clamps}\n= {counts} comptes au total × {unit} cu in\n= {needed} cu in requis\n{box} : {available} cu in disponibles → {status}</div>\n<p>Détail : les queues de cochon entièrement dans la boîte ne comptent pas, mais un conducteur qui la traverse sans être coupé compte UNE fois; incluez-le ci-dessus. Si plus de quatre conducteurs de mise à la terre entrent dans la boîte, chacun au-delà du quatrième ajoute ¼ de compte (règle de 2020); ajoutez environ un conducteur pour conserver une marge sécuritaire. Plusieurs calibres exigent le calcul complet par calibre (à venir); d’ici là, choisir le plus gros calibre est la façon sécuritaire d’utiliser cet outil.</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: 'Une boîte trop remplie force les raccords, endommage l’isolant et accumule de la chaleur. C’est une cause fréquente d’échec à l’inspection et de circuits intermittents. NEC 314.16 attribue un volume à chaque calibre du conducteur, et la boîte doit offrir au moins ce volume.',
    exp2: 'Chaque conducteur de phase ou neutre qui entre dans la boîte = 1, y compris un conducteur qui la traverse sans être coupé. Chaque dispositif = 2. Tous les conducteurs de mise à la terre ensemble = 1; au-delà de quatre, chacun ajoute ¼ selon les règles de 2020. Les serre-câbles internes = 1. Les queues de cochon entièrement dans la boîte ne comptent pas. Nous multiplions le total par le volume du calibre du conducteur et le comparons au volume de la boîte.',
  },
  ca: {
    exp1: 'Une boîte trop remplie force les raccords, endommage l’isolant et accumule de la chaleur. C’est une cause fréquente d’échec à l’inspection. Canadian Electrical Code (Rule 12-3034 avec Table 22) attribue un volume en millilitres à chaque conducteur isolé, et la boîte doit offrir au moins ce volume.',
    exp2: 'Comptage canadien (Rule 12-3034) : chaque conducteur isolé entrant dans la boîte = 1; les conducteurs de continuité des masses nus NE comptent PAS. Chaque dispositif = 2. Chaque PAIRE de connecteurs isolés (marrettes) = 1, selon le plus gros conducteur raccordé. Cette règle canadienne n’a pas d’équivalent aux US. Les serre-câbles ne reçoivent aucun volume au Canada. Les queues de cochon entièrement dans la boîte ne comptent pas. Nous multiplions le total par le volume de Table 22 et le comparons au volume de la boîte en millilitres.',
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
    $('bf-custom').placeholder = 'e.g. 310 (mL, marked dans le boîte)';
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
customOpt.textContent = 'Custom — volume imprimé dans le boîte';
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
    boxName = 'votre boîte';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const size = sizeSel.value;
  const unit = ca ? CEC_VOL_ML[size] : VOL_PER_CONDUCTOR[size];
  if (unit === undefined) { alert('pour canadien remplissage de boîte, utilisez sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
  const counts = ca
    ? conductors + devices * 2 + Math.floor(marrettes / 2)
    : conductors + devices * 2 + (grounds ? 1 : 0) + (clamps ? 1 : 0);
  const needed = counts * unit;
  const ok = needed <= boxVol;
  const pct = (needed / boxVol) * 100;

  const verdict = $('verdict');
  verdict.className = 'verdict ' + (ok ? (pct <= 90 ? 'good' : 'warn') : 'bad');
  $('verdict-badge').textContent = ok ? (pct <= 90 ? 'convient' : 'SERRÉ') : 'trop plein';
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
        ['isolés conducteurs', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 1) })],
        ['Dispositifs (comptent double)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 1) })],
        ['Paires de marrettes', vdFormat(BOX_RESULT_TEXT.countVolume, { count: Math.floor(marrettes / 2), unit, volume: fmt(Math.floor(marrettes / 2) * unit, 1) })],
        ['Utilisation de la boîte', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['conducteurs (hots + neutrals)', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 2) })],
        ['Dispositifs (comptent double)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 2) })],
        ['mises à la terre (tous = 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : 'aucun'],
        ['serre-câbles', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : 'aucun'],
        ['Utilisation de la boîte', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ];
  $('result-grid').innerHTML = rows.map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = ok
    ? (pct <= 90
        ? 'Cette boîte offre l’espace exigé par le code.'
        : 'Permis, mais juste à la limite. Si vous pourriez ajouter un dispositif ou un câble plus tard, choisissez une boîte plus grande maintenant.')
    : 'Au-dessus de la limite. Utilisez une boîte plus profonde, une rallonge de boîte ou moins de conducteurs. Une boîte trop remplie échoue souvent à l’inspection et présente un risque de chaleur.';

  const pairs = Math.floor(marrettes / 2);
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMath : BOX_RESULT_TEXT.usMath, {
    size,
    unit,
    conductors,
    devices,
    deviceWord: devices === 1 ? 'dispositif' : 'dispositifs',
    pairs,
    pairWord: pairs === 1 ? 'paire de marrettes' : 'paires de marrettes',
    grounds: grounds ? 'mises à la terre (1)' : 'non mises à la terre (0)',
    clamps: clamps ? 'serre-câbles (1)' : 'non serre-câbles (0)',
    counts,
    needed: fmt(needed, ca ? 1 : 2),
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? 'convient' : 'NE CONVIENT PAS',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
