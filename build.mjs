// Generates the per-tool pages (own URLs for SEO) from index.html.
// Run after editing index.html, styles.css, or any .js: node build.mjs
// Then commit the outputs.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { dirname, resolve } from 'path';
import { localizeRuntimeSource } from './tools/runtime-code-boundary.mjs';
import { checkRegistries } from './tools/check-registries.mjs';

/* Sealed electrical data that exists in more than one file must stay IDENTICAL.
   landscape.js carries its own copy of WIRE_TABLE and K_FACTOR because each page
   loads only its own script; the data tripwire fingerprints tables per
   [file, NAME], so a copy does not inherit the original's protection.

   This check lives in the BUILD, not only in verify.mjs, on purpose: a deploy
   that never runs the test suite could otherwise ship two tables that had
   drifted apart. You cannot generate a page without it passing.

   The comparison is deep AND positional — row order matters, because the wire
   selector picks by index, so a reordered table silently changes what "12 AWG"
   means. */
const readLiteral = (file, name) => {
  const source = readFileSync(file, 'utf8');
  const match = source.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
  if (!match) throw new Error(`Cannot read sealed constant ${name} from ${file}`);
  return Function(`"use strict"; return (${match[1]});`)();
};
for (const [file, name] of [['landscape.js', 'WIRE_TABLE'], ['landscape.js', 'K_FACTOR'],
                            ['solar.js', 'WIRE_TABLE'], ['solar.js', 'K_FACTOR']]) {
  const canonical = JSON.stringify(readLiteral('app.js', name));
  const copy = JSON.stringify(readLiteral(file, name));
  if (canonical !== copy) {
    console.error(`\nSEALED DATA DIVERGED: ${name} in ${file} no longer matches app.js.`);
    console.error(`  app.js       ${canonical}`);
    console.error(`  ${file} ${copy}`);
    console.error(`  These are electrical constants. Fix the copy to match, or if the change is`);
    console.error(`  intended, change BOTH deliberately and re-verify against an independent source.`);
    process.exit(1);
  }
}

const englishCatalog = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const runtimeMap = JSON.parse(readFileSync('i18n/runtime-map.json', 'utf8'));
const runtimePatternGroups = {
  'app.js': 'drop',
  'ampacity.js': 'ampacity',
  'conduit.js': 'conduit',
  'boxfill.js': 'boxFill',
  'power.js': 'power',
  'landscape.js': 'landscape',
  'solar.js': 'solar',
};
const countryPacks = {
  us: JSON.parse(readFileSync('i18n/country-packs/us.json', 'utf8')),
  ca: JSON.parse(readFileSync('i18n/country-packs/ca.json', 'utf8')),
};
const EDITIONS = [
  { id: 'us-en', country: 'us', locale: 'en', lang: 'en', hreflang: 'en-US', prefix: '' },
  { id: 'us-es', country: 'us', locale: 'es', lang: 'es', hreflang: 'es-US', prefix: '/es' },
  { id: 'us-zh', country: 'us', locale: 'zh-Hans', lang: 'zh-Hans', hreflang: 'zh-Hans-US', prefix: '/zh' },
  { id: 'ca-en', country: 'ca', locale: 'en', lang: 'en', hreflang: 'en-CA', prefix: '/ca' },
  { id: 'ca-fr', country: 'ca', locale: 'fr-CA', lang: 'fr-CA', hreflang: 'fr-CA', prefix: '/ca-fr' },
  { id: 'ca-zh', country: 'ca', locale: 'zh-Hans', lang: 'zh-Hans', hreflang: 'zh-Hans-CA', prefix: '/ca-zh' },
].map((edition) => {
  const file = `i18n/strings/${edition.locale}.json`;
  return {
    ...edition,
    catalog: edition.locale === 'en'
      ? englishCatalog
      : (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null),
    pack: countryPacks[edition.country],
  };
});
const EDITION_UI = {
  'us-en': { flag: '🇺🇸', code: 'NEC', languageLabel: 'Language in United States' },
  'us-es': { flag: '🇺🇸', code: 'NEC', languageLabel: 'Idioma en Estados Unidos' },
  'us-zh': { flag: '🇺🇸', code: 'NEC', languageLabel: '美国的语言' },
  'ca-en': { flag: '🇨🇦', code: 'CEC', languageLabel: 'Language in Canada' },
  'ca-fr': { flag: '🇨🇦', code: 'CEC', languageLabel: 'Langue au Canada' },
  'ca-zh': { flag: '🇨🇦', code: 'CEC', languageLabel: '加拿大的语言' },
};
const editionChip = (edition) => {
  const ui = EDITION_UI[edition.id];
  const language = edition.locale.split('-', 1)[0].toUpperCase();
  return `${ui.flag} ${ui.code} · ${language}`;
};

