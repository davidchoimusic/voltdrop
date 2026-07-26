// Engine tests run against the REAL landscape.js source (not a copy of it),
// evaluated in node. Fast inner loop; these assertions get ported into verify.mjs.
import { readFileSync } from 'fs';

const WT = process.cwd();
const src = readFileSync(`${WT}/landscape.js`, 'utf8');

// Expose the top-level declarations. The engine half is DOM-free by design.
const api = Function(`"use strict";
${src}
return { WIRE_TABLE, K_FACTOR, SOURCE_ID, fixtureAmps, solveTree, groupByDistance,
         buildDaisy, buildStar, buildHub, compareLayouts, nameplateCaution };`)();

const {
  WIRE_TABLE, K_FACTOR, fixtureAmps, solveTree,
  buildDaisy, buildStar, buildHub, compareLayouts, nameplateCaution,
} = api;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
};
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

const CM = 6530;                 // 12 AWG
const K = K_FACTOR.cu;           // 12.9
const V = 12;
const fx = (ft, watts) => ({ ft, load: watts, unit: 'w', pf: 1, ratedVolts: 12 });
const solve = (tree) => solveTree({ sourceVolts: V, k: K, ...tree });
const singleLoad = (amps, ft) => (2 * K * amps * ft) / CM;

console.log('--- sealed table sanity ---');
ok('WIRE_TABLE has 20 rows', WIRE_TABLE.length === 20, `got ${WIRE_TABLE.length}`);
ok('12 AWG is 6530 cmil', WIRE_TABLE[3][1] === 6530);
ok('500 kcmil is the top row', WIRE_TABLE.at(-1)[0] === '500 kcmil');
ok('K copper 12.9', K_FACTOR.cu === 12.9);
ok('K aluminum 21.2', K_FACTOR.al === 21.2);

console.log('\n--- one load field + unit selector (no priority guessing) ---');
ok('amps used directly', near(fixtureAmps({ load: 0.5, unit: 'a' }).amps, 0.5));
ok('amps needs no rated volts', fixtureAmps({ load: 0.5, unit: 'a' }).basis === 'amps');
ok('VA divides by rated volts', near(fixtureAmps({ load: 9, unit: 'va', ratedVolts: 12 }).amps, 0.75));
ok('VA without rated volts is unusable', fixtureAmps({ load: 9, unit: 'va' }).basis === 'none');
ok('watts uses RATED volts, not the tap',
  near(fixtureAmps({ load: 7, unit: 'w', pf: 1, ratedVolts: 12 }).amps, 7 / 12));
ok('watts with PF 0.9 draws MORE current',
  fixtureAmps({ load: 7, unit: 'w', pf: 0.9, ratedVolts: 12 }).amps
  > fixtureAmps({ load: 7, unit: 'w', pf: 1, ratedVolts: 12 }).amps);
ok('watts with PF 0.9 is exactly W/(V*PF)',
  near(fixtureAmps({ load: 7, unit: 'w', pf: 0.9, ratedVolts: 12 }).amps, 7 / (12 * 0.9)));
ok('missing PF flags the unity assumption',
  fixtureAmps({ load: 7, unit: 'w', ratedVolts: 12 }).assumedUnityPf === true);
ok('given PF does not flag',
  fixtureAmps({ load: 7, unit: 'w', pf: 0.9, ratedVolts: 12 }).assumedUnityPf === false);
ok('nonsense PF falls back to unity AND flags',
  fixtureAmps({ load: 7, unit: 'w', pf: 5, ratedVolts: 12 }).assumedUnityPf === true);
ok('amps basis never flags a PF assumption',
  fixtureAmps({ load: 0.5, unit: 'a' }).assumedUnityPf === false);
ok('zero load -> zero', fixtureAmps({ load: 0, unit: 'a' }).amps === 0);
ok('negative load -> zero', fixtureAmps({ load: -3, unit: 'a' }).amps === 0);
ok('non-numeric load -> zero', fixtureAmps({ load: 'abc', unit: 'a' }).amps === 0);

