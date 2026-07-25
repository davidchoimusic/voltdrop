/* VoltDrop — Ampacity Check
   Base data: one deliberately shared 60/75/90°C dataset for NEC Table 310.16
   and CEC Tables 2/4. The grids were verified cell-for-cell against
   CSA C22.1:24, 26th edition (2024): all 105 cells shipped here were
   verified, with zero mismatches.
   Do not duplicate this table. The harmonization does not extend to the CEC's
   higher-temperature columns, free-air tables, derating rules, or other data.

   Order matters: insulation-column ampacity × ambient correction × conductor
   adjustment, then the termination limit, then the small-conductor cap. */

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

// Same values, cited by country: NEC 240.4(D) and CEC Rule 14-104.
// This is an overcurrent-device cap, not a derating factor.
const SMALL_CAP = {
  cu: { '14 AWG': 15, '12 AWG': 20, '10 AWG': 30 },
  al: { '12 AWG': 15, '10 AWG': 25 },
};

// NEC Table 310.15(B)(1), based on 30°C ambient.
// null is the table's published "—": that combination is not permitted.
const AMBIENT_CORRECTION = [
  { min: null, max: 10, factors: { 60: 1.29, 75: 1.20, 90: 1.15 } },
  { min: 11, max: 15, factors: { 60: 1.22, 75: 1.15, 90: 1.12 } },
  { min: 16, max: 20, factors: { 60: 1.15, 75: 1.11, 90: 1.08 } },
  { min: 21, max: 25, factors: { 60: 1.08, 75: 1.05, 90: 1.04 } },
  { min: 26, max: 30, factors: { 60: 1.00, 75: 1.00, 90: 1.00 } },
  { min: 31, max: 35, factors: { 60: 0.91, 75: 0.94, 90: 0.96 } },
  { min: 36, max: 40, factors: { 60: 0.82, 75: 0.88, 90: 0.91 } },
  { min: 41, max: 45, factors: { 60: 0.71, 75: 0.82, 90: 0.87 } },
  { min: 46, max: 50, factors: { 60: 0.58, 75: 0.75, 90: 0.82 } },
  { min: 51, max: 55, factors: { 60: 0.41, 75: 0.67, 90: 0.76 } },
  { min: 56, max: 60, factors: { 60: null, 75: 0.58, 90: 0.71 } },
  { min: 61, max: 65, factors: { 60: null, 75: 0.47, 90: 0.65 } },
  { min: 66, max: 70, factors: { 60: null, 75: 0.33, 90: 0.58 } },
  { min: 71, max: 75, factors: { 60: null, 75: null, 90: 0.50 } },
  { min: 76, max: 80, factors: { 60: null, 75: null, 90: 0.41 } },
  { min: 81, max: 85, factors: { 60: null, 75: null, 90: 0.29 } },
];

// NEC Table 310.15(C)(1). One through three conductors use 1.00 because
// this adjustment table begins at four current-carrying conductors.
const CONDUCTOR_ADJUSTMENT = [
  { min: 4, max: 6, factor: 0.80 },
  { min: 7, max: 9, factor: 0.70 },
  { min: 10, max: 20, factor: 0.50 },
  { min: 21, max: 30, factor: 0.45 },
  { min: 31, max: 40, factor: 0.40 },
  { min: 41, max: null, factor: 0.35 },
];

// CEC Table 5A, CSA C22.1:24 (2024), single-point ambient rows above 30°C.
// The real CEC table also has 110/125/200°C columns. VoltDrop deliberately
// omits them because this interface supports only 60/75/90°C insulation.
// null is the table's published "—": that combination is not permitted.
const CEC_AMBIENT_CORRECTION = [
  { ambient: 35, factors: { 60: 0.91, 75: 0.94, 90: 0.96 } },
  { ambient: 40, factors: { 60: 0.82, 75: 0.88, 90: 0.91 } },
  { ambient: 45, factors: { 60: 0.71, 75: 0.82, 90: 0.87 } },
  { ambient: 50, factors: { 60: 0.58, 75: 0.75, 90: 0.82 } },
  { ambient: 55, factors: { 60: 0.41, 75: 0.67, 90: 0.76 } },
  { ambient: 60, factors: { 60: null, 75: 0.58, 90: 0.71 } },
  { ambient: 65, factors: { 60: null, 75: 0.47, 90: 0.65 } },
  { ambient: 70, factors: { 60: null, 75: 0.33, 90: 0.58 } },
  { ambient: 75, factors: { 60: null, 75: null, 90: 0.50 } },
  { ambient: 80, factors: { 60: null, 75: null, 90: 0.41 } },
];

