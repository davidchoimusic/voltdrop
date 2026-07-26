/* VoltDrop — Power Calculator
   DC:  P = V·I
   1φ:  P = V·I·PF
   3φ:  P = √3·V(line-line)·I·PF
   kVA = V·I(·√3) / 1000; kW = P/1000.

   V/I is resistance only on DC. On AC it is impedance; its resistive
   component is Z·PF. Three-phase ohms need the missing wye/delta connection,
   so every ohms path refuses that system instead of inventing an answer. */

const SQRT3 = 1.7320508;

const SYSTEMS = {
  dc:  { name: 'DC', mult: 1, usesPF: false, multLabel: '', hint: 'DC: batteries, solar, vehicles, LED strips.' },
  ac1: { name: 'AC single-phase', mult: 1, usesPF: true, multLabel: '', hint: 'Single-phase: normal household and light commercial circuits.' },
  ac3: { name: 'AC three-phase', mult: SQRT3, usesPF: true, multLabel: '√3 × ', hint: 'Three-phase: commercial and industrial. Enter line-to-line voltage.' },
};
const POWER_RESULT_TEXT = {
  amps: '{amps} A',
  watts: '{watts} W',
  volts: '{volts} V',
  ohms: '{ohms} Ω',
  kilovoltAmps: '{kva} kVA',
  resultLabel: '{result} · {system}',
  wattsAndKilowatts: '{watts} W ({kilowatts} kW)',
  ampsFormula: 'Amps = watts ÷ ({mult}volts)\n     = {watts} ÷ ({mult}{volts})\n     = {amps} A',
  ampsPfFormula: 'Amps = watts ÷ ({mult}volts × PF)\n     = {watts} ÷ ({mult}{volts} × {pf})\n     = {amps} A',
  ampsOhmsFormula: 'Amps = volts ÷ {quantity}\n     = {volts} ÷ {ohms}\n     = {amps} A',
  wattsFormula: 'Watts = {mult}volts × amps\n      = {mult}{volts} × {amps}\n      = {watts} W',
  wattsPfFormula: 'Watts = {mult}volts × amps × PF\n      = {mult}{volts} × {amps} × {pf}\n      = {watts} W',
  voltsFormula: 'Volts = watts ÷ ({mult}amps)\n      = {watts} ÷ ({mult}{amps})\n      = {volts} V',
  voltsPfFormula: 'Volts = watts ÷ ({mult}amps × PF)\n      = {watts} ÷ ({mult}{amps} × {pf})\n      = {volts} V',
  voltsOhmsFormula: 'Volts = amps × {quantity}\n      = {amps} × {ohms}\n      = {volts} V',
  resistanceFormula: 'Resistance = volts ÷ amps\n           = {volts} ÷ {amps}\n           = {ohms} Ω',
  impedanceFormula: 'Impedance = volts ÷ amps\n          = {volts} ÷ {amps}\n          = {ohms} Ω\nResistive part ≈ impedance × PF\n               = {ohms} × {pf}\n               ≈ {resistance} Ω',
  math: '\n<p>{system}:</p>\n<div class="formula">{formula}</div>\n',
  mathWithPf: '\n<p>{system} with power factor {pf}:</p>\n<div class="formula">{formula}</div>\n<p>Apparent power: {mult}{volts} V × {amps} A = {va} VA = <strong>{kva} kVA</strong>.</p>',
};
const POWER_UI_TEXT = {
  current: 'current',
  realPower: 'real power',
  voltage: 'voltage',
  resistance: 'resistance',
  impedance: 'impedance',
  volts: 'Volts',
  amps: 'Amps',
  watts: 'Watts',
  resistanceR: 'Resistance (R)',
  impedanceZ: 'Impedance (Z)',
  resistivePartResistance: 'Resistive part — Resistance (R ≈ Z × power factor)',
  apparentPower: 'Apparent power',
  powerFactor: 'Power factor',
  checkInput: 'CHECK INPUT',
  enterPositiveValues: 'Enter a value greater than zero in every field shown.',
  currentMustBeGreaterThanZero: 'Current must be greater than zero to calculate resistance or impedance. Enter the measured amps.',
  ohmsMustBeGreaterThanZero: 'Enter a value above 0 Ω. 0 Ω is a dead short and would make the calculated current infinite.',
  nextStep: 'Next step: check this current against wire size and ampacity before choosing a wire.',
};

