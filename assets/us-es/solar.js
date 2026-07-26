/* VoltDrop — Solar & Battery Wire Size (DC circuits)

   WHY THIS IS A SEPARATE TOOL and not a preset on the voltage-drop calculator:
   the 3%/5% figures everywhere else are a house-wiring convention. Solar practice
   is tighter, and — more importantly — the CURRENT is worked out differently in
   each scenario. Getting that wrong is the whole ballgame, so the tool asks for
   the right number for the circuit you picked rather than one "amps" box:

     - Panel circuit: the array's operating current (Imp), at its operating
       voltage (Vmp). A panel behaves much more like a current source than a
       constant-power load.
     - Charge controller to battery: the controller's maximum OUTPUT current.
     - Battery to inverter: the maximum continuous DC input current. Working it
       out from nominal battery voltage UNDERSTATES it, because the current rises
       as the bank sags — so the derivation uses the low-voltage cutout and the
       inverter's efficiency, not the nominal 12/24/48 V.

   NO AC HERE. An inverter's AC output is a different calculation (single- or
   three-phase, its own multiplier) and it belongs to the existing voltage-drop
   calculator. This tool sends people there rather than pretending a DC engine
   answers it.

   VOLTAGE DROP ONLY. It does not size overcurrent protection, does not apply the
   PV sizing factors, does not evaluate temperature, and NEVER reports an
   "ampacity-driven size" — a base-table lookup is not an ampacity design, and
   claiming otherwise would be worse than saying nothing. */

/* Sealed copy of the canonical table in app.js. build.mjs refuses to generate a
   page if this drifts from app.js (deep and positional), and verify.mjs
   fingerprints it. Never edit one copy alone. */
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

/* Sealed copy of app.js K_FACTOR, multi-line so the tripwire regex binds here. */
const K_FACTOR = {
  cu: 12.9,
  al: 21.2,
};

/* ------------------------------------------------------------------ engine --
   Pure functions, no DOM, above the marker so verify.mjs can call them in the
   page. Same K-factor arithmetic as every other tool here: a DC circuit's drop
   is 2 × K × I × one-way feet ÷ circular mils. */

/* Battery-to-inverter current. The honest derivation, not W ÷ nominal volts:
     I = watts ÷ (efficiency × the LOWEST voltage the bank will reach)
   Using nominal voltage understates the current, because a 3000 W inverter still
   has to deliver 3000 W when the bank has sagged to its cutout — so it pulls
   MORE current exactly when the cable can least afford it. */
function inverterCurrent(watts, efficiency, minimumVolts) {
  const w = Number(watts);
  const eff = Number(efficiency);
  const v = Number(minimumVolts);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (!Number.isFinite(eff) || eff <= 0 || eff > 1) return null;
  if (!Number.isFinite(v) || v <= 0) return null;
  return w / (eff * v);
}

/* Circular mils needed to keep the drop inside an allowance. */
function requiredCircularMils(k, amps, feetOneWay, allowedVolts) {
  if (!(allowedVolts > 0)) return Infinity;
  return (2 * k * amps * feetOneWay) / allowedVolts;
}

function dropVolts(k, amps, feetOneWay, circularMils) {
  return (2 * k * amps * feetOneWay) / circularMils;
}

/* Smallest listed conductor that meets the requirement — or an explicit
   OUT OF RANGE. Long low-voltage DC runs genuinely need more copper than the
   table holds, and silently handing back 500 kcmil as though it were the answer
   would be a wrong number dressed as a result. */
function smallestWire(requiredCm) {
  if (!Number.isFinite(requiredCm)) return { outOfRange: true, requiredCm };
  for (let index = 0; index < WIRE_TABLE.length; index++) {
    if (WIRE_TABLE[index][1] >= requiredCm) {
      return { outOfRange: false, index, label: WIRE_TABLE[index][0], cm: WIRE_TABLE[index][1] };
    }
  }
  return { outOfRange: true, requiredCm, largest: WIRE_TABLE.at(-1) };
}

/* One call the UI can render directly. Returns the current actually used, the
   size the DROP demands, and nothing at all about ampacity. */
function sizeForDrop({ k, amps, feetOneWay, systemVolts, targetPercent }) {
  const allowedVolts = (systemVolts * targetPercent) / 100;
  const requiredCm = requiredCircularMils(k, amps, feetOneWay, allowedVolts);
  const wire = smallestWire(requiredCm);
  return {
    amps,
    allowedVolts,
    requiredCm,
    wire,
    actualDropVolts: wire.outOfRange ? null : dropVolts(k, amps, feetOneWay, wire.cm),
    actualDropPercent: wire.outOfRange
      ? null
      : (dropVolts(k, amps, feetOneWay, wire.cm) / systemVolts) * 100,
    /* How many of the largest listed conductor it would take, so an out-of-range
       answer still tells the installer something useful instead of stopping dead.
       Parallel conductors have their own rules this tool does not check. */
    parallelLargest: wire.outOfRange && Number.isFinite(requiredCm)
      ? Math.ceil(requiredCm / WIRE_TABLE.at(-1)[1])
      : null,
  };
}

