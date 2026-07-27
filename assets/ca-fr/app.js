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
const MATERIAL_NAME = { cu: 'cuivre', al: 'aluminium' };

const SYSTEMS = {
  dc:  { mult: 2,     multLabel: '2',  name: 'DC',
         hint: 'DC: batteries, solaire, véhicules, LED rubans.' },
  ac1: { mult: 2,     multLabel: '2',  name: 'AC monophasé',
         hint: 'monophasé: normal household et light commercial circuits.' },
  ac3: { mult: 1.732, multLabel: '√3 (1.732)', name: 'AC triphasé',
         hint: 'triphasé: commercial et industrial. tension est entre phases.' },
};
const DROP_TEXT = {
  volts: '{volts} V',
  amps: '{amps} A',
  percent: '{percent}%',
  dropLabel: 'chute de tension du conducteur en {material} {size}',
  limit: '{percent}% = {volts} V',
  actualDrop: '{percent}% ({volts} V)',
  noFitLabel: 'aucun calibre indiqué ne garde la chute sous {percent}%',
  noFitNote: 'Même un conducteur en {material} {size} subit une chute supérieure à {percent}% sur {feet} pieds à l’aller avec {amps} A.',
  smallestWireLabel: 'plus petit conducteur en {material} qui garde la chute sous {percent}%',
  ampacityWarning: 'Attention : ceci calcule seulement la chute de tension. Le conducteur doit AUSSI être homologué pour transporter {amps} A de façon sécuritaire (courant admissible); vérifiez ce point séparément avant l’achat.',
  maxDistanceNote: 'À cette distance exacte, la chute atteint {percent}%. Gardez le parcours plus court pour conserver une marge. Le conducteur doit aussi être homologué pour {amps} A (courant admissible), quelle que soit la distance.',
  feet: '{feet} ft',
  maxRunLabel: 'parcours maximal à l’aller pour un conducteur en {material} {size} avec une chute de {percent}%',
  mathIntroRoundTrip: '<p>Nous utilisons la formule standard au facteur K employée par les électriciens :</p>\n<div class="formula">Chute de tension = {mult} × K × ampères × pieds à l’aller ÷ mils circulaires</div>\n<p><strong>{mult}</strong> tient compte du trajet aller-retour : le courant part ET revient, donc le trajet du conducteur vaut deux fois la distance à l’aller (un seul trajet). <strong>K = {factor}</strong> est la constante de résistance du {material} (ohm·cmil/ft à 75°C). <strong>Circular mils</strong> est l’aire de la section du conducteur.</p>',
  mathIntroThreePhase: '<p>Nous utilisons la formule standard au facteur K employée par les électriciens :</p>\n<div class="formula">Chute de tension = {mult} × K × ampères × pieds à l’aller ÷ mils circulaires</div>\n<p><strong>{mult}</strong> tient compte de la géométrie triphasée. <strong>K = {factor}</strong> est la constante de résistance du {material} (ohm·cmil/ft à 75°C). <strong>Circular mils</strong> est l’aire de la section du conducteur.</p>',
  dropMath: '\n<p>Avec vos valeurs ({size} = {cm} mils circulaires) :</p>\n<div class="formula">{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= chute de {dropped} volts\n÷ source de {source} V = {percent}%</div>\n<p>Tension à la charge : {source} − {dropped} = <strong>{endVolts} V</strong>.</p>',
  noFitMath: '<p>Nous avons vérifié tous les calibres, du plus petit au plus gros; aucun n’a donné une chute ≤ {maxDrop} V ({percent}% de {source} V).</p>',
  sizeMath: '\n<p>Nous avons vérifié chaque calibre, du plus petit au plus gros, jusqu’à ce qu’un calibre garde la chute sous votre limite de {percent}% ({maxDrop} V) :</p>\n<div class="formula">{size} ({cm} cmil) :\n{mult} × {factor} × {amps} A × {feet} ft ÷ {cm}\n= {dropped} V = {actualPercent}%  ✓ sous votre limite</div>',
  maxRunMath: '\n<p>Nous avons réorganisé la formule pour calculer la distance, avec votre limite de {percent}% ({maxDrop} V) :</p>\n<div class="formula">Maximum de pieds à l’aller = {maxDrop} V × {cm} cmil\n             ÷ ({mult} × {factor} × {amps} A)\n             = {feet} ft</div>',
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
    drop: 'calculer chute de tension',
    size: 'trouvez plus petit conducteur',
    length: 'trouvez maximum distance',
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

  const feet = mode === 'length' ? null : Number($('distance').value);
  if (mode !== 'length' && !feet) return;

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
  else if (result.mode === 'size') renderSize(result);
  else renderLength(result);
}

