import { readFileSync } from 'fs';
const WT = process.cwd();
const whole = readFileSync(`${WT}/solar.js`, 'utf8');
const MARKER = '/* ===== END OF PURE ENGINE';
const src = whole.includes(MARKER) ? whole.slice(0, whole.indexOf(MARKER)) : whole;
const api = Function(`"use strict";
${src}
return { WIRE_TABLE, K_FACTOR, inverterCurrent, requiredCircularMils, dropVolts, smallestWire, sizeForDrop };`)();
const { WIRE_TABLE, K_FACTOR, inverterCurrent, requiredCircularMils, dropVolts, smallestWire, sizeForDrop } = api;

let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${e}`); } };
const near = (a, b, t = 1e-9) => Math.abs(a - b) < t;
const K = K_FACTOR.cu;

console.log('--- sealed tables match the canonical ones ---');
const appSrc = readFileSync(`${WT}/app.js`, 'utf8');
const appTable = Function(`"use strict"; return (${appSrc.match(/const WIRE_TABLE = ([\s\S]*?);\n/)[1]});`)();
const appK = Function(`"use strict"; return (${appSrc.match(/const K_FACTOR = ([\s\S]*?);\n/)[1]});`)();
ok('WIRE_TABLE identical to app.js (deep + positional)',
  JSON.stringify(WIRE_TABLE) === JSON.stringify(appTable));
ok('K_FACTOR identical to app.js', JSON.stringify(K_FACTOR) === JSON.stringify(appK));

console.log('\n--- battery-to-inverter current uses the CUTOFF, not nominal ---');
// 3000 W inverter, 90% efficient, 12 V bank sagging to 10.5 V cutout.
const atCutoff = inverterCurrent(3000, 0.9, 10.5);
const atNominal = inverterCurrent(3000, 0.9, 12);
ok('current at cutoff is ~317 A', near(atCutoff, 3000 / (0.9 * 10.5), 1e-9), String(atCutoff));
ok('using nominal UNDERSTATES the current', atNominal < atCutoff, `${atNominal} vs ${atCutoff}`);
ok('the understatement is material (>8%)', (atCutoff - atNominal) / atNominal > 0.08);
ok('efficiency of 1 is allowed', inverterCurrent(1000, 1, 12) !== null);
ok('efficiency above 1 is rejected', inverterCurrent(1000, 1.2, 12) === null);
ok('zero volts rejected', inverterCurrent(1000, 0.9, 0) === null);
ok('negative watts rejected', inverterCurrent(-5, 0.9, 12) === null);
ok('non-numeric rejected', inverterCurrent('abc', 0.9, 12) === null);

console.log('\n--- required circular mils, hand checked ---');
// 20 A, 30 ft one way, 1% of 12 V = 0.12 V allowed.
ok('required cmil = 2*K*I*L / allowed',
  near(requiredCircularMils(K, 20, 30, 0.12), (2 * 12.9 * 20 * 30) / 0.12));
ok('zero allowance is impossible, not infinite copper',
  requiredCircularMils(K, 20, 30, 0) === Infinity);

console.log('\n--- smallest wire selection ---');
ok('exactly 6530 picks 12 AWG', smallestWire(6530).label === '12 AWG');
ok('6531 steps up to 10 AWG', smallestWire(6531).label === '10 AWG');
ok('tiny requirement picks the smallest row', smallestWire(1).label === '18 AWG');
ok('500000 picks 500 kcmil', smallestWire(500000).label === '500 kcmil');

console.log('\n--- OUT OF RANGE is explicit, never the biggest row in disguise ---');
const over = smallestWire(500001);
ok('just over the table is out of range', over.outOfRange === true);
ok('out of range carries no label', over.label === undefined);
const huge = smallestWire(2_000_000);
ok('far over is out of range', huge.outOfRange === true);
ok('Infinity is out of range', smallestWire(Infinity).outOfRange === true);

console.log('\n--- the 3000 W at 12 V case from the project notes ---');
// The notes warn a 3000 W inverter at 12 V draws ~250 A. At the cutout it is more.
const battery = sizeForDrop({ k: K, amps: atCutoff, feetOneWay: 8, systemVolts: 12, targetPercent: 1 });
ok('1% of 12 V is 0.12 V', near(battery.allowedVolts, 0.12));
ok('a 1% target at 317 A over 8 ft is out of the table', battery.wire.outOfRange === true,
  JSON.stringify(battery.wire));
ok('it says how many of the largest it would take', battery.parallelLargest >= 1,
  String(battery.parallelLargest));
ok('no drop figure is invented when out of range', battery.actualDropVolts === null);

console.log('\n--- a realistic in-range battery run ---');
const shorter = sizeForDrop({ k: K, amps: atCutoff, feetOneWay: 2, systemVolts: 12, targetPercent: 1 });
ok('2 ft at 1% lands inside the table', shorter.wire.outOfRange === false, JSON.stringify(shorter.wire));
ok('the chosen size actually meets the target',
  shorter.actualDropPercent <= 1 + 1e-9, String(shorter.actualDropPercent));
ok('one size smaller would NOT meet it',
  dropVolts(K, atCutoff, 2, WIRE_TABLE[shorter.wire.index - 1][1]) > shorter.allowedVolts);

console.log('\n--- a tighter target never picks a smaller wire ---');
let previousCm = 0;
for (const percent of [3, 2, 1, 0.5]) {
  const r = sizeForDrop({ k: K, amps: 30, feetOneWay: 40, systemVolts: 48, targetPercent: percent });
  const cm = r.wire.outOfRange ? Infinity : r.wire.cm;
  ok(`target ${percent}% needs at least as much copper as the looser one`, cm >= previousCm,
    `${cm} < ${previousCm}`);
  previousCm = cm;
}

console.log('\n--- PV scenario, 48 V string ---');
const pv = sizeForDrop({ k: K, amps: 9.5, feetOneWay: 60, systemVolts: 48, targetPercent: 2 });
ok('PV run resolves in range', pv.wire.outOfRange === false, JSON.stringify(pv.wire));
ok('actual drop is under the 2% target', pv.actualDropPercent <= 2 + 1e-9);
ok('actual drop volts agrees with the formula',
  near(pv.actualDropVolts, dropVolts(K, 9.5, 60, pv.wire.cm)));

console.log('\n--- aluminium needs more copper-equivalent area than copper ---');
const cu = sizeForDrop({ k: K_FACTOR.cu, amps: 30, feetOneWay: 50, systemVolts: 48, targetPercent: 2 });
const al = sizeForDrop({ k: K_FACTOR.al, amps: 30, feetOneWay: 50, systemVolts: 48, targetPercent: 2 });
ok('aluminium requires a larger conductor', al.wire.cm > cu.wire.cm, `${al.wire.cm} vs ${cu.wire.cm}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
