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

  const big = find === 'amps' ? fmt(amps) + ' A' : find === 'watts' ? fmt(watts, 1) + ' W' : fmt(volts, 1) + ' V';
  $('big-number').textContent = big;
  $('big-label').textContent = { amps: 'current', watts: 'real power', volts: 'voltage' }[find] + ' · ' + sys.name;

  const cells = [
    ['Volts', fmt(volts, 1) + ' V'],
    ['Amps', fmt(amps) + ' A'],
    ['Watts', fmt(watts, 1) + ' W (' + fmt(kw, 3) + ' kW)'],
  ];
  if (sys.usesPF) {
    cells.push(['Apparent power', fmt(kva, 3) + ' kVA']);
    cells.push(['Power factor', fmt(pf, 2)]);
  }
  $('result-grid').innerHTML = cells
    .map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join('');

  $('verdict-note').textContent = find === 'amps'
    ? 'Next step: check this current against wire size and ampacity before choosing a wire.'
    : '';

  const formula = find === 'amps'
    ? `Amps = watts ÷ (${sys.multLabel}volts${sys.usesPF ? ' × PF' : ''})
     = ${fmt(watts, 1)} ÷ (${sys.multLabel}${fmt(volts, 1)}${sys.usesPF ? ' × ' + fmt(pf, 2) : ''})
     = ${fmt(amps)} A`
    : find === 'watts'
      ? `Watts = ${sys.multLabel}volts × amps${sys.usesPF ? ' × PF' : ''}
      = ${sys.multLabel}${fmt(volts, 1)} × ${fmt(amps)}${sys.usesPF ? ' × ' + fmt(pf, 2) : ''}
      = ${fmt(watts, 1)} W`
      : `Volts = watts ÷ (${sys.multLabel}amps${sys.usesPF ? ' × PF' : ''})
      = ${fmt(watts, 1)} ÷ (${sys.multLabel}${fmt(amps)}${sys.usesPF ? ' × ' + fmt(pf, 2) : ''})
      = ${fmt(volts, 1)} V`;

  $('math-body').innerHTML = `
<p>${sys.name}${sys.usesPF ? ' with power factor ' + fmt(pf, 2) : ''}:</p>
<div class="formula">${formula}</div>
${sys.usesPF ? `<p>Apparent power: ${sys.multLabel}${fmt(volts, 1)} V × ${fmt(amps)} A = ${fmt(va, 1)} VA = <strong>${fmt(kva, 3)} kVA</strong>.</p>` : ''}`;

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