/* ===== END OF PURE ENGINE — everything below this line touches the DOM =====
   tools/solar-engine-tests.mjs splits this file on the line above so the engine
   can be tested in node with no browser, and fails loudly if the marker goes
   missing. This is a contract, not a comment. */

/* Result copy. Every string here is display text and is registered in
   i18n/runtime-map.json. Nothing here may be an element id, selector, dataset key
   or event name — those are program wiring and must never enter the catalog. */
const SOL_TEXT = {
  volts: '{volts} V',
  amps: '{amps} A',
  feet: '{feet} ft',
  percent: '{percent}%',
  needAtLeast: 'al menos {size}',
  dropAtSize: '{volts} V de caída ({percent}%) en {size}',
  allowanceLabel: 'su objetivo del {percent}% son {volts} V',
  colCurrentUsed: 'Corriente usada',
  colAllowance: 'Caída permitida',
  colActualDrop: 'Caída real',
  colActualPercent: '% real',
  colRequiredCm: 'Área necesaria',
  colSize: 'Calibre',
  colLargestListed: 'Mayor de la lista',
  circularMils: '{cm} cmil',
  badgeSized: 'CALIBRE',
  badgeOutOfRange: 'FUERA DE RANGO',
  badgeCheck: 'REVISAR',
  outOfRangeLabel: 'ningún conductor de la lista es lo bastante grande',
  needInputs: 'Introduzca una corriente y una distancia en un solo sentido.',
  // Scenario labels, hints and the reason each target is what it is.
  voltsLabelPv: 'Tensión de operación del generador (Vmp)',
  voltsLabelController: 'Tensión nominal del banco de baterías',
  voltsLabelBattery: 'Tensión mínima de batería que permitirá',
  voltsHintPv: 'Use la Vmp del generador de la ficha técnica del panel, no la Voc de circuito abierto.',
  voltsHintController: 'La tensión nominal del banco: 12, 24 o 48 V.',
  voltsHintBattery: 'Use el corte por baja tensión, no los 12/24/48 V nominales. La caída es peor justo cuando el banco está más bajo.',
  ampsLabelPv: 'Corriente de operación del generador (Imp)',
  ampsLabelController: 'Corriente máxima de salida del controlador',
  ampsLabelBattery: 'Corriente continua máxima de entrada en CC',
  ampsHintPv: 'La Imp de la ficha técnica. Sume las cadenas en paralelo.',
  ampsHintController: 'De la etiqueta del controlador: su valor de salida, no el de los paneles.',
  ampsHintBattery: 'De la ficha técnica del inversor, o abra la ayuda de abajo y lo calculamos.',
  targetHintPv: 'En un circuito de paneles la pérdida es continua, así que es producción perdida durante toda la vida del sistema.',
  targetHintController: 'Aquí la caída hace que el controlador lea una tensión de batería menor que la real, lo que puede terminar antes de tiempo un ciclo de carga.',
  targetHintBattery: 'El más estricto de los tres: aquí la caída es potencia perdida Y margen de corte perdido, así que un cable que se hunde puede apagar el inversor mientras el banco todavía tiene carga.',
  // Cautions.
  cautionAmpacity: 'Este es el calibre que exige la caída de tensión. NO es un resultado de ampacidad: esta herramienta no ha comprobado que el conductor pueda conducir la corriente, no ha aplicado corrección por temperatura y no ha aplicado factores de dimensionamiento PV. Compruebe la ampacidad por separado y use el calibre mayor de los dos.',
  cautionBatteryFault: 'Los sistemas con baterías pueden entregar corrientes de falla muy elevadas. Use protección contra sobrecorriente y medios de desconexión con valores adecuados, colocados según las instrucciones del fabricante de la batería y del equipo.',
  cautionOutOfRange: 'Ningún conductor de la tabla es lo bastante grande para este objetivo. Acorte el recorrido, suba la tensión del sistema, relaje el objetivo o use conductores en paralelo; los recorridos en paralelo tienen sus propias reglas que esta herramienta no comprueba.',
  cautionParallel: 'Como referencia, cumplir este objetivo con el calibre mayor de la lista requeriría unos {count} en paralelo.',
  cautionAcOutput: 'Dimensionar la salida en corriente alterna del inversor es otro cálculo. Use la calculadora de caída de tensión para eso: admite monofásico y trifásico.',
  cautionTargetUnsourced: 'El objetivo que aparece es un punto de partida habitual, no un requisito normativo ni una cifra trazada a una norma. Fije el número que exija su diseño.',
  // Math.
  mathIntro: 'Un circuito de corriente continua pierde tensión a la ida y a la vuelta, así que la caída se calcula sobre el doble de la distancia en un solo sentido.',
  mathFormula: 'cmil necesarios = 2 × K × A × ft ÷ voltios permitidos',
  mathConstants: 'K = {k} para {material}. Su margen es el {percent}% de {volts} V, es decir {allowed} V. Eso requiere {cm} cmil, así que el conductor más pequeño de la lista que sirve es {size}.',
  mathConstantsOutOfRange: 'K = {k} para {material}. Su margen es el {percent}% de {volts} V, es decir {allowed} V. Eso requiere {cm} cmil, más que {largest}, el conductor mayor de la tabla, así que no hay solución con un solo conductor.',
  mathCurrentDerived: 'Corriente calculada a partir del inversor: {watts} W ÷ ({efficiency} × {volts} V) = {amps} A.',
  materialCopper: 'cobre',
  materialAluminum: 'aluminio',
};

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

