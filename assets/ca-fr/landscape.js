/* VoltDrop — Landscape Lighting (low-voltage lighting systems)

   WHY THIS TOOL EXISTS: every other calculator here — including ours — puts one
   load at the far end of one run. A landscape run does not work that way. The
   fixtures are tapped along the cable, so the stretch nearest the transformer
   carries every fixture's current and the last stretch carries one. Modelling
   the whole load at the full distance overstates the drop badly (for N evenly
   spaced equal fixtures it is wrong by a factor of 2N/(N+1)), which pushes
   installers toward heavier cable than they need.

   AC, NOT DC. A landscape transformer is a transformer: line voltage in,
   low-voltage AC out. At these gauges and lengths the drop is resistive, so the
   arithmetic matches the DC case (the factor of 2 is the out-and-back conductor
   pair, applied per physical segment). What differs is the current: an LED
   driver is not a unity-power-factor load, so watts / volts is an estimate, not
   a measurement. Rated amps or VA from the fixture is preferred, and the watts
   path is labelled with its assumption.

   NO CODE VERDICT — AND NO CLAIM ABOUT WHAT CODE SAYS. The acceptable voltage
   window for a fixture belongs to its manufacturer, so this tool reports voltages
   and leaves the judgement to the data sheet, with optional fields so the
   installer can enter their own fixture's limits and have them checked.
   NOT VERIFIED, deliberately unclaimed: CEC Rule 8-102 makes drop limits
   mandatory for branch circuits and feeders, and whether those extend to a
   low-voltage lighting system on the load side of a transformer has not been
   checked against the standard. So no page in any edition asserts that a code
   limit does or does not apply here. Verify before ever writing one. */

/* Sealed copy of the canonical table in app.js. verify.mjs fingerprints this
   copy AND asserts it is value-identical to app.js, so the two cannot drift
   apart silently. Never edit one without the other. The right long-term fix is
   a single shared data module; that means editing the live voltage-drop
   calculator, so it is deliberately a separate job. */
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

/* Sealed copy of app.js K_FACTOR. Written multi-line on purpose so the data
   tripwire's regex binds to this literal alone. */
const K_FACTOR = {
  cu: 12.9,
  al: 21.2,
};

/* ------------------------------------------------------------------ engine --
   A layout is a TREE. Loads hang off nodes; cable runs are edges. An edge
   carries the sum of every load in the subtree beyond it. A daisy chain, a hub
   and a star are three different trees over the same fixtures, which is why the
   engine is a tree and not a sorted list — you cannot derive a hub from "how
   far away is each light".

   Pure functions, no DOM, declared at top level so verify.mjs can call them
   directly in the page.

   KNOWN LIMIT: k (the material constant) is tree-wide, while cm sits per edge.
   So v1 can already handle mixed conductor SIZES, but copper and aluminum cannot
   be mixed in one layout. Moving k onto the edge is the change required, and it
   must happen before any mixed-material feature ships. */

const SOURCE_ID = 'source';

/* Resolve one fixture's current from a SINGLE load field plus a unit, rather
   than three competing fields with priority rules — on a phone, three fields
   means everyone types watts and the power-factor assumption becomes the silent
   default. Returns the basis and any assumption so the UI can disclose it.

   Watts is the weakest basis: real current is W / (V × PF), so treating watts as
   volt-amperes assumes PF = 1, which is a BEST CASE. It understates current and
   therefore understates drop. Flagged, never hidden. */
function fixtureAmps(fixture) {
  const value = Number(fixture.load);
  const ratedVolts = Number(fixture.ratedVolts);
  const none = { amps: 0, basis: 'none', assumedUnityPf: false };
  if (!Number.isFinite(value) || value <= 0) return none;

  const unit = fixture.unit ?? 'a';
  if (unit === 'a') return { amps: value, basis: 'amps', assumedUnityPf: false };
  if (!Number.isFinite(ratedVolts) || ratedVolts <= 0) return none;
  if (unit === 'va') return { amps: value / ratedVolts, basis: 'va', assumedUnityPf: false };
  if (unit === 'w') {
    const pf = Number(fixture.pf);
    const given = Number.isFinite(pf) && pf > 0 && pf <= 1;
    return {
      amps: value / (ratedVolts * (given ? pf : 1)),
      basis: 'watts',
      assumedUnityPf: !given,
    };
  }
  return none;
}

