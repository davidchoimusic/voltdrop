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
  caMath: '\n<p>每根{size}绝缘导线需要<strong>{unit} mL</strong>接线盒空间（CEC Table 22，Rule 12-3034）。</p>\n<div class="formula">{conductors}根导线 + {devices}个{deviceWord} × 2 + {pairs}{pairWord}\n= {counts}个总计数 × {unit} mL\n= 需要{needed} mL\n{box}：可用{available} mL → {status}</div>\n<p>加拿大细则：裸露的接地跨接导体和电缆夹不预留容积（与US不同）；每对marrettes按其中最大导线计一个容积（我们使用您选择的规格；为保留安全余量，请选择现场最大的导线）；深度超过2.54 cm的器件，每cm深度还要额外扣除32 mL，本简化检查未包括这项扣除。</p>',
  usMath: '\n<p>每根{size}导线需要<strong>{unit} cu in</strong>接线盒空间（NEC Table 314.16(B)）。</p>\n<div class="formula">{conductors}根导线 + {devices}个{deviceWord} × 2 + {grounds} + {clamps}\n= {counts}个总计数 × {unit} cu in\n= 需要{needed} cu in\n{box}：可用{available} cu in → {status}</div>\n<p>细则：完全留在接线盒内的引线不计数，但未断开而穿过接线盒的导线必须计一次，请将其包括在上方。如果超过四根接地导线进入接线盒，从第五根开始每根增加¼个计数（2020规范规则）；为保留安全余量，可按大约多一根导线计算。混合导线规格需要按规格分别完整计算（即将提供）；在此之前，选择现场最大的规格是使用本工具的安全方法。</p>',
};

function bfCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

const BF_TEXT = {
  us: {
    exp1: '接线盒过满会使连接点受力、损伤绝缘层并积聚热量，常导致检查不合格和电路闪断。NEC 314.16按导线规格（线规）规定所需空间，接线盒必须至少提供该容积。',
    exp2: '进入接线盒的每根相线或中性线 = 1，包括未断开而穿过盒体的导线。每个器件 = 2。所有接地导体合计 = 1；超过四根后，根据2020规则，每增加一根加¼。内部电缆夹 = 1。始终留在盒内的引出短线不计。总数乘以相应导线规格（线规）的空间，再与接线盒容积比较。',
  },
  ca: {
    exp1: '接线盒过满会使连接点受力、损伤绝缘层并积聚热量，常导致检查不合格。Canadian Electrical Code（Rule 12-3034和Table 22）按毫升为每根绝缘导线规定空间，接线盒必须至少提供该容积。',
    exp2: '加拿大计数规则（Rule 12-3034）：每根进入接线盒的绝缘导线 = 1；裸露的接地跨接导体不计。每个器件 = 2。每对绝缘导线连接器（marrettes）= 1，并按其中最大的导线计算；此规则在US没有对应规定。加拿大不为电缆夹预留容积。始终留在盒内的引出短线不计。总数乘以Table 22规定的容积，再与接线盒的毫升容积比较。',
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
    $('bf-custom').placeholder = 'e.g. 310 (mL, marked在接线盒)';
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
customOpt.textContent = 'Custom —容积印在在接线盒';
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
    boxName = '您的接线盒';
    if (!boxVol) return;
  } else {
    const [label, vol] = BOXES[Number(boxSel.value)];
    boxName = label;
    boxVol = vol;
  }

  const size = sizeSel.value;
  const unit = ca ? CEC_VOL_ML[size] : VOL_PER_CONDUCTOR[size];
  if (unit === undefined) { alert('用于加拿大接线盒填充,使用sizes 14-6 AWG (CEC Table 22 coverage).'); return; }
  const counts = ca
    ? conductors + devices * 2 + Math.floor(marrettes / 2)
    : conductors + devices * 2 + (grounds ? 1 : 0) + (clamps ? 1 : 0);
  const needed = counts * unit;
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
        ['绝缘导线', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 1) })],
        ['器件（按两倍计）', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 1) })],
        ['marrettes对数', vdFormat(BOX_RESULT_TEXT.countVolume, { count: Math.floor(marrettes / 2), unit, volume: fmt(Math.floor(marrettes / 2) * unit, 1) })],
        ['接线盒使用率', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ]
    : [
        ['导线(hots + neutrals)', vdFormat(BOX_RESULT_TEXT.countVolume, { count: conductors, unit, volume: fmt(conductors * unit, 2) })],
        ['器件（按两倍计）', vdFormat(BOX_RESULT_TEXT.doubleCountVolume, { count: devices, unit, volume: fmt(devices * 2 * unit, 2) })],
        ['接地线(全部= 1)', grounds ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : '无'],
        ['电缆夹', clamps ? vdFormat(BOX_RESULT_TEXT.oneCountVolume, { unit, volume: fmt(unit, 2) }) : '无'],
        ['接线盒使用率', vdFormat(BOX_RESULT_TEXT.usage, { percent: fmt(pct, 0) })],
      ];
  $('result-grid').innerHTML = rows.map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = ok
    ? (pct <= 90
        ? '此接线盒提供了规范要求的空间。'
        : '合规，但正好达到限值。如果以后可能增加器件或电缆，现在就应使用更大的接线盒。')
    : '超出限值。请使用更深的接线盒、扩展盒或减少导线数量。接线盒过满通常会导致检查不合格并产生发热风险。';

  const pairs = Math.floor(marrettes / 2);
  $('math-body').innerHTML = vdFormat(ca ? BOX_RESULT_TEXT.caMath : BOX_RESULT_TEXT.usMath, {
    size,
    unit,
    conductors,
    devices,
    deviceWord: devices === 1 ? '器件' : '器件',
    pairs,
    pairWord: pairs === 1 ? '对marrettes' : '对marrettes',
    grounds: grounds ? '接地线(1)' : '否接地线(0)',
    clamps: clamps ? '电缆夹(1)' : '否电缆夹(0)',
    counts,
    needed: fmt(needed, ca ? 1 : 2),
    box: boxName,
    available: fmt(boxVol, 1),
    status: ok ? '合适' : '不符合',
  });

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyBfCountry();
