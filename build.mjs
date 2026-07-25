// Generates the per-tool pages (own URLs for SEO) from index.html.
// Run after editing index.html, styles.css, or any .js: node build.mjs
// Then commit the outputs.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

const localeArg = process.argv.find((arg) => arg.startsWith('--locale='));
const locale = localeArg ? localeArg.slice('--locale='.length) : 'en';
const SUPPORTED_LOCALES = new Set(['en']);
if (!SUPPORTED_LOCALES.has(locale)) {
  throw new Error(`Unsupported locale "${locale}". Stage 1 intentionally ships English only.`);
}

const catalog = JSON.parse(readFileSync(`i18n/strings/${locale}.json`, 'utf8'));
const englishCatalog = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const runtimeMap = JSON.parse(readFileSync('i18n/runtime-map.json', 'utf8'));

const text = (key, source = catalog) => {
  const value = key.split('.').reduce((cursor, part) => cursor?.[part], source);
  if (typeof value !== 'string') throw new Error(`Missing catalog string: ${key}`);
  return value;
};

const renderTemplate = (template, label) => {
  const rendered = template.replace(/\{\{(?:(json|attr):)?([A-Za-z0-9.%]+)\}\}/g, (_, format, key) => {
    const value = text(key);
    if (format === 'json') return JSON.stringify(value).slice(1, -1);
    return value;
  });
  const unresolved = rendered.match(/\{\{[^}]+\}\}/);
  if (unresolved) throw new Error(`Unresolved catalog placeholder in ${label}: ${unresolved[0]}`);
  return rendered;
};

const quoteLike = (value, quote) => {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(quote, 'g'), `\\${quote}`)
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `${quote}${escaped}${quote}`;
};

// Runtime copy lives in the JavaScript assets rather than the HTML templates.
// The map makes those strings catalog-driven too. English replacements are
// deliberately identity replacements, which preserves the asset hashes.
for (const [file, entries] of Object.entries(runtimeMap)) {
  let source = readFileSync(file, 'utf8');
  for (const entry of entries) {
    const english = text(entry.key, englishCatalog);
    const localized = text(entry.key);
    const raw = entry.kind === 'quoted'
      ? quoteLike(english, entry.quote)
      : `${entry.leading}${english}${entry.trailing}`;
    if (!source.includes(raw)) {
      throw new Error(`Runtime source fragment for ${entry.key} is missing from ${file}`);
    }
    let replacement;
    if (entry.kind === 'quoted') {
      const decoded = Function(`"use strict"; return (${raw});`)();
      if (decoded !== english) throw new Error(`Runtime map drift for ${entry.key} in ${file}`);
      replacement = locale === 'en' ? raw : quoteLike(localized, entry.quote);
    } else {
      replacement = locale === 'en' ? raw : `${entry.leading}${localized}${entry.trailing}`;
    }
    source = source.replaceAll(raw, replacement);
  }
  writeFileSync(file, source);
}

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

let src = stamp(renderTemplate(readFileSync('templates/index.html', 'utf8'), 'templates/index.html'));
writeFileSync('index.html', src);
console.log(`locale: ${locale}`);
console.log('stamped:', Object.entries(V).map(([k, v]) => `${k}?v=${v}`).join(' '));

