/* ========================================================================
   VoltDrop — voltage drop calculator
   K-factor method (NEC-style): Vd = mult × K × I × L / CM
     mult = 2 for DC and single-phase (round trip), √3 for three-phase
     K    = ohm·cmil/ft (12.9 copper, 21.2 aluminum, ~75°C)
     L    = ONE-WAY length in feet (the mult handles the return path)
     CM   = conductor area in circular mils
   Wire data is a swappable table so metric (mm²/IEC) regions can be
   added later without touching the math or UI logic.
   ======================================================================== */

const WIRE_TABLE = [
  // [label, circular mils]
  ['18 AWG', 1620],
  ['16 AWG', 2580],
  ['14 AWG', 4110],
  ['12 AWG', 6530],
  ['10 AWG', 10380],
  ['8 AWG', 16510],
  ['6 AWG', 26240],
  ['4 AWG', 41740],
  ['3 AWG', 52620],
  ['2 AWG', 66360],
  ['1 AWG', 83690],
  ['1/0 AWG', 105600],
  ['2/0 AWG', 133100],
  ['3/0 AWG', 167800],
  ['4/0 AWG', 211600],
  ['250 kcmil', 250000],
  ['300 kcmil', 300000],
  ['350 kcmil', 350000],
  ['400 kcmil', 400000],
  ['500 kcmil', 500000],
];

const K_FACTOR = { cu: 12.9, al: 21.2 };
const MATERIAL_NAME = { cu: 'cobre', al: 'aluminio' };

const SYSTEMS = {
  dc:  { mult: 2,     multLabel: '2',  name: 'DC',
         hint: 'DC: baterías, solar, vehículos, LED tiras.' },
  ac1: { mult: 2,     multLabel: '2',  name: 'AC monofásica',
         hint: 'monofásica: normal household y light commercial circuitos.' },
  ac3: { mult: 1.732, multLabel: '√3 (1.732)', name: 'AC trifásica',
         hint: 'trifásica: commercial y industrial. tensión es entre líneas.' },
};
const DROP_TEXT = {
  volts: '{volts} V',
  amps: '{amps} A',
  percent: '{percent}%',
  dropLabel: 'caída de tensión en conductor de {material} {size}',
  limit: '{percent}% = {volts} V',
  actualDrop: '{percent}% ({volts} V)',
  noFitLabel: 'ningún calibre indicado mantiene la caída por debajo de {percent}%',
  noFitNote: 'Incluso un conductor de {material} {size} tiene una caída superior a {percent}% en {feet} pies de distancia en un solo sentido con {amps} A.',
  smallestWireLabel: 'menor conductor de {material} que mantiene la caída por debajo de {percent}%',
  ampacityWarning: 'Atención: esto solo calcula la caída de tensión. El conductor TAMBIÉN debe tener capacidad nominal para transportar {amps} A de forma segura (ampacidad); verifíquelo por separado antes de comprar.',
  maxDistanceNote: 'A esta distancia exacta se alcanza una caída de {percent}%. Mantenga el recorrido más corto para conservar margen. Recuerde también que el conductor debe tener capacidad nominal para {amps} A (ampacidad), sin importar la distancia.',
  feet: '{feet} ft',
  maxRunLabel: 'recorrido máximo en un solo sentido para conductor de {material} {size} con una caída de {percent}%',
  mathIntroRoundTrip: '<p>Usamos la fórmula estándar del factor K que emplean los electricistas:</p>\n<div class="formula">Caída de tensión = {mult} × K × amperios × pies en un solo sentido ÷ milésimas circulares</div>\n<p><strong>{mult}</strong> tiene en cuenta el recorrido de ida y vuelta: la corriente sale Y regresa, por lo que el trayecto del conductor es el doble de la distancia en un solo sentido. <strong>K = {factor}</strong> es la constante de resistencia del {material} (ohm·cmil/ft a 75°C). <strong>Circular mils</strong> es el área de la sección transversal del conductor.</p>',
  mathIntroThreePhase: '<p>Usamos la fórmula estándar del factor K que emplean los electricistas:</p>\n<div class="formula">Caída de tensión = {mult} × K × amperios × pies en un solo sentido ÷ milésimas circulares</div>\n<p><strong>{mult}</strong> tiene en cuenta la geometría trifásica. <strong>K = {factor}</strong> es la constante de resistencia del {material} (ohm·cmil/ft a 75°C). <strong>Circular mils</strong> es el área de la sección transversal del conductor.</p>',
  dropMath: '\n<p>Con sus valores ({size} = {cm} milésimas circulares):</p>\n<div class="formula">{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} voltios de caída\n÷ {source} V de la fuente = {percent}%</div>\n<p>Tensión en la carga: {source} − {dropped} = <strong>{endVolts} V</strong>.</p>',
  noFitMath: '<p>Verificamos todos los calibres, de menor a mayor; ninguno produjo una caída ≤ {maxDrop} V ({percent}% de {source} V).</p>',
  sizeMath: '\n<p>Probamos cada calibre, empezando por el menor, hasta encontrar uno que mantuviera la caída por debajo de su límite de {percent}% ({maxDrop} V):</p>\n<div class="formula">{size} ({cm} cmil):\n{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} V = {actualPercent}%  ✓ por debajo de su límite</div>',
  maxRunMath: '\n<p>Reordenamos la fórmula para calcular la distancia, con su límite de {percent}% ({maxDrop} V):</p>\n<div class="formula">Máximo de pies en un solo sentido = {maxDrop} V × {cm} cmil\n             ÷ ({mult} × {factor} × {amps} A)\n             = {feet} ft</div>',
};

