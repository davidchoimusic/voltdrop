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

   NO CODE VERDICT. Neither the NEC nor the CEC sets a mandatory voltage-drop
   limit for a low-voltage lighting system, and the acceptable voltage window is
   set by the fixture manufacturer, not by us. This tool reports voltages and
   leaves the judgement to the data sheet — with optional fields so the installer
   can enter their own fixture's limits and have them checked. */

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
    if (byId.has(node.id)) throw new Error(`duplicate node id: ${node.id}`);
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
      label: n.label ?? n.id,
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
      id: `tap${index + 1}`,
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
    nodes.push({ id: tap.id, label: `${tap.ft} ft`, loads: tap.loads });
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
    nodes.push({ id: tap.id, label: `${tap.ft} ft`, loads: tap.loads });
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
    nodes.push({ id: tap.id, label: `${tap.ft} ft`, loads: tap.loads });
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
