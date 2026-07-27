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
const MATERIAL_NAME = { cu: '铜', al: '铝' };

const SYSTEMS = {
  dc:  { mult: 2,     multLabel: '2',  name: 'DC',
         hint: 'DC:电池,太阳能,车辆, LED灯带.' },
  ac1: { mult: 2,     multLabel: '2',  name: 'AC单相',
         hint: '单相: normal household和light commercial电路.' },
  ac3: { mult: 1.732, multLabel: '√3 (1.732)', name: 'AC三相',
         hint: '三相: commercial和industrial.电压是线电压.' },
};
const DROP_TEXT = {
  volts: '{volts} V',
  amps: '{amps} A',
  percent: '{percent}%',
  dropLabel: '{size} {material}线的电压降',
  limit: '{percent}% = {volts} V',
  actualDrop: '{percent}%（{volts} V）',
  noFitLabel: '没有任何所列规格可将电压降控制在{percent}%以下',
  noFitNote: '即使使用{size} {material}线，在{feet}英尺单程距离（仅去程）和{amps} A条件下，电压降仍超过{percent}%。',
  smallestWireLabel: '可将电压降控制在{percent}%以下的最小{material}线规格',
  maxDistanceNote: '在此距离下，电压降正好达到{percent}%。请缩短线路以保留余量。还要注意：无论距离多短，导线都必须具有承载{amps} A的额定载流量。',
  feet: '{feet} ft',
  maxRunLabel: '{size} {material}线在{percent}%电压降下的最大单程线路长度',
  mathIntroRoundTrip: '<p>我们使用电工常用的标准K系数公式：</p>\n<div class="formula">电压降 = {mult} × K × 安培 × 单程英尺 ÷ circular mils</div>\n<p><strong>{mult}</strong>计入往返距离：电流流出后还要返回，因此导线路径是单程距离（仅去程）的两倍。<strong>K = {factor}</strong>是{material}在75°C时的电阻常数（ohm·cmil/ft）。<strong>Circular mils</strong>是导线横截面积。</p>',
  mathIntroThreePhase: '<p>我们使用电工常用的标准K系数公式：</p>\n<div class="formula">电压降 = {mult} × K × 安培 × 单程英尺 ÷ circular mils</div>\n<p><strong>{mult}</strong>计入三相几何关系。<strong>K = {factor}</strong>是{material}在75°C时的电阻常数（ohm·cmil/ft）。<strong>Circular mils</strong>是导线横截面积。</p>',
  dropMath: '\n<p>代入您的数值（{size} = {cm} circular mils）：</p>\n<div class="formula">{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= 电压降{dropped}伏\n÷ {source} V电源电压 = {percent}%</div>\n<p>负载端电压：{source} − {dropped} = <strong>{endVolts} V</strong>。</p>',
  noFitMath: '<p>我们从最小规格到最大规格逐一检查；没有任何规格的电压降≤{maxDrop} V（{source} V的{percent}%）。</p>',
  sizeMath: '\n<p>我们从最小规格开始逐一检查，直到找到可将电压降控制在{percent}%限值（{maxDrop} V）以下的规格：</p>\n<div class="formula">{size}（{cm} cmil）：\n{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} V = {actualPercent}%  ✓ 低于您的限值</div>',
  governingLabel: '最终导线 — 由{constraint}决定',
  notPermittedNote: '已发布的环境温度表将 {ambient}°C 环境温度与 {insulation}°C 绝缘组合标为“—”，或该组合超出支持的表格行。本工具不会替代校正系数，也不会返回导线规格。',
  outOfRangeNote: '没有任何列出的导线能同时通过两项检查。电压降搜索得到：{dropStatus}；载流量搜索得到：{ampacityStatus}。请更改设计，或由合格电工评估本工具范围以外的导线或布置。',
  distanceRaisedOne: '距离使导线从 {ampacitySize} 增大到 {finalSize} — 增大一个列出规格。',
  distanceRaisedMany: '距离使导线从 {ampacitySize} 增大到 {finalSize} — 增大 {count} 个列出规格。',
  ampacityRaised: '距离没有提高导线规格：移动零个已列规格。载流量要求把仅按距离可用的 {dropSize} 增大到 {finalSize}。',
  constraintsTie: '距离没有把导线提高到载流量要求以上：移动零个已列规格。两项约束都选择 {finalSize}；这是正常的相同结果。',
  ampacityHeadroom: '{amps} A',
  voltageHeadroom: '{percent} 个百分点',
  degrees: '{degrees}°C',
  atMostDegrees: '≤{max}°C',
  degreeRange: '{min}–{max}°C',
  ampacityChain: '<h3>载流量决定的最小规格：{size}</h3>\n<div class="formula">基础载流量（{insulation}°C 绝缘）：{base} A\n→ 环境温度校正（{ambient}°C；采用 {ambientRow} 行）：× {ambientFactor} = {ambientAdjusted} A\n→ {conductors} 根载流导体：× {adjustmentFactor} = {adjusted} A\n→ 端子限值（{termination}°C）：{terminationLimit} A\n→ 小导体上限：{smallCap}\n= 最终允许载流量：{permitted} A</div>\n<p><strong>起决定作用的限值：</strong>{binding}。</p>\n{continuousRule}',
  continuousRuleNote: '<strong>NEC 连续负载：按负载的 125% 计算。</strong>调整前：输入负载为 {load} A。调整后：{load} A × {factor}% = {after} A 所需载流量。此开关将全部输入负载视为连续负载；不计算混合负载。',
  continuousRuleMath: '<h3>连续负载步骤</h3>\n<div class="formula">输入负载：{load} A\n× {factor}%\n= {after} A 所需载流量\n{after} A ≤ {permitted} A 允许载流量 → 通过</div>\n<p>此开关将全部输入负载视为连续负载；不计算混合负载。</p>',
  ampacitySearchProof: '<p><strong>最小规格证明：</strong>{size} 通过。下一个更小的受支持规格 {smallerSize} 在所应用的负载规则下不能通过输入的 {load} A。</p>',
  ampacityFloorProof: '<p><strong>最小规格证明：</strong>{size} 通过，并且是此载流量表支持的最小{material}规格。计算引擎不会对更小规格作出判断。</p>',
  ampacityDomainNote: '<p><strong>表格范围不同：</strong>仅按电压降可使用 {dropSize}，但{material}载流量表从 {floorSize} 开始。因此不会把 {dropSize} 视为通过载流量检查。</p>',
  outOfRangeMath: '<p><strong>拒绝给出规格：</strong>{constraint}未找到合格的列出规格。本工具不会把最大的列出导线作为建议返回。</p>',
  maxRunMath: '\n<p>根据您的{percent}%限值（{maxDrop} V），我们将公式变形以求解距离：</p>\n<div class="formula">最大单程英尺 = {maxDrop} V × {cm} cmil\n             ÷（{mult} × {factor} × {amps} A）\n             = {feet} ft</div>',
};
const SIZE_TEXT = {
  governingBadge: '决定规格',
  notPermittedBadge: '不允许',
  outOfRangeBadge: '超出范围',
  ampacityUnavailable: '载流量表不允许此温度组合',
  noListedConductor: '列出的导线均不能同时满足两项限制',
  ampacityMinimum: '载流量最小规格',
  voltageDropMinimum: '电压降最小规格',
  ampacityHeadroom: '最终规格的载流量余量',
  voltageHeadroom: '最终规格的电压降余量',
  largestSizeChecked: '最大规格检查',
  notAvailable: '不可用',
  noPassingSize: '没有合格规格',
  distanceConstraint: '电压降（距离）',
  ampacityConstraint: '载流量（热量）',
  tieConstraint: '载流量与电压降相同',
  bindingDerating: '环境温度与导体数量降容',
  bindingTermination: '端子温度限值',
  bindingCap: '小导体上限',
  noncontinuousRuleApplied: '未应用连续负载调整。',
};

