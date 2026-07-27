/* VoltDrop — Conduit Fill
   US data: NEC Chapter 9 Tables 4 and 5.
   Canadian data: CSA C22.1:24 Tables 6A/6K and 9A–9H.
   Fill limits: 1 wire 53%, 2 wires 31%, 3+ wires 40%. */

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

const CEC_CONDUCTOR_AREA = {
  RW90: {
    '14 AWG': { dia_mm: 3.36, area_mm2: 8.87 },
    '12 AWG': { dia_mm: 3.84, area_mm2: 11.6 },
    '10 AWG': { dia_mm: 4.47, area_mm2: 15.7 },
    '8 AWG': { dia_mm: 5.99, area_mm2: 28.2 },
    '6 AWG': { dia_mm: 6.95, area_mm2: 38.0 },
    '4 AWG': { dia_mm: 8.17, area_mm2: 52.5 },
    '3 AWG': { dia_mm: 8.88, area_mm2: 62.0 },
    '2 AWG': { dia_mm: 9.7, area_mm2: 73.9 },
    '1 AWG': { dia_mm: 11.23, area_mm2: 99.1 },
    '1/0 AWG': { dia_mm: 12.27, area_mm2: 119 },
    '2/0 AWG': { dia_mm: 13.44, area_mm2: 142 },
    '3/0 AWG': { dia_mm: 14.74, area_mm2: 171 },
    '4/0 AWG': { dia_mm: 16.21, area_mm2: 207 },
    '250 kcmil': { dia_mm: 17.9, area_mm2: 252 },
    '300 kcmil': { dia_mm: 19.3, area_mm2: 293 },
    '350 kcmil': { dia_mm: 20.53, area_mm2: 332 },
    '400 kcmil': { dia_mm: 21.79, area_mm2: 373 },
    '450 kcmil': { dia_mm: 22.91, area_mm2: 413 },
  },
  T90: {
    '14 AWG': { dia_mm: 2.8, area_mm2: 6.16 },
    '12 AWG': { dia_mm: 3.28, area_mm2: 8.45 },
    '10 AWG': { dia_mm: 4.17, area_mm2: 13.7 },
    '8 AWG': { dia_mm: 5.49, area_mm2: 23.7 },
    '6 AWG': { dia_mm: 6.45, area_mm2: 32.7 },
    '4 AWG': { dia_mm: 8.23, area_mm2: 53.2 },
    '3 AWG': { dia_mm: 8.94, area_mm2: 62.8 },
    '2 AWG': { dia_mm: 9.76, area_mm2: 74.9 },
    '1 AWG': { dia_mm: 11.33, area_mm2: 101 },
    '1/0 AWG': { dia_mm: 12.37, area_mm2: 121 },
    '2/0 AWG': { dia_mm: 13.54, area_mm2: 144 },
    '3/0 AWG': { dia_mm: 14.84, area_mm2: 173 },
    '4/0 AWG': { dia_mm: 16.31, area_mm2: 209 },
    '250 kcmil': { dia_mm: 18.04, area_mm2: 256 },
    '300 kcmil': { dia_mm: 19.44, area_mm2: 297 },
    '350 kcmil': { dia_mm: 20.67, area_mm2: 336 },
    '400 kcmil': { dia_mm: 21.93, area_mm2: 378 },
    '450 kcmil': { dia_mm: 23.05, area_mm2: 418 },
    '500 kcmil': { dia_mm: 24.09, area_mm2: 456 },
  },
};