// Country editions live in common.js (window.VDCountry) — shared with the
// ampacity and conduit tools. Future countries (mm²/IEC) additionally swap
// WIRE_TABLE and units here.

// ---- state ----
let mode = 'drop';        // drop | size | length
let system = 'dc';
let material = 'cu';
let targetChoice = '3';   // '3' | '5' | 'custom'

// ---- element handles ----
const $ = (id) => document.getElementById(id);
const form = $('calc-form');
const results = $('results');

// ---- populate wire select ----
const awgSelect = $('awg');
WIRE_TABLE.forEach(([label], i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = label;
  awgSelect.appendChild(opt);
});
awgSelect.value = 3; // 12 AWG default — the everyday size

// ---- segmented control wiring ----
function wireSeg(container, attr, onChange) {
  container.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset[attr]);
    });
  });
}

document.querySelectorAll('.seg').forEach((seg) => {
  const first = seg.querySelector('.seg-btn');
  if (!first) return;
  if ('system' in first.dataset) wireSeg(seg, 'system', setSystem);
  else if ('material' in first.dataset) wireSeg(seg, 'material', (v) => { material = v; recalcIfVisible(); });
  else if ('target' in first.dataset) wireSeg(seg, 'target', setTarget);
});

function setSystem(v) {
  system = v;
  $('system-hint').textContent = SYSTEMS[v].hint;
  renderVoltagePresets();
  recalcIfVisible();
}

function setTarget(v) {
  targetChoice = v;
  $('target-custom-wrap').hidden = v !== 'custom';
  recalcIfVisible();
}

// ---- voltage presets ----
function renderVoltagePresets() {
  const row = $('voltage-presets');
  row.innerHTML = '';
  VDCountry.COUNTRIES[VDCountry.get()].presets[system].forEach((v) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.textContent = vdFormat(DROP_TEXT.volts, { volts: v });
    if (Number($('voltage').value) === v) btn.classList.add('active');
    btn.addEventListener('click', () => {
      $('voltage').value = v;
      row.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      recalcIfVisible();
    });
    row.appendChild(btn);
  });
}
$('voltage').addEventListener('input', () => {
  document.querySelectorAll('.preset-btn').forEach((b) => {
    b.classList.toggle('active', Number($('voltage').value) === parseFloat(b.textContent));
  });
});

// ---- country edition (state managed by common.js) ----
window.addEventListener('vd:country', () => {
  renderVoltagePresets();
  recalcIfVisible();
});
renderVoltagePresets();

// ---- mode tabs & sidebar tool links ----
function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-tab').forEach((t) => {
    const on = t.dataset.mode === m;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tool-link[data-tool]').forEach((l) => {
    l.classList.toggle('active', l.dataset.tool === m);
  });
  applyMode();
}

document.querySelectorAll('.mode-tab').forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

function applyMode() {
  $('field-size').hidden = mode === 'size';
  $('field-distance').hidden = mode === 'length';
  $('field-target').hidden = mode === 'drop';
  $('distance').required = mode !== 'length';
  results.hidden = true;
  $('calc-btn').textContent = {
    drop: 'calcular caída de tensión',
    size: 'encuentre menor conductor',
    length: 'encuentre máximo distancia',
  }[mode];
}

