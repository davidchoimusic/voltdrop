// Generates the per-tool pages (own URLs for SEO) from index.html.
// Run after editing index.html, styles.css, or any .js: node build.mjs
// Then commit the outputs.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

// Cache-busting: stamp asset links with a content hash so Cloudflare's
// edge cache can never serve stale JS/CSS after a deploy. Idempotent.
const hash = (f) => createHash('md5').update(readFileSync(f)).digest('hex').slice(0, 10);
const V = {
  'styles.css': hash('styles.css'),
  'app.js': hash('app.js'),
  'common.js': hash('common.js'),
  'ampacity.js': hash('ampacity.js'),
  'conduit.js': hash('conduit.js'),
  'power.js': hash('power.js'),
  'boxfill.js': hash('boxfill.js'),
};
const stamp = (html) => html
  .replace(/\/styles\.css\?v=[A-Za-z0-9]+/g, `/styles.css?v=${V['styles.css']}`)
  .replace(/\/app\.js\?v=[A-Za-z0-9]+/g, `/app.js?v=${V['app.js']}`)
  .replace(/\/common\.js\?v=[A-Za-z0-9]+/g, `/common.js?v=${V['common.js']}`);

let src = stamp(readFileSync('index.html', 'utf8'));
writeFileSync('index.html', src);
console.log('stamped:', Object.entries(V).map(([k, v]) => `${k}?v=${v}`).join(' '));