const valueAt = (source, key) => {
  if (!source) return undefined;
  if (typeof source[key] === 'string') return source[key];
  return key.split('.').reduce((cursor, part) => cursor?.[part], source);
};

const text = (key, edition, { allowEnglishFallback = false } = {}) => {
  const packLocalized = edition.pack.localizedStrings?.[edition.locale]?.[key];
  const localized = valueAt(edition.catalog, key);
  const packEnglish = edition.pack.strings?.[key];
  const english = valueAt(englishCatalog, key);
  let value;
  if (edition.locale === 'en') {
    value = packEnglish ?? english;
  } else if (packEnglish !== undefined) {
    value = packLocalized;
    if (value === undefined && allowEnglishFallback) value = packEnglish;
  } else {
    value = localized;
    if (value === undefined && allowEnglishFallback) value = english;
  }
  if (typeof value !== 'string') throw new Error(`Missing catalog string: ${key}`);
  return value;
};

const expandFragments = (template, label) => {
  const expanded = template.replace(/\{\{>\s*([^{}\s]+)\s*\}\}/g, (_, fragmentName) => {
    const fragmentFile = resolve(dirname(label), fragmentName);
    if (!existsSync(fragmentFile)) {
      throw new Error(`Missing fragment ${fragmentName} referenced by ${label}`);
    }
    const fragment = readFileSync(fragmentFile, 'utf8');
    const nested = fragment.match(/\{\{>[^}]*\}\}/);
    if (nested) {
      throw new Error(`Nested fragment directive in ${fragmentName} referenced by ${label}: ${nested[0]}`);
    }
    return fragment.replace(/\r?\n$/, '');
  });
  const unresolved = expanded.match(/\{\{>[^}]*\}\}/);
  if (unresolved) throw new Error(`Unresolved fragment directive in ${label}: ${unresolved[0]}`);
  return expanded;
};