console.log('\n--- Codex requirement: single fixture must equal the existing calculator ---');
const one = solve(buildDaisy([fx(80, 7)], CM));
ok('one fixture matches single-load formula',
  near(one.taps[0].drop, singleLoad(7 / 12, 80)),
  `${one.taps[0].drop} vs ${singleLoad(7 / 12, 80)}`);

console.log('\n--- two fixtures, hand calculated ---');
// 2 x 7W at 50 and 100 ft. Seg1 (0-50) carries both, seg2 (50-100) carries one.
const I1 = 7 / 12;
const hand1 = (2 * K * (2 * I1) * 50) / CM;
const hand2 = (2 * K * I1 * 50) / CM;
const two = solve(buildDaisy([fx(50, 7), fx(100, 7)], CM));
ok('near fixture drop', near(two.taps[0].drop, hand1));
ok('far fixture drop', near(two.taps[1].drop, hand1 + hand2));
ok('far fixture is the lowest', near(two.lowestVolts, V - (hand1 + hand2)));
ok('naive method would overstate',
  singleLoad(2 * I1, 100) > two.taps[1].drop,
  `naive ${singleLoad(2 * I1, 100)} vs real ${two.taps[1].drop}`);

console.log('\n--- closed form: N evenly spaced equal fixtures => daisy/naive = (N+1)/2N ---');
for (const N of [2, 3, 4, 6, 10]) {
  const L = 20, W = 7;
  const rows = Array.from({ length: N }, (_, i) => fx(L * (i + 1), W));
  const r = solve(buildDaisy(rows, CM));
  const naive = singleLoad((N * W) / 12, L * N);
  ok(`N=${N} ratio == ${(N + 1) / (2 * N)}`,
    near(r.taps.at(-1).drop / naive, (N + 1) / (2 * N)),
    `got ${r.taps.at(-1).drop / naive}`);
}

console.log('\n--- duplicate distances group onto one tap (no zero-length segments) ---');
const dup = solve(buildDaisy([fx(30, 7), fx(30, 7), fx(60, 7)], CM));
ok('3 fixtures -> 2 taps', dup.taps.length === 2, `got ${dup.taps.length}`);
ok('shared tap holds 2 fixtures', dup.taps[0].fixtures === 2);
ok('no zero-length edge', dup.edgeDrops.every((e) => e.lengthFt > 0));
const dupReordered = solve(buildDaisy([fx(60, 7), fx(30, 7), fx(30, 7)], CM));
ok('row order does not change the answer',
  near(dup.lowestVolts, dupReordered.lowestVolts));

console.log('\n--- unsorted rows sort themselves ---');
const unsorted = solve(buildDaisy([fx(80, 7), fx(20, 7), fx(60, 7), fx(40, 7)], CM));
const sorted = solve(buildDaisy([fx(20, 7), fx(40, 7), fx(60, 7), fx(80, 7)], CM));
ok('unsorted == sorted', near(unsorted.lowestVolts, sorted.lowestVolts));

console.log('\n--- conservation: every edge carries the sum of loads below it ---');
const consFixtures = [fx(20, 7), fx(45, 12), fx(70, 7), fx(70, 20), fx(95, 7)];
const cons = solve(buildDaisy(consFixtures, CM));
const totalAmps = consFixtures.reduce((s, f) => s + f.load / 12, 0);
ok('first edge carries the whole load', near(cons.edgeDrops[0].amps, totalAmps));
ok('last edge carries only the last tap',
  near(cons.edgeDrops.at(-1).amps, cons.taps.at(-1).amps));
ok('edge currents are monotonically non-increasing outward',
  cons.edgeDrops.every((e, i) => i === 0 || e.amps <= cons.edgeDrops[i - 1].amps + 1e-12));
ok('source total equals sum of fixtures', near(cons.totalAmps, totalAmps));