/* Solve a tree. Throws on anything that is not a single-rooted tree rather than
   quietly "repairing" a graph the installer did not describe. */
function solveTree(tree) {
  const { sourceVolts, k, nodes, edges } = tree;
  if (!Number.isFinite(sourceVolts) || sourceVolts <= 0) throw new Error('source voltage must be positive');
  if (!Number.isFinite(k) || k <= 0) throw new Error('k factor must be positive');

  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) throw new Error('duplicate node id');
    for (const load of node.loads ?? []) {
      if (!Number.isFinite(Number(load.amps)) || Number(load.amps) < 0) {
        throw new Error('load current must be a finite, non-negative number');
      }
    }
    byId.set(node.id, node);
  }
  if (!byId.has(SOURCE_ID)) throw new Error('tree has no source node');
  if (edges.length !== nodes.length - 1) throw new Error('not a tree: edge count');

  const children = new Map();
  const feed = new Map();
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) throw new Error('edge references unknown node');
    if (edge.from === edge.to) throw new Error('not a tree: self loop');
    if (edge.to === SOURCE_ID) throw new Error('not a tree: source is fed by an edge');
    if (feed.has(edge.to)) throw new Error('not a tree: node fed twice');
    const lengthFt = Number(edge.lengthFt);
    if (!Number.isFinite(lengthFt) || lengthFt < 0) throw new Error('edge length must be a finite, non-negative number');
    if (!Number.isFinite(Number(edge.cm)) || Number(edge.cm) <= 0) throw new Error('edge needs a conductor size');
    feed.set(edge.to, edge);
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge);
  }

  // Reachable from source exactly once — catches cycles and orphans.
  const order = [];
  const seen = new Set([SOURCE_ID]);
  const stack = [SOURCE_ID];
  while (stack.length) {
    const id = stack.pop();
    order.push(id);
    for (const edge of children.get(id) ?? []) {
      if (seen.has(edge.to)) throw new Error('not a tree: cycle or repeated node');
      seen.add(edge.to);
      stack.push(edge.to);
    }
  }
  if (seen.size !== nodes.length) throw new Error('not a tree: unreachable node');

  // Post-order: a node's subtree current is its own loads plus its children's.
  const subtreeAmps = new Map();
  for (const id of [...order].reverse()) {
    const own = (byId.get(id).loads ?? []).reduce((sum, load) => sum + (Number(load.amps) || 0), 0);
    const below = (children.get(id) ?? []).reduce((sum, edge) => sum + subtreeAmps.get(edge.to), 0);
    subtreeAmps.set(id, own + below);
  }

  // Pre-order: each edge drops 2·K·I·L/CM, and a node's voltage is the source
  // voltage minus every drop along its unique path back to the transformer.
  const volts = new Map([[SOURCE_ID, sourceVolts]]);
  const edgeDrops = [];
  for (const id of order) {
    for (const edge of children.get(id) ?? []) {
      const amps = subtreeAmps.get(edge.to);
      const drop = (2 * k * amps * Number(edge.lengthFt)) / Number(edge.cm);
      edgeDrops.push({ from: edge.from, to: edge.to, amps, lengthFt: Number(edge.lengthFt), drop });
      volts.set(edge.to, volts.get(id) - drop);
    }
  }

  const taps = nodes
    .filter((n) => n.id !== SOURCE_ID && (n.loads ?? []).length > 0)
    .map((n) => ({
      id: n.id,
      ft: n.ft,
      fixtures: n.loads.length,
      amps: (n.loads ?? []).reduce((s, l) => s + (Number(l.amps) || 0), 0),
      volts: volts.get(n.id),
      drop: sourceVolts - volts.get(n.id),
      percent: sourceVolts > 0 ? ((sourceVolts - volts.get(n.id)) / sourceVolts) * 100 : 0,
    }));

  // Min and max are taken over LOAD-BEARING nodes only. An internal junction
  // (a hub with nothing wired to it) is not a place anyone measures voltage.
  const tapVolts = taps.map((t) => t.volts);

  /* Voltage at or below zero is not a small number, it is an impossible design.
     Flagged rather than thrown, because it is a real thing an installer can
     describe (too much load, too far, too thin) as opposed to malformed input —
     but the UI must refuse to present a result, not print a plausible figure. */
  const collapsed = tapVolts.some((v) => v <= 0);

  return {
    taps,
    edgeDrops,
    collapsed,
    totalAmps: subtreeAmps.get(SOURCE_ID),
    lowestVolts: tapVolts.length ? Math.min(...tapVolts) : sourceVolts,
    highestVolts: tapVolts.length ? Math.max(...tapVolts) : sourceVolts,
    spreadVolts: tapVolts.length ? Math.max(...tapVolts) - Math.min(...tapVolts) : 0,
    cableFt: edgeDrops.reduce((sum, e) => sum + e.lengthFt, 0),
  };
}