const PAGES = [
  {
    dir: 'wire-size-calculator',
    mode: 'size',
    ldName: 'VoltDrop Wire Size Calculator',
    h1: '🔌 Wire Size Calculator',
    sub: "What gauge wire do you need? Enter amps, voltage, and one-way distance — get the smallest size that keeps voltage drop in check, with the math shown.",
    title: 'Wire Size Calculator — what gauge wire do I need? | VoltDrop',
    description: 'Free wire size calculator: enter amps, voltage, and one-way distance to get the smallest copper or aluminum AWG that keeps voltage drop under 3%. Plain English, full math shown, no signup.',
  },
  {
    dir: 'max-wire-length',
    mode: 'length',
    ldName: 'VoltDrop Max Wire Length Calculator',
    h1: '📏 Max Wire Length Calculator',
    sub: 'How far can your wire run before voltage drop becomes a problem? Get the maximum one-way distance for any wire size and load.',
    title: 'Max Wire Length Calculator — how far can this wire run? | VoltDrop',
    description: 'Free max wire run calculator: enter wire size, amps, and voltage to get the longest one-way distance that stays under 3% or 5% voltage drop. Copper and aluminum, DC and AC, no signup.',
  },
  {
    dir: 'ampacity-check',
    ldName: 'VoltDrop Ampacity Check',
    tool: 'ampacity',
    script: 'ampacity.js',
    main: 'partials/ampacity-main.html',
    title: 'Ampacity Check — how many amps can this wire carry? | VoltDrop',
    description: 'Free wire ampacity checker based on NEC Table 310.16: copper and aluminum, 60/75/90°C insulation, small-conductor breaker caps included. Clear yes/no verdict, no signup.',
  },
  {
    dir: 'conduit-fill',
    ldName: 'VoltDrop Conduit Fill Calculator',
    tool: 'conduit',
    script: 'conduit.js',
    main: 'partials/conduit-main.html',
    title: 'Conduit Fill Calculator — what size conduit for my wires? | VoltDrop',
    description: 'Free conduit fill calculator: THHN wire count and size in, smallest legal EMT or PVC Schedule 40 conduit out — using the official NEC Chapter 9 tables and 53/31/40% fill limits.',
  },
  {
    dir: 'privacy',
    tool: 'privacy',
    script: null, // static page — common.js alone is enough
    main: 'partials/privacy-main.html',
    title: 'Privacy Policy | VoltDrop',
    description: 'VoltDrop privacy policy: calculator inputs never leave your browser; optional sign-in data for comments only; no data sales; deletion on request.',
  },
  {
    dir: 'power-calculator',
    ldName: 'VoltDrop Power Calculator',
    tool: 'power',
    script: 'power.js',
    main: 'partials/power-main.html',
    title: 'Power Calculator — volts, amps, watts, kW & kVA | VoltDrop',
    description: 'Free electrical power calculator: convert between volts, amps, watts, kW and kVA with power factor — DC, single-phase, and three-phase. Full math shown, no signup.',
  },
  {
    dir: 'box-fill',
    ldName: 'VoltDrop Box Fill Calculator',
    tool: 'boxfill',
    script: 'boxfill.js',
    main: 'partials/boxfill-main.html',
    title: 'Box Fill Calculator — is my electrical box big enough? | VoltDrop',
    description: 'Free NEC 314.16 box fill calculator: count wires, devices, grounds and clamps, get a clear fits/too-full verdict with the cubic-inch math shown. No signup.',
  },
  {
    dir: 'guides',
    tool: 'guides',
    script: null,
    main: 'partials/guides-index-main.html',
    title: 'Electrical Wiring Guides — verified answers, math shown | VoltDrop',
    description: 'Plain-English guides to wire sizing, voltage drop, ampacity and box fill — every number source-verified against the published code tables, every answer with the math shown.',
  },
  {
    dir: 'guides/sub-panel-wire-size',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/sub-panel-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/sub-panel-wire-size/'}],
    script: null,
    main: 'partials/guide-subpanel-main.html',
    title: 'Wire Size for a Sub-Panel (Shed or Detached Garage) — with distance tables | VoltDrop',
    description: 'What size wire for a 50, 60 or 100 amp sub-panel at 50-300 feet: verified copper and aluminum tables, the voltage-drop math that reconciles the forum debates, and the 4 things people miss.',
  },
  {
    dir: 'guides/50-amp-wire-size',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/50-amp-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/50-amp-wire-size/'}],
    script: null,
    main: 'partials/guide-50amp-main.html',
    title: 'What Size Wire for 50 Amps? Breaker, hot tub, EV, RV | VoltDrop',
    description: 'Why the internet says both 6 and 8 gauge for 50 amps — and the real answer by wire type, with a verified distance table and worked examples for hot tubs, EV chargers, and RV outlets.',
  },
  {
    dir: 'guides/wire-ampacity-chart',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/wire-ampacity-chart/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/wire-ampacity-chart/'}],
    script: null,
    main: 'partials/guide-ampacity-main.html',
    title: 'Wire Ampacity Chart — NEC Table 310.16, current code | VoltDrop',
    description: 'Full copper and aluminum ampacity chart (60/75/90°C, verified against the published NEC tables, identical 2017-2023) plus the plain-English rule for which temperature column you may use.',
  },
  {
    dir: 'guides/how-far-12-gauge-wire',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/how-far-12-gauge-wire/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/how-far-12-gauge-wire/'}],
    script: null,
    main: 'partials/guide-12gauge-main.html',
    title: 'How Far Can You Run 12 Gauge Wire? Distance limits by gauge | VoltDrop',
    description: 'Verified distance tables for 14-6 AWG at 120 V and 240 V under the 3% voltage-drop target — plus why other sites say 50, 57, or 100 feet for the same wire.',
  },
  {
    dir: 'guides/voltage-drop-formula',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/voltage-drop-formula/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/voltage-drop-formula/'}],
    script: null,
    main: 'partials/guide-vdformula-main.html',
    title: 'Voltage Drop Formula & the 3% Rule, Explained | VoltDrop',
    description: 'The K-factor voltage drop formula with three worked examples (including 12 V DC), whether the 3% rule is actually code, and how to fix excessive drop.',
  },
  {
    dir: 'ca/guides',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guides-index-main.html',
    title: 'Canadian Electrical Guides — CEC, verified | VoltDrop',
    description: 'Plain-English Canadian wiring guides written to the CEC: sub-panel wire size, 50 amp circuits, ampacity tables, run-length limits, and the mandatory Rule 8-102 voltage-drop rules.',
  },
  {
    dir: 'ca/guides/sub-panel-wire-size',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-subpanel-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/sub-panel-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/sub-panel-wire-size/'}],
    title: 'Wire Size for a Sub-Panel in Canada (Shed or Garage) — CEC Rule 8-102 | VoltDrop',
    description: "What size wire for a 50, 60 or 100 amp sub-panel in Canada: metric+imperial distance tables under the CEC's mandatory 3% voltage-drop limit, NMD90/aluminum notes, worked examples.",
  },
  {
    dir: 'ca/guides/50-amp-wire-size',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-50amp-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/50-amp-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/50-amp-wire-size/'}],
    title: 'What Size Wire for 50 Amps in Canada? NMD90, hot tub, EV | VoltDrop',
    description: 'The Canadian 50-amp answer: #6 NMD90 vs #8 T90 in conduit under CEC termination rules, with a verified distance table and hot tub / EV / RV framings.',
  },
  {
    dir: 'ca/guides/wire-ampacity-chart',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-ampacity-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/wire-ampacity-chart/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/wire-ampacity-chart/'}],
    title: 'Wire Ampacity Chart Canada — CEC Table 2 & Table 4 | VoltDrop',
    description: 'Canadian copper and aluminum ampacity chart (CEC Tables 2 and 4, harmonized with US values — verified), plus the NMD90 termination-temperature rules in plain English.',
  },
  {
    dir: 'ca/guides/how-far-12-gauge-wire',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-12gauge-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/how-far-12-gauge-wire/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/how-far-12-gauge-wire/'}],
    title: 'How Far Can You Run 12 Gauge Wire in Canada? (metres + feet) | VoltDrop',
    description: "Distance limits by gauge in metres and feet under the CEC's mandatory 3% limit — plus Canada's official answer to the breaker-vs-actual-load question and Table 68.",
  },
  {
    dir: 'ca/guides/voltage-drop-formula',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-vdformula-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/voltage-drop-formula/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/voltage-drop-formula/'}],
    title: 'Voltage Drop in Canada — Rule 8-102 Explained | VoltDrop',
    description: 'CEC Rule 8-102 in plain English: the mandatory 3%/3%/5% limits, the 80%-of-breaker calculation basis, Table 68 dwelling lengths, the formula, and worked examples.',
  },
  {
    dir: 'terms',
    tool: 'terms',
    script: null,
    main: 'partials/terms-main.html',
    title: 'Terms of Service | VoltDrop',
    description: 'VoltDrop terms of service: free electrical calculators provided as planning estimates, not professional advice; no warranty; comment rules.',
  },
];