// Country editions live in common.js (window.VDCountry) — shared with the
// ampacity and conduit tools. Future countries (mm²/IEC) additionally swap
// WIRE_TABLE and units here.

// ---- state ----
let mode = 'drop';        // drop | size | length
let system = 'dc';
let material = 'cu';
let targetChoice = '3';   // '3' | '5' | 'custom'
let sizeInsulationTemp = 90;
let sizeContinuous = false;

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
      container.querySelectorAll('.seg-btn[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.classList.add('active');
      if (btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'true');
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
  else if ('sizeInsulation' in first.dataset) {
    wireSeg(seg, 'sizeInsulation', (v) => { sizeInsulationTemp = Number(v); recalcIfVisible(); });
  } else if ('sizeContinuous' in first.dataset) {
    wireSeg(seg, 'sizeContinuous', (v) => { sizeContinuous = v === 'yes'; recalcIfVisible(); });
  }
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
  const isSizeMode = mode === 'size';
  $('field-size').hidden = mode === 'size';
  $('field-distance').hidden = mode === 'length';
  $('field-target').hidden = mode === 'drop';
  $('size-ampacity-fields').hidden = !isSizeMode;
  $('size-safety-boundary').hidden = !isSizeMode;
  for (const id of ['size-termination', 'size-ambient', 'size-conductors']) {
    $(id).disabled = !isSizeMode;
  }
  $('distance').required = mode !== 'length';
  results.hidden = true;
  $('calc-btn').textContent = {
    drop: '计算电压降',
    size: '查找最小导线',
    length: '查找最大距离',
  }[mode];
}

