import { readFileSync } from 'node:fs';
import { deriveGuideTables } from './derive-guide-tables.mjs';
import { generateGuideProvenance, NUMERIC_TOKEN_PATTERN, PROVENANCE_FILE } from './generate-guide-provenance.mjs';

const PARTIALS = [
  ['partials/guide-20amp-main.html', 'twentyAmp', 'us'],
  ['partials/ca-guide-20amp-main.html', 'twentyAmp', 'ca'],
  ['partials/guide-30amp-main.html', 'thirtyAmp', 'us'],
  ['partials/ca-guide-30amp-main.html', 'thirtyAmp', 'ca'],
  ['partials/guide-40amp-main.html', 'fortyAmp', 'us'],
  ['partials/ca-guide-40amp-main.html', 'fortyAmp', 'ca'],
  ['partials/guide-60amp-main.html', 'sixtyAmp', 'us'],
  ['partials/ca-guide-60amp-main.html', 'sixtyAmp', 'ca'],
];
const GUIDES = ['twentyAmp', 'thirtyAmp', 'fortyAmp', 'sixtyAmp'];
const INTERNAL_JARGON_PATTERN = /\b(?:repo|engine|sealed)\b/i;

const catalog = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const storedDerivation = JSON.parse(readFileSync('tools/guide-table-derivations.json', 'utf8'));
const freshDerivation = deriveGuideTables();
if (JSON.stringify(storedDerivation) !== JSON.stringify(freshDerivation)) {
  throw new Error('tools/guide-table-derivations.json is stale; rerun the derivation tool.');
}
const storedProvenance = JSON.parse(readFileSync(PROVENANCE_FILE, 'utf8'));
const freshProvenance = generateGuideProvenance();
if (JSON.stringify(storedProvenance) !== JSON.stringify(freshProvenance)) {
  throw new Error(`${PROVENANCE_FILE} is stale; rerun the provenance generator.`);
}

const valueAt = (source, key) => key.split('.').reduce((cursor, part) => cursor?.[part], source);
const jsonEscape = (value) => JSON.stringify(value).slice(1, -1);
const render = (source, file) => {
  const keys = new Set();
  const rendered = source.replace(/\{\{(?:(json|attr):)?([A-Za-z0-9.%]+)\}\}/g, (_, format, key) => {
    keys.add(key);
    const value = valueAt(catalog, key);
    if (typeof value !== 'string') throw new Error(`${file}: missing catalog string ${key}`);
    return format === 'json' ? jsonEscape(value) : value;
  });
  const unresolved = rendered.match(/\{\{[^}]+\}\}/);
  if (unresolved) throw new Error(`${file}: unresolved placeholder ${unresolved[0]}`);
  return { rendered, keys };
};

const stripTags = (value) => value.replace(/<[^>]+>/g, '').trim();

function checkCatalogBoundaries() {
  for (const guide of GUIDES) {
    for (const [prefix, namespace] of [
      [`guides.${guide}`, catalog.guides?.[guide]],
      [`guides.ca.${guide}`, catalog.guides?.ca?.[guide]],
    ]) {
      for (const [key, value] of Object.entries(namespace || {})) {
        if (/^n(?:120|240)VId$/.test(key)) {
          throw new Error(`${prefix}.${key}: structural table identifiers must not live in the string catalog`);
        }
        if (typeof value === 'string' && INTERNAL_JARGON_PATTERN.test(value)) {
          throw new Error(`${prefix}.${key}: internal wording leaked into reader copy`);
        }
      }
    }
  }
}

function checkReaderSentenceRoles(source, file) {
  if (/data-guide-table="\{\{/.test(source)) {
    throw new Error(`${file}: data-guide-table must use a literal structural identifier`);
  }
  const readerSource = source
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<table\b[\s\S]*?<\/table>/g, '')
    .replace(/<a\b[\s\S]*?<\/a>/g, '');
  const usesByValue = new Map();
  for (const match of readerSource.matchAll(/\{\{(?:(?:json|attr):)?([A-Za-z0-9.%]+)\}\}/g)) {
    const key = match[1];
    const value = valueAt(catalog, key);
    if (typeof value !== 'string' || !/[.!?](?:\s|$)/.test(value)) continue;
    const uses = usesByValue.get(value) || [];
    uses.push(key);
    usesByValue.set(value, uses);
  }
  for (const uses of usesByValue.values()) {
    if (uses.length > 1) {
      throw new Error(`${file}: full reader sentence is rendered in more than one role: ${uses.join(', ')}`);
    }
  }
}

