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
const MATERIAL_NAME = { cu: 'cobre', al: 'aluminio' };
const AMP_RESULT_TEXT = {
  amps: '{amps} A',
  safeLimit: 'límite seguro para conductor de {material} {size} a {temp}°C',
  normalMargin: 'Este conductor puede transportar la carga en condiciones normales. Recuerde: las cargas continuas (3+ horas) deberían mantenerse por debajo de 80% del límite; aquí son {amps} A.',
  tightMargin: 'Cumple, pero apenas. Para cargas continuas (3+ horas), calor o conductores agrupados, use un calibre mayor; la recomendación de 80% fija aquí un máximo de {amps} A.',
  notRated: 'Este conductor NO tiene capacidad nominal para {amps} A. Use un calibre mayor: un conductor de calibre insuficiente se sobrecalienta y supone un riesgo de incendio.',
  lookup: '\n<p>{table} indica que un conductor de {material} {size} en la columna de {temp}°C tiene una ampacidad de <strong>{tableAmps} A</strong> (hasta tres conductores portadores de corriente en tubo conduit y temperatura ambiente normal).</p>',
  cap: '<p>La regla para conductores pequeños ({citation}) limita a <strong>{capAmps} A</strong> el interruptor del conductor de {material} {size}; ese es el límite práctico que usamos para comparar.</p>',
  comparison: '<div class="formula">Límite seguro = {rated} A   frente a   su carga = {load} A   →   {status}</div>',
};

let material = 'cu';
let temp = 75;

// Country-aware wording: same verified data both countries (CEC Tables 2/4
// are harmonized with NEC 310.16); citations, cable names, and rules swap.
const AMP_TEXT = {
  us: {
    tableCite: 'NEC tabla 310.16',
    capCite: 'NEC 240.4(D)',
    tempHint: '¿No está seguro? Use <strong>75°C</strong>: la mayoría de las terminales de interruptores automáticos y zapatas tienen esa clasificación. El cable Romex/NM-B debe usar la columna de 60°C. THHN en lugares secos tiene clasificación de 90°C, pero los puntos de conexión suelen limitar el circuito a 75°C.',
    expLookup: 'Buscamos el conductor en la tabla estándar de ampacidad de EE. UU. (NEC Table 310.16; condiciones normales: hasta tres conductores portadores de corriente en un tubo conduit y temperatura ambiente normal). Para conductores pequeños también aplicamos NEC 240.4(D): 14 AWG cobre, máximo 15 A; 12 AWG, 20 A; 10 AWG, 30 A, aunque la tabla indique más.',
  },
  ca: {
    tableCite: 'CEC Table 2/Table 4 (harmonized con NEC 310.16)',
    capCite: 'CEC Rule 14-104',
    tempHint: 'no sure? use <strong>75°C</strong> — it\'s qué la mayoría marked breakers y lugs son nominal para; unmarked equipment cuenta as 60°C (CEC Rule 4-006). NMD90 isn\'t blanket-capped a 60°C like American Romex — el terminales establece el ceiling — pero funcionando eso a el 60°C columna es el conservative habit.',
    expLookup: 'Buscamos el conductor en las tablas canadienses de ampacidad (CEC Table 2 para cobre y Table 4 para aluminio; verificamos que los valores coinciden con la tabla de US). Para conductores pequeños también aplicamos CEC Rule 14-104: #14 cobre, máximo 15 A; #12, 20 A; #10, 30 A, aunque la tabla indique más.',
  },
};
function ampCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }
function applyAmpCountryText() {
  const t = AMP_TEXT[ampCountry()];
  const hint = $('amp-temp-hint');
  if (hint) hint.innerHTML = t.tempHint;
  const exp = $('amp-exp-lookup');
  if (exp) exp.textContent = t.expLookup;
  if (!$('results').hidden) check();
}
window.addEventListener('vd:country', applyAmpCountryText);

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
  $('verdict-badge').textContent = ok ? (margin / rated >= 0.2 ? 'OK' : 'AJUSTADO') : 'DEMASIADO PEQUEÑO';
  $('big-number').textContent = vdFormat(AMP_RESULT_TEXT.amps, { amps: rated });
  $('big-label').textContent = vdFormat(AMP_RESULT_TEXT.safeLimit, {
    size: label,
    material: MATERIAL_NAME[material],
    temp,
  });

  const cells = [
    ['su carga', vdFormat(AMP_RESULT_TEXT.amps, { amps: load })],
    ['tabla ampacidad', vdFormat(AMP_RESULT_TEXT.amps, { amps: tableAmps })],
  ];
  if (cap) cells.push(['Límite del interruptor automático (regla para conductores pequeños)', vdFormat(AMP_RESULT_TEXT.amps, { amps: cap })]);
  cells.push(['Margen disponible', vdFormat(AMP_RESULT_TEXT.amps, { amps: margin >= 0 ? margin : 0 })]);
  $('result-grid').innerHTML = cells
    .map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join('');

  $('verdict-note').textContent = ok
    ? (margin / rated >= 0.2
        ? vdFormat(AMP_RESULT_TEXT.normalMargin, { amps: Math.floor(rated * 0.8) })
        : vdFormat(AMP_RESULT_TEXT.tightMargin, { amps: Math.floor(rated * 0.8) }))
    : vdFormat(AMP_RESULT_TEXT.notRated, { amps: load });

  const T = AMP_TEXT[ampCountry()];
  $('math-body').innerHTML = [
    vdFormat(AMP_RESULT_TEXT.lookup, {
      table: T.tableCite,
      size: label,
      material: MATERIAL_NAME[material],
      temp,
      tableAmps,
    }),
    cap ? vdFormat(AMP_RESULT_TEXT.cap, {
      citation: T.capCite,
      size: label,
      material: MATERIAL_NAME[material],
      capAmps: cap,
    }) : '',
    vdFormat(AMP_RESULT_TEXT.comparison, {
      rated,
      load,
      status: ok ? 'OK' : 'supera el límite',
    }),
  ].filter(Boolean).join('\n');

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyAmpCountryText();