let find = 'amps';
let system = 'dc';
let known = 'watts';

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
const defaultResultBadge = $('pw-result-badge').textContent;
const ohmsUnavailableMessage = $('pw-ohms-unavailable').textContent;
const SEGMENT_SELECTORS = {
  find: '[data-find]',
  system: '[data-system]',
  known: '[data-known]',
};

const syncSegment = (key, value) => {
  document.querySelectorAll(SEGMENT_SELECTORS[key]).forEach((button) => {
    const active = button.dataset[key] === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
};

document.querySelectorAll('#pw-form .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const hadResults = !$('results').hidden;
    if ('find' in btn.dataset) find = btn.dataset.find;
    if ('system' in btn.dataset) system = btn.dataset.system;
    if ('known' in btn.dataset) known = btn.dataset.known;
    const refused = applyMode();
    if (refused) {
      showError(ohmsUnavailableMessage);
    } else if (hadResults) {
      calc();
    }
  });
});

function applyMode() {
  let refused = false;
  const requestedOhmsInput = (find === 'amps' || find === 'volts') && known === 'ohms';
  if (system === 'ac3' && (find === 'ohms' || requestedOhmsInput)) {
    refused = true;
    if (find === 'ohms') find = 'amps';
    known = 'watts';
  }

  const solvesFromOhms = (find === 'amps' || find === 'volts') && known === 'ohms';
  const needsKnownChoice = find === 'amps' || find === 'volts';
  const ohmsUnavailable = system === 'ac3';

  $('pw-find-ohms').disabled = ohmsUnavailable;
  $('pw-known-ohms').disabled = ohmsUnavailable;
  $('pw-ohms-unavailable').hidden = !ohmsUnavailable;
  $('pw-system-hint').textContent = SYSTEMS[system].hint;
  $('pw-voltage-hint').hidden = system !== 'ac3';
  $('pw-known-field').hidden = !needsKnownChoice;
  $('pw-ohms-label').textContent = system === 'dc' ? 'Resistance (Ω)' : 'Impedance (Ω)';

  // A solved field and an unused alternative must never stay active inputs.
  $('pw-field-volts').hidden = find === 'volts';
  $('pw-field-amps').hidden = find === 'amps';
  $('pw-field-watts').hidden = find === 'watts' || find === 'ohms' || solvesFromOhms;
  $('pw-field-ohms').hidden = !solvesFromOhms;
  $('pw-field-pf').hidden = !SYSTEMS[system].usesPF || solvesFromOhms;

  for (const [inputId, fieldId] of [
    ['pw-volts', 'pw-field-volts'],
    ['pw-amps', 'pw-field-amps'],
    ['pw-watts', 'pw-field-watts'],
    ['pw-ohms', 'pw-field-ohms'],
    ['pw-pf', 'pw-field-pf'],
  ]) {
    $(inputId).required = !$(fieldId).hidden;
  }

  syncSegment('find', find);
  syncSegment('system', system);
  syncSegment('known', known);
  return refused;
}
applyMode();

$('pw-form').addEventListener('submit', (e) => {
  e.preventDefault();
  calc();
});