function checkFaq(html, file) {
  const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error(`${file}: missing FAQ JSON-LD`);
  let faq;
  try { faq = JSON.parse(script); } catch (error) { throw new Error(`${file}: invalid FAQ JSON-LD: ${error.message}`); }
  if (faq?.['@type'] !== 'FAQPage' || !Array.isArray(faq.mainEntity) || !faq.mainEntity.length) {
    throw new Error(`${file}: FAQ JSON-LD has the wrong shape`);
  }
  const visible = [...html.matchAll(/<div><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g)]
    .map((match) => [stripTags(match[1]), stripTags(match[2])]);
  const structured = faq.mainEntity.map((entry) => [entry.name, entry.acceptedAnswer?.text]);
  if (JSON.stringify(visible) !== JSON.stringify(structured)) {
    throw new Error(`${file}: visible FAQ and FAQ JSON-LD do not match`);
  }
}

function checkTables(html, file, guide, edition) {
  const expected = freshDerivation.guides[guide][edition];
  const allGuideTables = [...html.matchAll(/<table class="gtable"/g)];
  const tableMatches = [...html.matchAll(/<table class="gtable" data-guide-table="([^"]+)">([\s\S]*?)<\/table>/g)];
  if (allGuideTables.length !== tableMatches.length) {
    throw new Error(`${file}: every guide table must have data-guide-table`);
  }
  if (tableMatches.length !== Object.keys(expected).length) {
    throw new Error(`${file}: found ${tableMatches.length} tables, expected ${Object.keys(expected).length}`);
  }

  for (const [whole, tableId, body] of tableMatches) {
    if (!expected[tableId]) throw new Error(`${file}: unexpected table ${tableId}`);
    const expectedDistances = Object.keys(Object.values(expected[tableId])[0]);
    const header = body.match(/<thead><tr[^>]*>([\s\S]*?)<\/tr><\/thead>/)?.[1] || '';
    const headerDistances = [...header.matchAll(/<th data-distance-ft="(\d+)">/g)].map((match) => match[1]);
    if (JSON.stringify(headerDistances) !== JSON.stringify(expectedDistances)) {
      throw new Error(`${file}: ${tableId} header distances differ from derivation`);
    }
    for (const row of whole.matchAll(/<tr([^>]*)>/g)) {
      if (!/data-(?:table-row|material)=/.test(row[1])) throw new Error(`${file}: table row lacks a stable data attribute`);
    }
    for (const cell of whole.matchAll(/<td([^>]*)>/g)) {
      if (!/data-(?:column|distance-ft)=/.test(cell[1])) throw new Error(`${file}: data cell lacks a stable data attribute`);
    }
    const rows = [...body.matchAll(/<tr data-material="(cu|al)">([\s\S]*?)<\/tr>/g)];
    if (rows.length !== Object.keys(expected[tableId]).length) throw new Error(`${file}: ${tableId} material-row count mismatch`);
    for (const [, material, rowBody] of rows) {
      const actual = Object.fromEntries([...rowBody.matchAll(/<td data-distance-ft="(\d+)">([^<]+)<\/td>/g)]
        .map((match) => [match[1], match[2].trim()]));
      if (JSON.stringify(actual) !== JSON.stringify(expected[tableId][material])) {
        throw new Error(`${file}: ${tableId}/${material} differs from derivation: ${JSON.stringify(actual)} != ${JSON.stringify(expected[tableId][material])}`);
      }
    }
  }
}

function checkProvenance(keys, file, guide, edition) {
  const prefix = edition === 'ca' ? `guides.ca.${guide}.` : `guides.${guide}.`;
  const pagePrefix = `pages.${edition}.guides.${guide}.`;
  const namespaceEntries = [
    ...Object.entries(valueAt(catalog, prefix.slice(0, -1)) || {}).map(([key, value]) => [`${prefix}${key}`, value]),
    ...Object.entries(valueAt(catalog, pagePrefix.slice(0, -1)) || {}).map(([key, value]) => [`${pagePrefix}${key}`, value]),
  ];
  for (const [key, value] of namespaceEntries) {
    if (typeof value !== 'string') continue;
    const tokens = value.match(NUMERIC_TOKEN_PATTERN) || [];
    if (!tokens.length) continue;
    const record = storedProvenance.entries[key];
    if (!record || JSON.stringify(record.tokens) !== JSON.stringify(tokens)) {
      throw new Error(`${file}: unclassified or stale numeric provenance for ${key}: ${JSON.stringify(tokens)}`);
    }
  }
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const value = valueAt(catalog, key);
    const tokens = value.match(NUMERIC_TOKEN_PATTERN) || [];
    if (tokens.length && !storedProvenance.entries[key]) throw new Error(`${file}: unclassified numeric token in ${key}`);
  }
}

let passed = 0;
checkCatalogBoundaries();
for (const [file, guide, edition] of PARTIALS) {
  try {
    const source = readFileSync(file, 'utf8');
    checkReaderSentenceRoles(source, file);
    const { rendered, keys } = render(source, file);
    checkFaq(rendered, file);
    checkTables(rendered, file, guide, edition);
    checkProvenance(keys, file, guide, edition);
    console.log(`PASS ${file}: placeholders, FAQ, tables, provenance`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${file}: ${error.message}`);
  }
}
console.log(`${passed}/${PARTIALS.length} guide partials passed`);
if (passed !== PARTIALS.length) process.exit(1);
