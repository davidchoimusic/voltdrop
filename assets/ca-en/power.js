/* VoltDrop — Power Calculator
   DC:  P = V·I
   1φ:  P = V·I·PF
   3φ:  P = √3·V(line-line)·I·PF
   kVA = V·I(·√3) / 1000; kW = P/1000. */

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
  kilovoltAmps: '{kva} kVA',
  resultLabel: '{result} · {system}',
  wattsAndKilowatts: '{watts} W ({kilowatts} kW)',
  ampsFormula: 'Amps = watts ÷ ({mult}volts)\n     = {watts} ÷ ({mult}{volts})\n     = {amps} A',
  ampsPfFormula: 'Amps = watts ÷ ({mult}volts × PF)\n     = {watts} ÷ ({mult}{volts} × {pf})\n     = {amps} A',
  wattsFormula: 'Watts = {mult}volts × amps\n      = {mult}{volts} × {amps}\n      = {watts} W',
  wattsPfFormula: 'Watts = {mult}volts × amps × PF\n      = {mult}{volts} × {amps} × {pf}\n      = {watts} W',
  voltsFormula: 'Volts = watts ÷ ({mult}amps)\n      = {watts} ÷ ({mult}{amps})\n      = {volts} V',
  voltsPfFormula: 'Volts = watts ÷ ({mult}amps × PF)\n      = {watts} ÷ ({mult}{amps} × {pf})\n      = {volts} V',
  math: '\n<p>{system}:</p>\n<div class="formula">{formula}</div>\n',
  mathWithPf: '\n<p>{system} with power factor {pf}:</p>\n<div class="formula">{formula}</div>\n<p>Apparent power: {mult}{volts} V × {amps} A = {va} VA = <strong>{kva} kVA</strong>.</p>',
};

let find = 'amps';
let system = 'dc';

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });

document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.seg');
    group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if ('find' in btn.dataset) { find = btn.dataset.find; applyMode(); }
    if ('system' in btn.dataset) { system = btn.dataset.system; applyMode(); }
    if (!$('results').hidden) calc();
  });
});

function applyMode() {
  $('pw-system-hint').textContent = SYSTEMS[system].hint;
  // Show the two inputs that aren't being solved for.
  $('pw-field-volts').hidden = find === 'volts';
  $('pw-field-amps').hidden = find === 'amps';
  $('pw-field-watts').hidden = find === 'watts';
  $('pw-volts').required = find !== 'volts';
  $('pw-amps').required = find !== 'amps';
  $('pw-watts').required = find !== 'watts';
  $('pw-field-pf').hidden = !SYSTEMS[system].usesPF;
}
applyMode();

$('pw-form').addEventListener('submit', (e) => { e.preventDefault(); calc(); });

function calc() {
  const sys = SYSTEMS[system];
  const pf = sys.usesPF ? Math.min(Math.max(Number($('pw-pf').value) || 1, 0.1), 1) : 1;
  let volts = Number($('pw-volts').value);
  let amps = Number($('pw-amps').value);
  let watts = Number($('pw-watts').value);

  if (find === 'amps') {
    if (!volts || !watts) return;
    amps = watts / (sys.mult * volts * pf);
  } else if (find === 'watts') {
    if (!volts || !amps) return;
    watts = sys.mult * volts * amps * pf;
  } else {
    if (!watts || !amps) return;
    volts = watts / (sys.mult * amps * pf);
  }

  const va = sys.mult * volts * amps; // apparent power
  const kva = va / 1000;
  const kw = watts / 1000;

  const big = find === 'amps'
    ? vdFormat(POWER_RESULT_TEXT.amps, { amps: fmt(amps) })
    : find === 'watts'
      ? vdFormat(POWER_RESULT_TEXT.watts, { watts: fmt(watts, 1) })
      : vdFormat(POWER_RESULT_TEXT.volts, { volts: fmt(volts, 1) });
  $('big-number').textContent = big;
  $('big-label').textContent = vdFormat(POWER_RESULT_TEXT.resultLabel, {
    result: { amps: 'current', watts: 'real power', volts: 'voltage' }[find],
    system: sys.name,
  });

  const cells = [
    ['Volts', vdFormat(POWER_RESULT_TEXT.volts, { volts: fmt(volts, 1) })],
    ['Amps', vdFormat(POWER_RESULT_TEXT.amps, { amps: fmt(amps) })],
    ['Watts', vdFormat(POWER_RESULT_TEXT.wattsAndKilowatts, {
      watts: fmt(watts, 1),
      kilowatts: fmt(kw, 3),
    })],
  ];
  if (sys.usesPF) {
    cells.push(['Apparent power', vdFormat(POWER_RESULT_TEXT.kilovoltAmps, { kva: fmt(kva, 3) })]);
    cells.push(['Power factor', fmt(pf, 2)]);
  }
  $('result-grid').innerHTML = cells
    .map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join('');

  $('verdict-note').textContent = find === 'amps'
    ? 'Next step: check this current against wire size and ampacity before choosing a wire.'
    : '';

  const formulaPattern = find === 'amps'
    ? (sys.usesPF ? POWER_RESULT_TEXT.ampsPfFormula : POWER_RESULT_TEXT.ampsFormula)
    : find === 'watts'
      ? (sys.usesPF ? POWER_RESULT_TEXT.wattsPfFormula : POWER_RESULT_TEXT.wattsFormula)
      : (sys.usesPF ? POWER_RESULT_TEXT.voltsPfFormula : POWER_RESULT_TEXT.voltsFormula);
  const formula = vdFormat(formulaPattern, {
    mult: sys.multLabel,
    volts: fmt(volts, 1),
    amps: fmt(amps),
    watts: fmt(watts, 1),
    pf: fmt(pf, 2),
  });

  $('math-body').innerHTML = vdFormat(
    sys.usesPF ? POWER_RESULT_TEXT.mathWithPf : POWER_RESULT_TEXT.math,
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

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