/* Group fixtures that sit at the same cable distance onto ONE tap. Without this,
   two lights at 30 ft would create a fictional zero-length segment whose result
   depended on row order. */
function groupByDistance(fixtures) {
  const groups = new Map();
  for (const fixture of fixtures) {
    const ft = Number(fixture.ft);
    if (!Number.isFinite(ft) || ft < 0) throw new Error('fixture distance must be a finite, non-negative number');
    if (!groups.has(ft)) groups.set(ft, []);
    groups.get(ft).push(fixture);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ft, members], index) => ({
      id: String(index + 1),
      ft,
      loads: members.map((m) => ({ amps: fixtureAmps(m).amps })),
      count: members.length,
    }));
}

/* Layout builders. Each turns the same fixture table into a different tree.
   The distance column means something different in each, which the UI states. */

// One cable, tapping each fixture in turn. Distance = cable run from the
// transformer following the wire.
function buildDaisy(fixtures, cm) {
  const taps = groupByDistance(fixtures);
  const nodes = [{ id: SOURCE_ID, loads: [] }];
  const edges = [];
  let prevId = SOURCE_ID;
  let prevFt = 0;
  for (const tap of taps) {
    nodes.push({ id: tap.id, ft: tap.ft, loads: tap.loads });
    edges.push({ from: prevId, to: tap.id, lengthFt: tap.ft - prevFt, cm });
    prevId = tap.id;
    prevFt = tap.ft;
  }
  return { nodes, edges };
}

// A separate home run from the transformer to every fixture. Distance = that
// fixture's own run.
function buildStar(fixtures, cm) {
  const taps = groupByDistance(fixtures);
  const nodes = [{ id: SOURCE_ID, loads: [] }];
  const edges = [];
  for (const tap of taps) {
    nodes.push({ id: tap.id, ft: tap.ft, loads: tap.loads });
    edges.push({ from: SOURCE_ID, to: tap.id, lengthFt: tap.ft, cm });
  }
  return { nodes, edges };
}

/* A shared trunk out to a hub somewhere along the path, then an individual spoke
   from the hub to each fixture. hubFt is the hub's distance along the SAME path
   the fixture distances are measured on, so a spoke is |fixture − hub|.

   A hub is NOT a star: a star has no shared trunk, so the two give different
   drops and different cable totals. A hub at 0 ft is electrically identical to a
   star (the hub carries no load of its own and every spoke keeps its length and
   size) — safe, and the page says so rather than pretending otherwise. */
function buildHub(fixtures, cm, hubFt) {
  const hub = Number(hubFt) || 0;
  const taps = groupByDistance(fixtures);
  const nodes = [{ id: SOURCE_ID, loads: [] }, { id: 'hub', loads: [] }];
  const edges = [{ from: SOURCE_ID, to: 'hub', lengthFt: hub, cm }];
  for (const tap of taps) {
    nodes.push({ id: tap.id, ft: tap.ft, loads: tap.loads });
    edges.push({ from: 'hub', to: tap.id, lengthFt: Math.abs(tap.ft - hub), cm });
  }
  return { nodes, edges };
}

/* All three layouts from one fixture table.

   THE ASSUMPTION, stated because the comparison depends on it: the fixtures run
   along ONE path and each distance is measured along that path. That is the
   straight bed / walkway / driveway case, which is both the common one and the
   only one where these three layouts are genuinely comparable from a single
   column of numbers. Fixtures scattered in different directions need their own
   real geometry, and this tool does not pretend to know it. */