// Design targets are data, not code constants: see i18n/solar-drop-targets.json.
// build.mjs inlines the defaults so the page needs no fetch.
const SCENARIO_DEFAULT_PERCENT = { pv: 2, controller: 2, battery: 1 };

let material = 'cu';
let scenario = 'pv';
let derivedNote = null;

/* Explicit per-scenario copy rather than building catalog keys out of strings.
   A built key fails silently when a name changes; this fails loudly. It also
   keeps every catalog reference greppable. */
const SCENARIO_COPY = {
  pv: {
    voltsLabel: SOL_TEXT.voltsLabelPv, voltsHint: SOL_TEXT.voltsHintPv,
    ampsLabel: SOL_TEXT.ampsLabelPv, ampsHint: SOL_TEXT.ampsHintPv,
    targetHint: SOL_TEXT.targetHintPv, defaultVolts: '48',
  },
  controller: {
    voltsLabel: SOL_TEXT.voltsLabelController, voltsHint: SOL_TEXT.voltsHintController,
    ampsLabel: SOL_TEXT.ampsLabelController, ampsHint: SOL_TEXT.ampsHintController,
    targetHint: SOL_TEXT.targetHintController, defaultVolts: '12',
  },
  battery: {
    voltsLabel: SOL_TEXT.voltsLabelBattery, voltsHint: SOL_TEXT.voltsHintBattery,
    ampsLabel: SOL_TEXT.ampsLabelBattery, ampsHint: SOL_TEXT.ampsHintBattery,
    targetHint: SOL_TEXT.targetHintBattery, defaultVolts: '10.5',
  },
};

function refreshScenarioUi() {
  const copy = SCENARIO_COPY[scenario];
  $('sol-volts-label').textContent = copy.voltsLabel;
  $('sol-volts-hint').textContent = copy.voltsHint;
  $('sol-amps-label').textContent = copy.ampsLabel;
  $('sol-amps-hint').textContent = copy.ampsHint;
  $('sol-target-hint').textContent = copy.targetHint;
  $('sol-target').value = String(SCENARIO_DEFAULT_PERCENT[scenario]);
  // The inverter helper only makes sense for the battery-to-inverter circuit.
  $('sol-helper').hidden = scenario !== 'battery';
  $('sol-volts').value = copy.defaultVolts;
}

document.querySelectorAll('.scenario-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.scenario-btn').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    scenario = button.dataset.scenario;
    derivedNote = null;
    refreshScenarioUi();
    if (!$('results').hidden) calc();
  });
});

document.querySelectorAll('.seg-btn').forEach((button) => {
  button.addEventListener('click', () => {
    button.parentElement.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    material = button.dataset.material;
    if (!$('results').hidden) calc();
  });
});

// The helper FILLS the current field rather than being a second engine, so there
// is one input model and the installer can override what it worked out.
$('sol-helper-apply').addEventListener('click', () => {
  const watts = Number($('sol-inv-watts').value);
  const efficiency = Number($('sol-inv-eff').value);
  const minimumVolts = Number($('sol-inv-min').value);
  const amps = inverterCurrent(watts, efficiency, minimumVolts);
  if (amps === null) return;
  $('sol-amps').value = amps.toFixed(1);
  $('sol-volts').value = String(minimumVolts);
  derivedNote = { watts, efficiency, minimumVolts, amps };
  calc();
});

$('sol-form').addEventListener('submit', (event) => { event.preventDefault(); calc(); });

function caution(text, stop = false) {
  return el('p', stop ? 'sol-caution is-stop' : 'sol-caution', text);
}

