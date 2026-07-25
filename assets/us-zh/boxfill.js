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
  ['器件接线盒3 × 2 × 1-1/2"', 7.5],
  ['器件接线盒3 × 2 × 2"', 10.0],
  ['器件接线盒3 × 2 × 2-1/4"', 10.5],
  ['器件接线盒3 × 2 × 2-1/2"', 12.5],
  ['器件接线盒3 × 2 × 2-3/4"', 14.0],
  ['器件接线盒3 × 2 × 3-1/2"', 18.0],
  ['4" 圆形/八角形 × 1-1/4"', 12.5],
  ['4" 圆形/八角形 × 1-1/2"', 15.5],
  ['4" 圆形/八角形 × 2-1/8"', 21.5],
  ['4"方形× 1-1/4"', 18.0],
  ['4"方形× 1-1/2"', 21.0],
  ['4"方形× 2-1/8"', 30.3],
  ['4-11/16"方形× 1-1/4"', 25.5],
  ['4-11/16"方形× 1-1/2"', 29.5],
  ['4-11/16"方形× 2-1/8"', 42.0],
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
  mlOption: '{size}（每根{volume} mL）',
  cubicInchOption: '{size}（每根{volume} cu in）',
  boxOption: '{box} — {volume} cu in',
  needed: '{volume} {unit}',
  neededVsAvailable: '所需容积；可用容积为{volume} {unit}',
  countVolume: '{count} × {unit} = {volume}',
  doubleCountVolume: '{count} × 2 × {unit} = {volume}',
  usage: '{percent}%',
  oneCountVolume: '1 × {unit} = {volume}',
  conductorBreakdown: '<span>{count} × {size}</span><span>{count} × {allowance} = {volume} {measure}</span>',
  deviceBreakdown: '<span>{count}个{deviceWord}（最大{size}）</span><span>{count} × 2 × {allowance} = {volume} {measure}</span>',
  groundsBreakdown: '<span>接地导线（最大{size}）</span><span>1 × {allowance} = {volume} {measure}</span>',
  clampsBreakdown: '<span>电缆夹（最大{size}）</span><span>1 × {allowance} = {volume} {measure}</span>',
  marretteBreakdown: '<span>{count}{pairWord}（最大{size}）</span><span>{count} × {allowance} = {volume} {measure}</span>',
  totalBreakdown: '<span><strong>总需求容积</strong></span><span><strong>{volume} {measure}</strong></span>',
  caMathMixed: '\n<p>每一行均使用CEC Table 22、Rule 12-3034中对应规格的容积。</p>\n<div class="formula">{breakdown}\n{box}：可用{available} mL → {status}</div>\n<p>加拿大细则：裸露的接地跨接导线和电缆夹不计容积。器件和marrettes对均按列出的最大导线计算，因为这些合并输入未关联到某一行。深度超过2.54 cm的器件，每cm还需额外扣除32 mL，本检查未包括此项。</p>',
  usMathMixed: '\n<p>每一行均使用NEC Table 314.16(B)中对应规格的容积。</p>\n<div class="formula">{breakdown}\n{box}：可用{available} cu in → {status}</div>\n<p>细则：完全留在接线盒内的引线不计，但未断开而穿过接线盒的导线计一次。器件、接地导线和电缆夹均按列出的最大导线计算，因为这些合并输入未关联到某一行。如果超过四根接地导线，从第五根起每根增加¼个计数（2020规则）；可多按约一根导线保留余量。</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: '接线盒过满会使连接点受力、损伤绝缘层并积聚热量，常导致检查不合格和电路闪断。NEC 314.16按导线规格（线规）规定所需空间，接线盒必须至少提供该容积。',
    exp2: '每根进入接线盒的相线或中性线都按其自身规格计算，包括未断开而穿过接线盒的导线。每个器件按其连接的最大导线容积计两次。所有接地导线合计一次，按最大接地导线计算。内部电缆夹按接线盒内最大导线计一次。完全留在接线盒内的引线不计。',
  },
  ca: {
    exp1: '接线盒过满会使连接点受力、损伤绝缘层并积聚热量，常导致检查不合格。Canadian Electrical Code（Rule 12-3034和Table 22）按毫升为每根绝缘导线规定空间，接线盒必须至少提供该容积。',
    exp2: '加拿大计数规则（Rule 12-3034）：每根进入接线盒的绝缘导线按自身规格计一次。裸露的接地跨接导线不计。每个器件计两次。每对绝缘导线连接器（marrettes）计一次。器件和marrettes对均按列出的最大导线计算。加拿大不计电缆夹。完全留在接线盒内的引线不计。',
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
    $('bf-custom').placeholder = 'e.g. 310 (mL, marked在接线盒)';
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
customOpt.textContent = 'Custom —容积印在在接线盒';
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
    boxName = '您的接线盒';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const largest = conductorEntries.reduce((current, row) =>
    row.allowance > current.allowance ? row : current);
  if (largest.allowance === undefined) { alert('用于加拿大接线盒填充,使用sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
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
  $('verdict-badge').textContent = ok ? (pct <= 90 ? '合适' : '接近限值') : '过于装满';
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
        ['绝缘导线', vdFormat(BOX_RESULT_TEXT.needed, { volume: fmt(conductorVolume, 1), unit: u })],
        ['器件（按两倍计）', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit: largest.allowance, volume: fmt(deviceVolume, 1) })],
        ['marrettes对数', vdFormat(BOX_RESULT_TEXT.countVolume, { count: pairs, unit: largest.allowance, volume: fmt(marretteVolume, 1) })],
        ['接线盒使用率', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['导线(hots + neutrals)', vdFormat(BOX_RESULT_TEXT.needed, { volume: fmt(conductorVolume, 2), unit: u })],
        ['器件（按两倍计）', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit: largest.allowance, volume: fmt(deviceVolume, 2) })],
        ['接地线(全部= 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit: largest.allowance, volume: fmt(groundVolume, 2) }) : '无'],
        ['电缆夹', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit: largest.allowance, volume: fmt(clampVolume, 2) }) : '无'],
        ['接线盒使用率', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
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
    deviceWord: devices === 1 ? '器件' : '器件',
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
    pairWord: pairs === 1 ? '对marrettes' : '对marrettes',
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
        ? '此接线盒提供了规范要求的空间。'
        : '合规，但正好达到限值。如果以后可能增加器件或电缆，现在就应使用更大的接线盒。')
    : '超出限值。请使用更深的接线盒、扩展盒或减少导线数量。接线盒过满通常会导致检查不合格并产生发热风险。';

  const breakdownText = [...$('itemized-breakdown').querySelectorAll('.breakdown-line')]
    .map((line) => line.textContent.trim())
    .join('\n');
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMathMixed : BOX_RESULT_TEXT.usMathMixed, {
    breakdown: breakdownText,
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? '合适' : '不符合',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