console.log('\n--- layouts genuinely differ, and hub != star ---');
const layoutRows = [fx(20, 7), fx(40, 7), fx(60, 7), fx(80, 7)];
const d = solve(buildDaisy(layoutRows, CM));
const s = solve(buildStar(layoutRows, CM));
const h = solve(buildHub(layoutRows, CM, 50));
ok('star beats daisy at the worst tap', s.lowestVolts > d.lowestVolts);
ok('star uses more cable than daisy', s.cableFt > d.cableFt, `${s.cableFt} vs ${d.cableFt}`);
ok('star spread is tighter than daisy', s.spreadVolts < d.spreadVolts);
ok('hub with a trunk differs from star', !near(h.lowestVolts, s.lowestVolts));
const hub0 = solve(buildHub(layoutRows, CM, 0));
ok('hub at 0 ft collapses to star', near(hub0.lowestVolts, s.lowestVolts));
ok('hub trunk carries the whole load', near(h.edgeDrops[0].amps, 4 * (7 / 12)));
// hub at 50 ft on a 20/40/60/80 path: spokes are 30/10/10/30, trunk 50.
ok('hub spokes are |fixture - hub|',
  [30, 10, 10, 30].every((want, i) => near(h.edgeDrops[i + 1].lengthFt, want)),
  h.edgeDrops.slice(1).map((e) => e.lengthFt).join(','));
ok('hub uses less cable than star', h.cableFt < s.cableFt, `${h.cableFt} vs ${s.cableFt}`);
ok('hub cable == trunk + spokes', near(h.cableFt, 50 + 30 + 10 + 10 + 30));

console.log('\n--- compareLayouts returns all three from one table ---');
const cmp = compareLayouts(layoutRows, CM, 50, V, K);
ok('all three layouts present', !!(cmp.daisy && cmp.hub && cmp.star));
ok('comparison matches the individual solves',
  near(cmp.daisy.lowestVolts, d.lowestVolts)
  && near(cmp.hub.lowestVolts, h.lowestVolts)
  && near(cmp.star.lowestVolts, s.lowestVolts));
ok('daisy has the widest spread of the three',
  cmp.daisy.spreadVolts > cmp.star.spreadVolts && cmp.daisy.spreadVolts > cmp.hub.spreadVolts);
/* Locked in deliberately, because it is the counter-intuitive finding this tool
   exists to surface: a hub placed part-way along the path beats a star on BOTH
   evenness and cable used. The trunk drop is common to every fixture, so it
   shifts all of them together instead of spreading them apart, and the spokes
   are short. "Star is the most even layout" is simply false. */
ok('a mid-path hub beats a star on evenness AND cable',
  cmp.hub.spreadVolts < cmp.star.spreadVolts && cmp.hub.cableFt < cmp.star.cableFt,
  `spread ${cmp.hub.spreadVolts} vs ${cmp.star.spreadVolts}, cable ${cmp.hub.cableFt} vs ${cmp.star.cableFt}`);
ok('but the star still delivers the highest worst-case voltage',
  cmp.star.lowestVolts > cmp.hub.lowestVolts,
  `${cmp.star.lowestVolts} vs ${cmp.hub.lowestVolts}`);
ok('daisy uses the least cable',
  cmp.daisy.cableFt <= cmp.hub.cableFt && cmp.daisy.cableFt <= cmp.star.cableFt);

console.log('\n--- highest voltage is reported, not just lowest (overvoltage matters) ---');
ok('spread == highest - lowest', near(d.spreadVolts, d.highestVolts - d.lowestVolts));
ok('highest is the nearest tap', near(d.highestVolts, d.taps[0].volts));

console.log('\n--- fixture rated volts separate from transformer tap volts ---');
// 7 W fixture RATED 12 V, fed from a 15 V tap: current must come from 12 V.
const hot = solveTree({
  sourceVolts: 15, k: K,
  ...buildDaisy([{ ft: 50, load: 7, unit: 'w', pf: 1, ratedVolts: 12 }], CM),
});
ok('current uses rated 12 V, not the 15 V tap',
  near(hot.edgeDrops[0].amps, 7 / 12));