function compareLayouts(fixtures, cm, hubFt, sourceVolts, k) {
  const solve = (tree) => solveTree({ sourceVolts, k, ...tree });
  return {
    daisy: solve(buildDaisy(fixtures, cm)),
    hub: solve(buildHub(fixtures, cm, hubFt)),
    star: solve(buildStar(fixtures, cm)),
  };
}

/* This engine is a NAMEPLATE-CURRENT calculation: each fixture's current is
   worked out once, at its rated voltage, and held fixed.

   An LED driver is closer to a constant-power load — as its voltage sags it
   draws more current, so the real drop is worse than a fixed-current answer.
   There IS a closed form for that, but only for a SINGLE isolated load
   ((1 - sqrt(1 - 4p)) / 2 for a fixed-current prediction of p). It cannot be
   applied per fixture here: a shared trunk couples every load downstream of it,
   so the honest options are a coupled nonlinear solver or no numeric claim at
   all. v1 makes no numeric claim.

   What it does instead: grade how far into the region where the fixed-current
   assumption stops being trustworthy the design has gone, so the page can warn
   in words. p is the worst tap's drop as a fraction of source voltage.
   The 0.25 boundary is where a single constant-power load reaches voltage
   collapse (the two roots meet at x = 0.5); beyond it there is no real solution.
   Used as a policy line, not as a computed result. */
function nameplateCaution(p) {
  if (!Number.isFinite(p) || p <= 0) return 'none';
  if (p >= 0.25) return 'collapse';   // a constant-power load cannot be fed at all
  if (p >= 0.10) return 'unreliable'; // fixed-current answer is materially optimistic
  if (p >= 0.05) return 'watch';
  return 'none';
}

/* ===== END OF PURE ENGINE — everything below this line touches the DOM =====
   tools/landscape-engine-tests.mjs splits this file on the line above so the
   engine can be tested in node with no browser. It fails loudly if the marker
   goes missing, so this is a contract, not a comment. */

/* ------------------------------------------------------------------- text ----
   Result copy with {placeholder} slots, filled by vdFormat from common.js.
   Every string in this object is display text and is listed in
   i18n/runtime-map.json so build.mjs can swap it per edition. NOTHING here may
   be an element id, class, selector, dataset key or event name — those are
   program wiring and must never enter the string catalog. */