const renderTemplate = (template, label, edition, options) => {
  const composed = expandFragments(template, label);
  const rendered = composed.replace(/\{\{(?:(json|attr):)?([A-Za-z0-9.%]+)\}\}/g, (_, format, key) => {
    const value = text(key, edition, options);
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

// Runtime copy lives in JavaScript assets. Each non-root edition gets its own
// localized, content-hashed copy; source files and sealed data stay untouched.
const localizeRuntime = (file, edition) => {
  const patternGroup = runtimePatternGroups[file];
  const patternEntries = patternGroup
    ? Object.keys(englishCatalog.runtimePatterns[patternGroup]).map((name) => ({
        key: `runtimePatterns.${patternGroup}.${name}`,
        kind: 'quoted',
        quote: "'",
      }))
    : [];
  return localizeRuntimeSource({
    source: readFileSync(file, 'utf8'),
    file,
    entries: [...runtimeMap[file], ...patternEntries],
    englishFor: (key) => valueAt(englishCatalog, key),
    localizedFor: (key) => text(key, edition),
    quoteLike,
    localize: edition.id !== 'us-en',
  });
};

// Cache-busting: stamp asset links with a content hash so Cloudflare's
// edge cache can never serve stale JS/CSS after a deploy. Idempotent.
const hashContent = (content) => createHash('md5').update(content).digest('hex').slice(0, 10);
const RUNTIME_FILES = Object.keys(runtimeMap);
const makeAssets = (edition) => {
  const files = {};
  for (const file of RUNTIME_FILES) {
    files[file] = localizeRuntime(file, edition);
    if (edition.id !== 'us-en') {
      const dir = `assets/${edition.id}`;
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/${file}`, files[file]);
    }
  }
  files['styles.css'] = readFileSync('styles.css', 'utf8');
  const hashes = Object.fromEntries(Object.entries(files).map(([file, content]) => [file, hashContent(content)]));
  const href = (file) => edition.id === 'us-en' || file === 'styles.css'
    ? `/${file}`
    : `/assets/${edition.id}/${file}`;
  const stamp = (html) => {
    for (const file of ['styles.css', ...RUNTIME_FILES]) {
      const escaped = file.replace('.', '\\.');
      html = html.replace(new RegExp(`/(?:assets/[^/]+/)?${escaped}\\?v=[A-Za-z0-9]+`, 'g'), `${href(file)}?v=${hashes[file]}`);
    }
    return html;
  };
  return { hashes, href, stamp };
};

const templateSource = readFileSync('templates/index.html', 'utf8');
const DEFAULT_TAGLINE_KEY = 'header.electricalCalculatorsThatExplainThemselves';

const PAGES = [
  {
    dir: '',
    taglineKey: 'header.theVoltageDropCalculatorThatExplainsItself',
  },
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
    dir: 'how-we-verify',
    tool: 'how-we-verify',
    script: null, // methodology page — common.js alone is enough
    main: 'partials/how-we-verify-main.html',
    titleKey: 'pages.us.howWeVerify.title',
    descriptionKey: 'pages.us.howWeVerify.description',
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
    dir: 'ohms-law',
    ldNameKey: 'pages.us.ohmsLaw.ldName',
    tool: 'power',
    script: 'power.js',
    main: 'partials/ohms-law-main.html',
    visibleFaq: true,
    titleKey: 'pages.us.ohmsLaw.title',
    descriptionKey: 'pages.us.ohmsLaw.description',
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
    dir: 'solar-battery-wire-size',
    ldNameKey: 'pages.us.solar.ldName',
    tool: 'solar',
    script: 'solar.js',
    main: 'partials/solar-main.html',
    titleKey: 'pages.us.solar.title',
    descriptionKey: 'pages.us.solar.description',
  },
  {
    dir: 'solar-wire-size-calculator',
    ldNameKey: 'pages.us.solarWireSize.ldName',
    tool: 'solar',
    script: 'solar.js',
    main: 'partials/solar-wire-size-main.html',
    visibleFaq: true,
    titleKey: 'pages.us.solarWireSize.title',
    descriptionKey: 'pages.us.solarWireSize.description',
  },
  {
    dir: 'landscape-lighting-calculator',
    ldNameKey: 'pages.us.landscape.ldName',
    tool: 'landscape',
    script: 'landscape.js',
    main: 'partials/landscape-main.html',
    titleKey: 'pages.us.landscape.title',
    descriptionKey: 'pages.us.landscape.description',
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

const homePage = PAGES.find((page) => page.dir === '');
if (!homePage) throw new Error('PAGES must define the homepage');
const scopedPages = PAGES.filter((page) =>
  page.dir !== '' && !page.dir.startsWith('guides') && !page.dir.startsWith('ca/guides'));
const guidePages = PAGES.filter((page) => page.dir.startsWith('guides') || page.dir.startsWith('ca/guides'));

const editionPath = (edition, dir = '') => {
  const suffix = dir ? `/${dir}/` : '/';
  return `${edition.prefix}${suffix}`;
};
const absoluteUrl = (edition, dir = '') => `https://voltdrop.app${editionPath(edition, dir)}`;
const hreflangMarkup = (dir = '') => [
  ...EDITIONS.map((edition) => `<link rel="alternate" hreflang="${edition.hreflang}" href="${absoluteUrl(edition, dir)}">`),
  `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(EDITIONS[0], dir)}">`,
].join('\n');

const applyMetadata = (html, { title, description, canonical, alternates }) => html
  .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${description}$2`)
  .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${title.replace(/"/g, '&quot;')}$2`)
  .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${description}$2`)
  .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${title.replace(/"/g, '&quot;')}$2`)
  .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${description}$2`)
  .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">\n${alternates}`)
  .replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${canonical}$2`);
const applyTagline = (html, page, edition) => {
  const tagline = text(page.taglineKey ?? DEFAULT_TAGLINE_KEY, edition);
  if (!tagline) throw new Error(`Empty tagline for ${edition.id}/${page.dir || ''}`);
  return html.replace(
    /(<p class="tagline">)[^<]*(<\/p>)/,
    `$1${tagline}$2`,
  );
};

const writeEditionPage = (edition, dir, html) => {
  const outputDir = edition.prefix
    ? `${edition.prefix.slice(1)}${dir ? `/${dir}` : ''}`
    : dir;
  const output = outputDir ? `${outputDir}/index.html` : 'index.html';
  if (outputDir) mkdirSync(outputDir, { recursive: true });
  writeFileSync(output, html);
  console.log(`built ${output}`);
};

const assertVisibleFaq = (html, label) => {
  const faqScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        throw new Error(`Invalid JSON-LD in ${label}: ${error.message}`);
      }
    })
    .filter((entry) => entry?.['@type'] === 'FAQPage');
  if (faqScripts.length !== 1) {
    throw new Error(`${label} must contain exactly one FAQPage JSON-LD block`);
  }
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  for (const entry of faqScripts[0].mainEntity ?? []) {
    const question = entry?.name;
    const answer = entry?.acceptedAnswer?.text;
    if (typeof question !== 'string' || typeof answer !== 'string'
        || !visibleText.includes(question) || !visibleText.includes(answer)) {
      throw new Error(`FAQ structured data is not visible in ${label}: ${question ?? 'missing question'}`);
    }
  }
};

for (const edition of EDITIONS) {
  if (!edition.catalog) throw new Error(`Missing locale catalog: i18n/strings/${edition.locale}.json`);
  const assets = makeAssets(edition);
  let src = assets.stamp(renderTemplate(templateSource, 'templates/index.html', edition))
    .replace('<html lang="en">', `<html lang="${edition.lang}">`)
    .replace('<body>', `<body data-country="${edition.country}" data-locale="${edition.locale}">`)
    .replace(/(<span id="country-chip-text">)[^<]*(<\/span>)/, `$1${editionChip(edition)}$2`)
    .replace(/(<span class="edition-label" id="edition-language-label">)[^<]*(<\/span>)/, `$1${EDITION_UI[edition.id].languageLabel}$2`);

  const homeTitle = text('meta.home.voltDropVoltageDropCalculatorThatExplainsItselfTitle', edition);
  const homeDescription = text('meta.home.freeVoltageDropCalculatorForCopperAndMeta', edition);
  const homeCanonical = absoluteUrl(edition);
  let home = applyTagline(applyMetadata(src, {
    title: homeTitle,
    description: homeDescription,
    canonical: homeCanonical,
    alternates: hreflangMarkup(),
  }), homePage, edition).replace(
    /<script type="application\/ld\+json" data-ld="app">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" data-ld="app">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: text('meta.home.voltDropVoltageDropCalculatorTitle', edition),
      url: homeCanonical,
      description: text('meta.home.freeVoltageDropCalculatorForCopperAndAluminum', edition),
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: edition.country === 'ca' ? 'CAD' : 'USD' },
    })}</script>`,
  );
  writeEditionPage(edition, '', home);

  for (const page of scopedPages) {
    const p = {
      ...page,
      ldName: page.ldNameKey ? text(page.ldNameKey, edition) : undefined,
      h1: page.h1Key ? text(page.h1Key, edition) : undefined,
      sub: page.subKey ? text(page.subKey, edition) : undefined,
      title: text(page.titleKey, edition),
      description: text(page.descriptionKey, edition),
    };
    const canonical = absoluteUrl(edition, p.dir);
    let html = applyTagline(applyMetadata(src, {
      title: p.title,
      description: p.description,
      canonical,
      alternates: hreflangMarkup(p.dir),
    }), page, edition);

    if (p.mode) {
      html = html.replace('<body ', `<body data-mode="${p.mode}" `);
      if (!html.includes(`data-mode="${p.mode}"`)) throw new Error(`body stamp failed for ${edition.id}/${p.dir}`);
      html = html
        .replace(/(<h1 class="tool-title" id="page-h1">)[^<]*(<\/h1>)/, `$1${p.h1}$2`)
        .replace(/(<p class="tool-sub" id="page-sub">)[^<]*(<\/p>)/, `$1${p.sub}$2`);
    }

    const ldRe = /<script type="application\/ld\+json" data-ld="app">[\s\S]*?<\/script>\n?/;
    if (p.ldName) {
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: p.ldName,
        url: canonical,
        description: p.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: edition.country === 'ca' ? 'CAD' : 'USD' },
      };
      html = html.replace(ldRe, `<script type="application/ld+json" data-ld="app">${JSON.stringify(ld)}</script>\n`);
    } else {
      html = html.replace(ldRe, '');
    }

    if (p.main) {
      const main = renderTemplate(readFileSync(p.main, 'utf8'), p.main, edition);
      html = html.replace(/<main class="main-col">[\s\S]*<\/main>/, main.trim());
      html = html.replace(/<script data-wire-size-engine[^>]*><\/script>\n?/, '');
      if (p.script) {
        html = html.replace(
          /<script src="[^"]*\/app\.js[^"]*"><\/script>/,
          `<script src="${assets.href(p.script)}?v=${assets.hashes[p.script]}"></script>`,
        );
        if (!html.includes(assets.href(p.script))) throw new Error(`script swap failed for ${edition.id}/${p.dir}`);
      } else {
        html = html.replace(/<script src="[^"]*\/app\.js[^"]*"><\/script>\n?/, '');
      }
      html = html.replace(`class="tool-link" data-tool="${p.tool}"`, `class="tool-link active" data-tool="${p.tool}"`);
    }

    if (p.visibleFaq) assertVisibleFaq(html, `${edition.id}/${p.dir}`);
    writeEditionPage(edition, p.dir, html);
  }

  const editionGuidePages = guidePages.filter((page) =>
    (edition.country === 'ca') === page.dir.startsWith('ca/'));
  for (const page of editionGuidePages) {
    const dir = page.dir.replace(/^ca\//, '');
    const title = text(page.titleKey, edition);
    const description = text(page.descriptionKey, edition);
    const canonical = absoluteUrl(edition, dir);
    let html = applyTagline(applyMetadata(src, {
      title,
      description,
      canonical,
      alternates: hreflangMarkup(dir),
    }), page, edition);
    html = html.replace(/<script type="application\/ld\+json" data-ld="app">[\s\S]*?<\/script>\n?/, '');
    const main = renderTemplate(readFileSync(page.main, 'utf8'), page.main, edition);
    html = html
      .replace(/<main class="main-col">[\s\S]*<\/main>/, main.trim())
      .replace(/<script data-wire-size-engine[^>]*><\/script>\n?/, '')
      .replace(/<script src="[^"]*\/app\.js[^"]*"><\/script>\n?/, '')
      .replace(`class="tool-link" data-tool="${page.tool}"`, `class="tool-link active" data-tool="${page.tool}"`);
    writeEditionPage(edition, dir, html);
  }
  console.log(`edition ${edition.id}:`, Object.entries(assets.hashes).map(([k, v]) => `${k}?v=${v}`).join(' '));
}

