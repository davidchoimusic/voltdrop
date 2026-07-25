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
  tooLarge: 'más de lo que un {conduit} de 4" puede contener legalmente',
  tooLargeMixed: '<p>El área combinada de los conductores es {area} sq in, lo que supera el límite de llenado de {percent}% incluso en un {conduit} de 4".</p>',
  smallestMixed: 'menor {conduit} para {count} conductores',
  fillAtSize: '{percent}% de {size}',
  oneWireLimit: '{percent}% para 1 conductor',
  twoWireLimit: '{percent}% para 2 conductores',
  manyWireLimit: '{percent}% para 3+ conductores',
  squareInches: '{area} sq in',
  comfortable: 'Cabe con margen por debajo del límite de {percent}%.',
  conductorBreakdown: '<span>{count} × {size} THHN</span><span>{count} × {wireArea} = {rowArea} sq in</span>',
  conductorMathText: '{count} × {size}: {count} × {wireArea} = {rowArea} sq in',
  totalBreakdown: '<span><strong>ÁREA TOTAL DE CONDUCTORES</strong></span><span><strong>{area} sq in</strong></span>',
  mathMixed: '\n<p>Cada fila usa la sección transversal del conductor de NEC Chapter 9, Table 5.</p>\n<div class="formula">{breakdown}\nTOTAL = {needed} sq in\nÁrea interior de {conduitSize} {conduit} = {conduitArea} sq in (NEC Chapter 9, Table 4)\nPermitido para {count} conductores: {conduitArea} × {percent}% = {allowed} sq in\n{needed} ≤ {allowed}  →  llenado real de {actualPercent}%</div>',
};

let conduitType = 'emt';

const $ = (id) => document.getElementById(id);

function populateSizeSelect(select, selected = '12 AWG') {
  Object.keys(THHN_AREA).forEach((label) => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.value = selected;
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('#fill-rows .mixed-wire-row');
  rows.forEach((row) => {
    row.querySelector('.remove-size-btn').hidden = rows.length === 1;
  });
}

function conductorRows() {
  return [...document.querySelectorAll('#fill-rows .mixed-wire-row')].map((row) => {
    const size = row.querySelector('.mixed-wire-size').value;
    const count = Math.floor(Number(row.querySelector('.mixed-wire-count').value));
    return { size, count, wireArea: THHN_AREA[size] };
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

populateSizeSelect($('fill-size'));

$('fill-add-row').addEventListener('click', () => {
  const fragment = $('fill-row-template').content.cloneNode(true);
  const row = fragment.querySelector('.mixed-wire-row');
  populateSizeSelect(row.querySelector('.mixed-wire-size'));
  $('fill-rows').appendChild(fragment);
  updateRemoveButtons();
  row.querySelector('.mixed-wire-size').focus();
});

$('fill-rows').addEventListener('click', (event) => {
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
    if ('conduit' in btn.dataset) conduitType = btn.dataset.conduit;
    if (!$('results').hidden) calc();
  });
});

$('fill-form').addEventListener('submit', (e) => { e.preventDefault(); calc(); });

function calc() {
  const rows = conductorRows();
  if (!rows.length || rows.some((row) => !Number.isFinite(row.count) || row.count < 1)) return;
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  const needed = rows.reduce((sum, row) => sum + row.wireArea * row.count, 0);
  const limit = fillLimit(totalCount);
  const family = CONDUIT[conduitType];
  const breakdown = rows.map((row) => vdFormat(CONDUIT_RESULT_TEXT.conductorBreakdown, {
    count: row.count,
    size: row.size,
    wireArea: row.wireArea.toFixed(4),
    rowArea: (row.wireArea * row.count).toFixed(4),
  }));

  let pick = null;
  for (const [size, area] of family.sizes) {
    if (needed <= area * limit) { pick = { size, area }; break; }
  }

  const verdict = $('verdict');
  if (!pick) {
    verdict.className = 'verdict bad';
    $('verdict-badge').textContent = 'demasiado muchos';
    $('big-number').textContent = '—';
    $('big-label').textContent = vdFormat(CONDUIT_RESULT_TEXT.tooLarge, { conduit: family.name });
    $('result-grid').innerHTML = '';
    $('verdict-note').textContent = 'Divida el recorrido entre varios tubos conduit o reduzca la cantidad de conductores.';
    renderBreakdown(
      breakdown,
      vdFormat(CONDUIT_RESULT_TEXT.totalBreakdown, { area: needed.toFixed(4) }),
    );
    $('math-body').innerHTML = vdFormat(CONDUIT_RESULT_TEXT.tooLargeMixed, {
      area: needed.toFixed(3),
      percent: Math.round(limit * 100),
      conduit: family.name,
    });
    $('results').hidden = false;
    return;
  }

  const pct = (needed / pick.area) * 100;
  verdict.className = 'verdict ' + (pct <= limit * 100 * 0.85 ? 'good' : 'warn');
  $('verdict-badge').textContent = pct <= limit * 100 * 0.85 ? 'cabe' : 'JUSTO';
  $('big-number').textContent = pick.size;
  $('big-label').textContent = vdFormat(CONDUIT_RESULT_TEXT.smallestMixed, {
    conduit: family.name,
    count: totalCount,
  });

  const nextUp = family.sizes[family.sizes.findIndex(([s]) => s === pick.size) + 1];
  const limitPattern = totalCount >= 3
    ? CONDUIT_RESULT_TEXT.manyWireLimit
    : totalCount === 1
      ? CONDUIT_RESULT_TEXT.oneWireLimit
      : CONDUIT_RESULT_TEXT.twoWireLimit;
  $('result-grid').innerHTML = [
    ['llenado a este calibre', vdFormat(CONDUIT_RESULT_TEXT.fillAtSize, { percent: pct.toFixed(1), size: pick.size })],
    ['Límite permitido', vdFormat(limitPattern, { percent: Math.round(limit * 100) })],
    ['área total de conductores', vdFormat(CONDUIT_RESULT_TEXT.squareInches, { area: needed.toFixed(3) })],
    nextUp ? ['Tendido más fácil: siguiente tamaño', nextUp[0]] : ['este es el mayor calibre', '4"'],
  ].map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  renderBreakdown(
    breakdown,
    vdFormat(CONDUIT_RESULT_TEXT.totalBreakdown, { area: needed.toFixed(4) }),
  );

  $('verdict-note').textContent = pct > limit * 100 * 0.85
    ? 'Permitido, pero cerca del límite. Un tamaño mayor facilita mucho el tendido en recorridos largos o con varias curvas.'
    : vdFormat(CONDUIT_RESULT_TEXT.comfortable, { percent: Math.round(limit * 100) });

  $('math-body').innerHTML = vdFormat(CONDUIT_RESULT_TEXT.mathMixed, {
    breakdown: rows.map((row) => vdFormat(CONDUIT_RESULT_TEXT.conductorMathText, {
      count: row.count,
      size: row.size,
      wireArea: row.wireArea.toFixed(4),
      rowArea: (row.count * row.wireArea).toFixed(4),
    })).join('\n'),
    count: totalCount,
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
