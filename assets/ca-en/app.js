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
const MATERIAL_NAME = { cu: 'copper', al: 'aluminum' };

const SYSTEMS = {
  dc:  { mult: 2,     multLabel: '2',  name: 'DC',
         hint: 'DC: batteries, solar, vehicles, LED strips.' },
  ac1: { mult: 2,     multLabel: '2',  name: 'AC single-phase',
         hint: 'Single-phase: normal household and light commercial circuits.' },
  ac3: { mult: 1.732, multLabel: '√3 (1.732)', name: 'AC three-phase',
         hint: 'Three-phase: commercial and industrial. Voltage is line-to-line.' },
};
const DROP_TEXT = {
  volts: '{volts} V',
  amps: '{amps} A',
  percent: '{percent}%',
  dropLabel: 'voltage drop on {size} {material}',
  limit: '{percent}% = {volts} V',
  actualDrop: '{percent}% ({volts} V)',
  noFitLabel: 'no listed size keeps you under {percent}%',
  noFitNote: 'Even {size} {material} drops more than {percent}% over {feet} one-way feet at {amps} A.',
  smallestWireLabel: 'smallest {material} wire that stays under {percent}%',
  maxDistanceNote: 'At exactly this distance you hit {percent}% drop. Stay shorter for margin. And remember: the wire must also be rated for {amps} A (ampacity) regardless of distance.',
  feet: '{feet} ft',
  maxRunLabel: 'max one-way run for {size} {material} at {percent}% drop',
  mathIntroRoundTrip: '<p>We use the standard K-factor formula electricians use in the field:</p>\n<div class="formula">Voltage drop = {mult} × K × amps × one-way feet ÷ circular mils</div>\n<p><strong>{mult}</strong> accounts for the round trip — current flows out AND back, so the wire path is twice your one-way distance. <strong>K = {factor}</strong> is the resistance constant for {material} (ohm·cmil/ft at 75°C). <strong>Circular mils</strong> is the wire\'s cross-section area.</p>',
  mathIntroThreePhase: '<p>We use the standard K-factor formula electricians use in the field:</p>\n<div class="formula">Voltage drop = {mult} × K × amps × one-way feet ÷ circular mils</div>\n<p><strong>{mult}</strong> accounts for the three-phase geometry. <strong>K = {factor}</strong> is the resistance constant for {material} (ohm·cmil/ft at 75°C). <strong>Circular mils</strong> is the wire\'s cross-section area.</p>',
  dropMath: '\n<p>With your numbers ({size} = {cm} circular mils):</p>\n<div class="formula">{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} volts dropped\n÷ {source} V source = {percent}%</div>\n<p>Voltage at the load: {source} − {dropped} = <strong>{endVolts} V</strong>.</p>',
  noFitMath: '<p>We checked every size from smallest to largest; none dropped ≤ {maxDrop} V ({percent}% of {source} V).</p>',
  sizeMath: '\n<p>We tested each size, smallest first, until one kept the drop under your {percent}% limit ({maxDrop} V):</p>\n<div class="formula">{size} ({cm} cmil):\n{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} V = {actualPercent}%  ✓ under your limit</div>',
  governingLabel: 'governing conductor — {constraint}',
  notPermittedNote: 'The published ambient table marks {ambient}°C with {insulation}°C insulation as “—” or outside the supported rows. No correction factor is substituted and no conductor size is returned.',
  outOfRangeNote: 'No listed conductor passes both checks. The voltage-drop search found {dropStatus}; the ampacity search found {ampacityStatus}. Change the design or have a qualified electrician evaluate conductors or arrangements outside this tool.',
  distanceRaisedOne: 'Distance raised the conductor from {ampacitySize} to {finalSize} — one listed size.',
  distanceRaisedMany: 'Distance raised the conductor from {ampacitySize} to {finalSize} — {count} listed sizes.',
  ampacityRaised: 'Distance did not raise the conductor — zero listed sizes. Ampacity raised it from the distance-only {dropSize} to {finalSize}.',
  constraintsTie: 'Distance did not raise the conductor beyond ampacity — zero listed sizes. Both constraints select {finalSize}; this is a normal tie.',
  ampacityHeadroom: '{amps} A',
  voltageHeadroom: '{percent} percentage points',
  degrees: '{degrees}°C',
  atMostDegrees: '≤{max}°C',
  degreeRange: '{min}–{max}°C',
  ampacityChain: '<h3>Ampacity-driven minimum: {size}</h3>\n<div class="formula">Base ampacity ({insulation}°C insulation): {base} A\n→ Ambient correction ({ambient}°C; row {ambientRow}): × {ambientFactor} = {ambientAdjusted} A\n→ {conductors} current-carrying conductors: × {adjustmentFactor} = {adjusted} A\n→ Termination limit ({termination}°C): {terminationLimit} A\n→ Small-conductor cap: {smallCap}\n= Final permitted ampacity: {permitted} A</div>\n<p><strong>Binding limit:</strong> {binding}.</p>\n{continuousRule}',
  continuousRuleNote: '<strong>CEC Rule 8-104 rated-equipment case — continuous load: conductor limited to 80% of its permitted ampacity.</strong> Before: {permitted} A permitted ampacity. After: {permitted} A × {factor}% = {after} A available for the entered {load} A continuous load. The switch treats the entire entered load as continuous; it does not model a mixed load.',
  continuousRuleMath: '<h3>Continuous-load step — CEC Rule 8-104 rated-equipment case</h3>\n<div class="formula">Permitted ampacity: {permitted} A\n× {factor}%\n= {after} A available for continuous load\n{load} A entered load ≤ {after} A → passes</div>\n<p>The conductor is limited to 80% of its permitted ampacity. The switch treats the entire entered load as continuous; it does not model a mixed load.</p>',
  ampacitySearchProof: '<p><strong>Smallest-size proof:</strong> {size} passes. The next smaller supported size, {smallerSize}, fails the entered {load} A under the applied load rule.</p>',
  ampacityFloorProof: '<p><strong>Smallest-size proof:</strong> {size} passes and is the smallest size this ampacity table supports for {material}. The engine makes no claim about smaller sizes.</p>',
  ampacityDomainNote: '<p><strong>Different table ranges:</strong> Voltage drop alone allows {dropSize}, but the ampacity table starts at {floorSize} for {material}. {dropSize} is not treated as passing ampacity.</p>',
  outOfRangeMath: '<p><strong>Refusal:</strong> {constraint} did not produce a passing listed size. The largest listed conductor is not returned as a recommendation.</p>',
  maxRunMath: '\n<p>We rearranged the formula to solve for distance, with your limit of {percent}% ({maxDrop} V):</p>\n<div class="formula">Max one-way feet = {maxDrop} V × {cm} cmil\n             ÷ ({mult} × {factor} × {amps} A)\n             = {feet} ft</div>',
};
const SIZE_TEXT = {
  governingBadge: 'GOVERNING',
  notPermittedBadge: 'NOT PERMITTED',
  outOfRangeBadge: 'OUT OF RANGE',
  ampacityUnavailable: 'ampacity table does not permit this temperature combination',
  noListedConductor: 'no listed conductor satisfies both constraints',
  ampacityMinimum: 'Ampacity minimum',
  voltageDropMinimum: 'Voltage-drop minimum',
  ampacityHeadroom: 'Ampacity headroom at final size',
  voltageHeadroom: 'Voltage-drop headroom at final size',
  largestSizeChecked: 'Largest size checked',
  notAvailable: 'not available',
  noPassingSize: 'no passing size',
  distanceConstraint: 'voltage drop (distance)',
  ampacityConstraint: 'ampacity (heat)',
  tieConstraint: 'ampacity and voltage drop tie',
  bindingDerating: 'ambient and conductor-count derating',
  bindingTermination: 'termination temperature limit',
  bindingCap: 'small-conductor cap',
  noncontinuousRuleApplied: 'No continuous-load adjustment was applied.',
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
    drop: 'Calculate voltage drop',
    size: 'Find smallest wire',
    length: 'Find max distance',
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
  if (verdict === 'good') return { cls: 'good', badge: 'GOOD', note: 'Within the mandatory 3% limit. This run should perform well.' };
  if (verdict === 'warn') return { cls: 'warn', badge: 'CAUTION', note: 'Over the mandatory 3% branch-circuit or feeder limit, though still within the 5% combined-path maximum. Increase the wire size or shorten the run.' };
  return { cls: 'bad', badge: 'TOO MUCH', note: 'Over the mandatory 5% combined-path maximum. Increase the wire size, shorten the run, or raise the voltage.' };
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
      ['Volts lost in the wire', vdFormat(DROP_TEXT.volts, { volts: fmt(vd) })],
      ['Voltage at the load', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['Started with', vdFormat(DROP_TEXT.volts, { volts: fmt(volts) })],
      ['Guidelines', '3% good · 5% max'],
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
    ? { cls: 'good', badge: 'MAX RUN', note: '' }
    : verdict === 'warn'
      ? { cls: 'warn', badge: 'MAX RUN', note: '' }
      : { cls: 'bad', badge: 'MAX RUN', note: '' };
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
      ['Drop at that distance', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['Voltage at the load', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['Current', vdFormat(DROP_TEXT.amps, { amps: fmt(amps) })],
      ['Guidelines', '3% good · 5% max'],
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