// Each tool page (built by build.mjs) stamps its mode on <body data-mode>.
setMode(document.body.dataset.mode || 'drop');

// ---- core math ----
function dropVolts(cm, amps, feet) {
  return (SYSTEMS[system].mult * K_FACTOR[material] * amps * feet) / cm;
}

function targetPercent() {
  if (targetChoice === 'custom') return Number($('target').value) || 3;
  return Number(targetChoice);
}

// ---- calculate ----
form.addEventListener('submit', (e) => {
  e.preventDefault();
  calculate();
});

function recalcIfVisible() {
  if (!results.hidden) calculate();
}

function calculate() {
  const volts = Number($('voltage').value);
  const amps = Number($('current').value);
  if (!volts || !amps) return;

  if (mode === 'drop') {
    const feet = Number($('distance').value);
    if (!feet) return;
    const idx = Number(awgSelect.value);
    const [label, cm] = WIRE_TABLE[idx];
    const vd = dropVolts(cm, amps, feet);
    const pct = (vd / volts) * 100;
    renderDrop({ label, cm, volts, amps, feet, vd, pct });
  } else if (mode === 'size') {
    const feet = Number($('distance').value);
    if (!feet) return;
    const maxPct = targetPercent();
    const maxVd = (maxPct / 100) * volts;
    let found = null;
    for (let i = 0; i < WIRE_TABLE.length; i++) {
      const [label, cm] = WIRE_TABLE[i];
      const vd = dropVolts(cm, amps, feet);
      if (vd <= maxVd) { found = { label, cm, vd, i }; break; }
    }
    renderSize({ found, volts, amps, feet, maxPct, maxVd });
  } else {
    const idx = Number(awgSelect.value);
    const [label, cm] = WIRE_TABLE[idx];
    const maxPct = targetPercent();
    const maxVd = (maxPct / 100) * volts;
    // Solve Vd = mult·K·I·L/CM for L
    const feet = (maxVd * cm) / (SYSTEMS[system].mult * K_FACTOR[material] * amps);
    renderLength({ label, cm, volts, amps, maxPct, maxVd, feet });
  }
}

// ---- verdict helpers ----
function verdictFor(pct) {
  if (pct <= 3) return { cls: 'good', badge: 'correcto', note: 'Dentro de la recomendación de 3%. Este recorrido debería funcionar bien.' };
  if (pct <= 5) return { cls: 'warn', badge: 'precaución', note: 'Supera la recomendación de 3%, pero está dentro del límite exterior de 5%. Puede ser aceptable para algunas cargas; considere un calibre del conductor mayor para motores, cargadores o circuitos de servicio prolongado.' };
  return { cls: 'bad', badge: 'demasiado mucho', note: 'Supera el límite exterior de 5%. Espere problemas reales de funcionamiento: use un calibre del conductor mayor, acorte el recorrido o aumente la tensión.' };
}

const fmt = (n, d = 2) => {
  const r = Number(n.toFixed(d));
  return r.toLocaleString('en-US', { maximumFractionDigits: d });
};