// ---- verdict helpers ----
function verdictFor(verdict) {
  if (verdict === 'good') return { cls: 'good', badge: 'bon', note: 'Dans la limite obligatoire de 3%. Ce parcours devrait bien fonctionner.' };
  if (verdict === 'warn') return { cls: 'warn', badge: 'attention', note: 'Au-dessus de la limite obligatoire de 3% du circuit de dérivation ou de l’artère, même si le trajet combiné demeure sous le maximum de 5%. Utilisez un calibre du conducteur supérieur ou raccourcissez le parcours.' };
  return { cls: 'bad', badge: 'trop beaucoup', note: 'Au-dessus du maximum combiné obligatoire de 5%. Utilisez un calibre du conducteur supérieur, raccourcissez le parcours ou augmentez la tension.' };
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
      ['volts perdue dans le conducteur', vdFormat(DROP_TEXT.volts, { volts: fmt(vd) })],
      ['tension à le charge', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['départ avec', vdFormat(DROP_TEXT.volts, { volts: fmt(volts) })],
      ['Repères', '3% bon · 5% maximum'],
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

function renderSize({
  system, material, factor,
  found, largestWire, volts, amps, feet, maxPct, maxVd,
}) {
  if (!found) {
    showResults(
      { cls: 'bad', badge: 'AUCUN CALIBRE', note: 'Aucun conducteur du tableau ne garde la chute sous votre limite. Options : raccourcissez le parcours, augmentez la tension, permettez une chute supérieure ou utilisez des conducteurs en parallèle; consultez un électricien.' },
      '—',
      vdFormat(DROP_TEXT.noFitLabel, { percent: maxPct }),
      [
        ['Votre limite', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
        ['plus grand calibre vérifié', largestWire.label],
      ],
      vdFormat(DROP_TEXT.noFitNote, {
        size: largestWire.label,
        material: MATERIAL_NAME[material],
        percent: fmt(maxPct),
        feet: fmt(feet, 1),
        amps: fmt(amps),
      }),
      [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.noFitMath, {
        maxDrop: fmt(maxVd, 3),
        percent: fmt(maxPct),
        source: fmt(volts),
      })].join('')
    );
    return;
  }
  const v = verdictFor(found.verdict);
  showResults(
    v,
    found.label,
    vdFormat(DROP_TEXT.smallestWireLabel, {
      material: MATERIAL_NAME[material],
      percent: fmt(maxPct),
    }),
    [
      ['chute réelle avec ce calibre', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(found.pct), volts: fmt(found.vd) })],
      ['tension à le charge', vdFormat(DROP_TEXT.volts, { volts: fmt(found.endVolts) })],
      ['Votre limite', vdFormat(DROP_TEXT.limit, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['Repères', '3% bon · 5% maximum'],
    ],
    vdFormat(DROP_TEXT.ampacityWarning, { amps: fmt(amps) }),
    [mathIntro({ system, material, factor }), vdFormat(DROP_TEXT.sizeMath, {
      percent: fmt(maxPct),
      maxDrop: fmt(maxVd, 3),
      size: found.label,
      cm: found.cm.toLocaleString('en-US'),
      mult: SYSTEMS[system].multLabel,
      factor,
      amps: fmt(amps),
      feet: fmt(feet, 1),
      dropped: fmt(found.vd, 3),
      actualPercent: fmt(found.pct),
    })].join('')
  );
}

function renderLength({
  system, material, factor,
  label, cm, volts, amps, maxPct, maxVd, feet, endVolts, verdict,
}) {
  const v = verdict === 'good'
    ? { cls: 'good', badge: 'maximum parcours', note: '' }
    : verdict === 'warn'
      ? { cls: 'warn', badge: 'maximum parcours', note: '' }
      : { cls: 'bad', badge: 'maximum parcours', note: '' };
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
      ['chute à que distance', vdFormat(DROP_TEXT.actualDrop, { percent: fmt(maxPct), volts: fmt(maxVd) })],
      ['tension à le charge', vdFormat(DROP_TEXT.volts, { volts: fmt(endVolts) })],
      ['Courant', vdFormat(DROP_TEXT.amps, { amps: fmt(amps) })],
      ['Repères', '3% bon · 5% maximum'],
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
