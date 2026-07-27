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
  needAtLeast: '至少 {size}',
  dropAtSize: '{size} 上电压降 {volts} V（{percent}%）',
  allowanceLabel: '您的 {percent}% 目标相当于 {volts} V',
  colCurrentUsed: '所用电流',
  colAllowance: '允许电压降',
  colActualDrop: '实际电压降',
  colActualPercent: '实际 %',
  colRequiredCm: '所需面积',
  colSize: '线径',
  colLargestListed: '表中最大',
  circularMils: '{cm} cmil',
  badgeSized: '已定线径',
  badgeOutOfRange: '超出范围',
  badgeCheck: '需检查',
  outOfRangeLabel: '表中没有足够大的导体',
  needInputs: '请输入电流和单程距离。',
  // Scenario labels, hints and the reason each target is what it is.
  voltsLabelPv: '阵列工作电压（Vmp）',
  voltsLabelController: '电池组标称电压',
  voltsLabelBattery: '您允许的最低电池电压',
  voltsHintPv: '请使用组件规格书上的阵列 Vmp，而不是开路电压 Voc。',
  voltsHintController: '电池组的标称电压：12、24 或 48 V。',
  voltsHintBattery: '请使用低压切断值，而不是标称的 12/24/48 V。电池组电压最低时，电压降最严重。',
  ampsLabelPv: '阵列工作电流（Imp）',
  ampsLabelController: '控制器最大输出电流',
  ampsLabelBattery: '最大持续直流输入电流',
  ampsHintPv: '规格书上的 Imp。并联的组串需相加。',
  ampsHintController: '见控制器标签：其输出额定值，而不是组件的额定值。',
  ampsHintBattery: '见逆变器规格书，或展开下方的助手，我们来推算。',
  targetHintPv: '在组件回路上损失是持续的，因此这是贯穿系统整个寿命的发电量损失。',
  targetHintController: '这里的电压降会让控制器读到比实际更低的电池电压，可能过早结束充电周期。',
  targetHintBattery: '三者中最严格的：这里的电压降既是损失的功率，也是损失的切断余量，因此电缆压降过大可能在电池组仍有电量时就让逆变器停机。',
  // Cautions.
  cautionAmpacity: '这是电压降所要求的线径。它不是载流量结果：本工具没有检查导体能否承载该电流，没有做温度校正，也没有应用光伏容量系数。请另行检查载流量，并采用两者中较大的线径。',
  cautionBatteryFault: '带电池的系统可能产生极高的故障电流。请使用额定值合适的过流保护和隔离装置，并按电池及设备制造商的说明安装到位。',
  cautionOutOfRange: '表中没有导体足以满足此目标。请缩短线路、提高系统电压、放宽目标，或采用并联导体 — 并联线路有其自身的规则，本工具不作检查。',
  cautionParallel: '作为参考，用表中最大线径达到此目标大约需要 {count} 根并联。',
  cautionAcOutput: '逆变器交流输出的线径是另一个计算。请使用电压降计算器，它支持单相和三相。',
  cautionTargetUnsourced: '预填的目标是常用的起点，既不是规范要求，也不是溯源到某项标准的数值。请设定您的设计所需的数值。',
  // Math.
  mathIntro: '直流回路在去和回的路径上都会损失电压，因此电压降按单程距离的两倍计算。',
  mathFormula: '所需 cmil = 2 × K × A × ft ÷ 允许伏数',
  mathConstants: '{material}的 K = {k}。您的允许值是 {volts} V 的 {percent}%，即 {allowed} V。这需要 {cm} cmil，因此表中可用的最小导体是 {size}。',
  mathConstantsOutOfRange: '{material}的 K = {k}。您的允许值是 {volts} V 的 {percent}%，即 {allowed} V。这需要 {cm} cmil，超过表中最大的导体 {largest}，因此没有单根导体的解决方案。',
  mathCurrentDerived: '由逆变器推算的电流：{watts} W ÷（{efficiency} × {volts} V）= {amps} A。',
  materialCopper: '铜',
  materialAluminum: '铝',
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