// ---- renderers ----
function showResults(v, bigNumber, bigLabel, cells, note, math) {
  const verdict = $('verdict');
  verdict.className = 'verdict ' + v.cls;
  $('verdict-badge').textContent = v.badge;
  $('big-number').textContent = bigNumber;
  $('big-label').textContent = bigLabel;
  $('result-grid').innerHTML = cells
    .map(([k, val]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${val}</div></div>`)
    .join('');
  $('verdict-note').textContent = note;
  $('math-body').innerHTML = math;
  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mathIntro() {
  return vdFormat(
    system === 'ac3' ? DROP_TEXT.mathIntroThreePhase : DROP_TEXT.mathIntroRoundTrip,
    {
      mult: SYSTEMS[system].multLabel,
      factor: K_FACTOR[material],
      material: MATERIAL_NAME[material],
    },
  );
}

function renderDrop({ label, cm, volts, amps, feet, vd, pct }) {
  const v = verdictFor(pct);
  const endV = volts - vd;
  showResults(
    v,
    vdFormat(DROP_TEXT.percent, { percent: fmt(pct) }),
    vdFormat(DROP_TEXT.dropLabel, { size: label, material: MATERIAL_NAME[material] }),
    [
      ['voltios perdida en el conductor', vdFormat(DROP_TEXT.volts, { volts: fmt(vd) })],
      ['tensión a el carga', vdFormat(DROP_TEXT.volts, { volts: fmt(endV) })],
      ['inicio con', vdFormat(DROP_TEXT.volts, { volts: fmt(volts) })],
      ['Referencias', '3% correcto · 5% máximo'],
    ],
    v.note,
    [mathIntro(), vdFormat(DROP_TEXT.dropMath, {
      size: label,
      cm: cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor: K_FACTOR[material],
      amps: fmt(amps),
      feet: fmt(feet, 1),
      dropped: fmt(vd, 3),
      source: fmt(volts),
      percent: fmt(pct),
      endVolts: fmt(endV),
    })].join('')
  );
}

function renderSize({ found, volts, amps, feet, maxPct, maxVd }) {
  if (!found) {
    showResults(
      { cls: 'bad', badge: 'NO HAY CALIBRE', note: 'Ningún conductor de la tabla mantiene la caída por debajo de su límite. Opciones: acorte el recorrido, aumente la tensión, permita una caída mayor o use conductores en paralelo; consulte a un electricista.' },
      '—',
      vdFormat(DROP_TEXT.noFitLabel, { percent: maxPct }),
      [
        ['Su límite', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
        ['mayor calibre verificado', WIRE_TABLE[WIRE_TABLE.length - 1][0]],
      ],
      vdFormat(DROP_TEXT.noFitNote, {
        size: WIRE_TABLE[WIRE_TABLE.length - 1][0],
        material: MATERIAL_NAME[material],
        percent: fmt(maxPct),
        feet: fmt(feet, 1),
        amps: fmt(amps),
      }),
      [mathIntro(), vdFormat(DROP_TEXT.noFitMath, {
        maxDrop: fmt(maxVd, 3),
        percent: fmt(maxPct),
        source: fmt(volts),
      })].join('')
    );
    return;
  }
  const pct = (found.vd / volts) * 100;
  const v = verdictFor(pct);
  showResults(
    v,
    found.label,
    vdFormat(DROP_TEXT.smallestWireLabel, {
      material: MATERIAL_NAME[material],
      percent: fmt(maxPct),
    }),
    [
      ['caída real con este calibre', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(pct), volts: fmt(found.vd) })],
      ['tensión a el carga', vdFormat(DROP_TEXT.volts, { volts: fmt(volts - found.vd) })],
      ['Su límite', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['Referencias', '3% correcto · 5% máximo'],
    ],
    vdFormat(DROP_TEXT.ampacityWarning, { amps: fmt(amps) }),
    [mathIntro(), vdFormat(DROP_TEXT.sizeMath, {
      percent: fmt(maxPct),
      maxDrop: fmt(maxVd, 3),
      size: found.label,
      cm: found.cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor: K_FACTOR[material],
      amps: fmt(amps),
      feet: fmt(feet, 1),
      dropped: fmt(found.vd, 3),
      actualPercent: fmt(pct),
    })].join('')
  );
}

function renderLength({ label, cm, volts, amps, maxPct, maxVd, feet }) {
  const v = maxPct <= 3
    ? { cls: 'good', badge: 'máximo recorrido', note: '' }
    : maxPct <= 5
      ? { cls: 'warn', badge: 'máximo recorrido', note: '' }
      : { cls: 'bad', badge: 'máximo recorrido', note: '' };
  v.note = vdFormat(DROP_TEXT.maxDistanceNote, {
    percent: fmt(maxPct),
    amps: fmt(amps),
  });
  showResults(
    v,
    vdFormat(DROP_TEXT.feet, { feet: fmt(feet, 0) }),
    vdFormat(DROP_TEXT.maxRunLabel, {
      size: label,
      material: MATERIAL_NAME[material],
      percent: fmt(maxPct),
    }),
    [
      ['caída a que distancia', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['tensión a el carga', vdFormat(DROP_TEXT.volts, { volts: fmt(volts - maxVd) })],
      ['Corriente', vdFormat(DROP_TEXT.amps, { amps: fmt(amps) })],
      ['Referencias', '3% correcto · 5% máximo'],
    ],
    v.note,
    [mathIntro(), vdFormat(DROP_TEXT.maxRunMath, {
      percent: fmt(maxPct),
      maxDrop: fmt(maxVd, 3),
      cm: cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor: K_FACTOR[material],
      amps: fmt(amps),
      feet: fmt(feet, 1),
    })].join('')
  );
}