// CEC Table 5C, CSA C22.1:24 (2024). These bands are genuinely Canadian;
// never replace them with NEC Table 310.15(C)(1).
const CEC_CONDUCTOR_ADJUSTMENT = [
  { min: 1, max: 3, factor: 1.00 },
  { min: 4, max: 6, factor: 0.80 },
  { min: 7, max: 24, factor: 0.70 },
  { min: 25, max: 42, factor: 0.60 },
  { min: 43, max: null, factor: 0.50 },
];

const TEMP_INDEX = { 60: 0, 75: 1, 90: 2 };
const BINDING_LABEL_IDS = {
  derating: 'amp-binding-derating',
  termination: 'amp-binding-termination',
  cap: 'amp-binding-cap',
};
const AMP_RESULT_TEXT = {
  amps: '{amps} A',
  factor: '× {factor}',
  degrees: '{degrees}°C',
  atMostDegrees: '≤{max}°C',
  degreeRange: '{min}–{max}°C',
  combined: '{base} A × {ambientFactor} × {adjustmentFactor} = {derated} A',
};

let material = 'cu';
let insulationTemp = 90;
let terminationTemp = 75;
let continuous = false;

const $ = (id) => document.getElementById(id);
const isCanada = () => document.body.dataset.country === 'ca';
const setText = (id, value) => { $(id).textContent = value; };
const formatNumber = (value) => Number.isInteger(value)
  ? String(value)
  : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
const formatAmps = (value) => vdFormat(AMP_RESULT_TEXT.amps, { amps: formatNumber(value) });
const formatWholeAmps = (value) => formatAmps(Math.floor(value + 1e-9));
const formatFactor = (value) => vdFormat(AMP_RESULT_TEXT.factor, { factor: value.toFixed(2) });

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
  if ([...sel.options].some((option) => option.value === prev)) sel.value = prev;
  else sel.value = '12 AWG';
}

