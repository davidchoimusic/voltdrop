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
  ['dispositivo caja 3 × 2 × 1-1/2"', 7.5],
  ['dispositivo caja 3 × 2 × 2"', 10.0],
  ['dispositivo caja 3 × 2 × 2-1/4"', 10.5],
  ['dispositivo caja 3 × 2 × 2-1/2"', 12.5],
  ['dispositivo caja 3 × 2 × 2-3/4"', 14.0],
  ['dispositivo caja 3 × 2 × 3-1/2"', 18.0],
  ['4" redonda/octagonal × 1-1/4"', 12.5],
  ['4" redonda/octagonal × 1-1/2"', 15.5],
  ['4" redonda/octagonal × 2-1/8"', 21.5],
  ['4" cuadrado × 1-1/4"', 18.0],
  ['4" cuadrado × 1-1/2"', 21.0],
  ['4" cuadrado × 2-1/8"', 30.3],
  ['4-11/16" cuadrado × 1-1/4"', 25.5],
  ['4-11/16" cuadrado × 1-1/2"', 29.5],
  ['4-11/16" cuadrado × 2-1/8"', 42.0],
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
  mlOption: '{size} ({volume} mL por conductor)',
  cubicInchOption: '{size} ({volume} cu in por conductor)',
  boxOption: '{box} — {volume} cu in',
  needed: '{volume} {unit}',
  neededVsAvailable: 'necesarios frente a {volume} {unit} disponibles',
  countVolume: '{count} × {unit} = {volume}',
  doubleCountVolume: '{count} × 2 × {unit} = {volume}',
  usage: '{percent}%',
  oneCountVolume: '1 × {unit} = {volume}',
  conductorBreakdown: '<span>{count} × {size}</span><span>{count} × {allowance} = {volume} {measure}</span>',
  deviceBreakdown: '<span>{count} {deviceWord} (mayor: {size})</span><span>{count} × 2 × {allowance} = {volume} {measure}</span>',
  groundsBreakdown: '<span>tierras (mayor: {size})</span><span>1 × {allowance} = {volume} {measure}</span>',
  clampsBreakdown: '<span>abrazaderas (mayor: {size})</span><span>1 × {allowance} = {volume} {measure}</span>',
  marretteBreakdown: '<span>{count} {pairWord} (mayor: {size})</span><span>{count} × {allowance} = {volume} {measure}</span>',
  totalBreakdown: '<span><strong>TOTAL NECESARIO</strong></span><span><strong>{volume} {measure}</strong></span>',
  caMathMixed: '\n<p>Cada fila usa su propio volumen de CEC Table 22, Rule 12-3034.</p>\n<div class="formula">{breakdown}\n{box}: {available} mL disponibles → {status}</div>\n<p>Detalle canadiense: los conductores de continuidad de masa desnudos y las abrazaderas no reciben volumen. Los dispositivos y pares de marrettes usan el conductor más grande indicado porque esas entradas conjuntas no están vinculadas a una fila. Los dispositivos con más de 2.54 cm de profundidad necesitan una deducción adicional de 32 mL por cm, que esta verificación no incluye.</p>',
  usMathMixed: '\n<p>Cada fila usa su propio volumen de NEC Table 314.16(B).</p>\n<div class="formula">{breakdown}\n{box}: {available} cu in disponibles → {status}</div>\n<p>Detalle: las colas de conexión internas no cuentan, pero un conductor que atraviesa la caja sin cortarse cuenta una vez. Los dispositivos, tierras y abrazaderas usan el conductor más grande indicado porque esas entradas conjuntas no están vinculadas a una fila. Si entran más de cuatro tierras, cada una después de la cuarta suma ¼ según la regla de 2020; agregue aproximadamente un conductor para conservar margen.</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: 'Una caja sobrecargada fuerza las conexiones, daña el aislamiento y acumula calor. Es una causa habitual de inspecciones fallidas y circuitos intermitentes. NEC 314.16 asigna un volumen a cada calibre del conductor, y la caja debe ofrecer al menos ese espacio.',
    exp2: 'Cada conductor de fase o neutro que entra en la caja cuenta según su propio calibre, incluidos los que la atraviesan sin cortarse. Cada dispositivo cuenta dos veces según el volumen de su conductor conectado más grande. Todos los conductores de puesta a tierra juntos cuentan una vez según el mayor. Las abrazaderas internas cuentan una vez según el conductor más grande de la caja. Las colas de conexión internas no cuentan.',
  },
  ca: {
    exp1: 'Una caja sobrecargada fuerza las conexiones, daña el aislamiento y acumula calor. Es una causa habitual de inspecciones fallidas. Canadian Electrical Code (Rule 12-3034 con Table 22) asigna a cada conductor aislado un volumen en mililitros, y la caja debe ofrecer al menos ese espacio.',
    exp2: 'Conteo canadiense (Rule 12-3034): cada conductor aislado que entra en la caja cuenta una vez según su propio calibre. Los conductores de continuidad de masa desnudos NO cuentan. Cada dispositivo cuenta dos veces. Cada PAR de conectores aislados (marrettes) cuenta una vez. Los dispositivos y pares de marrettes usan el conductor más grande indicado. Las abrazaderas NO reciben volumen en Canadá. Las colas de conexión internas no cuentan.',
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
    $('bf-custom').placeholder = 'e.g. 310 (mL, marked en el caja)';
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
customOpt.textContent = 'Custom — volumen impreso en el caja';
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
    boxName = 'su caja';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const largest = conductorEntries.reduce((current, row) =>
    row.allowance > current.allowance ? row : current);
  if (largest.allowance === undefined) { alert('para canadiense llenado de caja, use sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
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
  $('verdict-badge').textContent = ok ? (pct <= 90 ? 'cabe' : 'AJUSTADO') : 'demasiado lleno';
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
        ['aislados conductores', vdFormat(BOX_RESULT_TEXT.needed, { volume: fmt(conductorVolume, 1), unit: u })],
        ['Dispositivos (cuentan doble)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit: largest.allowance, volume: fmt(deviceVolume, 1) })],
        ['Pares de marrettes', vdFormat(BOX_RESULT_TEXT.countVolume, { count: pairs, unit: largest.allowance, volume: fmt(marretteVolume, 1) })],
        ['Uso de la caja', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['conductores (hots + neutrals)', vdFormat(BOX_RESULT_TEXT.needed, { volume: fmt(conductorVolume, 2), unit: u })],
        ['Dispositivos (cuentan doble)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit: largest.allowance, volume: fmt(deviceVolume, 2) })],
        ['tierras (todos = 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit: largest.allowance, volume: fmt(groundVolume, 2) }) : 'ninguno'],
        ['abrazaderas', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit: largest.allowance, volume: fmt(clampVolume, 2) }) : 'ninguno'],
        ['Uso de la caja', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
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
    deviceWord: devices === 1 ? 'dispositivo' : 'dispositivos',
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
    pairWord: pairs === 1 ? 'par de marrettes' : 'pares de marrettes',
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
        ? 'Esta caja tiene el espacio que exige el código.'
        : 'Permitido, pero justo en el límite. Si más adelante pudiera agregar un dispositivo u otro cable, use ahora una caja mayor.')
    : 'Supera el límite. Use una caja más profunda, una extensión o menos conductores. Las cajas sobrecargadas suelen fallar la inspección y presentan riesgo de calor.';

  const breakdownText = [...$('itemized-breakdown').querySelectorAll('.breakdown-line')]
    .map((line) => line.textContent.trim())
    .join('\n');
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMathMixed : BOX_RESULT_TEXT.usMathMixed, {
    breakdown: breakdownText,
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? 'cabe' : 'NO CABE',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