for (const p of PAGES) {
  let html = src
    .replace(/<title>[^<]*<\/title>/, `<title>${p.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${p.description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${p.title.replace(/"/g, '&quot;')}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${p.description}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${p.title.replace(/"/g, '&quot;')}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${p.description}$2`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://voltdrop.app/${p.dir}/">` +
      (p.hreflang ? '\n' + p.hreflang.map(h => `<link rel="alternate" hreflang="${h.lang}" href="${h.href}">`).join('\n') : ''))
    .replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1https://voltdrop.app/${p.dir}/$2`);

  if (p.mode) {
    html = html.replace('<body>', `<body data-mode="${p.mode}">`);
    if (!html.includes(`data-mode="${p.mode}"`)) throw new Error(`body stamp failed for ${p.dir}`);
    // Mode pages share the homepage main — swap in their own h1 + subtitle.
    html = html
      .replace(/(<h1 class="tool-title" id="page-h1">)[^<]*(<\/h1>)/, `$1${p.h1}$2`)
      .replace(/(<p class="tool-sub" id="page-sub">)[^<]*(<\/p>)/, `$1${p.sub}$2`);
  }

  // Per-page WebApplication JSON-LD (dropped for content pages like privacy/terms).
  const ldRe = /<script type="application\/ld\+json" data-ld="app">[\s\S]*?<\/script>\n?/;
  if (p.ldName) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: p.ldName,
      url: `https://voltdrop.app/${p.dir}/`,
      description: p.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    };
    html = html.replace(ldRe, `<script type="application/ld+json" data-ld="app">${JSON.stringify(ld)}</script>\n`);
  } else {
    html = html.replace(ldRe, '');
  }

  if (p.main) {
    const main = readFileSync(p.main, 'utf8');
    html = html.replace(/<main class="main-col">[\s\S]*<\/main>/, main.trim());
    // Page script replaces the calculator script; common.js stays.
    // script: null drops the calculator script entirely (pure content pages).
    if (p.script) {
      html = html.replace(/<script src="\/app\.js[^"]*"><\/script>/, `<script src="/${p.script}?v=${V[p.script]}"></script>`);
      if (!html.includes(p.script)) throw new Error(`script swap failed for ${p.dir}`);
    } else {
      html = html.replace(/<script src="\/app\.js[^"]*"><\/script>\n?/, '');
    }
    // Highlight this tool in the sidebar (app.js does it for calculator modes).
    html = html.replace(`class="tool-link" data-tool="${p.tool}"`, `class="tool-link active" data-tool="${p.tool}"`);
  }

  mkdirSync(p.dir, { recursive: true });
  writeFileSync(`${p.dir}/index.html`, html);
  console.log(`built ${p.dir}/index.html`);
}