// Each tool page (built by build.mjs) stamps its mode on <body data-mode>.
setMode(document.body.dataset.mode || 'drop');

// Keeping this independent of page state lets later tools reuse the electrical
// result without inheriting this page's controls or translated rendering.
function calculateVoltageDrop(
  calculationMode,
  selectedSystem,
  selectedMaterial,
  volts,
  amps,
  feet,
  wireIndex,
  maxPct,
  wireTable,
  kFactors,
  systems,
) {
  const systemData = systems[selectedSystem];
  const factor = kFactors[selectedMaterial];
  const calculationContext = {
    system: selectedSystem,
    material: selectedMaterial,
    mult: systemData.mult,
    factor,
  };
  const voltageDropFor = (cm) =>
    (systemData.mult * factor * amps * feet) / cm;

  if (calculationMode === 'drop') {
    const [label, cm] = wireTable[wireIndex];
    const vd = voltageDropFor(cm);
    const pct = (vd / volts) * 100;
    return {
      ...calculationContext,
      mode: calculationMode,
      label,
      cm,
      volts,
      amps,
      feet,
      vd,
      pct,
      endVolts: volts - vd,
      verdict: pct <= 3 ? 'good' : pct <= 5 ? 'warn' : 'bad',
    };
  }

  const maxVd = (maxPct / 100) * volts;
  if (calculationMode === 'size') {
    let found = null;
    for (let i = 0; i < wireTable.length; i++) {
      const [label, cm] = wireTable[i];
      const vd = voltageDropFor(cm);
      if (vd <= maxVd) {
        const pct = (vd / volts) * 100;
        found = {
          label,
          cm,
          vd,
          wireIndex: i,
          pct,
          endVolts: volts - vd,
          verdict: pct <= 3 ? 'good' : pct <= 5 ? 'warn' : 'bad',
        };
        break;
      }
    }
    return {
      ...calculationContext,
      mode: calculationMode,
      found,
      largestWire: {
        label: wireTable[wireTable.length - 1][0],
        cm: wireTable[wireTable.length - 1][1],
      },
      volts,
      amps,
      feet,
      maxPct,
      maxVd,
    };
  }

  const [label, cm] = wireTable[wireIndex];
  const maxFeet =
    (maxVd * cm) / (systemData.mult * factor * amps);
  return {
    ...calculationContext,
    mode: calculationMode,
    label,
    cm,
    volts,
    amps,
    maxPct,
    maxVd,
    feet: maxFeet,
    endVolts: volts - maxVd,
    verdict: maxPct <= 3 ? 'good' : maxPct <= 5 ? 'warn' : 'bad',
  };
}