function showError(message) {
  $('verdict').className = 'verdict bad';
  $('pw-result-badge').textContent = POWER_UI_TEXT.checkInput;
  $('big-number').textContent = '—';
  $('big-label').textContent = message;
  $('result-grid').innerHTML = '';
  $('verdict-note').textContent = '';
  $('math-body').innerHTML = '';
  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function calc() {
  const sys = SYSTEMS[system];
  const solvesFromOhms = (find === 'amps' || find === 'volts') && known === 'ohms';
  if (system === 'ac3' && (find === 'ohms' || solvesFromOhms)) {
    showError(ohmsUnavailableMessage);
    return;
  }

  let volts = Number($('pw-volts').value);
  let amps = Number($('pw-amps').value);
  let watts = Number($('pw-watts').value);
  let ohms = Number($('pw-ohms').value);
  const pfText = $('pw-pf').value.trim();
  const pf = sys.usesPF && !solvesFromOhms
    ? (pfText === '' ? 1 : Number(pfText))
    : 1;

  const requiredValues = find === 'amps'
    ? (solvesFromOhms ? [volts, ohms] : [volts, watts, pf])
    : find === 'watts'
      ? [volts, amps, pf]
      : find === 'volts'
        ? (solvesFromOhms ? [amps, ohms] : [watts, amps, pf])
        : [volts, amps, pf];

  if (requiredValues.some((value) => !Number.isFinite(value) || value < 0)) {
    showError(POWER_UI_TEXT.enterPositiveValues);
    return;
  }
  if (find === 'ohms' && amps === 0) {
    showError(POWER_UI_TEXT.currentMustBeGreaterThanZero);
    return;
  }
  if (solvesFromOhms && ohms === 0) {
    showError(POWER_UI_TEXT.ohmsMustBeGreaterThanZero);
    return;
  }
  if (requiredValues.some((value) => value === 0) || (sys.usesPF && !solvesFromOhms && (pf < 0.1 || pf > 1))) {
    showError(POWER_UI_TEXT.enterPositiveValues);
    return;
  }

  if (find === 'amps') {
    amps = solvesFromOhms
      ? volts / ohms
      : watts / (sys.mult * volts * pf);
  } else if (find === 'watts') {
    watts = sys.mult * volts * amps * pf;
  } else if (find === 'volts') {
    volts = solvesFromOhms
      ? amps * ohms
      : watts / (sys.mult * amps * pf);
  } else {
    ohms = volts / amps;
    watts = sys.mult * volts * amps * pf;
  }

  // Power is derivable on DC from an ohms input, but on AC real watts also
  // needs a power factor that this path deliberately does not pretend to know.
  if (solvesFromOhms && !sys.usesPF) watts = volts * amps;

  const va = sys.mult * volts * amps;
  const kva = va / 1000;
  const kw = watts / 1000;
  const resistivePart = ohms * pf;
  const quantity = system === 'dc' ? POWER_UI_TEXT.resistance : POWER_UI_TEXT.impedance;

  const big = find === 'amps'
    ? vdFormat(POWER_RESULT_TEXT.amps, { amps: fmt(amps) })
    : find === 'watts'
      ? vdFormat(POWER_RESULT_TEXT.watts, { watts: fmt(watts, 1) })
      : find === 'volts'
        ? vdFormat(POWER_RESULT_TEXT.volts, { volts: fmt(volts, 1) })
        : vdFormat(POWER_RESULT_TEXT.ohms, { ohms: fmt(ohms) });
  $('big-number').textContent = big;
  $('big-label').textContent = vdFormat(POWER_RESULT_TEXT.resultLabel, {
    result: {
      amps: POWER_UI_TEXT.current,
      watts: POWER_UI_TEXT.realPower,
      volts: POWER_UI_TEXT.voltage,
      ohms: quantity,
    }[find],
    system: sys.name,
  });

  let cells;
  if (find === 'ohms') {
    cells = [
      [POWER_UI_TEXT.volts, vdFormat(POWER_RESULT_TEXT.volts, { volts: fmt(volts, 1) })],
      [POWER_UI_TEXT.amps, vdFormat(POWER_RESULT_TEXT.amps, { amps: fmt(amps) })],
      [system === 'dc' ? POWER_UI_TEXT.resistanceR : POWER_UI_TEXT.impedanceZ,
        vdFormat(POWER_RESULT_TEXT.ohms, { ohms: fmt(ohms) })],
    ];
    if (sys.usesPF) {
      cells.push([POWER_UI_TEXT.powerFactor, fmt(pf, 2)]);
      cells.push([
        POWER_UI_TEXT.resistivePartResistance,
        vdFormat(POWER_RESULT_TEXT.ohms, { ohms: fmt(resistivePart) }),
      ]);
    }
  } else if (solvesFromOhms) {
    cells = [
      [POWER_UI_TEXT.volts, vdFormat(POWER_RESULT_TEXT.volts, { volts: fmt(volts, 1) })],
      [POWER_UI_TEXT.amps, vdFormat(POWER_RESULT_TEXT.amps, { amps: fmt(amps) })],
      [system === 'dc' ? POWER_UI_TEXT.resistanceR : POWER_UI_TEXT.impedanceZ,
        vdFormat(POWER_RESULT_TEXT.ohms, { ohms: fmt(ohms) })],
    ];
  } else {
    cells = [
      [POWER_UI_TEXT.volts, vdFormat(POWER_RESULT_TEXT.volts, { volts: fmt(volts, 1) })],
      [POWER_UI_TEXT.amps, vdFormat(POWER_RESULT_TEXT.amps, { amps: fmt(amps) })],
      [POWER_UI_TEXT.watts, vdFormat(POWER_RESULT_TEXT.wattsAndKilowatts, {
        watts: fmt(watts, 1),
        kilowatts: fmt(kw, 3),
      })],
    ];
    if (sys.usesPF) {
      cells.push([POWER_UI_TEXT.apparentPower, vdFormat(POWER_RESULT_TEXT.kilovoltAmps, { kva: fmt(kva, 3) })]);
      cells.push([POWER_UI_TEXT.powerFactor, fmt(pf, 2)]);
    }
  }
  $('result-grid').innerHTML = cells
    .map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join('');

  $('verdict-note').textContent = find === 'amps' ? POWER_UI_TEXT.nextStep : '';

  const formulaPattern = find === 'amps'
    ? (solvesFromOhms
        ? POWER_RESULT_TEXT.ampsOhmsFormula
        : (sys.usesPF ? POWER_RESULT_TEXT.ampsPfFormula : POWER_RESULT_TEXT.ampsFormula))
    : find === 'watts'
      ? (sys.usesPF ? POWER_RESULT_TEXT.wattsPfFormula : POWER_RESULT_TEXT.wattsFormula)
      : find === 'volts'
        ? (solvesFromOhms
            ? POWER_RESULT_TEXT.voltsOhmsFormula
            : (sys.usesPF ? POWER_RESULT_TEXT.voltsPfFormula : POWER_RESULT_TEXT.voltsFormula))
        : (sys.usesPF ? POWER_RESULT_TEXT.impedanceFormula : POWER_RESULT_TEXT.resistanceFormula);
  const formula = vdFormat(formulaPattern, {
    mult: sys.multLabel,
    volts: fmt(volts, 1),
    amps: fmt(amps),
    watts: fmt(watts, 1),
    ohms: fmt(ohms),
    resistance: fmt(resistivePart),
    quantity,
    pf: fmt(pf, 2),
  });

  $('math-body').innerHTML = vdFormat(
    sys.usesPF && !solvesFromOhms ? POWER_RESULT_TEXT.mathWithPf : POWER_RESULT_TEXT.math,
    {
      system: sys.name,
      pf: fmt(pf, 2),
      formula,
      mult: sys.multLabel,
      volts: fmt(volts, 1),
      amps: fmt(amps),
      va: fmt(va, 1),
      kva: fmt(kva, 3),
    },
  );

  $('verdict').className = 'verdict good';
  $('pw-result-badge').textContent = defaultResultBadge;
  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
