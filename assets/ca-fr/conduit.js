/* VoltDrop — Conduit Fill
   Data: NEC Chapter 9 Table 5 (THHN/THWN areas, sq in) and Table 4
   (conduit total internal area, sq in). Fill limits: 1 wire 53%,
   2 wires 31%, 3+ wires 40%. */

const THHN_AREA = {
  '14 AWG': 0.0097, '12 AWG': 0.0133, '10 AWG': 0.0211, '8 AWG': 0.0366,
  '6 AWG': 0.0507, '4 AWG': 0.0824, '3 AWG': 0.0973, '2 AWG': 0.1158,
  '1 AWG': 0.1562, '1/0 AWG': 0.1855, '2/0 AWG': 0.2223, '3/0 AWG': 0.2679,
  '4/0 AWG': 0.3237, '250 kcmil': 0.3970, '300 kcmil': 0.4608,
  '350 kcmil': 0.5242, '400 kcmil': 0.5863, '500 kcmil': 0.7073,
};

const CONDUIT = {
  emt: {
    name: 'EMT',
    sizes: [['1/2"', 0.304], ['3/4"', 0.533], ['1"', 0.864], ['1-1/4"', 1.496], ['1-1/2"', 2.036], ['2"', 3.356], ['2-1/2"', 5.858], ['3"', 8.846], ['3-1/2"', 11.545], ['4"', 14.753]],
  },
  pvc40: {
    name: 'PVC Sch 40',
    sizes: [['1/2"', 0.285], ['3/4"', 0.508], ['1"', 0.832], ['1-1/4"', 1.453], ['1-1/2"', 1.986], ['2"', 3.291], ['2-1/2"', 4.695], ['3"', 7.268], ['3-1/2"', 9.737], ['4"', 12.554]],
  },
};

const fillLimit = (n) => (n === 1 ? 0.53 : n === 2 ? 0.31 : 0.40);
const CONDUIT_RESULT_TEXT = {
  tooLarge: 'plus que ce qu’un conduit {conduit} de 4" peut contenir légalement',
  tooLargeMath: '<p>{count} × {size} THHN = {area} sq in de conducteurs, ce qui dépasse la limite de remplissage de {percent}% même dans un conduit {conduit} de 4".</p>',
  smallest: 'plus petit conduit {conduit} pour {count} × {size} THHN',
  fillAtSize: '{percent}% de {size}',
  oneWireLimit: '{percent}% pour 1 conducteur',
  twoWireLimit: '{percent}% pour 2 conducteurs',
  manyWireLimit: '{percent}% pour 3+ conducteurs',
  squareInches: '{area} sq in',
  comfortable: 'Bon dégagement sous la limite de {percent}%.',
  math: '\n<p>Chaque conducteur {size} THHN a une section de <strong>{wireArea} sq in</strong> (NEC Chapter 9, Table 5).</p>\n<div class="formula">{count} conducteurs × {wireArea} = {needed} sq in requis\nAire intérieure du conduit {conduitSize} {conduit} = {conduitArea} sq in (NEC Chapter 9, Table 4)\nPermis : {conduitArea} × {percent}% = {allowed} sq in\n{needed} ≤ {allowed}  →  remplissage de {actualPercent}%</div>',
};

let conduitType = 'emt';

const $ = (id) => document.getElementById(id);

const sel = $('fill-size');
Object.keys(THHN_AREA).forEach((label) => {
  const opt = document.createElement('option');
  opt.value = label;
  opt.textContent = label;
  sel.appendChild(opt);
});
sel.value = '12 AWG';

document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.seg');
    group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if ('conduit' in btn.dataset) conduitType = btn.dataset.conduit;
    if (!$('results').hidden) calc();
  });
});

$('fill-form').addEventListener('submit', (e) => { e.preventDefault(); calc(); });

function calc() {
  const count = Math.floor(Number($('fill-count').value));
  if (!count || count < 1) return;
  const label = $('fill-size').value;
  const wireArea = THHN_AREA[label];
  const needed = wireArea * count;
  const limit = fillLimit(count);
  const family = CONDUIT[conduitType];

  let pick = null;
  for (const [size, area] of family.sizes) {
    if (needed <= area * limit) { pick = { size, area }; break; }
  }

  const verdict = $('verdict');
  if (!pick) {
    verdict.className = 'verdict bad';
    $('verdict-badge').textContent = 'trop plusieurs';
    $('big-number').textContent = '—';
    $('big-label').textContent = vdFormat(CONDUIT_RESULT_TEXT.tooLarge, { conduit: family.name });
    $('result-grid').innerHTML = '';
    $('verdict-note').textContent = 'Répartissez le parcours dans plusieurs conduits ou réduisez le nombre de conducteurs.';
    $('math-body').innerHTML = vdFormat(CONDUIT_RESULT_TEXT.tooLargeMath, {
      count,
      size: label,
      area: needed.toFixed(3),
      percent: Math.round(limit * 100),
      conduit: family.name,
    });
    $('results').hidden = false;
    return;
  }

  const pct = (needed / pick.area) * 100;
  verdict.className = 'verdict ' + (pct <= limit * 100 * 0.85 ? 'good' : 'warn');
  $('verdict-badge').textContent = pct <= limit * 100 * 0.85 ? 'convient' : 'JUSTE';
  $('big-number').textContent = pick.size;
  $('big-label').textContent = vdFormat(CONDUIT_RESULT_TEXT.smallest, {
    conduit: family.name,
    count,
    size: label,
  });

  const nextUp = family.sizes[family.sizes.findIndex(([s]) => s === pick.size) + 1];
  const limitPattern = count >= 3
    ? CONDUIT_RESULT_TEXT.manyWireLimit
    : count === 1
      ? CONDUIT_RESULT_TEXT.oneWireLimit
      : CONDUIT_RESULT_TEXT.twoWireLimit;
  $('result-grid').innerHTML = [
    ['remplissage à ce calibre', vdFormat(CONDUIT_RESULT_TEXT.fillAtSize, { percent: pct.toFixed(1), size: pick.size })],
    ['Limite permise', vdFormat(limitPattern, { percent: Math.round(limit * 100) })],
    ['aire totale des conducteurs', vdFormat(CONDUIT_RESULT_TEXT.squareInches, { area: needed.toFixed(3) })],
    nextUp ? ['Tirage plus facile : diamètre suivant', nextUp[0]] : ['ce est le plus grand calibre', '4"'],
  ].map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = pct > limit * 100 * 0.85
    ? 'Permis, mais près de la limite. Un diamètre supérieur facilite beaucoup le tirage sur les longs parcours ou avec plusieurs coudes.'
    : vdFormat(CONDUIT_RESULT_TEXT.comfortable, { percent: Math.round(limit * 100) });

  $('math-body').innerHTML = vdFormat(CONDUIT_RESULT_TEXT.math, {
    size: label,
    wireArea,
    count,
    needed: needed.toFixed(4),
    conduitSize: pick.size,
    conduit: family.name,
    conduitArea: pick.area,
    percent: Math.round(limit * 100),
    allowed: (pick.area * limit).toFixed(4),
    actualPercent: pct.toFixed(1),
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