function calc() {
  const amps = Number($('sol-amps').value);
  const feetOneWay = Number($('sol-feet').value);
  const systemVolts = Number($('sol-volts').value);
  const targetPercent = Number($('sol-target').value);
  const results = $('results');
  const cautions = $('sol-cautions');
  const grid = $('result-grid');

  if (!(amps > 0) || !(feetOneWay >= 0) || !(systemVolts > 0) || !(targetPercent > 0)) {
    $('verdict-badge').textContent = SOL_TEXT.badgeCheck;
    $('big-number').textContent = '';
    $('big-label').textContent = SOL_TEXT.needInputs;
    [grid, cautions].forEach(clear);
    clear($('math-body'));
    results.hidden = false;
    return;
  }

  const k = K_FACTOR[material];
  const sized = sizeForDrop({ k, amps, feetOneWay, systemVolts, targetPercent });

  if (sized.wire.outOfRange) {
    $('verdict-badge').textContent = SOL_TEXT.badgeOutOfRange;
    $('big-number').textContent = vdFormat(SOL_TEXT.circularMils, { cm: Math.ceil(sized.requiredCm).toLocaleString() });
    $('big-label').textContent = SOL_TEXT.outOfRangeLabel;
  } else {
    $('verdict-badge').textContent = SOL_TEXT.badgeSized;
    $('big-number').textContent = vdFormat(SOL_TEXT.needAtLeast, { size: sized.wire.label });
    $('big-label').textContent = vdFormat(SOL_TEXT.allowanceLabel, {
      percent: String(targetPercent), volts: sized.allowedVolts.toFixed(2),
    });
  }

  const cells = [
    [SOL_TEXT.colCurrentUsed, vdFormat(SOL_TEXT.amps, { amps: amps.toFixed(1) })],
    [SOL_TEXT.colAllowance, vdFormat(SOL_TEXT.volts, { volts: sized.allowedVolts.toFixed(2) })],
    [SOL_TEXT.colRequiredCm, vdFormat(SOL_TEXT.circularMils, { cm: Math.ceil(sized.requiredCm).toLocaleString() })],
  ];
  if (sized.wire.outOfRange) {
    cells.push([SOL_TEXT.colLargestListed, WIRE_TABLE.at(-1)[0]]);
  } else {
    cells.push([SOL_TEXT.colSize, sized.wire.label]);
    cells.push([SOL_TEXT.colActualDrop, vdFormat(SOL_TEXT.volts, { volts: sized.actualDropVolts.toFixed(2) })]);
    cells.push([SOL_TEXT.colActualPercent, vdFormat(SOL_TEXT.percent, { percent: sized.actualDropPercent.toFixed(2) })]);
  }
  clear(grid);
  for (const [key, value] of cells) {
    const cell = el('div', 'result-cell');
    cell.appendChild(el('div', 'k', key));
    cell.appendChild(el('div', 'v', value));
    grid.appendChild(cell);
  }

  const notes = [];
  if (sized.wire.outOfRange) {
    notes.push(caution(SOL_TEXT.cautionOutOfRange, true));
    if (sized.parallelLargest) {
      notes.push(caution(vdFormat(SOL_TEXT.cautionParallel, { count: String(sized.parallelLargest) })));
    }
  }
  // Never let a drop answer read as an ampacity answer.
  notes.push(caution(SOL_TEXT.cautionAmpacity, true));
  if (scenario === 'battery') notes.push(caution(SOL_TEXT.cautionBatteryFault, true));
  notes.push(caution(SOL_TEXT.cautionTargetUnsourced));
  notes.push(caution(SOL_TEXT.cautionAcOutput));
  clear(cautions);
  for (const note of notes) cautions.appendChild(note);

  const math = $('math-body');
  clear(math);
  math.appendChild(el('p', undefined, SOL_TEXT.mathIntro));
  math.appendChild(el('div', 'formula', SOL_TEXT.mathFormula));
  if (derivedNote) {
    math.appendChild(el('p', undefined, vdFormat(SOL_TEXT.mathCurrentDerived, {
      watts: String(derivedNote.watts),
      efficiency: String(derivedNote.efficiency),
      volts: String(derivedNote.minimumVolts),
      amps: derivedNote.amps.toFixed(1),
    })));
  }
  const mathValues = {
    k: String(k),
    material: material === 'cu' ? SOL_TEXT.materialCopper : SOL_TEXT.materialAluminum,
    percent: String(targetPercent),
    volts: String(systemVolts),
    allowed: sized.allowedVolts.toFixed(2),
    cm: Math.ceil(sized.requiredCm).toLocaleString(),
  };
  math.appendChild(el('p', undefined, sized.wire.outOfRange
    ? vdFormat(SOL_TEXT.mathConstantsOutOfRange, { ...mathValues, largest: WIRE_TABLE.at(-1)[0] })
    : vdFormat(SOL_TEXT.mathConstants, { ...mathValues, size: sized.wire.label })));

  results.hidden = false;
}

refreshScenarioUi();
window.addEventListener('vd:country', () => { if (!$('results').hidden) calc(); });