const LS_TEXT = {
  volts: '{volts} V',
  voltsAt: '{volts} V à {label}',
  feet: '{feet} ft',
  amps: '{amps} A',
  percent: '{percent}%',
  lowestLabel: 'tension la plus basse, à {label}',
  fixtureCount: '{count} luminaires',
  oneFixture: '1 luminaire',
  tapLine: '{label} — {count}',
  tapVolts: '{volts} V  ({percent}% de chute)',
  layoutDaisy: 'En guirlande',
  layoutHub: 'Moyeu',
  layoutStar: 'Étoile',
  yoursSuffix: ' — le vôtre',
  colLayout: 'Disposition',
  colLowest: 'Minimale',
  colHighest: 'Maximale',
  colSpread: 'Écart',
  colCable: 'Câble',
  colLowestVolts: 'Min. V',
  colSpreadVolts: 'Écart V',
  colCableFeet: 'Câble ft',
  colTotalLoad: 'Charge totale',
  colWorstDrop: 'Chute max.',
  hubAtFt: 'Moyeu (à {feet} ft)',
  hubSuggested: 'Moyeu (suggéré à {feet} ft)',
  hubSuggestedNote: 'Vous n’avez pas fixé de distance de moyeu, alors la ligne du moyeu est calculée au milieu de votre parcours — ce qui est habituellement près du meilleur emplacement. Fixez votre propre distance pour en comparer une autre.',
  noResultDash: '—',
  tapsHeading: 'Tension à chaque luminaire',
  compareHeading: 'Les mêmes luminaires, câblés de trois façons',
  assumption: 'Cette comparaison suppose que vos luminaires suivent un seul parcours et que chaque distance est mesurée le long de celui-ci : une plate-bande, une allée ou une entrée. Les luminaires dispersés dans des directions différentes ont leur propre géométrie, que cet outil ne peut pas connaître.',
  hubIsStar: 'Un moyeu à 0 ft est le même circuit qu’une étoile, alors ces deux lignes concordent.',
  hintDaisy: 'Un seul câble, dérivant chaque luminaire à tour de rôle. Les distances se mesurent le long du câble.',
  hintHub: 'Un tronc jusqu’à un moyeu, puis une antenne distincte vers chaque luminaire.',
  hintStar: 'Un câble distinct du transformateur jusqu’à chaque luminaire.',
  cautionUnityPf: 'Les watts seuls ne donnent pas le courant. Faute de facteur de puissance entré, nous avons supposé 1.0, ce qui est le meilleur cas : le courant réel est plus élevé et la chute de tension réelle aussi. Utilisez les ampères nominaux ou les VA du luminaire pour obtenir une réponse sûre.',
  cautionWatch: 'La chute ici est assez importante pour mériter un second coup d’œil avant d’enfouir le câble.',
  cautionUnreliable: 'À cette chute, la méthode à courant fixe cesse d’être fiable : un pilote de DEL tire plus de courant à mesure que sa tension baisse, alors la chute réelle est pire que celle affichée. Montez de calibre, raccourcissez le parcours ou répartissez la charge.',
  cautionCollapse: 'Cette conception ne peut pas fonctionner. Le câble ne peut pas livrer cette charge sur cette distance : la tension s’effondre. Changez le calibre du câble, la distance ou le nombre de luminaires.',
  cautionAmpacity: 'Ceci répond uniquement à la chute de tension. Il ne vérifie pas que le câble est homologué pour porter le courant, ni la capacité nominale de votre transformateur.',
  cautionLimitsUnset: 'Non évalué par rapport aux limites du fabricant. Entrez la tension minimale et maximale de votre luminaire pour que chaque dérivation soit vérifiée.',
  cautionBelowMin: '{count} de vos dérivations tombent sous le minimum de {volts} V que vous avez entré.',
  cautionAboveMax: '{count} de vos dérivations dépassent le maximum de {volts} V que vous avez entré. La surtension raccourcit la vie du luminaire, surtout avec l’halogène.',
  needTwoRows: 'Entrez une distance et une charge pour au moins un luminaire.',
  badInput: 'Ces nombres ne décrivent pas un circuit que nous pouvons résoudre. Vérifiez les distances et les charges.',
  mathIntro: 'Chaque section de câble porte le courant de tous les luminaires situés au-delà, alors la chute est calculée section par section puis additionnée le long du parcours jusqu’à chaque luminaire.',
  mathFormula: 'chute par section = 2 × K × A × ft ÷ cmil',
  mathConstants: 'K = {k} pour le {material}. Câble = {size} ({cm} cmil). Les distances sont à l’aller; le 2 correspond à la paire aller-retour.',
  mathNaive: 'À titre de comparaison, placer les {amps} A complets aux {feet} ft complets — comme le ferait un calculateur ordinaire — donne {volts} V de chute, ce qui l’exagère.',
  materialCopper: 'cuivre',
  materialAluminum: 'aluminium',
  badgeOk: 'CORRECT',
  badgeCheck: 'À VÉRIFIER',
  badgeStop: 'NE FONCTIONNERA PAS',
};

/* --------------------------------------------------------------------- ui ----
   Everything below touches the DOM. The engine above stays pure so verify.mjs
   can call it directly. */
const $ = (id) => document.getElementById(id);

function lsCountry() { return (window.VDCountry && VDCountry.get() === 'ca') ? 'ca' : 'us'; }

let material = 'cu';
let layout = 'daisy';

// Wire size choices come from the sealed table, so the option order is the
// table order. verify.mjs relies on that being positional.
const sizeSelect = $('ls-size');
WIRE_TABLE.forEach(([label], index) => {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = label;
  sizeSelect.appendChild(option);
});
sizeSelect.value = '3'; // 12 AWG — the common landscape cable

function layoutHint() {
  if (layout === 'hub') return LS_TEXT.hintHub;
  if (layout === 'star') return LS_TEXT.hintStar;
  return LS_TEXT.hintDaisy;
}

function refreshLayoutUi() {
  $('ls-field-hub').hidden = layout !== 'hub';
  $('ls-layout-hint').textContent = layoutHint();
}

