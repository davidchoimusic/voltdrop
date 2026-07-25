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
const MATERIAL_NAME = { cu: '铜', al: '铝' };
const AMP_RESULT_TEXT = {
  amps: '{amps} A',
  safeLimit: '{temp}°C时{size} {material}导线的安全限值',
  normalMargin: '在正常条件下，此导线可以承载该负载。请注意：连续负载（3小时以上）应低于限值的80%，此处为{amps} A。',
  tightMargin: '符合限值，但余量很小。对于连续负载（3小时以上）、高温或成束导线，请增大一个规格；按80%建议值计算，此处最大为{amps} A。',
  notRated: '此导线的额定载流量不足以承载{amps} A。请增大导线规格（线规）——导线规格过小会过热并造成火灾风险。',
  lookup: '\n<p>{table}规定：{temp}°C列中的{size} {material}导线载流量为<strong>{tableAmps} A</strong>（导管内最多三根载流导体，且为正常室温）。</p>',
  cap: '<p>小导体规则（{citation}）将{size} {material}导线的断路器上限设为<strong>{capAmps} A</strong>；因此我们使用该实际限值进行比较。</p>',
  comparison: '<div class="formula">安全限值 = {rated} A   对比   您的负载 = {load} A   →   {status}</div>',
};

let material = 'cu';
let temp = 75;

// Country-aware wording: same verified data both countries (CEC Tables 2/4
// are harmonized with NEC 310.16); citations, cable names, and rules swap.
const AMP_TEXT = {
  us: {
    tableCite: 'NEC表310.16',
    capCite: 'NEC 240.4(D)',
    tempHint: '不确定？请使用<strong>75°C</strong>：大多数断路器端子和接线端子的额定温度为该值。Romex/NM-B电缆必须使用60°C列。干燥场所中的THHN额定为90°C，但接线点通常仍将电路限制在75°C。',
    expLookup: '我们根据美国标准载流量表查找导线（NEC Table 310.16；正常条件：导管内最多三根载流导体，且为正常室温）。小导体还适用NEC 240.4(D)：14 AWG铜最大15 A，12 AWG最大20 A，10 AWG最大30 A，即使原始表格给出更高数值。',
  },
  ca: {
    tableCite: 'CEC Table 2/Table 4 (harmonized使用NEC 310.16)',
    capCite: 'CEC Rule 14-104',
    tempHint: '不sure?使用<strong>75°C</strong> — it\'s什么大多数marked breakers和lugs是额定用于; unmarked equipment计数as 60°C (CEC Rule 4-006). NMD90 isn\'t blanket-capped在60°C like American Romex —接线端子规定ceiling —但运行它在60°C列是conservative habit.',
    expLookup: '我们根据加拿大载流量表查找导线（铜使用CEC Table 2，铝使用Table 4；已经核实这些数值与US表一致）。小导体还适用CEC Rule 14-104：#14铜最大15 A，#12最大20 A，#10最大30 A，即使原始表格给出更高数值。',
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
  $('verdict-badge').textContent = ok ? (margin / rated >= 0.2 ? 'OK' : '余量较小') : '规格过小';
  $('big-number').textContent = vdFormat(AMP_RESULT_TEXT.amps, { amps: rated });
  $('big-label').textContent = vdFormat(AMP_RESULT_TEXT.safeLimit, {
    size: label,
    material: MATERIAL_NAME[material],
    temp,
  });

  const cells = [
    ['您的负载', vdFormat(AMP_RESULT_TEXT.amps, { amps: load })],
    ['表载流量', vdFormat(AMP_RESULT_TEXT.amps, { amps: tableAmps })],
  ];
  if (cap) cells.push(['断路器限值（小导体规则）', vdFormat(AMP_RESULT_TEXT.amps, { amps: cap })]);
  cells.push(['余量', vdFormat(AMP_RESULT_TEXT.amps, { amps: margin >= 0 ? margin : 0 })]);
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
      status: ok ? 'OK' : '超过限值',
    }),
  ].filter(Boolean).join('\n');

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyAmpCountryText();
