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
const MATERIAL_NAME = { cu: 'cuivre', al: 'aluminium' };
const AMP_RESULT_TEXT = {
  amps: '{amps} A',
  safeLimit: 'limite sécuritaire du conducteur en {material} {size} à {temp}°C',
  normalMargin: 'Ce conducteur peut transporter la charge dans des conditions normales. Rappel : les charges continues (3+ heures) devraient demeurer sous 80% de la limite, soit {amps} A ici.',
  tightMargin: 'Cela convient, mais avec peu de marge. Pour les charges continues (3+ heures), la chaleur ou les conducteurs groupés, utilisez un calibre supérieur; la recommandation de 80% fixe ici un maximum de {amps} A.',
  notRated: 'Ce conducteur N’EST PAS homologué pour {amps} A. Utilisez un calibre supérieur — un conducteur trop petit surchauffe et présente un risque d’incendie.',
  lookup: '\n<p>{table} indique qu’un conducteur en {material} {size}, dans la colonne de {temp}°C, a un courant admissible de <strong>{tableAmps} A</strong> (au plus trois conducteurs porteurs de courant dans un conduit, à température ambiante normale).</p>',
  cap: '<p>La règle des petits conducteurs ({citation}) limite à <strong>{capAmps} A</strong> le disjoncteur du conducteur en {material} {size}; c’est donc la limite pratique utilisée pour la comparaison.</p>',
  comparison: '<div class="formula">Limite sécuritaire = {rated} A   par rapport à   votre charge = {load} A   →   {status}</div>',
};

let material = 'cu';
let temp = 75;

// Country-aware wording: same verified data both countries (CEC Tables 2/4
// are harmonized with NEC 310.16); citations, cable names, and rules swap.
const AMP_TEXT = {
  us: {
    tableCite: 'NEC tableau 310.16',
    capCite: 'NEC 240.4(D)',
    tempHint: 'Vous hésitez? Utilisez <strong>75°C</strong> : la plupart des bornes de disjoncteur sont homologuées pour cette température. Le câble Romex/NM-B doit utiliser la colonne de 60°C. THHN dans un endroit sec est homologué 90°C, mais les points de raccordement limitent habituellement le circuit à 75°C.',
    expLookup: 'Nous repérons le conducteur dans le tableau américain standard du courant admissible (NEC Table 310.16; conditions normales : au plus trois conducteurs porteurs de courant dans un conduit et température ambiante normale). Pour les petits conducteurs, nous appliquons aussi NEC 240.4(D) : 14 AWG cuivre, maximum 15 A; 12 AWG, 20 A; 10 AWG, 30 A, même si le tableau indique davantage.',
  },
  ca: {
    tableCite: 'CEC Table 2/Table 4 (harmonized avec NEC 310.16)',
    capCite: 'CEC Rule 14-104',
    tempHint: 'ne pas sure? utilisez <strong>75°C</strong> — it\'s quoi la plupart marked breakers et lugs sont homologué pour; unmarked equipment compte as 60°C (CEC Rule 4-006). NMD90 isn\'t blanket-capped à 60°C like American Romex — le terminaisons établit le ceiling — mais fonctionnant cela à le 60°C colonne est le conservative habit.',
    expLookup: 'Nous repérons le conducteur dans les tableaux canadiens du courant admissible (CEC Table 2 pour le cuivre et Table 4 pour l’aluminium; nous avons vérifié que les valeurs correspondent au tableau US). Pour les petits conducteurs, nous appliquons aussi CEC Rule 14-104 : #14 cuivre, maximum 15 A; #12, 20 A; #10, 30 A, même si le tableau indique davantage.',
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
  $('verdict-badge').textContent = ok ? (margin / rated >= 0.2 ? 'OK' : 'SERRÉ') : 'TROP PETIT';
  $('big-number').textContent = vdFormat(AMP_RESULT_TEXT.amps, { amps: rated });
  $('big-label').textContent = vdFormat(AMP_RESULT_TEXT.safeLimit, {
    size: label,
    material: MATERIAL_NAME[material],
    temp,
  });

  const cells = [
    ['votre charge', vdFormat(AMP_RESULT_TEXT.amps, { amps: load })],
    ['tableau courant admissible', vdFormat(AMP_RESULT_TEXT.amps, { amps: tableAmps })],
  ];
  if (cap) cells.push(['Limite du disjoncteur (règle des petits conducteurs)', vdFormat(AMP_RESULT_TEXT.amps, { amps: cap })]);
  cells.push(['Marge disponible', vdFormat(AMP_RESULT_TEXT.amps, { amps: margin >= 0 ? margin : 0 })]);
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
      status: ok ? 'OK' : 'dépasse la limite',
    }),
  ].filter(Boolean).join('\n');

  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

applyAmpCountryText();