function refreshUnitUi() {
  $('ls-field-pf').hidden = $('ls-unit').value !== 'w';
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('#ls-rows .fixture-row');
  rows.forEach((row) => {
    row.querySelector('.remove-size-btn').hidden = rows.length <= 1;
  });
}

function readRows() {
  const unit = $('ls-unit').value;
  const ratedVolts = Number($('ls-rated-volts').value);
  const pf = $('ls-pf').value === '' ? null : Number($('ls-pf').value);
  return [...document.querySelectorAll('#ls-rows .fixture-row')]
    .map((row) => ({
      ft: Number(row.querySelector('.ls-ft').value),
      load: Number(row.querySelector('.ls-load').value),
      unit,
      pf,
      ratedVolts,
    }))
    .filter((row) => Number.isFinite(row.ft) && row.ft >= 0 && row.load > 0);
}

function addRow(ft = '', load = '') {
  const fragment = $('ls-row-template').content.cloneNode(true);
  fragment.querySelector('.ls-ft').value = ft;
  fragment.querySelector('.ls-load').value = load;
  $('ls-rows').appendChild(fragment);
  updateRemoveButtons();
}

$('ls-add-row').addEventListener('click', () => addRow());

$('ls-rows').addEventListener('click', (event) => {
  const button = event.target.closest('.remove-size-btn');
  if (!button) return;
  if (document.querySelectorAll('#ls-rows .fixture-row').length <= 1) return;
  button.closest('.fixture-row').remove();
  updateRemoveButtons();
  if (!$('results').hidden) calc();
});

// Quick fill POPULATES the rows rather than being a second engine — one input
// model, one code path, and the installer can correct any row afterwards.
$('ls-qf-apply').addEventListener('click', () => {
  const count = Math.floor(Number($('ls-qf-count').value));
  const first = Number($('ls-qf-first').value);
  const spacing = Number($('ls-qf-spacing').value);
  const load = Number($('ls-qf-load').value);
  if (!(count >= 1) || !(first >= 0) || !(spacing >= 0) || !(load > 0)) return;
  $('ls-rows').innerHTML = '';
  for (let i = 0; i < count; i++) addRow(first + spacing * i, load);
  updateRemoveButtons();
  calc();
});

document.querySelectorAll('.seg-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const group = button.parentElement;
    group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    if ('material' in button.dataset) material = button.dataset.material;
    if ('layout' in button.dataset) { layout = button.dataset.layout; refreshLayoutUi(); }
    if (!$('results').hidden) calc();
  });
});

$('ls-unit').addEventListener('change', () => {
  refreshUnitUi();
  if (!$('results').hidden) calc();
});

$('ls-form').addEventListener('submit', (event) => { event.preventDefault(); calc(); });

/* Result copy is built with DOM nodes, not assembled strings. Two reasons: the
   project forbids composing user-facing text with template literals (a natural
   language sentence must come from ONE named catalog pattern, or a translator
   only ever sees fragments), and textContent cannot inject markup. */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };
// One catalog pattern owns the whole phrase; never assembled from pieces.
const feetLabel = (ft) => vdFormat(LS_TEXT.feet, { feet: String(ft) });

function caution(text, stop = false) {
  return el('p', stop ? 'ls-caution is-stop' : 'ls-caution', text);
}

