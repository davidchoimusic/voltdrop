/* VoltDrop — Conduit Fill
   Data: NEC Chapter 9 Table 5 (THHN/THWN areas, sq in) and Table 4
   (conduit total internal area, sq in). Fill limits: 1 wire 53%,
   2 wires 31%, 3+ wires 40%. */

const THHN_AREA = {
  '14 AWG': 0.0097, '12 AWG': 0.0133, '10 AWG': 0.0211, '8 AWG': 0.0366,
  '6 AWG': 0.0507, '4 AWG': 0.0824, '3 AWG': 0.0973, '2 AWG': 0.1158,
  '1 AWG': 0.1562, '1/0 AWG': 0.1855, '2/0 AWG': 0.2223, '3/0 AWG': 0.2679,
  '4/0 AWG': 0.3237, '250 kcmil': 0.3970, '300 kcmil': 0.4608,
  '350 kcmil': 0.5242, '400 kcmil': 0.5863, '500 kcmil': 0.7073,
};

const CONDUIT = {
  emt: {
    name: 'EMT',
    sizes: [['1/2"', 0.304], ['3/4"', 0.533], ['1"', 0.864], ['1-1/4"', 1.496], ['1-1/2"', 2.036], ['2"', 3.356], ['2-1/2"', 5.858], ['3"', 8.846], ['3-1/2"', 11.545], ['4"', 14.753]],
  },
  pvc40: {
    name: 'PVC Sch 40',
    sizes: [['1/2"', 0.285], ['3/4"', 0.508], ['1"', 0.832], ['1-1/4"', 1.453], ['1-1/2"', 1.986], ['2"', 3.291], ['2-1/2"', 4.695], ['3"', 7.268], ['3-1/2"', 9.737], ['4"', 12.554]],
  },
};

const fillLimit = (n) => (n === 1 ? 0.53 : n === 2 ? 0.31 : 0.40);

let conduitType = 'emt';

const $ = (id) => document.getElementById(id);

const sel = $('fill-size');
Object.keys(THHN_AREA).forEach((label) => {
  const opt = document.createElement('option');
  opt.value = label;
  opt.textContent = label;
  sel.appendChild(opt);
});
sel.value = '12 AWG';

document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.seg');
    group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if ('conduit' in btn.dataset) conduitType = btn.dataset.conduit;
    if (!$('results').hidden) calc();
  });
});

$('fill-form').addEventListener('submit', (e) => { e.preventDefault(); calc(); });

function calc() {
  const count = Math.floor(Number($('fill-count').value));
  if (!count || count < 1) return;
  const label = $('fill-size').value;
  const wireArea = THHN_AREA[label];
  const needed = wireArea * count;
  const limit = fillLimit(count);
  const family = CONDUIT[conduitType];

  let pick = null;
  for (const [size, area] of family.sizes) {
    if (needed <= area * limit) { pick = { size, area }; break; }
  }

  const verdict = $('verdict');
  if (!pick) {
    verdict.className = 'verdict bad';
    $('verdict-badge').textContent = 'TOO MANY';
    $('big-number').textContent = '—';
    $('big-label').textContent = 'more than a 4" ' + family.name + ' can legally hold';
    $('result-grid').innerHTML = '';
    $('verdict-note').textContent = 'Split the run across multiple conduits or reduce the wire count.';
    $('math-body').innerHTML = `<p>${count} × ${label} THHN = ${needed.toFixed(3)} sq in of wire, which exceeds the ${Math.round(limit * 100)}% fill limit of even 4" ${family.name}.</p>`;
    $('results').hidden = false;
    return;
  }

  const pct = (needed / pick.area) * 100;
  verdict.className = 'verdict ' + (pct <= limit * 100 * 0.85 ? 'good' : 'warn');
  $('verdict-badge').textContent = pct <= limit * 100 * 0.85 ? 'FITS' : 'SNUG';
  $('big-number').textContent = pick.size;
  $('big-label').textContent = 'smallest ' + family.name + ' for ' + count + ' × ' + label + ' THHN';

  const nextUp = family.sizes[family.sizes.findIndex(([s]) => s === pick.size) + 1];
  $('result-grid').innerHTML = [
    ['Fill at this size', pct.toFixed(1) + '% of ' + pick.size],
    ['Legal limit', Math.round(limit * 100) + '% for ' + (count >= 3 ? '3+ wires' : count + ' wire' + (count > 1 ? 's' : ''))],
    ['Wire area total', needed.toFixed(3) + ' sq in'],
    nextUp ? ['Easier pull: next size up', nextUp[0]] : ['This is the largest size', '4"'],
  ].map(([k, v]) => `<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  $('verdict-note').textContent = pct > limit * 100 * 0.85
    ? 'Legal, but close to the limit — long runs or multiple bends will pull much easier one size up.'
    : 'Comfortable fit under the ' + Math.round(limit * 100) + '% limit.';

  $('math-body').innerHTML = `
<p>Each ${label} THHN wire has a cross-section of <strong>${wireArea} sq in</strong> (NEC Chapter 9, Table 5).</p>
<div class="formula">${count} wires × ${wireArea} = ${needed.toFixed(4)} sq in needed
${pick.size} ${family.name} inside area = ${pick.area} sq in (NEC Chapter 9, Table 4)
Allowed: ${pick.area} × ${Math.round(limit * 100)}% = ${(pick.area * limit).toFixed(4)} sq in
${needed.toFixed(4)} ≤ ${(pick.area * limit).toFixed(4)}  →  fits at ${pct.toFixed(1)}% fill</div>`;

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