// Build the answer-engine companion from the same catalogs and country packs
// as the rendered pages. The template supplies only structure and scope
// boundaries; substantive descriptions remain owned by page strings.
const llmsEditions = {
  us: EDITIONS.find((edition) => edition.id === 'us-en'),
  ca: EDITIONS.find((edition) => edition.id === 'ca-en'),
};
const llmsTemplate = readFileSync('templates/llms-full.txt', 'utf8');
const llmsFull = llmsTemplate.replace(
  /\{\{(us|ca|usFact|caFact):([A-Za-z0-9.%]+)\}\}/g,
  (_, source, key) => {
    if (source === 'us') return text(key, llmsEditions.us);
    if (source === 'ca') return text(key, llmsEditions.ca);
    const pack = source === 'usFact' ? countryPacks.us : countryPacks.ca;
    const value = valueAt(pack.verifiedFacts, key);
    if (typeof value !== 'string') throw new Error(`Missing llms-full source string: ${source}:${key}`);
    return value;
  },
);
const unresolvedLlmsPlaceholder = llmsFull.match(/\{\{[^}]+\}\}/);
if (unresolvedLlmsPlaceholder) {
  throw new Error(`Unresolved llms-full placeholder: ${unresolvedLlmsPlaceholder[0]}`);
}
writeFileSync('llms-full.txt', `${llmsFull.trim()}\n`);
console.log('built llms-full.txt');
checkRegistries();
