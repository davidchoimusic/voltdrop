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
  ampacityWarning: '注意：此结果只计算电压降。导线还必须能够安全承载{amps} A（载流量）；购买前请另行核验。',
  maxDistanceNote: '在此距离下，电压降正好达到{percent}%。请缩短线路以保留余量。还要注意：无论距离多短，导线都必须具有承载{amps} A的额定载流量。',
  feet: '{feet} ft',
  maxRunLabel: '{size} {material}线在{percent}%电压降下的最大单程线路长度',
  mathIntroRoundTrip: '<p>我们使用电工常用的标准K系数公式：</p>\n<div class="formula">电压降 = {mult} × K × 安培 × 单程英尺 ÷ circular mils</div>\n<p><strong>{mult}</strong>计入往返距离：电流流出后还要返回，因此导线路径是单程距离（仅去程）的两倍。<strong>K = {factor}</strong>是{material}在75°C时的电阻常数（ohm·cmil/ft）。<strong>Circular mils</strong>是导线横截面积。</p>',
  mathIntroThreePhase: '<p>我们使用电工常用的标准K系数公式：</p>\n<div class="formula">电压降 = {mult} × K × 安培 × 单程英尺 ÷ circular mils</div>\n<p><strong>{mult}</strong>计入三相几何关系。<strong>K = {factor}</strong>是{material}在75°C时的电阻常数（ohm·cmil/ft）。<strong>Circular mils</strong>是导线横截面积。</p>',
  dropMath: '\n<p>代入您的数值（{size} = {cm} circular mils）：</p>\n<div class="formula">{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= 电压降{dropped} V\n÷ {source} V电源电压 = {percent}%</div>\n<p>负载端电压：{source} − {dropped} = <strong>{endVolts} V</strong>。</p>',
  noFitMath: '<p>我们从最小规格到最大规格逐一检查；没有任何规格的电压降≤{maxDrop} V（{source} V的{percent}%）。</p>',
  sizeMath: '\n<p>我们从最小规格开始逐一检查，直到找到可将电压降控制在{percent}%限值（{maxDrop} V）以下的规格：</p>\n<div class="formula">{size}（{cm} cmil）：\n{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} V = {actualPercent}%  ✓ 低于您的限值</div>',
  maxRunMath: '\n<p>根据您的{percent}%限值（{maxDrop} V），我们将公式变形以求解距离：</p>\n<div class="formula">最大单程英尺 = {maxDrop} V × {cm} cmil\n             ÷（{mult} × {factor} × {amps} A）\n             = {feet} ft</div>',
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
    drop: '计算电压降',
    size: '查找最小导线',
    length: '查找最大距离',
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
  if (pct <= 3) return { cls: 'good', badge: '良好', note: '在3%的建议值内。此线路应能正常工作。' };
  if (pct <= 5) return { cls: 'warn', badge: '注意', note: '高于3%的建议值，但仍在5%的外部限值内。某些负载可能适用；对于电动机、充电器或长时间运行的电路，请考虑增大导线规格（线规）。' };
  return { cls: 'bad', badge: '过于很多', note: '超出5%的外部限值。可能出现明显性能问题：请增大导线规格（线规）、缩短线路或提高电压。' };
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
      ['伏特损失在导线', vdFormat(DROP_TEXT.volts, { volts: fmt(vd) })],
      ['电压在负载', vdFormat(DROP_TEXT.volts, { volts: fmt(endV) })],
      ['起始使用', vdFormat(DROP_TEXT.volts, { volts: fmt(volts) })],
      ['参考限值', '3%良好· 5%最大'],
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
      { cls: 'bad', badge: '无合适规格', note: '表中没有任何单根导线能将电压降保持在您的限值内。可以缩短线路、提高电压、允许更大的电压降，或并联导线；请咨询电工。' },
      '—',
      vdFormat(DROP_TEXT.noFitLabel, { percent: maxPct }),
      [
        ['您的限值', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
        ['最大规格检查', WIRE_TABLE[WIRE_TABLE.length - 1][0]],
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
      ['该规格的实际电压降', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(pct), volts: fmt(found.vd) })],
      ['电压在负载', vdFormat(DROP_TEXT.volts, { volts: fmt(volts - found.vd) })],
      ['您的限值', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['参考限值', '3%良好· 5%最大'],
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
    ? { cls: 'good', badge: '最大线路', note: '' }
    : maxPct <= 5
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
      ['电压在负载', vdFormat(DROP_TEXT.volts, { volts: fmt(volts - maxVd) })],
      ['电流', vdFormat(DROP_TEXT.amps, { amps: fmt(amps) })],
      ['参考限值', '3%良好· 5%最大'],
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
