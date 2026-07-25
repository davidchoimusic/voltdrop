import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync('i18n/safety-critical.json', 'utf8'));
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
  if (key.startsWith('guides.ca.') || key.startsWith('pages.ca.guides.')) return country === 'ca';
  if (key.startsWith('guides.') || key.startsWith('pages.us.guides.')) return country === 'us';
  return true;
};

const valueAt = (source, key) => {
  if (typeof source[key] === 'string') return source[key];
  return key.split('.').reduce((cursor, part) => cursor?.[part], source);
};

const entries = [];
for (const edition of editions) {
  for (const key of registry.keys) {
    if (!keyApplies(key, edition.country)) continue;
    const pack = packs[edition.country];
    const hasCountryString = pack.strings[key] !== undefined;
    const translation = hasCountryString
      ? pack.localizedStrings[edition.locale]?.[key]
      : valueAt(catalogs[edition.locale], key);
    if (typeof translation !== 'string' || translation === '') continue;
    entries.push({
      id: `bt-${String(entries.length + 1).padStart(4, '0')}`,
      locale: edition.locale,
      targetText: translation,
    });
  }
}

const targetDigest = createHash('sha256')
  .update(JSON.stringify(entries))
  .digest('hex');
const output = {
  policy: 'Target-language-only input for back-translation Pass A. It intentionally contains no source English and uses opaque row IDs.',
  targetDigest,
  entries,
};

writeFileSync('i18n/backtranslation-input.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`back-translation Pass A input: ${entries.length} target-only rows (${targetDigest})`);