function activateButton(button) {
  const group = button.closest('.seg');
  group.querySelectorAll('.seg-btn').forEach((item) => {
    item.classList.remove('active');
    item.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
}

document.querySelectorAll('.seg-btn').forEach((button) => {
  button.addEventListener('click', () => {
    activateButton(button);
    if ('material' in button.dataset) {
      material = button.dataset.material;
      fillSizes();
    }
    if ('insulation' in button.dataset) insulationTemp = Number(button.dataset.insulation);
    if ('termination' in button.dataset) terminationTemp = Number(button.dataset.termination);
    if ('continuous' in button.dataset) continuous = button.dataset.continuous === 'yes';
    if (!$('results').hidden) check();
  });
});

function ambientSelectionFor(ambient) {
  if (isCanada()) {
    // Table 5A starts above 30°C and grants no cool-ambient credit.
    if (ambient <= 30) {
      return {
        factor: 1,
        rowDisplay: vdFormat(AMP_RESULT_TEXT.atMostDegrees, { max: 30 }),
      };
    }

    // CEC rows are points, not bands. Always select the next higher listed
    // point so an in-between input can never overstate permitted ampacity.
    const row = CEC_AMBIENT_CORRECTION.find((item) => ambient <= item.ambient);
    return {
      factor: row?.factors[insulationTemp],
      rowDisplay: row
        ? vdFormat(AMP_RESULT_TEXT.degrees, { degrees: row.ambient })
        : '',
    };
  }

  const row = AMBIENT_CORRECTION.find((item) =>
    (item.min === null || ambient >= item.min) && ambient <= item.max);
  const rowDisplay = row
    ? row.min === null
      ? vdFormat(AMP_RESULT_TEXT.atMostDegrees, { max: row.max })
      : vdFormat(AMP_RESULT_TEXT.degreeRange, { min: row.min, max: row.max })
    : '';
  return {
    factor: row?.factors[insulationTemp],
    rowDisplay,
  };
}

function adjustmentFor(count) {
  const table = isCanada() ? CEC_CONDUCTOR_ADJUSTMENT : CONDUCTOR_ADJUSTMENT;
  if (!isCanada() && count <= 3) return 1;
  return table.find((row) =>
    count >= row.min && (row.max === null || count <= row.max))?.factor;
}

function showOnly(selector, id) {
  document.querySelectorAll(selector).forEach((element) => {
    element.hidden = element.id !== id;
  });
}

function showUnavailable() {
  $('results').hidden = false;
  $('amp-result-calculation').hidden = true;
  $('amp-result-unavailable').hidden = false;
  $('verdict').className = 'verdict bad';
  showOnly('.amp-verdict-badge', 'amp-badge-not-permitted');
  showOnly('.amp-big-label', 'amp-label-not-permitted');
  setText('big-number', '—');
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setBinding(binding) {
  document.querySelectorAll('.amp-binding-marker').forEach((marker) => {
    marker.hidden = marker.dataset.binding !== binding;
  });
  document.querySelectorAll('.amp-not-binding-marker').forEach((marker) => {
    marker.hidden = marker.dataset.binding === binding;
  });
  setText('amp-binding-value', $(BINDING_LABEL_IDS[binding]).textContent);
}

function check() {
  const load = Number($('amp-load').value);
  const ambient = Number($('amp-ambient').value);
  const conductorCount = Number($('amp-conductors').value);
  if (!load || !Number.isFinite(ambient) || !Number.isInteger(conductorCount) || conductorCount < 1) return;

  const ambientSelection = ambientSelectionFor(ambient);
  const ambientFactor = ambientSelection.factor;
  if (ambientFactor === null || ambientFactor === undefined) {
    showUnavailable();
    return;
  }

  const adjustmentFactor = adjustmentFor(conductorCount);
  const label = $('amp-size').value;
  const baseAmpacity = AMPACITY[material][label][TEMP_INDEX[insulationTemp]];
  const ambientAdjusted = baseAmpacity * ambientFactor;
  const adjustedAmpacity = ambientAdjusted * adjustmentFactor;
  const terminationLimit = AMPACITY[material][label][TEMP_INDEX[terminationTemp]];
  const smallCap = (SMALL_CAP[material] || {})[label];
  const exactPermitted = Math.min(
    adjustedAmpacity,
    terminationLimit,
    smallCap === undefined ? Infinity : smallCap,
  );
  const permitted = Math.floor(exactPermitted + 1e-9);
  const loadCheckValue = continuous
    ? (isCanada() ? permitted * 0.80 : load * 1.25)
    : load;
  const passes = continuous && isCanada()
    ? load <= loadCheckValue
    : loadCheckValue <= permitted;

  let binding = 'derating';
  if (smallCap !== undefined
      && smallCap <= terminationLimit
      && smallCap <= adjustedAmpacity) {
    binding = 'cap';
  } else if (terminationLimit <= adjustedAmpacity) {
    binding = 'termination';
  }

  $('results').hidden = false;
  $('amp-result-calculation').hidden = false;
  $('amp-result-unavailable').hidden = true;
  $('verdict').className = passes ? 'verdict good' : 'verdict bad';
  showOnly('.amp-verdict-badge', passes ? 'amp-badge-pass' : 'amp-badge-too-small');
  showOnly('.amp-big-label', 'amp-label-final');
  setText('big-number', formatAmps(permitted));

  setText('amp-base-value', formatAmps(baseAmpacity));
  setText('amp-ambient-input', vdFormat(AMP_RESULT_TEXT.degrees, { degrees: formatNumber(ambient) }));
  setText('amp-ambient-row-value', ambientSelection.rowDisplay);
  setText('amp-ambient-factor', formatFactor(ambientFactor));
  setText('amp-ambient-value', formatWholeAmps(ambientAdjusted));
  setText('amp-conductor-input', String(conductorCount));
  setText('amp-adjustment-factor', formatFactor(adjustmentFactor));
  setText('amp-adjusted-value', formatWholeAmps(adjustedAmpacity));
  setText('amp-termination-value', formatAmps(terminationLimit));
  setText('amp-cap-value', smallCap === undefined ? '—' : formatAmps(smallCap));
  setText('amp-final-value', formatAmps(permitted));
  setText('amp-combined-formula', vdFormat(AMP_RESULT_TEXT.combined, {
    base: formatNumber(baseAmpacity),
    ambientFactor: ambientFactor.toFixed(2),
    adjustmentFactor: adjustmentFactor.toFixed(2),
    derated: formatNumber(Math.floor(adjustedAmpacity + 1e-9)),
  }));
  setBinding(binding);

  setText('amp-load-entered', formatAmps(load));
  setText('amp-load-required', formatAmps(loadCheckValue));
  $('amp-continuous-row').hidden = !continuous;
  $('amp-noncontinuous-row').hidden = continuous;
  showOnly('.amp-load-note', passes
    ? (continuous ? 'amp-note-continuous-pass' : 'amp-note-load-pass')
    : (continuous ? 'amp-note-continuous-fail' : 'amp-note-load-fail'));

  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

fillSizes();
$('amp-form').addEventListener('submit', (event) => {
  event.preventDefault();
  check();
});
