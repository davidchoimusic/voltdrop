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
  tooLarge: 'more than a 4" {conduit} can legally hold',
  tooLargeMixed: '<p>The combined conductor area is {area} sq in, which exceeds the {percent}% fill limit of even 4" {conduit}.</p>',
  smallestMixed: 'smallest {conduit} for {count} conductors',
  fillAtSize: '{percent}% of {size}',
  oneWireLimit: '{percent}% for 1 wire',
  twoWireLimit: '{percent}% for 2 wires',
  manyWireLimit: '{percent}% for 3+ wires',
  squareInches: '{area} sq in',
  comfortable: 'Comfortable fit under the {percent}% limit.',
  conductorBreakdown: '<span>{count} × {size} THHN</span><span>{count} × {wireArea} = {rowArea} sq in</span>',
  conductorMathText: '{count} × {size}: {count} × {wireArea} = {rowArea} sq in',
  totalBreakdown: '<span><strong>TOTAL CONDUCTOR AREA</strong></span><span><strong>{area} sq in</strong></span>',
  mathMixed: '\n<p>Each row uses the conductor cross-section from NEC Chapter 9, Table 5.</p>\n<div class="formula">{breakdown}\nTOTAL = {needed} sq in\n{conduitSize} {conduit} inside area = {conduitArea} sq in (NEC Chapter 9, Table 4)\nAllowed for {count} conductors: {conduitArea} × {percent}% = {allowed} sq in\n{needed} ≤ {allowed}  →  fits at {actualPercent}% fill</div>',
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
    $('verdict-badge').textContent = 'TOO MANY';
    $('big-number').textContent = '—';
    $('big-label').textContent = vdFormat(CONDUIT_RESULT_TEXT.tooLarge, { conduit: family.name });
    $('result-grid').innerHTML = '';
    $('verdict-note').textContent = 'Split the run across multiple conduits or reduce the wire count.';
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
  $('verdict-badge').textContent = pct <= limit * 100 * 0.85 ? 'FITS' : 'SNUG';
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
    ['Fill at this size', vdFormat(CONDUIT_RESULT_TEXT.fillAtSize, { percent: pct.toFixed(1), size: pick.size })],
    ['Legal limit', vdFormat(limitPattern, { percent: Math.round(limit * 100) })],
    ['Wire area total', vdFormat(CONDUIT_RESULT_TEXT.squareInches, { area: needed.toFixed(3) })],
    nextUp ? ['Easier pull: next size up', nextUp[0]] : ['This is the largest size', '4"'],
  ].map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  renderBreakdown(
    breakdown,
    vdFormat(CONDUIT_RESULT_TEXT.totalBreakdown, { area: needed.toFixed(4) }),
  );

  $('verdict-note').textContent = pct > limit * 100 * 0.85
    ? 'Legal, but close to the limit — long runs or multiple bends will pull much easier one size up.'
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
