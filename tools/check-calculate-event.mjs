// Tool-usage event gate: proves the GA4 'calculate' event fires when a person
// actually runs a calculator, and that nothing reaches analytics hosts.
//
// The production gate in the page head only defines window.gtag on a real
// production host outside automation, so under Playwright the tracker is
// normally a no-op. Here we stub window.gtag the way the gated loader would
// have defined it, interact like a user, and read back what the tracker sent.
// The stub keeps the loader gate untouched — a request to an analytics host
// during this check is still a hard failure.
//
// Mobile viewport on purpose: the site is mobile-first and mode tabs are
// display:none on desktop (the sidebar takes over there).
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:8642/').replace(/\/$/, '');
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} calculate-event: ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const analyticsRequests = [];
await context.route('**/*', (route) => {
  const url = route.request().url();
  if (/googletagmanager|google-analytics|googlesyndication/.test(url)) {
    analyticsRequests.push(url);
  }
  route.continue();
});
await context.addInitScript(() => {
  window.__events = [];
  window.gtag = function () { window.__events.push([...arguments]); };
});

async function calcEvents(page) {
  return page.evaluate(() =>
    window.__events.filter((e) => e[0] === 'event' && e[1] === 'calculate').map((e) => e[2]));
}

// 1. Homepage voltage drop (US edition), submit-based; required fields filled
//    like a real user, because native validation blocks empty submits.
let page = await context.newPage();
await page.goto(`${BASE}/`);
await page.fill('#current', '20');
await page.fill('#distance', '100');
await page.click('#calc-form button[type="submit"]');
let events = await calcEvents(page);
check(events.length === 1 && events[0].tool === 'voltage-drop' && events[0].edition === 'us',
  'homepage submit fires tool=voltage-drop edition=us', JSON.stringify(events));
await page.click('#calc-form button[type="submit"]');
events = await calcEvents(page);
check(events.length === 2, 'second submit fires a second event', `count=${events.length}`);
await page.close();

// 2. Canadian French conduit fill — prefixed edition resolves correctly.
page = await context.newPage();
await page.goto(`${BASE}/ca-fr/conduit-fill/`);
await page.fill('#fill-count', '3');
await page.evaluate(() => {
  [...document.getElementById('fill-form').querySelectorAll('input[required]')].forEach((i) => {
    if (!i.disabled && !i.value) i.value = '3';
  });
});
await page.click('#fill-form button[type="submit"]');
events = await calcEvents(page);
check(events.length === 1 && events[0].tool === 'conduit-fill' && events[0].edition === 'ca-fr',
  'ca-fr conduit fill event tool/edition correct', JSON.stringify(events[0]));
await page.close();

// 3. Framed page: ohms-law shares power.js but must report its own slug.
page = await context.newPage();
await page.goto(`${BASE}/zh/ohms-law/`);
await page.click('#pw-form button[type="submit"]');
events = await calcEvents(page);
check(events.length === 1 && events[0].tool === 'ohms-law' && events[0].edition === 'zh',
  'zh ohms-law framed page reports its own slug', JSON.stringify(events[0]));
await page.close();

// 4. Wire colour has no Calculate button: page load fires nothing, the first
//    interaction fires exactly one event, further interactions fire no more.
page = await context.newPage();
await page.goto(`${BASE}/wire-colour/`);
events = await calcEvents(page);
check(events.length === 0, 'wire-colour page load fires nothing', `count=${events.length}`);
await page.selectOption('#wire-system', { index: 1 });
events = await calcEvents(page);
check(events.length === 1 && events[0].tool === 'wire-colour' && events[0].edition === 'us',
  'wire-colour first interaction fires one event', JSON.stringify(events[0]));
await page.selectOption('#wire-system', { index: 0 });
await page.click('[data-wire-mode="circuit"]');
events = await calcEvents(page);
check(events.length === 1, 'wire-colour further interactions fire no more', `count=${events.length}`);
await page.close();

// 5. Mode tabs sit OUTSIDE the form element — the click hook must still count.
page = await context.newPage();
await page.goto(`${BASE}/ca/wire-colour/`);
await page.click('[data-wire-mode="circuit"]');
events = await calcEvents(page);
check(events.length === 1 && events[0].tool === 'wire-colour' && events[0].edition === 'ca',
  'ca wire-colour mode-tab click (outside form) fires one event', JSON.stringify(events[0]));
await page.close();

// 6. The loader gate held: zero requests to analytics/ad hosts throughout.
check(analyticsRequests.length === 0, 'zero requests to analytics/ad hosts',
  analyticsRequests.join(', '));

await browser.close();
if (failures) {
  console.error(`calculate-event gate failed: ${failures} check(s).`);
  process.exit(1);
}
console.log('PASS calculate-event gate: tool-usage tracking fires for users, never for automation.');
