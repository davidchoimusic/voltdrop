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
  caMath: '\n<p>Cada conductor aislado {size} requiere <strong>{unit} mL</strong> de espacio en la caja (CEC Table 22, Rule 12-3034).</p>\n<div class="formula">{conductors} conductores + {devices} {deviceWord} × 2 + {pairs} {pairWord}\n= {counts} cuentas totales × {unit} mL\n= {needed} mL necesarios\n{box}: {available} mL disponibles → {status}</div>\n<p>Detalle canadiense: los conductores de continuidad de masa desnudos y las abrazaderas no reciben volumen (a diferencia de US); cada par de marrettes cuenta una vez según el conductor más grande conectado (usamos el calibre seleccionado; elija el mayor presente para conservar un margen seguro); los dispositivos con más de 2.54 cm de profundidad necesitan una deducción adicional de 32 mL por cm de profundidad, que esta verificación sencilla no incluye.</p>',
  usMath: '\n<p>Cada conductor {size} requiere <strong>{unit} cu in</strong> de espacio en la caja (NEC Table 314.16(B)).</p>\n<div class="formula">{conductors} conductores + {devices} {deviceWord} × 2 + {grounds} + {clamps}\n= {counts} cuentas totales × {unit} cu in\n= {needed} cu in necesarios\n{box}: {available} cu in disponibles → {status}</div>\n<p>Detalle: las colas de conexión que permanecen por completo dentro de la caja no cuentan, pero un conductor que la atraviesa sin cortarse SÍ cuenta una vez; inclúyalo arriba. Si entran más de cuatro conductores de puesta a tierra, cada uno después del cuarto suma ¼ de cuenta (regla de 2020); agregue aproximadamente un conductor extra para conservar un margen seguro. Con varios calibres se necesita el cálculo completo por calibre (próximamente); hasta entonces, seleccionar el calibre mayor es la forma segura de usar esta herramienta.</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: 'Una caja sobrecargada fuerza las conexiones, daña el aislamiento y acumula calor. Es una causa habitual de inspecciones fallidas y circuitos intermitentes. NEC 314.16 asigna un volumen a cada calibre del conductor, y la caja debe ofrecer al menos ese espacio.',
    exp2: 'Cada conductor de fase o neutro que entra en la caja = 1, incluidos los que la atraviesan sin cortarse. Cada dispositivo = 2. Todos los conductores de puesta a tierra juntos = 1; si hay más de cuatro, cada adicional suma ¼ según las reglas de 2020. Las abrazaderas internas = 1. Las colas de conexión que permanecen dentro de la caja no cuentan. Multiplicamos el total por el volumen del calibre del conductor y lo comparamos con el volumen de la caja.',
  },
  ca: {
    exp1: 'Una caja sobrecargada fuerza las conexiones, daña el aislamiento y acumula calor. Es una causa habitual de inspecciones fallidas. Canadian Electrical Code (Rule 12-3034 con Table 22) asigna a cada conductor aislado un volumen en mililitros, y la caja debe ofrecer al menos ese espacio.',
    exp2: 'Conteo canadiense (Rule 12-3034): cada conductor aislado que entra en la caja = 1; los conductores de continuidad de masa desnudos NO cuentan. Cada dispositivo (interruptor/tomacorriente) = 2. Cada PAR de conectores aislados (marrettes) = 1, según el conductor más grande conectado. Es una regla canadiense sin equivalente en US. Las abrazaderas no reciben volumen en Canadá. Las colas de conexión que permanecen dentro de la caja no cuentan. Multiplicamos el total por el volumen de Table 22 y lo comparamos con el volumen de la caja en mililitros.',
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
    $('bf-custom').placeholder = 'e.g. 310 (mL, marked en el caja)';
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
customOpt.textContent = 'Custom — volumen impreso en el caja';
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
    boxName = 'su caja';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const size = sizeSel.value;
  const unit = ca ? CEC_VOL_ML[size] : VOL_PER_CONDUCTOR[size];
  if (unit === undefined) { alert('para canadiense llenado de caja, use sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
  const counts = ca
    ? conductors + devices * 2 + Math.floor(marrettes / 2)
    : conductors + devices * 2 + (grounds ? 1 : 0) + (clamps ? 1 : 0);
  const needed = counts * unit;
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
        ['aislados conductores', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 1) })],
        ['Dispositivos (cuentan doble)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 1) })],
        ['Pares de marrettes', vdFormat(BOX_RESULT_TEXT.countVolume, { count: Math.floor(marrettes / 2), unit, volume: fmt(Math.floor(marrettes / 2) * unit, 1) })],
        ['Uso de la caja', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['conductores (hots + neutrals)', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 2) })],
        ['Dispositivos (cuentan doble)', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 2) })],
        ['tierras (todos = 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : 'ninguno'],
        ['abrazaderas', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : 'ninguno'],
        ['Uso de la caja', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ];
  $('result-grid').innerHTML = rows.map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = ok
    ? (pct <= 90
        ? 'Esta caja tiene el espacio que exige el código.'
        : 'Permitido, pero justo en el límite. Si más adelante pudiera agregar un dispositivo u otro cable, use ahora una caja mayor.')
    : 'Supera el límite. Use una caja más profunda, una extensión o menos conductores. Las cajas sobrecargadas suelen fallar la inspección y presentan riesgo de calor.';

  const pairs = Math.floor(marrettes / 2);
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMath : BOX_RESULT_TEXT.usMath, {
    size,
    unit,
    conductors,
    devices,
    deviceWord: devices === 1 ? 'dispositivo' : 'dispositivos',
    pairs,
    pairWord: pairs === 1 ? 'par de marrettes' : 'pares de marrettes',
    grounds: grounds ? 'tierras (1)' : 'no tierras (0)',
    clamps: clamps ? 'abrazaderas (1)' : 'no abrazaderas (0)',
    counts,
    needed: fmt(needed, ca ? 1 : 2),
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? 'cabe' : 'NO CABE',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