// Search the verified ampacity domain smallest-first, then combine that answer
// with the unchanged voltage-drop size. Every table remains an explicit input
// so the search can be tested without the page or hidden global assumptions.
function calculateCombinedWireSize(
  country,
  selectedSystem,
  selectedMaterial,
  volts,
  amps,
  feet,
  maxPct,
  insulationTemp,
  terminationTemp,
  isContinuous,
  ambient,
  conductorCount,
  wireTable,
  kFactors,
  systems,
  ampacityTable,
  smallCapTable,
  ambientCorrectionTable,
  conductorAdjustmentTable,
  cecAmbientCorrectionTable,
  cecConductorAdjustmentTable,
  tempIndex,
  ampacityCalculator,
) {
  const voltageDrop = calculateVoltageDrop(
    'size',
    selectedSystem,
    selectedMaterial,
    volts,
    amps,
    feet,
    0,
    maxPct,
    wireTable,
    kFactors,
    systems,
  );
  const supported = wireTable
    .map(([label], wireIndex) => ({ label, wireIndex }))
    .filter(({ label }) => ampacityTable[selectedMaterial][label]);
  let previousSupported = null;
  let ampacityMinimum = null;

  for (const candidate of supported) {
    const result = ampacityCalculator(
      country,
      selectedMaterial,
      insulationTemp,
      terminationTemp,
      isContinuous,
      amps,
      ambient,
      conductorCount,
      candidate.label,
      ampacityTable,
      smallCapTable,
      ambientCorrectionTable,
      conductorAdjustmentTable,
      cecAmbientCorrectionTable,
      cecConductorAdjustmentTable,
      tempIndex,
    );
    const checked = { ...candidate, result };
    if (result.status === 'not-permitted') {
      return {
        status: 'not-permitted',
        voltageDrop,
        ampacityMinimum: null,
        ampacityRefusal: checked,
        supportedFloor: supported[0],
      };
    }
    if (result.passes) {
      ampacityMinimum = {
        ...checked,
        nextSmallerSupported: previousSupported,
        domainFloor: previousSupported === null,
      };
      break;
    }
    previousSupported = checked;
  }

  if (ampacityMinimum?.nextSmallerSupported?.result.passes) {
    throw new Error('Ampacity search invariant failed: next smaller supported size also passes.');
  }
  if (ampacityMinimum && !ampacityMinimum.result.passes) {
    throw new Error('Ampacity search invariant failed: chosen size does not pass.');
  }

  if (!voltageDrop.found || !ampacityMinimum) {
    return {
      status: 'out-of-range',
      voltageDrop,
      ampacityMinimum,
      lastAmpacityCheck: previousSupported,
      supportedFloor: supported[0],
      reason: !voltageDrop.found && !ampacityMinimum
        ? 'both'
        : !voltageDrop.found
          ? 'voltage-drop'
          : 'ampacity',
    };
  }

  const governingIndex = Math.max(voltageDrop.found.wireIndex, ampacityMinimum.wireIndex);
  const governing = voltageDrop.found.wireIndex === ampacityMinimum.wireIndex
    ? 'tie'
    : governingIndex === voltageDrop.found.wireIndex
      ? 'distance'
      : 'ampacity';
  const finalDrop = calculateVoltageDrop(
    'drop',
    selectedSystem,
    selectedMaterial,
    volts,
    amps,
    feet,
    governingIndex,
    null,
    wireTable,
    kFactors,
    systems,
  );
  const finalLabel = wireTable[governingIndex][0];
  const finalAmpacity = ampacityCalculator(
    country,
    selectedMaterial,
    insulationTemp,
    terminationTemp,
    isContinuous,
    amps,
    ambient,
    conductorCount,
    finalLabel,
    ampacityTable,
    smallCapTable,
    ambientCorrectionTable,
    conductorAdjustmentTable,
    cecAmbientCorrectionTable,
    cecConductorAdjustmentTable,
    tempIndex,
  );
  if (finalAmpacity.status !== 'ok' || !finalAmpacity.passes || finalDrop.pct > maxPct) {
    throw new Error('Combined sizing invariant failed: governing conductor does not pass both checks.');
  }

  // Express headroom as additional entered-load amps in both countries.
  // NEC raises the load side to 125%; CEC lowers the permitted side to 80%.
  const maximumEnteredLoad = !isContinuous
    ? finalAmpacity.permitted
    : country === 'ca'
      ? finalAmpacity.loadCheckValue
      : finalAmpacity.permitted / finalAmpacity.continuousFactor;
  const ampacityHeadroom = maximumEnteredLoad - amps;

  return {
    status: 'ok',
    country,
    voltageDrop,
    ampacityMinimum,
    supportedFloor: supported[0],
    governing,
    governingIndex,
    finalLabel,
    finalDrop,
    finalAmpacity,
    distanceSizeSteps: governingIndex - ampacityMinimum.wireIndex,
    ampacityHeadroom,
    voltageHeadroom: maxPct - finalDrop.pct,
  };
}

