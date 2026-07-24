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
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://voltdrop.app/${p.dir}/">`)
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