const PAGES = [
  {
    dir: 'wire-size-calculator',
    mode: 'size',
    ldNameKey: 'pages.us.wireSize.ldName',
    h1Key: 'pages.us.wireSize.h1',
    subKey: 'pages.us.wireSize.sub',
    titleKey: 'pages.us.wireSize.title',
    descriptionKey: 'pages.us.wireSize.description',
  },
  {
    dir: 'max-wire-length',
    mode: 'length',
    ldNameKey: 'pages.us.maxLength.ldName',
    h1Key: 'pages.us.maxLength.h1',
    subKey: 'pages.us.maxLength.sub',
    titleKey: 'pages.us.maxLength.title',
    descriptionKey: 'pages.us.maxLength.description',
  },
  {
    dir: 'ampacity-check',
    ldNameKey: 'pages.us.ampacity.ldName',
    tool: 'ampacity',
    script: 'ampacity.js',
    main: 'partials/ampacity-main.html',
    titleKey: 'pages.us.ampacity.title',
    descriptionKey: 'pages.us.ampacity.description',
  },
  {
    dir: 'conduit-fill',
    ldNameKey: 'pages.us.conduit.ldName',
    tool: 'conduit',
    script: 'conduit.js',
    main: 'partials/conduit-main.html',
    titleKey: 'pages.us.conduit.title',
    descriptionKey: 'pages.us.conduit.description',
  },
  {
    dir: 'privacy',
    tool: 'privacy',
    script: null, // static page — common.js alone is enough
    main: 'partials/privacy-main.html',
    titleKey: 'pages.us.privacy.title',
    descriptionKey: 'pages.us.privacy.description',
  },
  {
    dir: 'power-calculator',
    ldNameKey: 'pages.us.power.ldName',
    tool: 'power',
    script: 'power.js',
    main: 'partials/power-main.html',
    titleKey: 'pages.us.power.title',
    descriptionKey: 'pages.us.power.description',
  },
  {
    dir: 'box-fill',
    ldNameKey: 'pages.us.boxFill.ldName',
    tool: 'boxfill',
    script: 'boxfill.js',
    main: 'partials/boxfill-main.html',
    titleKey: 'pages.us.boxFill.title',
    descriptionKey: 'pages.us.boxFill.description',
  },
  {
    dir: 'guides',
    tool: 'guides',
    script: null,
    main: 'partials/guides-index-main.html',
    titleKey: 'pages.us.guides.index.title',
    descriptionKey: 'pages.us.guides.index.description',
  },
  {
    dir: 'guides/sub-panel-wire-size',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/sub-panel-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/sub-panel-wire-size/'}],
    script: null,
    main: 'partials/guide-subpanel-main.html',
    titleKey: 'pages.us.guides.subPanel.title',
    descriptionKey: 'pages.us.guides.subPanel.description',
  },
  {
    dir: 'guides/50-amp-wire-size',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/50-amp-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/50-amp-wire-size/'}],
    script: null,
    main: 'partials/guide-50amp-main.html',
    titleKey: 'pages.us.guides.fiftyAmp.title',
    descriptionKey: 'pages.us.guides.fiftyAmp.description',
  },
  {
    dir: 'guides/wire-ampacity-chart',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/wire-ampacity-chart/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/wire-ampacity-chart/'}],
    script: null,
    main: 'partials/guide-ampacity-main.html',
    titleKey: 'pages.us.guides.ampacityChart.title',
    descriptionKey: 'pages.us.guides.ampacityChart.description',
  },
  {
    dir: 'guides/how-far-12-gauge-wire',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/how-far-12-gauge-wire/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/how-far-12-gauge-wire/'}],
    script: null,
    main: 'partials/guide-12gauge-main.html',
    titleKey: 'pages.us.guides.twelveGauge.title',
    descriptionKey: 'pages.us.guides.twelveGauge.description',
  },
  {
    dir: 'guides/voltage-drop-formula',
    tool: 'guides',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/voltage-drop-formula/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/voltage-drop-formula/'}],
    script: null,
    main: 'partials/guide-vdformula-main.html',
    titleKey: 'pages.us.guides.voltageDrop.title',
    descriptionKey: 'pages.us.guides.voltageDrop.description',
  },
  {
    dir: 'ca/guides',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guides-index-main.html',
    titleKey: 'pages.ca.guides.index.title',
    descriptionKey: 'pages.ca.guides.index.description',
  },
  {
    dir: 'ca/guides/sub-panel-wire-size',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-subpanel-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/sub-panel-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/sub-panel-wire-size/'}],
    titleKey: 'pages.ca.guides.subPanel.title',
    descriptionKey: 'pages.ca.guides.subPanel.description',
  },
  {
    dir: 'ca/guides/50-amp-wire-size',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-50amp-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/50-amp-wire-size/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/50-amp-wire-size/'}],
    titleKey: 'pages.ca.guides.fiftyAmp.title',
    descriptionKey: 'pages.ca.guides.fiftyAmp.description',
  },
  {
    dir: 'ca/guides/wire-ampacity-chart',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-ampacity-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/wire-ampacity-chart/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/wire-ampacity-chart/'}],
    titleKey: 'pages.ca.guides.ampacityChart.title',
    descriptionKey: 'pages.ca.guides.ampacityChart.description',
  },
  {
    dir: 'ca/guides/how-far-12-gauge-wire',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-12gauge-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/how-far-12-gauge-wire/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/how-far-12-gauge-wire/'}],
    titleKey: 'pages.ca.guides.twelveGauge.title',
    descriptionKey: 'pages.ca.guides.twelveGauge.description',
  },
  {
    dir: 'ca/guides/voltage-drop-formula',
    tool: 'guides',
    script: null,
    main: 'partials/ca-guide-vdformula-main.html',
    hreflang: [{lang: 'en-us', href: 'https://voltdrop.app/guides/voltage-drop-formula/'}, {lang: 'en-ca', href: 'https://voltdrop.app/ca/guides/voltage-drop-formula/'}],
    titleKey: 'pages.ca.guides.voltageDrop.title',
    descriptionKey: 'pages.ca.guides.voltageDrop.description',
  },
  {
    dir: 'terms',
    tool: 'terms',
    script: null,
    main: 'partials/terms-main.html',
    titleKey: 'pages.us.terms.title',
    descriptionKey: 'pages.us.terms.description',
  },
];

for (const page of PAGES) {
  const p = {
    ...page,
    ldName: page.ldNameKey ? text(page.ldNameKey) : undefined,
    h1: page.h1Key ? text(page.h1Key) : undefined,
    sub: page.subKey ? text(page.subKey) : undefined,
    title: text(page.titleKey),
    description: text(page.descriptionKey),
  };
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
    const main = renderTemplate(readFileSync(p.main, 'utf8'), p.main);
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