window.VDVoltageDrop = Object.freeze({
  calculateVoltageDrop,
  calculateCombinedWireSize,
  WIRE_TABLE,
  K_FACTOR,
  SYSTEMS,
});

function targetPercent() {
  if (targetChoice === 'custom') return Number($('target').value) || 3;
  return Number(targetChoice);
}

for (const id of ['size-termination', 'size-ambient', 'size-conductors']) {
  $(id).addEventListener('input', recalcIfVisible);
  $(id).addEventListener('change', recalcIfVisible);
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

  const feet = mode === 'length' ? null : Number($('distance').value);
  if (mode !== 'length' && !feet) return;

  if (mode === 'size') {
    const terminationTemp = Number($('size-termination').value);
    const ambient = Number($('size-ambient').value);
    const conductorCount = Number($('size-conductors').value);
    if (!terminationTemp
        || !Number.isFinite(ambient)
        || !Number.isInteger(conductorCount)
        || conductorCount < 1) return;
    if (!window.VDAmpacity) throw new Error('Ampacity engine is unavailable.');
    const amp = window.VDAmpacity;
    const combined = calculateCombinedWireSize(
      document.body.dataset.country === 'ca' ? 'ca' : 'us',
      system,
      material,
      volts,
      amps,
      feet,
      targetPercent(),
      sizeInsulationTemp,
      terminationTemp,
      sizeContinuous,
      ambient,
      conductorCount,
      WIRE_TABLE,
      K_FACTOR,
      SYSTEMS,
      amp.AMPACITY,
      amp.SMALL_CAP,
      amp.AMBIENT_CORRECTION,
      amp.CONDUCTOR_ADJUSTMENT,
      amp.CEC_AMBIENT_CORRECTION,
      amp.CEC_CONDUCTOR_ADJUSTMENT,
      amp.TEMP_INDEX,
      amp.calculateAmpacity,
    );
    window.VDLastWireSizeResult = combined;
    renderCombinedSize(combined, {
      system,
      material,
      factor: K_FACTOR[material],
      volts,
      amps,
      feet,
      maxPct: targetPercent(),
      insulationTemp: sizeInsulationTemp,
      terminationTemp,
      continuous: sizeContinuous,
      ambient,
      conductorCount,
    });
    return;
  }

  const result = calculateVoltageDrop(
    mode,
    system,
    material,
    volts,
    amps,
    feet,
    Number(awgSelect.value),
    mode === 'drop' ? null : targetPercent(),
    WIRE_TABLE,
    K_FACTOR,
    SYSTEMS,
  );

  if (result.mode === 'drop') renderDrop(result);
  else renderLength(result);
}

