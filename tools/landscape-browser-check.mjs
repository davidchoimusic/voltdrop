// Drive the real page in a real browser: fill rows, submit, assert the numbers,
// and assert zero page errors DURING interaction (not just on load) — the
// failure mode that once passed 178 checks while four editions were dead.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8651/landscape-lighting-calculator/';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
};

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(BASE, { waitUntil: 'networkidle' });

/* Quick fill and the manufacturer-limit fields live inside <details> so the form
   stays short on a phone. Open them before driving them. */
const openDetails = async () => {
  await page.evaluate(() => {
    document.querySelectorAll('details.math-details').forEach((d) => { d.open = true; });
  });
};

await openDetails();

ok('page has the h1', (await page.locator('h1.tool-title').textContent()).includes('Landscape'));
ok('sidebar link is present', await page.locator('a[data-tool="landscape"]').count() > 0);
ok('landscape.js loaded with a ?v= stamp',
  await page.locator('script[src*="landscape.js?v="]').count() > 0);
ok('wire select is populated from the sealed table',
  await page.locator('#ls-size option').count() === 20);
ok('12 AWG is the default', await page.locator('#ls-size').inputValue() === '3');
ok('results start hidden', await page.locator('#results').isHidden());

// Four 7 W fixtures at 20/40/60/80 ft on 12 AWG copper from a 12 V tap.
await page.fill('#ls-pf', '1');
const rows = [[20, 7], [40, 7], [60, 7], [80, 7]];
for (let i = 0; i < rows.length; i++) {
  if (i > 0) await page.click('#ls-add-row');
  const row = page.locator('#ls-rows .fixture-row').nth(i);
  await row.locator('.ls-ft').fill(String(rows[i][0]));
  await row.locator('.ls-load').fill(String(rows[i][1]));
}
ok('four fixture rows exist', await page.locator('#ls-rows .fixture-row').count() === 4);

await page.click('button.calc-btn');
await page.waitForSelector('#results:not([hidden])');

const big = await page.locator('#big-number').textContent();
// Hand-calculated: sum of segment drops = 0.46095 V, so 12 - 0.46095 = 11.54 V
ok('lowest voltage matches the hand calculation', big.trim().startsWith('11.54'), `got ${big}`);

const taps = await page.locator('#ls-taps li').count();
ok('four taps listed', taps === 4, `got ${taps}`);

const compareRows = await page.locator('#ls-compare tbody tr').count();
ok('three layouts compared', compareRows === 3, `got ${compareRows}`);
ok('the chosen layout is marked', await page.locator('#ls-compare tr.is-yours').count() === 1);

const cmp = await page.locator('#ls-compare').innerText();
ok('comparison shows daisy, hub and star', /Daisy/.test(cmp) && /Hub/.test(cmp) && /Star/.test(cmp));

const cautions = await page.locator('#ls-cautions').innerText();
ok('says ampacity was not checked', /rated to carry/i.test(cautions));
ok('says limits were not evaluated', /Not evaluated against manufacturer limits/i.test(cautions));
ok('no false brightness claim', !/dimmest|brightest/i.test(await page.locator('#results').innerText()));

// Switch layout: the numbers must change, and hub reveals its extra input.
await page.click('button[data-layout="hub"]');
ok('hub distance field appears', await page.locator('#ls-field-hub').isVisible());
await page.fill('#ls-hub-ft', '50');
await page.click('button.calc-btn');
await page.waitForTimeout(200);
const hubBig = await page.locator('#big-number').textContent();
ok('hub gives a different answer than daisy', hubBig.trim() !== big.trim(), `${hubBig} vs ${big}`);

// Quick fill must populate rows, not act as a second engine.
await page.click('button[data-layout="daisy"]');
await page.fill('#ls-qf-count', '6');
await page.fill('#ls-qf-first', '20');
await page.fill('#ls-qf-spacing', '15');
await page.fill('#ls-qf-load', '7');
await page.click('#ls-qf-apply');
await page.waitForTimeout(200);
ok('quick fill produced six rows',
  await page.locator('#ls-rows .fixture-row').count() === 6,
  `got ${await page.locator('#ls-rows .fixture-row').count()}`);
ok('first quick-filled row is 20 ft',
  await page.locator('#ls-rows .fixture-row').first().locator('.ls-ft').inputValue() === '20');

// A deliberately impossible design must refuse to print a number.
await page.selectOption('#ls-size', '0'); // 18 AWG
await page.fill('#ls-qf-count', '10');
await page.fill('#ls-qf-first', '100');
await page.fill('#ls-qf-spacing', '50');
await page.fill('#ls-qf-load', '50');
await page.click('#ls-qf-apply');
await page.waitForTimeout(200);
const collapsedText = await page.locator('#results').innerText();
ok('impossible design refuses to show a voltage', /—/.test(await page.locator('#big-number').textContent()));
ok('impossible design says it will not work', /cannot work|WILL NOT WORK/i.test(collapsedText));

// Unity power factor assumption must be disclosed when PF is left blank.
await page.fill('#ls-pf', '');
await page.selectOption('#ls-size', '3');
await page.fill('#ls-qf-count', '4');
await page.fill('#ls-qf-first', '20');
await page.fill('#ls-qf-spacing', '20');
await page.fill('#ls-qf-load', '7');
await page.click('#ls-qf-apply');
await page.waitForTimeout(200);
ok('blank power factor is disclosed',
  /assumed 1\.0|best case/i.test(await page.locator('#ls-cautions').innerText()));

ok('zero page errors during all of that', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
