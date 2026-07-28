import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const english = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const registry = JSON.parse(readFileSync('i18n/safety-critical.json', 'utf8'));
const reviewKeys = [...registry.keys, ...(registry.extraReviewKeys ?? [])];
const targetOnly = JSON.parse(readFileSync('i18n/backtranslation-input.json', 'utf8'));
const passA = JSON.parse(readFileSync('i18n/backtranslations.json', 'utf8'));
const catalogs = {
  es: JSON.parse(readFileSync('i18n/strings/es.json', 'utf8')),
  'fr-CA': JSON.parse(readFileSync('i18n/strings/fr-CA.json', 'utf8')),
  'zh-Hans': JSON.parse(readFileSync('i18n/strings/zh-Hans.json', 'utf8')),
};
const packs = {
  us: JSON.parse(readFileSync('i18n/country-packs/us.json', 'utf8')),
  ca: JSON.parse(readFileSync('i18n/country-packs/ca.json', 'utf8')),
};
const editions = [
  { id: 'us-es', country: 'us', locale: 'es' },
  { id: 'us-zh', country: 'us', locale: 'zh-Hans' },
  { id: 'ca-fr', country: 'ca', locale: 'fr-CA' },
  { id: 'ca-zh', country: 'ca', locale: 'zh-Hans' },
];
const keyApplies = (key, country) => {
  if (key.startsWith('guides.necVsCec.')) return true;
  if (key.startsWith('guides.ca.') || key.startsWith('pages.ca.guides.')) return country === 'ca';
  if (key.startsWith('guides.') || key.startsWith('pages.us.guides.')) return country === 'us';
  return true;
};

const valueAt = (source, key) => {
  if (typeof source[key] === 'string') return source[key];
  return key.split('.').reduce((cursor, part) => cursor?.[part], source);
};
const backById = new Map(passA.entries.map((entry) => [entry.id, entry.backTranslation]));
const actualBacktranslationDigest = createHash('sha256')
  .update(JSON.stringify(passA.entries))
  .digest('hex');
if (
  passA.targetDigest !== targetOnly.targetDigest
  || passA.backtranslationDigest !== actualBacktranslationDigest
  || passA.entries.length !== targetOnly.entries.length
  || backById.size !== targetOnly.entries.length
) {
  throw new Error('Pass A output is missing rows or does not match the target-only input.');
}

const entries = [];
let rowIndex = 0;
for (const edition of editions) {
  for (const key of reviewKeys) {
    if (!keyApplies(key, edition.country)) continue;
    const pack = packs[edition.country];
    const original = pack.strings[key] ?? valueAt(english, key);
    if (typeof original !== 'string' || original === '') continue;
    const translation = pack.strings[key] !== undefined
      ? pack.localizedStrings[edition.locale][key]
      : valueAt(catalogs[edition.locale], key);
    const targetRow = targetOnly.entries[rowIndex];
    if (!targetRow || targetRow.locale !== edition.locale || targetRow.targetText !== translation) {
      throw new Error(`Pass A row alignment failed at ${edition.id}:${key}.`);
    }
    entries.push({
      id: targetRow.id,
      edition: edition.id,
      locale: edition.locale,
      key,
      original,
      translation,
      backTranslation: backById.get(targetRow.id),
    });
    rowIndex += 1;
  }
}

const output = {
  policy: 'Pass B comparison packet. Originals are introduced only after Pass A has been saved and sealed.',
  targetDigest: targetOnly.targetDigest,
  backtranslationDigest: passA.backtranslationDigest,
  entries,
};
writeFileSync('i18n/backtranslation-comparison.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`back-translation Pass B comparison input: ${entries.length} rows`);