ok('near-fixture overvoltage is visible', hot.taps[0].volts > 12);

console.log('\n--- non-tree graphs are rejected, not repaired ---');
const rejects = [
  ['no source', { nodes: [{ id: 'a', loads: [] }], edges: [] }],
  ['node fed twice', {
    nodes: [{ id: 'source', loads: [] }, { id: 'a', loads: [] }, { id: 'b', loads: [] }],
    edges: [{ from: 'source', to: 'a', lengthFt: 10, cm: CM },
            { from: 'b', to: 'a', lengthFt: 10, cm: CM }],
  }],
  ['unreachable node', {
    nodes: [{ id: 'source', loads: [] }, { id: 'a', loads: [] }, { id: 'b', loads: [] }],
    edges: [{ from: 'source', to: 'a', lengthFt: 10, cm: CM }],
  }],
  ['zero conductor size', {
    nodes: [{ id: 'source', loads: [] }, { id: 'a', loads: [] }],
    edges: [{ from: 'source', to: 'a', lengthFt: 10, cm: 0 }],
  }],
  ['negative length', {
    nodes: [{ id: 'source', loads: [] }, { id: 'a', loads: [] }],
    edges: [{ from: 'source', to: 'a', lengthFt: -5, cm: CM }],
  }],
];
for (const [name, tree] of rejects) {
  let threw = false;
  try { solveTree({ sourceVolts: V, k: K, ...tree }); } catch { threw = true; }
  ok(`rejects: ${name}`, threw);
}

console.log('\n--- nameplate caution grades, no fake numeric claim ---');
ok('tiny drop -> none', nameplateCaution(0.01) === 'none');
ok('5% -> watch', nameplateCaution(0.05) === 'watch');
ok('10% -> unreliable', nameplateCaution(0.10) === 'unreliable');
ok('25% -> collapse boundary', nameplateCaution(0.25) === 'collapse');
ok('40% -> collapse', nameplateCaution(0.40) === 'collapse');
ok('zero -> none', nameplateCaution(0) === 'none');
ok('garbage -> none', nameplateCaution(NaN) === 'none');
ok('grades are monotonic', ['none', 'watch', 'unreliable', 'collapse']
  .indexOf(nameplateCaution(0.02)) <= ['none', 'watch', 'unreliable', 'collapse']
  .indexOf(nameplateCaution(0.2)));

console.log('\n--- voltage collapse is flagged, never printed as a plausible number ---');
// 10 x 50 W halogen on 18 AWG at 200 ft: deliberately impossible.
const doomed = solve(buildDaisy(
  Array.from({ length: 10 }, (_, i) => fx(20 * (i + 1) + 20, 50)),
  WIRE_TABLE[0][1],
));
ok('impossible design sets collapsed', doomed.collapsed === true);
ok('a sane design does not', d.collapsed === false);

console.log('\n--- rejects malformed input rather than repairing it ---');
let negThrew = false;
try { buildDaisy([fx(-10, 7)], CM); } catch { negThrew = true; }
ok('negative fixture distance rejected', negThrew);
let zeroVoltThrew = false;
try { solveTree({ sourceVolts: 0, k: K, ...buildDaisy([fx(10, 7)], CM) }); } catch { zeroVoltThrew = true; }
ok('zero source voltage rejected', zeroVoltThrew);
let dupIdThrew = false;
try {
  solveTree({ sourceVolts: V, k: K,
    nodes: [{ id: 'source', loads: [] }, { id: 'a', loads: [] }, { id: 'a', loads: [] }],
    edges: [{ from: 'source', to: 'a', lengthFt: 10, cm: CM }] });
} catch { dupIdThrew = true; }
ok('duplicate node id rejected', dupIdThrew);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