function calc() {
  const fixtures = readRows();
  const results = $('results');
  const cautions = $('ls-cautions');

  if (!fixtures.length) {
    $('verdict-badge').textContent = LS_TEXT.badgeCheck;
    $('big-number').textContent = '';
    $('big-label').textContent = LS_TEXT.needTwoRows;
    [$('result-grid'), $('ls-taps'), $('ls-compare'), cautions].forEach(clear);
    results.hidden = false;
    return;
  }

  const sizeIndex = Number(sizeSelect.value);
  const [sizeLabel, cm] = WIRE_TABLE[sizeIndex];
  const k = K_FACTOR[material];
  const sourceVolts = Number($('ls-source-volts').value);

  /* The comparison table always shows a hub row, so a hub distance of 0 would
     print a row identical to the star with nothing explaining why. When the
     installer has not set one, cost the hub at the MIDDLE of the run — usually
     near the best spot — and say so in the row label and a note. Suggesting a
     distance out loud is honest; silently showing a duplicate row is not. */
  const distances = fixtures.map((f) => f.ft);
  const midpointFt = (Math.min(...distances) + Math.max(...distances)) / 2;
  const hubSet = $('ls-hub-ft').value !== '' && Number($('ls-hub-ft').value) > 0;
  const hubFt = hubSet ? Number($('ls-hub-ft').value) : midpointFt;

  let all;
  try {
    all = compareLayouts(fixtures, cm, hubFt, sourceVolts, k);
  } catch (error) {
    console.error('landscape engine rejected the input:', error);
    $('verdict-badge').textContent = LS_TEXT.badgeCheck;
    $('big-number').textContent = '';
    $('big-label').textContent = LS_TEXT.badInput;
    [$('result-grid'), $('ls-taps'), $('ls-compare'), cautions].forEach(clear);
    results.hidden = false;
    return;
  }

  const mine = all[layout];
  const worstPercent = sourceVolts > 0 ? (sourceVolts - mine.lowestVolts) / sourceVolts : 0;
  const grade = mine.collapsed ? 'collapse' : nameplateCaution(worstPercent);
  const lowestTap = mine.taps.reduce((worst, tap) => (tap.volts < worst.volts ? tap : worst), mine.taps[0]);

  // Verdict wording never claims a fixture is dim or bright — an LED driver
  // holds steady and then drops out, so brightness is not ours to assert.
  $('verdict-badge').textContent = grade === 'collapse'
    ? LS_TEXT.badgeStop
    : (grade === 'none' ? LS_TEXT.badgeOk : LS_TEXT.badgeCheck);
  $('big-number').textContent = mine.collapsed
    ? LS_TEXT.noResultDash
    : vdFormat(LS_TEXT.volts, { volts: mine.lowestVolts.toFixed(2) });
  $('big-label').textContent = vdFormat(LS_TEXT.lowestLabel, { label: feetLabel(lowestTap.ft) });

  const grid = [
    [LS_TEXT.colLowest, vdFormat(LS_TEXT.volts, { volts: mine.lowestVolts.toFixed(2) })],
    [LS_TEXT.colHighest, vdFormat(LS_TEXT.volts, { volts: mine.highestVolts.toFixed(2) })],
    [LS_TEXT.colSpread, vdFormat(LS_TEXT.volts, { volts: mine.spreadVolts.toFixed(2) })],
    [LS_TEXT.colTotalLoad, vdFormat(LS_TEXT.amps, { amps: mine.totalAmps.toFixed(2) })],
    [LS_TEXT.colCable, vdFormat(LS_TEXT.feet, { feet: mine.cableFt.toFixed(0) })],
    [LS_TEXT.colWorstDrop, vdFormat(LS_TEXT.percent, { percent: (worstPercent * 100).toFixed(1) })],
  ];
  const gridHost = $('result-grid');
  clear(gridHost);
  for (const [key, value] of grid) {
    const cell = el('div', 'result-cell');
    cell.appendChild(el('div', 'k', key));
    cell.appendChild(el('div', 'v', value));
    gridHost.appendChild(cell);
  }

  const minVolts = $('ls-min-volts').value === '' ? null : Number($('ls-min-volts').value);
  const maxVolts = $('ls-max-volts').value === '' ? null : Number($('ls-max-volts').value);
  const below = minVolts === null ? [] : mine.taps.filter((tap) => tap.volts < minVolts);
  const above = maxVolts === null ? [] : mine.taps.filter((tap) => tap.volts > maxVolts);

  $('ls-taps-heading').textContent = LS_TEXT.tapsHeading;
  const tapHost = $('ls-taps');
  clear(tapHost);
  for (const tap of mine.taps) {
    const out = (minVolts !== null && tap.volts < minVolts) || (maxVolts !== null && tap.volts > maxVolts);
    const count = tap.fixtures === 1
      ? LS_TEXT.oneFixture
      : vdFormat(LS_TEXT.fixtureCount, { count: tap.fixtures });
    const row = el('li', out ? 'out-of-range' : undefined);
    row.appendChild(el('span', undefined, vdFormat(LS_TEXT.tapLine, { label: feetLabel(tap.ft), count })));
    row.appendChild(el('span', undefined, vdFormat(LS_TEXT.tapVolts, {
      volts: tap.volts.toFixed(2), percent: tap.percent.toFixed(1),
    })));
    tapHost.appendChild(row);
  }

  const names = {
    daisy: LS_TEXT.layoutDaisy,
    hub: vdFormat(hubSet ? LS_TEXT.hubAtFt : LS_TEXT.hubSuggested, { feet: hubFt.toFixed(0) }),
    star: LS_TEXT.layoutStar,
  };
  $('ls-compare-heading').textContent = LS_TEXT.compareHeading;
  const table = $('ls-compare');
  clear(table);
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const heading of [LS_TEXT.colLayout, LS_TEXT.colLowestVolts, LS_TEXT.colSpreadVolts, LS_TEXT.colCableFeet]) {
    headRow.appendChild(el('th', undefined, heading));
  }
  head.appendChild(headRow);
  table.appendChild(head);
  const body = document.createElement('tbody');
  for (const key of ['daisy', 'hub', 'star']) {
    const result = all[key];
    const row = el('tr', key === layout ? 'is-yours' : undefined);
    row.appendChild(el('td', undefined, key === layout ? names[key] + LS_TEXT.yoursSuffix : names[key]));
    row.appendChild(el('td', undefined, result.collapsed ? LS_TEXT.noResultDash : result.lowestVolts.toFixed(2)));
    row.appendChild(el('td', undefined, result.spreadVolts.toFixed(2)));
    row.appendChild(el('td', undefined, result.cableFt.toFixed(0)));
    body.appendChild(row);
  }
  table.appendChild(body);

  // The hub notes attach to the comparison table, so they show whatever layout
  // is selected — the table always has a hub row to explain.
  $('ls-assumption').textContent = [
    LS_TEXT.assumption,
    hubSet ? '' : LS_TEXT.hubSuggestedNote,
    hubSet && hubFt === 0 ? LS_TEXT.hubIsStar : '',
  ].filter(Boolean).join(' ');

  const notes = [];
  if (grade === 'collapse') notes.push(caution(LS_TEXT.cautionCollapse, true));
  else if (grade === 'unreliable') notes.push(caution(LS_TEXT.cautionUnreliable, true));
  else if (grade === 'watch') notes.push(caution(LS_TEXT.cautionWatch));
  if (fixtures.some((f) => fixtureAmps(f).assumedUnityPf)) notes.push(caution(LS_TEXT.cautionUnityPf));
  if (below.length) {
    notes.push(caution(vdFormat(LS_TEXT.cautionBelowMin, { count: below.length, volts: minVolts }), true));
  }
  if (above.length) {
    notes.push(caution(vdFormat(LS_TEXT.cautionAboveMax, { count: above.length, volts: maxVolts }), true));
  }
  // A blank limits box must read as "not checked", never as a quiet pass.
  if (minVolts === null && maxVolts === null) notes.push(caution(LS_TEXT.cautionLimitsUnset));
  notes.push(caution(LS_TEXT.cautionAmpacity));
  clear(cautions);
  for (const note of notes) cautions.appendChild(note);
  $('verdict-note').textContent = '';

  const farthest = Math.max(...fixtures.map((f) => f.ft));
  const naiveDrop = (2 * k * mine.totalAmps * farthest) / cm;
  const math = $('math-body');
  clear(math);
  math.appendChild(el('p', undefined, LS_TEXT.mathIntro));
  math.appendChild(el('div', 'formula', LS_TEXT.mathFormula));
  math.appendChild(el('p', undefined, vdFormat(LS_TEXT.mathConstants, {
    k: String(k),
    material: material === 'cu' ? LS_TEXT.materialCopper : LS_TEXT.materialAluminum,
    size: sizeLabel,
    cm: String(cm),
  })));
  math.appendChild(el('p', undefined, vdFormat(LS_TEXT.mathNaive, {
    amps: mine.totalAmps.toFixed(2),
    feet: String(farthest),
    volts: naiveDrop.toFixed(2),
  })));

  results.hidden = false;
}

refreshLayoutUi();
refreshUnitUi();
updateRemoveButtons();

// Country switches only change words on this page: the physics is the same in
// both, and no code limit is claimed for a low-voltage lighting system.
window.addEventListener('vd:country', () => { if (!$('results').hidden) calc(); });