const CEC_CONDUIT = {
  emt: {
    16: 15.4, 21: 20.5, 27: 26.2, 35: 34.6, 41: 40.5, 53: 52.1,
    63: 69.4, 78: 85.2, 91: 97.4, 103: 110.0, 129: 128.9, 155: 154.8,
  },
  pvc40: {
    16: 14.57, 21: 19.77, 27: 25.4, 35: 31.75, 41: 38.1, 53: 50.8,
    63: 61.3, 78: 76.2, 91: 88.4, 103: 100.1, 129: 125.85, 155: 149.75,
    200: 199.39,
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

const CEC_CONDUIT_RESULT_TEXT = {
  tooLarge: 'más de lo que el mayor {conduit} incluido puede contener legalmente',
  tooLargeMixed: '<p>El área combinada de los conductores es {area} mm², lo que supera el límite de llenado de {percent}% incluso en el {conduit} de {largestSize}.</p>',
  smallestMixed: 'menor {conduit} para {count} conductores',
  fillAtSize: '{percent}% de {size}',
  oneWireLimit: '{percent}% para 1 conductor',
  twoWireLimit: '{percent}% para 2 conductores',
  manyWireLimit: '{percent}% para 3+ conductores',
  squareMillimetres: '{area} mm²',
  comfortable: 'Cabe con margen por debajo del límite de {percent}%.',
  conductorBreakdown: '<span>{count} × {size} {conductorType}</span><span>{count} × {wireArea} = {rowArea} mm²</span>',
  conductorMathText: '{count} × {size}: {count} × {wireArea} = {rowArea} mm²',
  totalBreakdown: '<span><strong>ÁREA TOTAL DE CONDUCTORES</strong></span><span><strong>{area} mm²</strong></span>',
  mathMixed: '\n<p>Cada fila usa la sección transversal del conductor de CSA C22.1:24 {conductorTable}.</p>\n<div class="formula">{breakdown}\nTOTAL = {needed} mm²\nÁrea interior de {conduitSize} {conduit} = {conduitArea} mm² (derivada de su diámetro interior en CSA C22.1:24 Tables 9A–9H)\nPermitido por Rule 12-910 y Table 8 para {count} conductores: {conduitArea} × {percent}% = {allowed} mm²\n{needed} ≤ {allowed}  →  llenado real de {actualPercent}%</div>',
};

const CEC_UI_TEXT = {
  conductorTypeLabel: 'Tipo de conductor',
  conductorTypeHint: 'RW90 es el conductor de construcción común en Canadá. Elija T90 para conductor con cubierta de nailon.',
  rigidPvc: 'PVC rígido',
  tradeSize: '{designator} ({imperial})',
};

const CEC_TRADE_SIZE_IMPERIAL = {
  16: '½″', 21: '¾″', 27: '1″', 35: '1¼″', 41: '1½″', 53: '2″',
  63: '2½″', 78: '3″', 91: '3½″', 103: '4″', 129: '5″', 155: '6″', 200: '8″',
};

const country = document.body.dataset.country || 'us';
let conduitType = 'emt';
let conductorType = country === 'ca' ? 'RW90' : 'THHN';

const $ = (id) => document.getElementById(id);

function activeConductorAreas() {
  return country === 'ca' ? CEC_CONDUCTOR_AREA[conductorType] : THHN_AREA;
}

function conductorArea(size) {
  const value = activeConductorAreas()[size];
  return country === 'ca' ? value?.area_mm2 : value;
}

function cecTradeSize(designator) {
  return vdFormat(CEC_UI_TEXT.tradeSize, {
    designator,
    imperial: CEC_TRADE_SIZE_IMPERIAL[designator],
  });
}

function activeConduitFamily() {
  if (country !== 'ca') return CONDUIT[conduitType];
  return {
    name: conduitType === 'emt' ? 'EMT' : CEC_UI_TEXT.rigidPvc,
    sizes: Object.entries(CEC_CONDUIT[conduitType]).map(([designator, idMm]) => [
      cecTradeSize(designator),
      Math.PI * (idMm / 2) ** 2,
    ]),
  };
}

function populateSizeSelect(select, selected = '12 AWG') {
  select.innerHTML = '';
  Object.keys(activeConductorAreas()).forEach((label) => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.value = Object.hasOwn(activeConductorAreas(), selected) ? selected : '12 AWG';
}

function addCecConductorTypeSelector() {
  if (country !== 'ca') return;
  const field = document.createElement('div');
  field.className = 'field';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = CEC_UI_TEXT.conductorTypeLabel;
  field.appendChild(label);

  const controls = document.createElement('div');
  controls.className = 'seg';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', CEC_UI_TEXT.conductorTypeLabel);
  for (const type of ['RW90', 'T90']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = type === conductorType ? 'seg-btn active' : 'seg-btn';
    button.dataset.conductorType = type;
    button.textContent = type;
    controls.appendChild(button);
  }
  field.appendChild(controls);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = CEC_UI_TEXT.conductorTypeHint;
  field.appendChild(hint);

  const wireField = $('fill-rows').closest('.field');
  wireField.parentNode.insertBefore(field, wireField);
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
    return { size, count, wireArea: conductorArea(size) };
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

if (country === 'ca') $('conduit-country-note').hidden = false;
addCecConductorTypeSelector();
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
    if ('conductorType' in btn.dataset) {
      conductorType = btn.dataset.conductorType;
      document.querySelectorAll('.mixed-wire-size').forEach((select) => {
        populateSizeSelect(select, select.value);
      });
    }
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
  const family = activeConduitFamily();
  const resultText = country === 'ca' ? CEC_CONDUIT_RESULT_TEXT : CONDUIT_RESULT_TEXT;
  const wireDecimals = country === 'ca' ? 2 : 4;
  const totalDecimals = country === 'ca' ? 2 : 4;
  const gridDecimals = country === 'ca' ? 2 : 3;
  const breakdown = rows.map((row) => vdFormat(resultText.conductorBreakdown, {
    count: row.count,
    size: row.size,
    conductorType,
    wireArea: row.wireArea.toFixed(wireDecimals),
    rowArea: (row.wireArea * row.count).toFixed(totalDecimals),
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
    $('big-label').textContent = vdFormat(resultText.tooLarge, { conduit: family.name });
    $('result-grid').innerHTML = '';
    $('verdict-note').textContent = 'Divida el recorrido entre varios tubos conduit o reduzca la cantidad de conductores.';
    renderBreakdown(
      breakdown,
      vdFormat(resultText.totalBreakdown, { area: needed.toFixed(totalDecimals) }),
    );
    $('math-body').innerHTML = vdFormat(resultText.tooLargeMixed, {
      area: needed.toFixed(gridDecimals),
      percent: Math.round(limit * 100),
      conduit: family.name,
      largestSize: family.sizes.at(-1)[0],
    });
    $('results').hidden = false;
    return;
  }

  const pct = (needed / pick.area) * 100;
  verdict.className = 'verdict ' + (pct <= limit * 100 * 0.85 ? 'good' : 'warn');
  $('verdict-badge').textContent = pct <= limit * 100 * 0.85 ? 'cabe' : 'JUSTO';
  $('big-number').textContent = pick.size;
  $('big-label').textContent = vdFormat(resultText.smallestMixed, {
    conduit: family.name,
    count: totalCount,
  });

  const nextUp = family.sizes[family.sizes.findIndex(([s]) => s === pick.size) + 1];
  const limitPattern = totalCount >= 3
    ? resultText.manyWireLimit
    : totalCount === 1
      ? resultText.oneWireLimit
      : resultText.twoWireLimit;
  $('result-grid').innerHTML = [
    ['llenado a este calibre', vdFormat(resultText.fillAtSize, { percent: pct.toFixed(1), size: pick.size })],
    ['Límite permitido', vdFormat(limitPattern, { percent: Math.round(limit * 100) })],
    ['área total de conductores', vdFormat(
      country === 'ca' ? resultText.squareMillimetres : resultText.squareInches,
      { area: needed.toFixed(gridDecimals) },
    )],
    nextUp
      ? ['Tendido más fácil: siguiente tamaño', nextUp[0]]
      : ['este es el mayor calibre', family.sizes.at(-1)[0]],
  ].map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  renderBreakdown(
    breakdown,
    vdFormat(resultText.totalBreakdown, { area: needed.toFixed(totalDecimals) }),
  );

  $('verdict-note').textContent = pct > limit * 100 * 0.85
    ? 'Permitido, pero cerca del límite. Un tamaño mayor facilita mucho el tendido en recorridos largos o con varias curvas.'
    : vdFormat(resultText.comfortable, { percent: Math.round(limit * 100) });

  $('math-body').innerHTML = vdFormat(resultText.mathMixed, {
    breakdown: rows.map((row) => vdFormat(resultText.conductorMathText, {
      count: row.count,
      size: row.size,
      wireArea: row.wireArea.toFixed(wireDecimals),
      rowArea: (row.count * row.wireArea).toFixed(totalDecimals),
    })).join('\n'),
    count: totalCount,
    needed: needed.toFixed(totalDecimals),
    conduitSize: pick.size,
    conduit: family.name,
    conduitArea: pick.area.toFixed(country === 'ca' ? 2 : 3),
    conductorTable: conductorType === 'RW90' ? 'Table 6A' : 'Table 6K',
    percent: Math.round(limit * 100),
    allowed: (pick.area * limit).toFixed(totalDecimals),
    actualPercent: pct.toFixed(1),
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