// ---- verdict helpers ----
function verdictFor(verdict) {
  if (verdict === 'good') return { cls: 'good', badge: '良好', note: '在3%的建议值内。此线路应能正常工作。' };
  if (verdict === 'warn') return { cls: 'warn', badge: '注意', note: '高于3%的建议值，但仍在5%的外部限值内。某些负载可能适用；对于电动机、充电器或长时间运行的电路，请考虑增大导线规格（线规）。' };
  return { cls: 'bad', badge: '过于很多', note: '超出5%的外部限值。可能出现明显性能问题：请增大导线规格（线规）、缩短线路或提高电压。' };
}

const fmt = (n, d = 2) => {
  const r = Number(n.toFixed(d));
  return r.toLocaleString('en-US', { maximumFractionDigits: d });
};

// ---- renderers ----
function showResults(v, bigNumber, bigLabel, cells, note, math, continuousRuleNote = '') {
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
  $('continuous-rule-note').innerHTML = continuousRuleNote;
  $('continuous-rule-note').hidden = !continuousRuleNote;
  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mathIntro({ system, material, factor }) {
  return vdFormat(
    system === 'ac3' ? DROP_TEXT.mathIntroThreePhase : DROP_TEXT.mathIntroRoundTrip,
    {
      mult: SYSTEMS[system].multLabel,
      factor,
      material: MATERIAL_NAME[material],
    },
  );
}

function renderDrop({
  system, material, factor,
  label, cm, volts, amps, feet, vd, pct, endVolts, verdict,
}) {
  const v = verdictFor(verdict);
  showResults(
    v,
    vdFormat(DROP_TEXT.percent, { percent: fmt(pct) }),
    vdFormat(DROP_TEXT.dropLabel, { size: label, material: MATERIAL_NAME[material] }),
    [
      ['伏特损失在导线', vdFormat(DROP_TEXT.volts, { volts: fmt(vd) })],
      ['电压在负载', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['起始使用', vdFormat(DROP_TEXT.volts, { volts: fmt(volts) })],
      ['参考限值', '3%良好· 5%最大'],
    ],
    v.note,
    [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.dropMath, {
      size: label,
      cm: cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor,
      amps: fmt(amps),
      feet: fmt(feet, 1),
      dropped: fmt(vd, 3),
      source: fmt(volts),
      percent: fmt(pct),
      endVolts: fmt(endVolts),
    })].join('')
  );
}

function ambientRowText(row) {
  if (row.kind === 'at-most') {
    return vdFormat(DROP_TEXT.atMostDegrees, { max: row.max });
  }
  if (row.kind === 'point') {
    return vdFormat(DROP_TEXT.degrees, { degrees: row.value });
  }
  if (row.kind === 'range') {
    return vdFormat(DROP_TEXT.degreeRange, { min: row.min, max: row.max });
  }
  return '—';
}

function ampacityChain(result, context) {
  const binding = {
    derating: SIZE_TEXT.bindingDerating,
    termination: SIZE_TEXT.bindingTermination,
    cap: SIZE_TEXT.bindingCap,
  }[result.binding];
  return vdFormat(DROP_TEXT.ampacityChain, {
    size: result.label,
    insulation: result.insulationTemp,
    base: fmt(result.baseAmpacity),
    ambient: fmt(result.ambient),
    ambientRow: ambientRowText(result.ambientRow),
    ambientFactor: result.ambientFactor.toFixed(2),
    ambientAdjusted: fmt(result.ambientAdjusted),
    conductors: result.conductorCount,
    adjustmentFactor: result.adjustmentFactor.toFixed(2),
    adjusted: fmt(result.adjustedAmpacity),
    termination: result.terminationTemp,
    terminationLimit: fmt(result.terminationLimit),
    smallCap: result.smallCap === null
      ? '—'
      : vdFormat(DROP_TEXT.amps, { amps: fmt(result.smallCap) }),
    permitted: fmt(result.permitted),
    binding,
    continuousRule: context.continuous
      ? vdFormat(DROP_TEXT.continuousRuleMath, {
        load: fmt(context.amps),
        factor: fmt(result.continuousFactor * 100),
        after: fmt(result.loadCheckValue),
        permitted: fmt(result.permitted),
      })
      : SIZE_TEXT.noncontinuousRuleApplied,
  });
}

function voltageSizeMath(found, context) {
  return vdFormat(DROP_TEXT.sizeMath, {
    percent: fmt(context.maxPct),
    maxDrop: fmt(context.volts * context.maxPct / 100, 3),
    size: found.label,
    cm: found.cm.toLocaleString('en-US'),
    mult: SYSTEMS[context.system].multLabel,
    factor: context.factor,
    amps: fmt(context.amps),
    feet: fmt(context.feet, 1),
    dropped: fmt(found.vd, 3),
    actualPercent: fmt(found.pct),
  });
}

function renderCombinedSize(result, context) {
  const voltageFound = result.voltageDrop.found;
  if (result.status === 'not-permitted') {
    showResults(
      { cls: 'bad', badge: SIZE_TEXT.notPermittedBadge },
      '—',
      SIZE_TEXT.ampacityUnavailable,
      [
        [SIZE_TEXT.voltageDropMinimum, voltageFound?.label ?? SIZE_TEXT.notAvailable],
        [SIZE_TEXT.ampacityMinimum, SIZE_TEXT.notAvailable],
      ],
      vdFormat(DROP_TEXT.notPermittedNote, {
        ambient: fmt(context.ambient),
        insulation: context.insulationTemp,
      }),
      [
        mathIntro(context),
        voltageFound ? voltageSizeMath(voltageFound, context) : '',
        vdFormat(DROP_TEXT.outOfRangeMath, { constraint: SIZE_TEXT.ampacityConstraint }),
      ].join(''),
    );
    return;
  }

  if (result.status === 'out-of-range') {
    const ampacityStatus = result.ampacityMinimum
      ? result.ampacityMinimum.label
      : SIZE_TEXT.noPassingSize;
    const dropStatus = voltageFound ? voltageFound.label : SIZE_TEXT.noPassingSize;
    showResults(
      { cls: 'bad', badge: SIZE_TEXT.outOfRangeBadge },
      '—',
      SIZE_TEXT.noListedConductor,
      [
        [SIZE_TEXT.voltageDropMinimum, dropStatus],
        [SIZE_TEXT.ampacityMinimum, ampacityStatus],
        [SIZE_TEXT.largestSizeChecked, result.voltageDrop.largestWire.label],
      ],
      vdFormat(DROP_TEXT.outOfRangeNote, {
        dropStatus,
        ampacityStatus,
      }),
      [
        mathIntro(context),
        voltageFound
          ? voltageSizeMath(voltageFound, context)
          : vdFormat(DROP_TEXT.noFitMath, {
            maxDrop: fmt(result.voltageDrop.maxVd, 3),
            percent: fmt(result.voltageDrop.maxPct),
            source: fmt(result.voltageDrop.volts),
          }),
        vdFormat(DROP_TEXT.outOfRangeMath, {
          constraint: result.reason === 'ampacity'
            ? SIZE_TEXT.ampacityConstraint
            : result.reason === 'voltage-drop'
              ? SIZE_TEXT.distanceConstraint
              : SIZE_TEXT.tieConstraint,
        }),
      ].join(''),
    );
    return;
  }

  const constraint = {
    distance: SIZE_TEXT.distanceConstraint,
    ampacity: SIZE_TEXT.ampacityConstraint,
    tie: SIZE_TEXT.tieConstraint,
  }[result.governing];
  const movement = result.governing === 'distance'
    ? vdFormat(
      result.distanceSizeSteps === 1
        ? DROP_TEXT.distanceRaisedOne
        : DROP_TEXT.distanceRaisedMany,
      {
        ampacitySize: result.ampacityMinimum.label,
        finalSize: result.finalLabel,
        count: result.distanceSizeSteps,
      },
    )
    : result.governing === 'ampacity'
      ? vdFormat(DROP_TEXT.ampacityRaised, {
        dropSize: voltageFound.label,
        finalSize: result.finalLabel,
      })
      : vdFormat(DROP_TEXT.constraintsTie, { finalSize: result.finalLabel });
  const smallerProof = result.ampacityMinimum.nextSmallerSupported
    ? vdFormat(DROP_TEXT.ampacitySearchProof, {
      size: result.ampacityMinimum.label,
      smallerSize: result.ampacityMinimum.nextSmallerSupported.label,
      load: fmt(context.amps),
    })
    : vdFormat(DROP_TEXT.ampacityFloorProof, {
      size: result.ampacityMinimum.label,
      material: MATERIAL_NAME[context.material],
    });
  const domainNote = voltageFound.wireIndex < result.supportedFloor.wireIndex
    ? vdFormat(DROP_TEXT.ampacityDomainNote, {
      dropSize: voltageFound.label,
      floorSize: result.supportedFloor.label,
      material: MATERIAL_NAME[context.material],
    })
    : '';
  const continuousRuleNote = context.continuous
    ? vdFormat(DROP_TEXT.continuousRuleNote, {
      load: fmt(context.amps),
      factor: fmt(result.finalAmpacity.continuousFactor * 100),
      after: fmt(result.finalAmpacity.loadCheckValue),
      permitted: fmt(result.finalAmpacity.permitted),
    })
    : '';

  showResults(
    { cls: 'good', badge: SIZE_TEXT.governingBadge },
    result.finalLabel,
    vdFormat(DROP_TEXT.governingLabel, { constraint }),
    [
      [SIZE_TEXT.ampacityMinimum, result.ampacityMinimum.label],
      [SIZE_TEXT.voltageDropMinimum, voltageFound.label],
      [
        SIZE_TEXT.ampacityHeadroom,
        vdFormat(DROP_TEXT.ampacityHeadroom, { amps: fmt(result.ampacityHeadroom) }),
      ],
      [
        SIZE_TEXT.voltageHeadroom,
        vdFormat(DROP_TEXT.voltageHeadroom, { percent: fmt(result.voltageHeadroom) }),
      ],
    ],
    movement,
    [
      mathIntro(context),
      voltageSizeMath(voltageFound, context),
      ampacityChain(result.ampacityMinimum.result, context),
      smallerProof,
      domainNote,
    ].join(''),
    continuousRuleNote,
  );
}

function renderLength({
  system, material, factor,
  label, cm, volts, amps, maxPct, maxVd, feet, endVolts, verdict,
}) {
  const v = verdict === 'good'
    ? { cls: 'good', badge: '最大线路', note: '' }
    : verdict === 'warn'
      ? { cls: 'warn', badge: '最大线路', note: '' }
      : { cls: 'bad', badge: '最大线路', note: '' };
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
      ['压降在该距离', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['电压在负载', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['电流', vdFormat(DROP_TEXT.amps, { amps: fmt(amps) })],
      ['参考限值', '3%良好· 5%最大'],
    ],
    v.note,
    [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.maxRunMath, {
      percent: fmt(maxPct),
      maxDrop: fmt(maxVd, 3),
      cm: cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor,
      amps: fmt(amps),
      feet: fmt(feet, 1),
    })].join('')
  );
}
