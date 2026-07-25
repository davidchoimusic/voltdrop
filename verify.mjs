// End-to-end check: drive all three modes, assert the math, screenshot.
// ALSO: electrical-data tripwire — the tables below are SOURCE-VERIFIED
// safety data (people get hurt if they're wrong). Any change to them fails
// this suite until the source-verification pass is re-run and the golden
// hash deliberately updated. See PROJECT_CONTEXT.md "REGRESSION RISKS".
import { chromium } from 'playwright';
import { existsSync, readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { spawnSync } from 'node:child_process';
import { extname, join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8642/';
const shots = 'verify-shots';
import { mkdirSync } from 'fs';
mkdirSync(shots, { recursive: true });

// ---- Byte-identical English build gate ----
const identical = spawnSync(process.execPath, ['tools/check-build-identical.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (identical.status !== 0) process.exit(identical.status ?? 1);

// ---- Back-translation contamination and meaning-review gate ----
const backtranslation = spawnSync(process.execPath, ['tools/generate-backtranslation-report.mjs', '--check'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (backtranslation.status !== 0) process.exit(backtranslation.status ?? 1);

// ---- Whole-sentence runtime pattern gate ----
// Result copy with live values must use one locale-owned pattern with named
// placeholders. This rejects both '+' fragments and natural-language
// template interpolation in every root-level calculator script.
const runtimePatterns = spawnSync(process.execPath, ['tools/check-runtime-result-patterns.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (runtimePatterns.status !== 0) process.exit(runtimePatterns.status ?? 1);

// ---- Runtime code identity gate ----
// Display copy may change by language. Program wiring may not: element IDs,
// selectors, classes, data keys/values, events, storage keys, and URL pieces
// must stay byte-identical to the English source in every built asset.
const runtimeCodeIdentity = spawnSync(process.execPath, ['tools/check-runtime-code-identity.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (runtimeCodeIdentity.status !== 0) process.exit(runtimeCodeIdentity.status ?? 1);

// ---- Electrical data tripwire (runs before browser checks) ----
// Each entry: [file, constant name]. Golden hashes = the state that passed
// independent source verification (NEC page reproductions, 2026-07-24).
const DATA_TABLES = [
  ['app.js', 'WIRE_TABLE'], ['app.js', 'K_FACTOR'],
  ['ampacity.js', 'AMPACITY'], ['ampacity.js', 'SMALL_CAP'],
  ['ampacity.js', 'AMBIENT_CORRECTION'], ['ampacity.js', 'CONDUCTOR_ADJUSTMENT'],
  ['ampacity.js', 'CEC_AMBIENT_CORRECTION'], ['ampacity.js', 'CEC_CONDUCTOR_ADJUSTMENT'],
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

// Read test expectations from the exact constants whose hashes just passed the
// electrical-data tripwire. The calculator files are browser scripts rather
// than importable modules, so evaluate only the named literal declarations.
const readSealedConstant = (file, name) => {
  const isSealed = DATA_TABLES.some(([sealedFile, sealedName]) =>
    sealedFile === file && sealedName === name);
  if (!isSealed) throw new Error(`Test expectation requested unsealed data: ${file}:${name}`);
  const source = readFileSync(file, 'utf8');
  const match = source.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
  if (!match) throw new Error(`Cannot read sealed constant ${name} from ${file}`);
  return Function(`"use strict"; return (${match[1]});`)();
};

const TEST_WIRE_TABLE = readSealedConstant('app.js', 'WIRE_TABLE');
const TEST_K_FACTOR = readSealedConstant('app.js', 'K_FACTOR');
const TEST_AMPACITY = readSealedConstant('ampacity.js', 'AMPACITY');
const TEST_SMALL_CAP = readSealedConstant('ampacity.js', 'SMALL_CAP');
const TEST_AMBIENT_CORRECTION = readSealedConstant('ampacity.js', 'AMBIENT_CORRECTION');
const TEST_CONDUCTOR_ADJUSTMENT = readSealedConstant('ampacity.js', 'CONDUCTOR_ADJUSTMENT');
const TEST_CEC_AMBIENT_CORRECTION = readSealedConstant('ampacity.js', 'CEC_AMBIENT_CORRECTION');
const TEST_CEC_CONDUCTOR_ADJUSTMENT = readSealedConstant('ampacity.js', 'CEC_CONDUCTOR_ADJUSTMENT');
const TEST_THHN_AREA = readSealedConstant('conduit.js', 'THHN_AREA');
const TEST_CONDUIT = readSealedConstant('conduit.js', 'CONDUIT');
const TEST_VOL_PER_CONDUCTOR = readSealedConstant('boxfill.js', 'VOL_PER_CONDUCTOR');
const TEST_CEC_VOL_ML = readSealedConstant('boxfill.js', 'CEC_VOL_ML');

const errors = [];
let pass = 0, fail = 0;
const check = (name, got, want, tol = 0.02) => {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${got}, expected ~${want}`);
  ok ? pass++ : fail++;
};
const checkBool = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

// Digits next to Latin letters are usually part of an identifier (COVID19,
// a1), but digits next to CJK text are normal prose because Chinese does not
// separate words with spaces. Using \p{L} here silently drops or truncates
// valid Chinese citations and values, so only Latin letters and digits form
// numeric-token boundaries.
const NUMERIC_TOKEN_PATTERN = String.raw`(?<![\p{Script=Latin}\p{N}])#?\d+(?:[.,/-]\d+)*(?![\p{Script=Latin}\p{N}])`;
const extractNumericTokens = (text) =>
  (text.match(new RegExp(NUMERIC_TOKEN_PATTERN, 'gu')) || []).sort();
const numericExtractorFixture = 'Rule 14-104将 Table 310.16相同 其60/75/90°C COVID19 a1';
const numericExtractorExpected = ['14-104', '310.16', '60/75/90'];
const numericExtractorActual = extractNumericTokens(numericExtractorFixture);
checkBool('numeric extractor handles CJK adjacency without matching Latin identifiers',
  JSON.stringify(numericExtractorActual) === JSON.stringify(numericExtractorExpected),
  JSON.stringify(numericExtractorActual));

const EDITIONS = [
  { prefix: '', country: 'us', locale: 'en', lang: 'en', hreflang: 'en-US', twin: '', chip: '🇺🇸 NEC · EN' },
  { prefix: 'es', country: 'us', locale: 'es', lang: 'es', hreflang: 'es-US', twin: '', chip: '🇺🇸 NEC · ES' },
  { prefix: 'zh', country: 'us', locale: 'zh-Hans', lang: 'zh-Hans', hreflang: 'zh-Hans-US', twin: '', chip: '🇺🇸 NEC · ZH' },
  { prefix: 'ca', country: 'ca', locale: 'en', lang: 'en', hreflang: 'en-CA', twin: 'ca', chip: '🇨🇦 CEC · EN' },
  { prefix: 'ca-fr', country: 'ca', locale: 'fr-CA', lang: 'fr-CA', hreflang: 'fr-CA', twin: 'ca', chip: '🇨🇦 CEC · FR' },
  { prefix: 'ca-zh', country: 'ca', locale: 'zh-Hans', lang: 'zh-Hans', hreflang: 'zh-Hans-CA', twin: 'ca', chip: '🇨🇦 CEC · ZH' },
];
const runtimeEditionId = (edition) => edition.country === 'ca'
  ? (edition.locale === 'fr-CA' ? 'ca-fr' : edition.locale === 'zh-Hans' ? 'ca-zh' : 'ca-en')
  : (edition.locale === 'es' ? 'us-es' : edition.locale === 'zh-Hans' ? 'us-zh' : 'us-en');
const SCOPED_PATHS = [
  '',
  'wire-size-calculator/',
  'max-wire-length/',
  'ampacity-check/',
  'conduit-fill/',
  'privacy/',
  'power-calculator/',
  'box-fill/',
  'terms/',
];
const editionPath = (prefix, path) => `${prefix ? `${prefix}/` : ''}${path}`;
const GUIDE_PATHS = [
  'guides/',
  'guides/sub-panel-wire-size/',
  'guides/50-amp-wire-size/',
  'guides/wire-ampacity-chart/',
  'guides/how-far-12-gauge-wire/',
  'guides/voltage-drop-formula/',
];
const GUIDE_ROUTES = GUIDE_PATHS.map((path) => `/${path}`);
const GENERATED_PATHS = [
  ...EDITIONS.flatMap((edition) =>
    [...SCOPED_PATHS, ...GUIDE_PATHS].map((path) => editionPath(edition.prefix, path))),
];
const staleCanadianAmpacityClaims = [
  'planning only',
  'planning note',
  'have not yet been verified',
  'has not verified',
  'not a calculation',
  'no ampacity number is produced',
  'planification seulement',
  'note de planification',
  'ne sont pas encore vérifiées',
  'n’a pas vérifié',
  '仅供规划',
  '规划说明',
  '尚未核验',
];
const canadianAmpacityRenderedFiles = ['ca', 'ca-fr', 'ca-zh'].flatMap((prefix) => [
  `${prefix}/ampacity-check/index.html`,
  `${prefix}/guides/wire-ampacity-chart/index.html`,
]);
const staleCanadianAmpacityMatches = [];
for (const file of canadianAmpacityRenderedFiles) {
  const source = readFileSync(file, 'utf8').toLowerCase();
  for (const claim of staleCanadianAmpacityClaims) {
    if (source.includes(claim.toLowerCase())) {
      staleCanadianAmpacityMatches.push(`${file}: ${claim}`);
    }
  }
}
checkBool('Canadian ampacity pages contain no superseded planning-only refusal',
  staleCanadianAmpacityMatches.length === 0,
  staleCanadianAmpacityMatches.length
    ? staleCanadianAmpacityMatches.join(' | ')
    : 'calculator and ampacity guide clean in all three Canadian editions');
const sitemap = readFileSync('sitemap.xml', 'utf8');
const missingGuideSitemapUrls = GENERATED_PATHS
  .filter((path) => path.includes('guides/'))
  .filter((path) => !sitemap.includes(`<loc>https://voltdrop.app/${path}</loc>`));
checkBool('sitemap lists all 36 guide pages',
  missingGuideSitemapUrls.length === 0,
  missingGuideSitemapUrls.length ? missingGuideSitemapUrls.join(', ') : '36 guide URLs');

// ---- Edition pages: lang/canonical/hreflang and protected-token parity.
const neverTranslate = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));
const protectedLiterals = [
  ...neverTranslate.brand,
  ...neverTranslate.standards,
  ...neverTranslate.citations,
  ...neverTranslate.wireAndCableDesignations,
  ...neverTranslate.unitSymbols,
];
const countLiteral = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
};
const countContextualUnit = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?:\\d+(?:\\.\\d+)?|\\{[A-Za-z][A-Za-z0-9]*\\})\\s*${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
};
const patternChecks = neverTranslate.protectedPatterns.map((pattern) => ({
  name: pattern.name,
  re: new RegExp(pattern.source, pattern.flags),
}));
const protectedParity = (source, target) => {
  const literalMismatch = protectedLiterals.find((token) =>
    countLiteral(source, token) !== countLiteral(target, token));
  const contextualMismatch = (neverTranslate.contextualUnitSymbols ?? []).find((token) =>
    countContextualUnit(source, token) !== countContextualUnit(target, token));
  const patternMismatch = patternChecks.find(({ re }) => {
    re.lastIndex = 0;
    const sourceMatches = source.match(re) || [];
    re.lastIndex = 0;
    const targetMatches = target.match(re) || [];
    return sourceMatches.length !== targetMatches.length;
  });
  return literalMismatch || contextualMismatch || patternMismatch?.name || null;
};

// Runtime strings are shipped in per-edition JavaScript assets. Check those
// assets as well as HTML so a translated warning cannot alter a citation,
// designation, number, or unit after the user clicks Calculate.
for (const edition of EDITIONS.filter((item) => item.locale !== 'en')) {
  const assetEdition = runtimeEditionId(edition);
  for (const file of ['common.js', 'app.js', 'ampacity.js', 'conduit.js', 'boxfill.js', 'power.js']) {
    const source = readFileSync(file, 'utf8');
    const localized = readFileSync(`assets/${assetEdition}/${file}`, 'utf8');
    const mismatch = protectedParity(source, localized);
    checkBool(`${assetEdition}/${file} runtime never-translate parity`, !mismatch,
      mismatch || 'all protected tokens');
  }
}

for (const edition of EDITIONS) {
  for (const path of [...SCOPED_PATHS, ...GUIDE_PATHS]) {
    const generated = editionPath(edition.prefix, path);
    const expectedCanonical = `https://voltdrop.app/${generated}`;
    const html = readFileSync(generated ? `${generated}index.html` : 'index.html', 'utf8');
    const langOk = html.includes(`<html lang="${edition.lang}">`);
    const chipOk = html.includes(`<span id="country-chip-text">${edition.chip}</span>`);
    const toolsAriaOk = /<button[^>]+id="tools-btn"[^>]+aria-label="[^"]+"/.test(html);
    const canonicalOk = html.includes(`<link rel="canonical" href="${expectedCanonical}">`);
    const localStandard = edition.country === 'ca' ? 'CEC' : 'NEC';
    const guideStandardOk = !GUIDE_PATHS.includes(path)
      || new RegExp(`<title>[^<]*\\b${localStandard}\\b[^<]*</title>`).test(html);
    const runtimeAssetOk = runtimeEditionId(edition) === 'us-en'
      ? html.includes('<script src="/common.js?v=')
      : html.includes(`<script src="/assets/${runtimeEditionId(edition)}/common.js?v=`);
    const alternatesOk = EDITIONS.every((alternate) => html.includes(
      `hreflang="${alternate.hreflang}" href="https://voltdrop.app/${editionPath(alternate.prefix, path)}"`,
    )) && html.includes(`hreflang="x-default" href="https://voltdrop.app/${path}"`);
    checkBool(`${generated || '/'} metadata + short chip + Tools label`,
      langOk && chipOk && toolsAriaOk && canonicalOk && guideStandardOk
        && runtimeAssetOk && alternatesOk);

    if (edition.locale === 'en') continue;
    const twinPath = editionPath(edition.twin, path);
    const twin = readFileSync(twinPath ? `${twinPath}index.html` : 'index.html', 'utf8');
    const mismatch = protectedParity(twin, html);
    checkBool(`${generated} never-translate parity`, !mismatch,
      mismatch || 'all protected tokens');
  }
}

// The homepage deliberately keeps the voltage-drop-specific brand promise.
// Every other page must inherit the non-empty site-wide default.
for (const edition of EDITIONS) {
  const readTagline = (path) => {
    const generated = editionPath(edition.prefix, path);
    const html = readFileSync(generated ? `${generated}index.html` : 'index.html', 'utf8');
    return html.match(/<p class="tagline">([^<]*)<\/p>/)?.[1]?.trim() || '';
  };
  const homepageTagline = readTagline('');
  const nonHomepageTaglines = [
    ...SCOPED_PATHS.filter(Boolean),
    ...GUIDE_PATHS,
  ].map(readTagline);
  const defaultTagline = nonHomepageTaglines[0] || '';
  const allNonHomepageUseDefault = nonHomepageTaglines.every((tagline) =>
    tagline !== '' && tagline === defaultTagline);
  checkBool(`${edition.prefix || 'us-en'} homepage and non-homepage taglines are distinct and non-empty`,
    homepageTagline !== ''
      && defaultTagline !== ''
      && homepageTagline !== defaultTagline
      && allNonHomepageUseDefault,
    `${homepageTagline} | ${defaultTagline}`);
}

const oneWayTerms = {
  es: 'distancia en un solo sentido',
  'fr-CA': 'distance à l’aller (un seul trajet)',
  'zh-Hans': '单程距离（仅去程）',
};
for (const edition of EDITIONS.filter((item) => item.locale !== 'en')) {
  const html = readFileSync(`${edition.prefix}/index.html`, 'utf8');
  checkBool(`${edition.prefix} one-way term is explicit`, html.includes(oneWayTerms[edition.locale]));
}

// Static mirror of the browser numeric gate. It strips non-rendered script and
// style content, then compares every visible-text digit token. The browser pass
// below repeats this against document.body.innerText.
const visibleTextNumbers = (file) => {
  const html = readFileSync(file, 'utf8');
  const body = html.match(/<body[\s\S]*?<\/body>/i)?.[0] || html;
  const text = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/\s+/g, ' ');
  return extractNumericTokens(text);
};
for (const edition of EDITIONS.filter(({ locale }) => locale !== 'en')) {
  const englishPrefix = edition.country === 'ca' ? 'ca' : '';
  for (const guidePath of GUIDE_PATHS) {
    const translatedPath = editionPath(edition.prefix, guidePath);
    const englishPath = editionPath(englishPrefix, guidePath);
    const translatedNumbers = visibleTextNumbers(`${translatedPath}index.html`);
    const englishNumbers = visibleTextNumbers(`${englishPath}index.html`);
    checkBool(`static numeric parity /${translatedPath}`,
      JSON.stringify(translatedNumbers) === JSON.stringify(englishNumbers),
      `${translatedNumbers.length} visible numeric tokens`);
  }
}

// Sealed, browser-independent ampacity oracles. These run even when the
// environment cannot launch Chromium, so the required hand-checkable cases
// still prove the table order directly from the sealed constants.
const SEALED_TEMP_INDEX = { 60: 0, 75: 1, 90: 2 };
const sealedAmbientSelection = (country, ambient, insulation) => {
  if (country === 'ca') {
    if (ambient <= 30) return { factor: 1, row: 30 };
    const row = TEST_CEC_AMBIENT_CORRECTION.find((item) => ambient <= item.ambient);
    return { factor: row?.factors[insulation], row: row?.ambient };
  }
  const row = TEST_AMBIENT_CORRECTION.find((item) =>
    (item.min === null || ambient >= item.min) && ambient <= item.max);
  return { factor: row?.factors[insulation], row };
};
const sealedConductorFactor = (country, count) => {
  const table = country === 'ca'
    ? TEST_CEC_CONDUCTOR_ADJUSTMENT
    : TEST_CONDUCTOR_ADJUSTMENT;
  if (country === 'us' && count <= 3) return 1;
  return table.find((item) =>
    count >= item.min && (item.max === null || count <= item.max))?.factor;
};
const sealedPermittedAmpacity = ({
  country = 'us', material, wire, insulation, termination, ambient, conductorCount,
}) => {
  const ambientFactor = sealedAmbientSelection(country, ambient, insulation).factor;
  if (ambientFactor === null || ambientFactor === undefined) return null;
  const row = TEST_AMPACITY[material][wire];
  const adjusted = row[SEALED_TEMP_INDEX[insulation]]
    * ambientFactor
    * sealedConductorFactor(country, conductorCount);
  const terminationLimit = row[SEALED_TEMP_INDEX[termination]];
  const cap = TEST_SMALL_CAP[material]?.[wire] ?? Infinity;
  return Math.floor(Math.min(adjusted, terminationLimit, cap) + 1e-9);
};
checkBool('sealed worked example: 55 × 0.91 × 0.80 = 40 A',
  sealedPermittedAmpacity({
    material: 'cu', wire: '8 AWG', insulation: 90, termination: 75,
    ambient: 40, conductorCount: 6,
  }) === 40);
checkBool('sealed termination-binding case: 55 A becomes 50 A',
  sealedPermittedAmpacity({
    material: 'cu', wire: '8 AWG', insulation: 90, termination: 75,
    ambient: 30, conductorCount: 3,
  }) === 50);
checkBool('sealed 240.4(D)-binding case: 12 AWG copper becomes 20 A',
  sealedPermittedAmpacity({
    material: 'cu', wire: '12 AWG', insulation: 90, termination: 75,
    ambient: 30, conductorCount: 3,
  }) === 20);
checkBool('sealed ambient-binding case: 75 × 0.82 = 61 A permitted',
  sealedPermittedAmpacity({
    material: 'cu', wire: '6 AWG', insulation: 90, termination: 75,
    ambient: 50, conductorCount: 3,
  }) === 61);
checkBool('sealed not-permitted case returns no number',
  sealedPermittedAmpacity({
    material: 'cu', wire: '12 AWG', insulation: 60, termination: 60,
    ambient: 60, conductorCount: 3,
  }) === null);
const sealedUsTenConductors = sealedPermittedAmpacity({
  country: 'us', material: 'cu', wire: '8 AWG', insulation: 90, termination: 75,
  ambient: 40, conductorCount: 10,
});
const sealedCanadaTenConductors = sealedPermittedAmpacity({
  country: 'ca', material: 'cu', wire: '8 AWG', insulation: 90, termination: 75,
  ambient: 40, conductorCount: 10,
});
checkBool('sealed US/Canada divergence at ten conductors is 0.50 vs 0.70',
  sealedConductorFactor('us', 10) === 0.50
    && sealedConductorFactor('ca', 10) === 0.70
    && sealedUsTenConductors === 25
    && sealedCanadaTenConductors === 35,
  `US=${sealedUsTenConductors} A, Canada=${sealedCanadaTenConductors} A`);
const cec37Selection = sealedAmbientSelection('ca', 37, 90);
checkBool('sealed CEC 37°C case uses the next higher 40°C row',
  cec37Selection.row === 40 && cec37Selection.factor === 0.91,
  JSON.stringify(cec37Selection));
checkBool('sealed CEC dash combination returns no number',
  sealedPermittedAmpacity({
    country: 'ca', material: 'cu', wire: '12 AWG', insulation: 60, termination: 60,
    ambient: 60, conductorCount: 3,
  }) === null);

for (const edition of EDITIONS) {
  const path = editionPath(edition.prefix, 'ampacity-check/');
  const html = readFileSync(`${path}index.html`, 'utf8');
  checkBool(`${edition.prefix || 'us-en'} ampacity page contains both new inputs`,
    html.includes('id="amp-ambient"') && html.includes('id="amp-conductors"'));
  if (edition.country === 'ca') {
    checkBool(`${edition.prefix} ampacity page names the approved Canadian source and rules`,
      html.includes('class="ca-note"')
        && html.includes('CSA C22.1:24')
        && html.includes('26th edition (2024)')
        && html.includes('Tables 2/4')
        && html.includes('5A')
        && html.includes('5C')
        && html.includes('4-004')
        && html.includes('4-006')
        && html.includes('8-104')
        && html.includes('14-104'));

    const guidePath = editionPath(edition.prefix, 'guides/wire-ampacity-chart/');
    const guideHtml = readFileSync(`${guidePath}index.html`, 'utf8');
    checkBool(`${edition.prefix} ampacity guide names CSA C22.1:24 and verified CEC Tables 2/4`,
      guideHtml.includes('class="ca-note"')
        && guideHtml.includes('CSA C22.1:24')
        && guideHtml.includes('CEC Table 2')
        && guideHtml.includes('Table 4'));
  }
}

if (process.env.STATIC_ONLY === '1') {
  console.log(`\n${pass + dataPass} static checks passed (${dataPass} data-integrity), ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone-ish
const installFileRoute = async (targetPage) => {
  if (!BASE.startsWith('file:')) return;
  const root = process.cwd();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
  };
  await targetPage.route('file:///**', async (route) => {
    const url = new URL(route.request().url());
    const decoded = decodeURIComponent(url.pathname);
    let file = decoded.startsWith(`${root}/`) ? decoded : join(root, decoded.replace(/^\/+/, ''));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'Not found' });
    return route.fulfill({
      status: 200,
      contentType: mime[extname(file)] || 'application/octet-stream',
      body: readFileSync(file),
    });
  });
};
await installFileRoute(page);
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE);

// ---- Every calculator in every edition ----
// Each case installs its error listeners before navigation, so both script
// initialization and the actual interaction are covered.
const MATRIX_INPUTS = {
  voltageDrop: { volts: 12, amps: 20, feet: 25, wire: '12 AWG', material: 'cu' },
  wireSize: { volts: 240, amps: 40, feet: 150, targetPercent: 3, material: 'cu' },
  maxLength: { volts: 12, amps: 10, targetPercent: 3, wire: '10 AWG', material: 'cu' },
  ampacity: {
    load: 35,
    wire: '8 AWG',
    material: 'cu',
    insulation: 90,
    termination: 75,
    ambient: 40,
    conductorCount: 6,
  },
  conduit: { count: 10, wire: '12 AWG', family: 'emt' },
  power: { volts: 240, watts: 1500, powerFactor: 1 },
  boxFill: { wire: '12 AWG', conductors: 6, devices: 1, grounds: 1, clamps: 0, marrettes: 0 },
};
const circularMils = (wire) => {
  const row = TEST_WIRE_TABLE.find(([label]) => label === wire);
  if (!row) throw new Error(`Missing wire-size test data for ${wire}`);
  return row[1];
};
const roundTripDrop = ({ material, amps, feet, wire }) =>
  (2 * TEST_K_FACTOR[material] * amps * feet) / circularMils(wire);
const expectedWireSize = () => {
  const input = MATRIX_INPUTS.wireSize;
  const maxDrop = input.volts * input.targetPercent / 100;
  const row = TEST_WIRE_TABLE.find(([, cm]) =>
    (2 * TEST_K_FACTOR[input.material] * input.amps * input.feet) / cm <= maxDrop);
  if (!row) throw new Error('Wire-size matrix input exceeds the sealed wire table');
  return parseFloat(row[0]);
};
const TEMP_INDEX = { 60: 0, 75: 1, 90: 2 };
const ambientFactorFor = (country, ambient, insulation) => {
  if (country === 'ca') {
    if (ambient <= 30) return 1;
    return TEST_CEC_AMBIENT_CORRECTION.find((item) =>
      ambient <= item.ambient)?.factors[insulation];
  }
  const row = TEST_AMBIENT_CORRECTION.find((item) =>
    (item.min === null || ambient >= item.min) && ambient <= item.max);
  return row?.factors[insulation];
};
const conductorFactorFor = (country, count) => {
  const table = country === 'ca'
    ? TEST_CEC_CONDUCTOR_ADJUSTMENT
    : TEST_CONDUCTOR_ADJUSTMENT;
  if (country === 'us' && count <= 3) return 1;
  return table.find((item) =>
    count >= item.min && (item.max === null || count <= item.max))?.factor;
};
const expectedAmpacity = (edition) => {
  const input = MATRIX_INPUTS.ampacity;
  const row = TEST_AMPACITY[input.material][input.wire];
  const base = row[TEMP_INDEX[input.insulation]];
  const adjusted = base
    * ambientFactorFor(edition.country, input.ambient, input.insulation)
    * conductorFactorFor(edition.country, input.conductorCount);
  const termination = row[TEMP_INDEX[input.termination]];
  const cap = TEST_SMALL_CAP[input.material]?.[input.wire] ?? Infinity;
  return Math.floor(Math.min(adjusted, termination, cap) + 1e-9);
};
// Canada intentionally gets the current planning-only result from these
// sealed NEC conductor/trade-size tables. Do not invent a Canadian size until
// CEC Tables 6A-6K and 9 pass the project's verification gate.
const CONDUIT_DATA_BY_COUNTRY = {
  us: { areas: TEST_THHN_AREA, families: TEST_CONDUIT, planningOnly: false },
  ca: { areas: TEST_THHN_AREA, families: TEST_CONDUIT, planningOnly: true },
};
const tradeSizeInches = (label) => {
  const text = label.replace('"', '');
  const [whole, fraction = ''] = text.includes('-') ? text.split('-') : ['', text];
  if (!fraction.includes('/')) return Number(whole || fraction);
  const [numerator, denominator] = fraction.split('/').map(Number);
  return Number(whole || 0) + numerator / denominator;
};
const expectedConduitSize = (country) => {
  const input = MATRIX_INPUTS.conduit;
  const source = CONDUIT_DATA_BY_COUNTRY[country];
  const needed = source.areas[input.wire] * input.count;
  const fillLimit = input.count === 1 ? 0.53 : input.count === 2 ? 0.31 : 0.40;
  const row = source.families[input.family].sizes.find(([, area]) => needed <= area * fillLimit);
  if (!row) throw new Error('Conduit-fill matrix input exceeds the sealed conduit table');
  return tradeSizeInches(row[0]);
};
const boxFillCounts = {
  us: MATRIX_INPUTS.boxFill.conductors
    + MATRIX_INPUTS.boxFill.devices * 2
    + MATRIX_INPUTS.boxFill.grounds
    + MATRIX_INPUTS.boxFill.clamps,
  ca: MATRIX_INPUTS.boxFill.conductors
    + MATRIX_INPUTS.boxFill.devices * 2
    + Math.floor(MATRIX_INPUTS.boxFill.marrettes / 2),
};
const voltageDropLabels = {
  en: 'voltage drop on 12 AWG copper',
  es: 'caída de tensión en conductor de cobre 12 AWG',
  'fr-CA': 'chute de tension du conducteur en cuivre 12 AWG',
  'zh-Hans': '12 AWG 铜线的电压降',
};
// Per-edition expected values must come from that country's verified
// constants and counting rules, never from typed answer totals. Countries can
// genuinely diverge; a typed total silently turns an unverified guess into a
// regression test, as the old Canadian box-fill expectation demonstrated.
const calculatorCases = [
  {
    name: 'voltage drop',
    path: '',
    expectedLabel: (edition) => voltageDropLabels[edition.locale],
    expected: () => {
      const input = MATRIX_INPUTS.voltageDrop;
      return roundTripDrop(input) / input.volts * 100;
    },
    readNumber: (value) => parseFloat(value),
    interact: async (targetPage) => {
      const input = MATRIX_INPUTS.voltageDrop;
      await targetPage.fill('#current', String(input.amps));
      await targetPage.fill('#distance', String(input.feet));
      await targetPage.click('#calc-btn');
    },
  },
  {
    name: 'wire size',
    path: 'wire-size-calculator/',
    expected: expectedWireSize,
    readNumber: (value) => parseFloat(value),
    interact: async (targetPage) => {
      const input = MATRIX_INPUTS.wireSize;
      await targetPage.click('[data-system="ac1"]');
      await targetPage.fill('#voltage', String(input.volts));
      await targetPage.fill('#current', String(input.amps));
      await targetPage.fill('#distance', String(input.feet));
      await targetPage.click('#calc-btn');
    },
  },
  {
    name: 'max wire length',
    path: 'max-wire-length/',
    expected: () => {
      const input = MATRIX_INPUTS.maxLength;
      const maxDrop = input.volts * input.targetPercent / 100;
      return (maxDrop * circularMils(input.wire))
        / (2 * TEST_K_FACTOR[input.material] * input.amps);
    },
    readNumber: (value) => parseFloat(value),
    tolerance: 0.05,
    interact: async (targetPage) => {
      const input = MATRIX_INPUTS.maxLength;
      await targetPage.fill('#voltage', String(input.volts));
      await targetPage.fill('#current', String(input.amps));
      await targetPage.selectOption('#awg', String(
        TEST_WIRE_TABLE.findIndex(([label]) => label === input.wire),
      ));
      await targetPage.click('#calc-btn');
    },
  },
  {
    name: 'ampacity',
    path: 'ampacity-check/',
    expected: expectedAmpacity,
    readNumber: (value) => parseFloat(value),
    interact: async (targetPage) => {
      const input = MATRIX_INPUTS.ampacity;
      await targetPage.selectOption('#amp-size', input.wire);
      await targetPage.click(`[data-insulation="${input.insulation}"]`);
      await targetPage.click(`[data-termination="${input.termination}"]`);
      await targetPage.fill('#amp-ambient', String(input.ambient));
      await targetPage.fill('#amp-conductors', String(input.conductorCount));
      await targetPage.fill('#amp-load', String(input.load));
      await targetPage.click('#amp-form .calc-btn');
    },
  },
  {
    name: 'conduit fill',
    path: 'conduit-fill/',
    expected: (edition) => expectedConduitSize(edition.country),
    readNumber: (value) => tradeSizeInches(value.trim()),
    interact: async (targetPage) => {
      await targetPage.fill('#fill-count', String(MATRIX_INPUTS.conduit.count));
      await targetPage.click('#fill-form .calc-btn');
    },
  },
  {
    name: 'power',
    path: 'power-calculator/',
    expected: () => {
      const input = MATRIX_INPUTS.power;
      return input.watts / (input.volts * input.powerFactor);
    },
    readNumber: (value) => parseFloat(value),
    interact: async (targetPage) => {
      const input = MATRIX_INPUTS.power;
      await targetPage.click('[data-system="ac1"]');
      await targetPage.fill('#pw-volts', String(input.volts));
      await targetPage.fill('#pw-watts', String(input.watts));
      await targetPage.click('#pw-form .calc-btn');
    },
  },
  {
    name: 'box fill',
    path: 'box-fill/',
    expected: (edition) => edition.country === 'ca'
      ? TEST_CEC_VOL_ML[MATRIX_INPUTS.boxFill.wire] * boxFillCounts.ca
      : TEST_VOL_PER_CONDUCTOR[MATRIX_INPUTS.boxFill.wire] * boxFillCounts.us,
    readNumber: (value) => parseFloat(value.replace(/,/g, '')),
    interact: async (targetPage, edition) => {
      const input = MATRIX_INPUTS.boxFill;
      if (edition.country === 'ca') await targetPage.fill('#bf-custom', '400');
      await targetPage.fill('#bf-conductors', String(input.conductors));
      await targetPage.fill('#bf-devices', String(input.devices));
      await targetPage.click('#bf-form .calc-btn');
    },
  },
];

for (const edition of EDITIONS) {
  const editionPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installFileRoute(editionPage);
  let interactionErrors = [];
  editionPage.on('pageerror', (error) => interactionErrors.push(`pageerror: ${String(error)}`));
  editionPage.on('console', (message) => {
    if (message.type() === 'error') interactionErrors.push(`console: ${message.text()}`);
  });

  for (const calculator of calculatorCases) {
    interactionErrors = [];
    const label = `${edition.prefix || 'us-en'} ${calculator.name}`;
    await editionPage.goto(BASE + editionPath(edition.prefix, calculator.path));
    await calculator.interact(editionPage, edition);
    await editionPage.waitForTimeout(20);

    const render = await editionPage.evaluate(() => {
      const results = document.getElementById('results');
      const bigNumber = document.getElementById('big-number');
      const bigLabel = document.getElementById('big-label');
      return {
        visible: Boolean(results) && !results.hidden
          && getComputedStyle(results).display !== 'none',
        value: bigNumber?.textContent?.trim() || '',
        label: bigLabel?.textContent || '',
      };
    });
    checkBool(`${label} renders #results and #big-number`,
      render.visible && render.value.length > 0,
      render.value || 'no result');
    check(`${label} numeric result`,
      calculator.readNumber(render.value),
      calculator.expected(edition),
      calculator.tolerance);
    if (calculator.expectedLabel) {
      const expectedLabel = calculator.expectedLabel(edition);
      checkBool(`${label} uses one locale-owned result pattern`,
        render.label === expectedLabel,
        render.label);
    }
    checkBool(`${label} interaction has zero page errors`,
      interactionErrors.length === 0,
      interactionErrors.join(' | '));
  }

  await editionPage.close();
}

// ---- Header fit: every mobile control stays within its one-line height.
for (const width of [360, 390]) {
  await page.setViewportSize({ width, height: 844 });
  const badPaths = [];
  for (const path of GENERATED_PATHS) {
    await page.goto(BASE + path);
    const fit = await page.evaluate(() => {
      const row = document.querySelector('.brand-row');
      const controls = [...row.children].filter((element) => getComputedStyle(element).display !== 'none');
      const centers = controls.map((element) => {
        const rect = element.getBoundingClientRect();
        return Math.round(rect.top + rect.height / 2);
      });
      const heights = controls.map((element) => {
        const clone = element.cloneNode(true);
        clone.removeAttribute('id');
        clone.style.position = 'fixed';
        clone.style.left = '-10000px';
        clone.style.top = '0';
        clone.style.visibility = 'hidden';
        clone.style.width = `${element.getBoundingClientRect().width}px`;
        clone.style.height = 'auto';
        clone.style.whiteSpace = 'nowrap';
        clone.style.overflowWrap = 'normal';
        document.body.appendChild(clone);
        const singleLine = clone.getBoundingClientRect().height;
        clone.remove();
        return {
          name: element.id || element.className,
          actual: element.getBoundingClientRect().height,
          singleLine,
        };
      });
      return {
        oneRow: Math.max(...centers) - Math.min(...centers) <= 1 && getComputedStyle(row).flexWrap === 'nowrap',
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        oneLine: heights.every(({ actual, singleLine }) => actual <= singleLine + 0.5),
        heights,
      };
    });
    if (!fit.oneRow || !fit.noOverflow || !fit.oneLine) {
      const badHeights = fit.heights
        .filter(({ actual, singleLine }) => actual > singleLine + 0.5)
        .map(({ name, actual, singleLine }) => `${name} ${actual}px>${singleLine}px`)
        .join(', ');
      badPaths.push(`/${path || ''}${badHeights ? ` (${badHeights})` : ''}`);
    }
  }
  checkBool(`header controls are one line + no overflow at ${width}px`, badPaths.length === 0,
    badPaths.length ? `failed on ${badPaths.join(', ')}` : `all ${GENERATED_PATHS.length} pages`);
}

// ---- Edition picker: deliberate navigation and honest guide fallback.
const pickerExpectations = {
  en: {
    us: { label: 'Language in United States', countries: ['United States', 'Canada'] },
    ca: { label: 'Language in Canada', countries: ['United States', 'Canada'] },
  },
  es: {
    us: {
      label: 'Idioma en Estados Unidos',
      countries: ['Estados Unidos', 'Canadá'],
      fallback: 'Deutsch todavía no está disponible para esta página en Estados Unidos; se muestra English. Disponible aquí: English, Español, 简体中文.',
    },
  },
  'fr-CA': {
    ca: {
      label: 'Langue au Canada',
      countries: ['États-Unis', 'Canada'],
      fallback: 'Deutsch n’est pas encore disponible pour cette page au Canada; affichage en English. Disponible ici : English, Français (Québec), 简体中文.',
    },
  },
  'zh-Hans': {
    us: {
      label: '美国的语言',
      countries: ['美国', '加拿大'],
      fallback: '美国的此页面暂不提供Deutsch；当前显示English。此处可用语言：English, Español, 简体中文。',
    },
    ca: {
      label: '加拿大的语言',
      countries: ['美国', '加拿大'],
      fallback: '加拿大的此页面暂不提供Deutsch；当前显示English。此处可用语言：English, Français (Québec), 简体中文。',
    },
  },
};
for (const edition of EDITIONS) {
  await page.goto(`${BASE}${edition.prefix ? `${edition.prefix}/` : ''}`);
  await page.click('#country-chip');
  const picker = await page.evaluate(() => ({
    label: document.getElementById('edition-language-label').textContent,
    countries: [...document.querySelectorAll('.edition-country-name')].map((name) => name.textContent),
    commonSrc: document.querySelector('script[src*="common.js"]')?.getAttribute('src'),
  }));
  const expected = pickerExpectations[edition.locale][edition.country];
  const usesLocalizedAsset = runtimeEditionId(edition) === 'us-en'
    ? picker.commonSrc?.startsWith('/common.js?v=')
    : picker.commonSrc?.startsWith(`/assets/${runtimeEditionId(edition)}/common.js?v=`);
  const isEnglishChrome = picker.label.startsWith('Language in ')
    || picker.countries.join('|') === 'United States|Canada';
  checkBool(`${edition.prefix || 'us-en'} picker uses its locale`,
    picker.label === expected.label
      && picker.countries.join('|') === expected.countries.join('|')
      && usesLocalizedAsset
      && (edition.locale === 'en' || !isEnglishChrome),
    `${picker.label}; ${picker.countries.join(', ')}; ${picker.commonSrc}`);

  if (edition.locale !== 'en') {
    const fallback = await page.evaluate((country) => {
      window.vdShowFallback('Deutsch', country);
      return document.getElementById('edition-fallback').textContent;
    }, edition.country);
    checkBool(`${edition.prefix} unavailable-language note uses its locale`,
      fallback === expected.fallback, fallback);
  }
}

await page.goto(BASE);
await page.click('#country-chip');
let panelState = await page.evaluate(() => ({
  open: !document.getElementById('edition-panel').hidden,
  expanded: document.getElementById('country-chip').getAttribute('aria-expanded'),
}));
checkBool('chip opens edition panel and expands aria state', panelState.open && panelState.expanded === 'true');

await page.keyboard.press('Escape');
panelState = await page.evaluate(() => ({
  closed: document.getElementById('edition-panel').hidden,
  expanded: document.getElementById('country-chip').getAttribute('aria-expanded'),
}));
checkBool('Escape closes edition panel', panelState.closed && panelState.expanded === 'false');

await page.click('#country-chip');
const usLanguageState = await page.evaluate(() => ({
  label: document.getElementById('edition-language-label').textContent,
  labels: [...document.querySelectorAll('.edition-language-option')].map((button) => button.textContent.trim()),
  spanishLang: document.querySelector('[data-lang="es"]')?.getAttribute('lang'),
}));
checkBool('second configured language reveals dependent group',
  usLanguageState.label === 'Language in United States');
checkBool('language choices use native names and lang tags',
  usLanguageState.labels.join('|') === 'English|Español|简体中文' && usLanguageState.spanishLang === 'es',
  usLanguageState.labels.join(', '));

await page.click('.edition-language-option[data-lang="es"]');
await page.waitForURL('**/es/');
checkBool('language click navigates to Spanish twin', new URL(page.url()).pathname === '/es/');

await page.goto(BASE + 'wire-size-calculator/');
await page.click('#country-chip');
await page.click('.edition-country-option[data-country="ca"]');
await page.waitForURL('**/ca/wire-size-calculator/');
checkBool('country click navigates to equivalent Canadian tool',
  new URL(page.url()).pathname === '/ca/wire-size-calculator/');

// ---- Edition path helper: computed twins match every old US↔CA guide pair.
const editionPaths = await page.evaluate((paths) => paths.map((usPath) => ({
  usPath,
  caPath: VDEdition.pathFor('ca', 'en', usPath),
  roundTrip: VDEdition.pathFor('us', 'en', `/ca${usPath}`),
})), GUIDE_ROUTES);
const twinsMatch = editionPaths.every(({ usPath, caPath, roundTrip }) =>
  caPath === `/ca${usPath}` && roundTrip === usPath);
checkBool('edition helper matches all six US/CA guide twins', twinsMatch,
  `${editionPaths.length} paths checked both ways`);
const guideEditionMatrix = await page.evaluate(({ editions, paths }) =>
  editions.flatMap((edition) => paths.map((path) => ({
    expected: `${edition.prefix ? `/${edition.prefix}` : ''}${path}`,
    actual: VDEdition.pathFor(edition.country, edition.locale, path),
  }))), { editions: EDITIONS, paths: GUIDE_ROUTES });
checkBool('edition helper resolves every guide in all six editions',
  guideEditionMatrix.every(({ expected, actual }) => expected === actual),
  `${guideEditionMatrix.length} guide-edition paths`);
const unavailableEditions = await page.evaluate(() => ({
  es: VDEdition.pathFor('us', 'es', '/guides/'),
  fr: VDEdition.pathFor('ca', 'fr-CA', '/guides/'),
  missing: VDEdition.pathFor('ca', 'en', '/not-built/'),
}));
checkBool('edition helper exposes built guide editions and refuses unbuilt pages',
  unavailableEditions.es === '/es/guides/'
    && unavailableEditions.fr === '/ca-fr/guides/'
    && unavailableEditions.missing === null);

const twinLinkCases = [
  ['zh/guides/', 'a[data-edition-country="ca"]', '/ca-zh/guides/'],
  ['es/guides/', 'a[data-edition-country="ca"]', '/ca/guides/'],
  ['ca-zh/guides/sub-panel-wire-size/', 'a[data-edition-country="us"]', '/zh/guides/sub-panel-wire-size/'],
  ['ca-fr/guides/sub-panel-wire-size/', 'a[data-edition-country="us"]', '/guides/sub-panel-wire-size/'],
];
for (const [path, selector, expected] of twinLinkCases) {
  await page.goto(BASE + path);
  const href = await page.getAttribute(selector, 'href');
  checkBool(`guide twin link /${path}`, href === expected, href);
}

await page.goto(BASE);

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

// ---- Canadian edition: URL fixes the CEC pack; no geo or stored-state override.
await page.goto(BASE + 'ca/');
let chip = await page.textContent('#country-chip');
checkBool('Canada URL shows CEC edition', chip.includes('CEC · EN'), chip.trim());
const caRule = await page.textContent('.explainer');
checkBool('Canada voltage-drop copy is mandatory and not contradictory',
  caRule.includes('mandatory')
    && caRule.includes('Rule 8-102')
    && !caRule.includes('not laws')
    && caRule.includes('not optional performance guidelines'));
// Canada 3-phase presets should include 600 V
await page.click('[data-system="ac3"]');
const presets = await page.textContent('#voltage-presets');
console.log(presets.includes('600') ? 'PASS CA 3-phase presets include 600 V' : `FAIL presets: "${presets}"`); presets.includes('600') ? pass++ : fail++;
await page.screenshot({ path: `${shots}/6-canada.png`, fullPage: true });

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

// ---- Ampacity derating: verified order, binding limits, and refusal cases.
await page.goto(BASE + 'ampacity-check/');
await page.selectOption('#amp-size', '8 AWG');
await page.click('[data-insulation="90"]');
await page.click('[data-termination="75"]');
await page.fill('#amp-ambient', '40');
await page.fill('#amp-conductors', '6');
await page.fill('#amp-load', '35');
await page.click('#amp-form .calc-btn');
await page.waitForSelector('#results:not([hidden])');
let ampBig = await page.textContent('#big-number');
let ampBinding = await page.textContent('#amp-binding-value');
check('worked example 55A × 0.91 × 0.80', parseFloat(ampBig), 40);
checkBool('worked example binding limit is derating',
  ampBinding.includes('Derating after ambient correction'),
  ampBinding);
let ampFormula = await page.textContent('#amp-combined-formula');
checkBool('worked example shows both factors multiplied together',
  ampFormula.trim() === '55 A × 0.91 × 0.80 = 40 A',
  ampFormula.trim());

// 8 AWG Cu, 90°C insulation, ordinary ambient, 3 CCC: 55A derated,
// then the 75°C terminal column limits the final answer to 50A.
await page.fill('#amp-ambient', '30');
await page.fill('#amp-conductors', '3');
await page.click('#amp-form .calc-btn');
ampBig = await page.textContent('#big-number');
ampBinding = await page.textContent('#amp-binding-value');
check('termination-binding case', parseFloat(ampBig), 50);
checkBool('110.14(C) termination limit binds',
  ampBinding.includes('110.14(C)'),
  ampBinding);

// 12 AWG Cu, 90°C insulation, 75°C terminals, 30°C, 3 CCC:
// 30A raw, 25A terminal limit, then 240.4(D) caps the final answer at 20A.
await page.selectOption('#amp-size', '12 AWG');
await page.click('#amp-form .calc-btn');
ampBig = await page.textContent('#big-number');
ampBinding = await page.textContent('#amp-binding-value');
check('240.4(D)-binding case', parseFloat(ampBig), 20);
checkBool('240.4(D) small-conductor cap binds',
  ampBinding.includes('240.4(D)'),
  ampBinding);

// A 33A continuous load needs 41.25A on the load side, while the conductor
// side remains the worked-example 40A. The two calculations must stay apart.
await page.selectOption('#amp-size', '8 AWG');
await page.fill('#amp-ambient', '40');
await page.fill('#amp-conductors', '6');
await page.fill('#amp-load', '33');
await page.click('[data-continuous="yes"]');
await page.click('#amp-form .calc-btn');
ampBig = await page.textContent('#big-number');
const continuousRequired = await page.textContent('#amp-load-required');
cls = await page.getAttribute('#verdict', 'class');
check('continuous case leaves conductor-side ampacity unchanged', parseFloat(ampBig), 40);
check('continuous case calculates load-side 125% separately', parseFloat(continuousRequired), 41.25);
checkBool('continuous requirement fails separately without changing derating',
  cls.includes('bad'),
  cls);

// 60°C insulation at 60°C ambient is a published "—". No neighboring
// factor may be substituted and no ampacity number may be returned.
await page.click('[data-insulation="60"]');
await page.click('[data-termination="60"]');
await page.fill('#amp-ambient', '60');
await page.click('#amp-form .calc-btn');
ampBig = await page.textContent('#big-number');
const notPermittedVisible = await page.isVisible('#amp-code-unavailable');
const calculationHidden = await page.$eval('#amp-result-calculation', (element) => element.hidden);
checkBool('not-permitted ambient/insulation combination refuses a number',
  ampBig.trim() === '—' && notPermittedVisible && calculationHidden,
  `${ampBig.trim()} visible=${notPermittedVisible} hidden=${calculationHidden}`);
await page.screenshot({ path: `${shots}/7-ampacity.png`, fullPage: true });

// Same physical inputs, different country tables: ten conductors are 0.50
// under NEC Table 310.15(C)(1) and 0.70 under CEC Table 5C.
const runTenConductorAmpacity = async (path) => {
  await page.goto(BASE + path);
  await page.selectOption('#amp-size', '8 AWG');
  await page.click('[data-insulation="90"]');
  await page.click('[data-termination="75"]');
  await page.fill('#amp-ambient', '40');
  await page.fill('#amp-conductors', '10');
  await page.fill('#amp-load', '20');
  await page.click('#amp-form .calc-btn');
  return {
    result: parseFloat(await page.textContent('#big-number')),
    factor: (await page.textContent('#amp-adjustment-factor')).trim(),
    formula: (await page.textContent('#amp-combined-formula')).trim(),
  };
};
const usTen = await runTenConductorAmpacity('ampacity-check/');
const caTen = await runTenConductorAmpacity('ca/ampacity-check/');
checkBool('rendered US/Canada ten-conductor paths diverge at 0.50 vs 0.70',
  usTen.result === 25
    && caTen.result === 35
    && usTen.factor === '× 0.50'
    && caTen.factor === '× 0.70',
  `US ${JSON.stringify(usTen)}; Canada ${JSON.stringify(caTen)}`);

// CEC Table 5A is point-based. 37°C must move up to the 40°C row.
await page.fill('#amp-ambient', '37');
await page.click('#amp-form .calc-btn');
const cec37 = {
  result: parseFloat(await page.textContent('#big-number')),
  row: (await page.textContent('#amp-ambient-row-value')).trim(),
  factor: (await page.textContent('#amp-ambient-factor')).trim(),
  math: (await page.textContent('.math-details .math-body')).replace(/\s+/g, ' '),
};
checkBool('rendered CEC 37°C case shows the 40°C row and conservative method',
  cec37.result === 35
    && cec37.row === '40°C'
    && cec37.factor === '× 0.91'
    && cec37.math.includes('next higher listed row'),
  JSON.stringify(cec37));

// A published dash remains a refusal in the Canadian path.
await page.click('[data-insulation="60"]');
await page.click('[data-termination="60"]');
await page.fill('#amp-ambient', '60');
await page.click('#amp-form .calc-btn');
const caDash = {
  value: (await page.textContent('#big-number')).trim(),
  noteVisible: await page.isVisible('#amp-code-unavailable'),
  calculationHidden: await page.$eval('#amp-result-calculation', (element) => element.hidden),
};
checkBool('rendered CEC dash combination refuses a number',
  caDash.value === '—' && caDash.noteVisible && caDash.calculationHidden,
  JSON.stringify(caDash));

// Rule 8-104 is displayed as an 80% Canadian load limit, not as a second
// 125% ampacity multiplier.
await page.click('[data-insulation="90"]');
await page.click('[data-termination="75"]');
await page.fill('#amp-ambient', '40');
await page.fill('#amp-conductors', '6');
await page.fill('#amp-load', '33');
await page.click('[data-continuous="yes"]');
await page.click('#amp-form .calc-btn');
const caContinuous = {
  ampacity: parseFloat(await page.textContent('#big-number')),
  limit: parseFloat(await page.textContent('#amp-load-required')),
  label: (await page.textContent('#amp-continuous-row')).replace(/\s+/g, ' ').trim(),
  verdict: await page.getAttribute('#verdict', 'class'),
};
checkBool('rendered CEC Rule 8-104 keeps 80% separate from conductor derating',
  caContinuous.ampacity === 40
    && caContinuous.limit === 32
    && caContinuous.label.includes('× 80%')
    && caContinuous.verdict.includes('bad'),
  JSON.stringify(caContinuous));

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

// ---- Guides: every edition loads, has an h1, highlights Guides, and carries translated FAQ data.
for (const g of GENERATED_PATHS.filter((path) => path.includes('guides/'))) {
  await page.goto(BASE + g);
  const h1 = await page.textContent('h1').catch(() => null);
  const active = await page.$('.sidebar .tool-link.active[data-tool="guides"]') !== null;
  const faq = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    return scripts.map((script) => {
      try { return JSON.parse(script.textContent); } catch { return null; }
    }).find((entry) => entry?.['@type'] === 'FAQPage') || null;
  });
  const faqOk = g.endsWith('guides/')
    ? faq === null
    : faq?.mainEntity?.every((entry) =>
        entry?.['@type'] === 'Question'
        && typeof entry.name === 'string'
        && entry.name.length > 3
        && typeof entry.acceptedAnswer?.text === 'string'
        && entry.acceptedAnswer.text.length > 3);
  const ok = h1 && h1.trim().length > 3 && active && faqOk;
  console.log(ok ? `PASS guide /${g} (${h1.trim().slice(0, 30)}…)` : `FAIL guide /${g}: h1=${h1} active=${active} faq=${faqOk}`); ok ? pass++ : fail++;
}

// Every number visible in a translated guide must have the exact source
// formatting and multiplicity of its country-specific English twin.
const renderedNumberMultiset = async (path) => {
  await page.goto(BASE + path);
  return page.evaluate((numericTokenPattern) => {
    const tokens = document.body.innerText.match(new RegExp(numericTokenPattern, 'gu')) || [];
    return tokens.sort();
  }, NUMERIC_TOKEN_PATTERN);
};
for (const edition of EDITIONS.filter(({ locale }) => locale !== 'en')) {
  const englishPrefix = edition.country === 'ca' ? 'ca' : '';
  for (const guidePath of GUIDE_PATHS) {
    const translatedPath = editionPath(edition.prefix, guidePath);
    const englishPath = editionPath(englishPrefix, guidePath);
    const [translatedNumbers, englishNumbers] = [
      await renderedNumberMultiset(translatedPath),
      await renderedNumberMultiset(englishPath),
    ];
    const same = JSON.stringify(translatedNumbers) === JSON.stringify(englishNumbers);
    checkBool(`numeric parity /${translatedPath}`, same,
      same ? `${translatedNumbers.length} rendered numeric tokens` : `translated=${JSON.stringify(translatedNumbers)} english=${JSON.stringify(englishNumbers)}`);
  }
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
