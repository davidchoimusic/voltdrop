// End-to-end check: drive all three modes, assert the math, screenshot.
// ALSO: electrical-data tripwire — the tables below are SOURCE-VERIFIED
// safety data (people get hurt if they're wrong). Any change to them fails
// this suite until the source-verification pass is re-run and the golden
// hash deliberately updated. See PROJECT_CONTEXT.md "REGRESSION RISKS".
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const BASE = process.env.BASE || 'http://localhost:8642/';
const shots = 'verify-shots';
import { mkdirSync } from 'fs';
mkdirSync(shots, { recursive: true });

// ---- Electrical data tripwire (runs before anything else) ----
// Each entry: [file, constant name]. Golden hashes = the state that passed
// independent source verification (NEC page reproductions, 2026-07-24).
const DATA_TABLES = [
  ['app.js', 'WIRE_TABLE'], ['app.js', 'K_FACTOR'],
  ['ampacity.js', 'AMPACITY'], ['ampacity.js', 'SMALL_CAP'],
  ['conduit.js', 'THHN_AREA'], ['conduit.js', 'CONDUIT'],
  ['boxfill.js', 'VOL_PER_CONDUCTOR'], ['boxfill.js', 'BOXES'],
  ['boxfill.js', 'CEC_VOL_ML'],
];
const GOLDEN = JSON.parse(readFileSync('data-golden.json', 'utf8'));
let dataPass = 0, dataFail = 0;
for (const [file, name] of DATA_TABLES) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(new RegExp(`const ${name} = [\\s\\S]*?\\n[}\\]];`));
  if (!m) { console.log(`FAIL data tripwire: ${name} not found in ${file}`); dataFail++; continue; }
  const h = createHash('md5').update(m[0]).digest('hex');
  const key = `${file}:${name}`;
  if (GOLDEN[key] === h) { console.log(`PASS data intact: ${key}`); dataPass++; }
  else {
    console.log(`FAIL DATA CHANGED: ${key} — hash ${h} != golden ${GOLDEN[key]}`);
    console.log(`  >> Electrical safety data was modified. Re-run independent source`);
    console.log(`  >> verification, then update data-golden.json ON PURPOSE.`);
    dataFail++;
  }
}
if (dataFail > 0) {
  console.log(`\nDATA TRIPWIRE FAILED (${dataFail}) — refusing to continue.`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone-ish
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE);

let pass = 0, fail = 0;
const check = (name, got, want, tol = 0.02) => {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${got}, expected ~${want}`);
  ok ? pass++ : fail++;
};

// ---- Mode 1: voltage drop. DC 12V, 20A, 12AWG copper, 25ft one-way.
// Vd = 2*12.9*20*25/6530 = 1.9755 V → 16.46% (classic 12V-lesson case, should be RED)
await page.fill('#current', '20');
await page.fill('#distance', '25');
await page.click('#calc-btn');
await page.waitForSelector('#results:not([hidden])');
let big = await page.textContent('#big-number');
check('drop % (12V 20A 25ft 12AWG Cu)', parseFloat(big), 16.46);
let cls = await page.getAttribute('#verdict', 'class');
console.log(cls.includes('bad') ? 'PASS verdict red' : 'FAIL verdict red'); cls.includes('bad') ? pass++ : fail++;
await page.screenshot({ path: `${shots}/1-drop-dc-red.png`, fullPage: true });

// AC single-phase 120V, 15A, 12AWG Cu, 50ft → Vd = 2*12.9*15*50/6530 = 2.963V = 2.47% GREEN
await page.click('[data-system="ac1"]');
await page.fill('#voltage', '120');
await page.fill('#current', '15');
await page.fill('#distance', '50');
await page.click('#calc-btn');
big = await page.textContent('#big-number');
check('drop % (120V 15A 50ft 12AWG Cu)', parseFloat(big), 2.47);
cls = await page.getAttribute('#verdict', 'class');
console.log(cls.includes('good') ? 'PASS verdict green' : 'FAIL verdict green'); cls.includes('good') ? pass++ : fail++;
await page.screenshot({ path: `${shots}/2-drop-ac-green.png`, fullPage: true });

// Three-phase 480V, 100A, 1/0 AWG Al, 300ft → Vd = 1.732*21.2*100*300/105600 = 10.43V = 2.17%
await page.click('[data-system="ac3"]');
await page.fill('#voltage', '480');
await page.fill('#current', '100');
await page.fill('#distance', '300');
await page.click('[data-material="al"]');
await page.selectOption('#awg', '11'); // 1/0 AWG
await page.click('#calc-btn');
big = await page.textContent('#big-number');
check('drop % (3ph 480V 100A 300ft 1/0 Al)', parseFloat(big), 2.17);

// ---- Mode 2: wire size. AC1 240V, 40A, 150ft, 3% → need Vd<=7.2V.
// 6 AWG: 2*12.9*40*150/26240 = 5.90V ✓ ; 8 AWG: 9.37V ✗ → expect 6 AWG
await page.click('#tab-size');
await page.click('[data-system="ac1"]');
await page.click('[data-material="cu"]');
await page.fill('#voltage', '240');
await page.fill('#current', '40');
await page.fill('#distance', '150');
await page.click('#calc-btn');
await page.waitForSelector('#results:not([hidden])');
big = await page.textContent('#big-number');
console.log(big.trim() === '6 AWG' ? 'PASS min size = 6 AWG' : `FAIL min size: got "${big}"`); big.trim() === '6 AWG' ? pass++ : fail++;
await page.screenshot({ path: `${shots}/3-size.png`, fullPage: true });

// ---- Mode 3: max length. DC 12V 10A 10AWG Cu at 3% → L = 0.36*10380/(2*12.9*10) = 14.48 ft
await page.click('#tab-length');
await page.click('[data-system="dc"]');
await page.fill('#voltage', '12');
await page.fill('#current', '10');
await page.selectOption('#awg', '4'); // 10 AWG
await page.click('#calc-btn');
big = await page.textContent('#big-number');
check('max length ft (12V 10A 10AWG 3%)', parseFloat(big), 14.48, 0.05);
await page.screenshot({ path: `${shots}/4-length.png`, fullPage: true });

// ---- Country selection + persistence
await page.click('[data-country="ca"]');
let chip = await page.textContent('#country-chip');
console.log(chip.includes('Canada') ? 'PASS chip shows Canada' : `FAIL chip: "${chip}"`); chip.includes('Canada') ? pass++ : fail++;
await page.reload();
chip = await page.textContent('#country-chip');
console.log(chip.includes('Canada') ? 'PASS Canada remembered after reload' : `FAIL after reload: "${chip}"`); chip.includes('Canada') ? pass++ : fail++;
let codeName = await page.textContent('#code-name');
console.log(codeName.includes('Canadian') ? 'PASS explainer cites CEC' : `FAIL code name: "${codeName}"`); codeName.includes('Canadian') ? pass++ : fail++;
// Canada 3-phase presets should include 600 V
await page.click('[data-system="ac3"]');
const presets = await page.textContent('#voltage-presets');
console.log(presets.includes('600') ? 'PASS CA 3-phase presets include 600 V' : `FAIL presets: "${presets}"`); presets.includes('600') ? pass++ : fail++;
await page.screenshot({ path: `${shots}/6-canada.png`, fullPage: true });
// back to US for the desktop shot
await page.click('[data-country="us"]');

// ---- Per-tool pages (own URLs) preselect the right mode + sidebar highlight
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + 'wire-size-calculator/');
let activeTab = await page.textContent('.mode-tab.active .mode-title');
console.log(activeTab.includes('Wire size') ? 'PASS /wire-size-calculator/ preselects Wire size' : `FAIL preselect: "${activeTab}"`); activeTab.includes('Wire size') ? pass++ : fail++;
let activeTool = await page.textContent('.tool-link.active');
console.log(activeTool.includes('Wire Size') ? 'PASS sidebar highlights Wire Size' : `FAIL sidebar: "${activeTool}"`); activeTool.includes('Wire Size') ? pass++ : fail++;
await page.goto(BASE + 'max-wire-length/');
activeTab = await page.textContent('.mode-tab.active .mode-title');
console.log(activeTab.includes('Max distance') ? 'PASS /max-wire-length/ preselects Max distance' : `FAIL preselect: "${activeTab}"`); activeTab.includes('Max distance') ? pass++ : fail++;

// ---- Ampacity Check: 12 AWG Cu @75°C = 25 A table, but 20 A breaker cap → limit 20 A
await page.goto(BASE + 'ampacity-check/');
await page.fill('#amp-load', '15');
await page.click('#amp-form .calc-btn');
await page.waitForSelector('#results:not([hidden])');
let ampBig = await page.textContent('#big-number');
console.log(ampBig.trim() === '20 A' ? 'PASS ampacity 12AWG Cu 75C limit = 20 A (240.4(D) cap)' : `FAIL ampacity: got "${ampBig}"`); ampBig.trim() === '20 A' ? pass++ : fail++;
cls = await page.getAttribute('#verdict', 'class');
console.log(cls.includes('good') ? 'PASS ampacity verdict OK at 15 A' : `FAIL verdict: ${cls}`); cls.includes('good') ? pass++ : fail++;
// Aluminum 8 AWG @60°C = 35 A (the value the source-check corrected)
await page.click('[data-material="al"]');
await page.selectOption('#amp-size', '8 AWG');
await page.click('[data-temp="60"]');
await page.fill('#amp-load', '30');
await page.click('#amp-form .calc-btn');
ampBig = await page.textContent('#big-number');
console.log(ampBig.trim() === '35 A' ? 'PASS ampacity 8AWG Al 60C = 35 A' : `FAIL Al ampacity: got "${ampBig}"`); ampBig.trim() === '35 A' ? pass++ : fail++;
await page.screenshot({ path: `${shots}/7-ampacity.png`, fullPage: true });

// ---- Conduit Fill: 10 × 12 THHN = 0.133 sq in → 1/2" EMT 40% = 0.1216 (no), 3/4" = 0.2132 (yes)
await page.goto(BASE + 'conduit-fill/');
await page.fill('#fill-count', '10');
await page.click('#fill-form .calc-btn');
await page.waitForSelector('#results:not([hidden])');
let fillBig = await page.textContent('#big-number');
console.log(fillBig.trim() === '3/4"' ? 'PASS conduit 10×12 THHN EMT = 3/4"' : `FAIL conduit: got "${fillBig}"`); fillBig.trim() === '3/4"' ? pass++ : fail++;
let fillCells = await page.textContent('#result-grid');
console.log(fillCells.includes('25.0%') ? 'PASS fill % = 25.0%' : `FAIL fill %: "${fillCells.slice(0, 120)}"`); fillCells.includes('25.0%') ? pass++ : fail++;
await page.screenshot({ path: `${shots}/8-conduit.png`, fullPage: true });

// ---- Power Calculator: 1φ 240V 1500W PF1 → 6.25 A; 3φ 480V 10000W PF0.85 → 14.15 A
await page.goto(BASE + 'power-calculator/');
await page.click('[data-system="ac1"]');
await page.fill('#pw-volts', '240');
await page.fill('#pw-watts', '1500');
await page.click('#pw-form .calc-btn');
await page.waitForSelector('#results:not([hidden])');
let pwBig = await page.textContent('#big-number');
check('power amps (240V 1500W 1φ)', parseFloat(pwBig), 6.25);
await page.click('[data-system="ac3"]');
await page.fill('#pw-volts', '480');
await page.fill('#pw-watts', '10000');
await page.fill('#pw-pf', '0.85');
await page.click('#pw-form .calc-btn');
pwBig = await page.textContent('#big-number');
check('power amps (480V 10kW 3φ PF0.85)', parseFloat(pwBig), 14.15);
await page.screenshot({ path: `${shots}/13-power.png`, fullPage: true });

// ---- Box Fill: 18 cu in box, 12 AWG, 6 wires + 1 device + grounds = 9 × 2.25 = 20.25 → TOO FULL
await page.goto(BASE + 'box-fill/');
await page.fill('#bf-conductors', '6');
await page.fill('#bf-devices', '1');
await page.click('#bf-form .calc-btn');
await page.waitForSelector('#results:not([hidden])');
let bfBig = await page.textContent('#big-number');
check('box fill needed cu in (6w+1d+gnd 12AWG)', parseFloat(bfBig.replace(/,/g, '')), 20.25);
cls = await page.getAttribute('#verdict', 'class');
console.log(cls.includes('bad') ? 'PASS box fill verdict TOO FULL' : `FAIL box verdict: ${cls}`); cls.includes('bad') ? pass++ : fail++;
// Same box with 14 AWG → 9 × 2.0 = 18.0 exactly → fits (tight)
await page.selectOption('#bf-size', '14 AWG');
await page.click('#bf-form .calc-btn');
bfBig = await page.textContent('#big-number');
check('box fill 14 AWG exact fit', parseFloat(bfBig.replace(/,/g, '')), 18.0);
cls = await page.getAttribute('#verdict', 'class');
console.log(cls.includes('warn') || cls.includes('good') ? 'PASS 18.0/18.0 fits' : `FAIL fit verdict: ${cls}`); (cls.includes('warn') || cls.includes('good')) ? pass++ : fail++;
await page.screenshot({ path: `${shots}/14-boxfill.png`, fullPage: true });

// ---- Guides: every page loads, has an h1, highlights Guides in sidebar
for (const g of ['guides/', 'guides/sub-panel-wire-size/', 'guides/50-amp-wire-size/', 'guides/wire-ampacity-chart/', 'guides/how-far-12-gauge-wire/', 'guides/voltage-drop-formula/', 'ca/guides/', 'ca/guides/sub-panel-wire-size/', 'ca/guides/50-amp-wire-size/', 'ca/guides/wire-ampacity-chart/', 'ca/guides/how-far-12-gauge-wire/', 'ca/guides/voltage-drop-formula/']) {
  await page.goto(BASE + g);
  const h1 = await page.textContent('h1').catch(() => null);
  const active = await page.textContent('.sidebar .tool-link.active').catch(() => '');
  const ok = h1 && h1.trim().length > 3 && active.includes('Guides');
  console.log(ok ? `PASS guide /${g} (${h1.trim().slice(0, 30)}…)` : `FAIL guide /${g}: h1=${h1} active=${active}`); ok ? pass++ : fail++;
}
// Spot-check a computed table value: sub-panel guide, 100A Cu @150ft = 2 AWG
await page.goto(BASE + 'guides/sub-panel-wire-size/');
const tbl = await page.textContent('.gtable');
console.log(tbl.includes('100 A copper') ? 'PASS sub-panel table present' : 'FAIL table missing'); tbl.includes('100 A copper') ? pass++ : fail++;

// ---- Logo present and loading on every page
for (const path of ['', 'ampacity-check/', 'conduit-fill/']) {
  await page.goto(BASE + path);
  const logoOk = await page.$eval('.brand-logo', (img) => img.complete && img.naturalWidth > 0);
  const favOk = await page.$('link[rel="icon"]') !== null;
  console.log(logoOk && favOk ? `PASS logo+favicon on /${path}` : `FAIL logo on /${path}: img=${logoOk} fav=${favOk}`); logoOk && favOk ? pass++ : fail++;
}

// Desktop screenshot too
await page.goto(BASE);
await page.screenshot({ path: `${shots}/5-desktop.png`, fullPage: true });

console.log(`\n${pass + dataPass} passed (${dataPass} data-integrity), ${fail} failed, JS errors: ${errors.length}`);
errors.forEach((e) => console.log('JS ERROR:', e));
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
