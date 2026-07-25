import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync('i18n/backtranslation-input.json', 'utf8'));
const oldComparison = JSON.parse(readFileSync('i18n/backtranslation-comparison.json', 'utf8'));
const oldReview = JSON.parse(readFileSync('i18n/backtranslation-review.json', 'utf8'));
const workDir = process.argv[3] || '.guide-i18n-tmp/backtranslation';
const BATCH_SIZE = 60;
mkdirSync(workDir, { recursive: true });

const stripFences = (raw) => raw.trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/, '');
const readResponse = (file) => {
  const raw = stripFences(readFileSync(file, 'utf8'));
  const first = raw.indexOf('[');
  const last = raw.lastIndexOf(']');
  if (first < 0 || last < first) throw new Error(`No JSON array in ${file}`);
  return JSON.parse(raw.slice(first, last + 1));
};
const chunks = (entries) => Array.from(
  { length: Math.ceil(entries.length / BATCH_SIZE) },
  (_, index) => entries.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
);
const oldReviewById = new Map(oldReview.entries.map((entry) => [entry.id, entry]));
const oldByIdentity = new Map(oldComparison.entries.map((entry) => {
  const judgment = oldReviewById.get(entry.id);
  return [`${entry.edition}\0${entry.key}`, {
    translation: entry.translation,
    backTranslation: entry.backTranslation,
    judgment: judgment ? { status: judgment.status, verdict: judgment.verdict } : null,
  }];
}));

const registry = JSON.parse(readFileSync('i18n/safety-critical.json', 'utf8'));
const reviewKeys = [...registry.keys, ...(registry.extraReviewKeys ?? [])];
const catalogs = Object.fromEntries(['es', 'fr-CA', 'zh-Hans'].map((locale) => [
  locale,
  JSON.parse(readFileSync(`i18n/strings/${locale}.json`, 'utf8')),
]));
const packs = Object.fromEntries(['us', 'ca'].map((country) => [
  country,
  JSON.parse(readFileSync(`i18n/country-packs/${country}.json`, 'utf8')),
]));
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
const rows = [];
let rowIndex = 0;
for (const edition of editions) {
  for (const key of reviewKeys) {
    if (!keyApplies(key, edition.country)) continue;
    const pack = packs[edition.country];
    const targetText = pack.strings[key] !== undefined
      ? pack.localizedStrings[edition.locale]?.[key]
      : valueAt(catalogs[edition.locale], key);
    if (typeof targetText !== 'string' || targetText === '') continue;
    const target = input.entries[rowIndex++];
    if (target.locale !== edition.locale || target.targetText !== targetText) {
      throw new Error(`Target row alignment failed at ${edition.id}:${key}`);
    }
    rows.push({ ...target, edition: edition.id, key });
  }
}
if (rows.length !== input.entries.length) throw new Error('Not every target-only row was identified.');

const reused = new Map();
for (const row of rows) {
  const old = oldByIdentity.get(`${row.edition}\0${row.key}`);
  if (old?.translation === row.targetText && old.backTranslation) reused.set(row.id, old);
}

if (process.argv[2] === '--prepare-a') {
  writeFileSync(join(workDir, 'reuse.json'), `${JSON.stringify(Object.fromEntries(reused), null, 2)}\n`);
  const missing = rows.filter((row) => !reused.has(row.id))
    .map(({ id, locale, targetText }) => ({ id, locale, targetText }));
  for (const [index, batch] of chunks(missing).entries()) {
    const prompt = `Back-translate each targetText into plain English.

This is Pass A of a sealed review. You have ONLY target-language text. Do not inspect any repository
file or seek the English originals. Preserve every number, unit, citation, designation, formula,
negation, maximum/minimum force, and required/advised force. Return only a strict JSON array in the
same order, with objects shaped exactly as {"id":"...","backTranslation":"..."}. No Markdown.

TARGET_ONLY_ROWS:
${JSON.stringify(batch)}`;
    writeFileSync(join(workDir, `pass-a-${String(index + 1).padStart(2, '0')}.prompt`), prompt);
  }
  console.log(`Pass A prepared: ${missing.length} new rows in ${chunks(missing).length} batches; ${reused.size} unchanged rows reused.`);
} else if (process.argv[2] === '--ingest-a') {
  const reuse = JSON.parse(readFileSync(join(workDir, 'reuse.json'), 'utf8'));
  const generated = new Map();
  for (let index = 1; ; index += 1) {
    const file = join(workDir, `pass-a-${String(index).padStart(2, '0')}.response`);
    try {
      for (const entry of readResponse(file)) generated.set(entry.id, entry.backTranslation);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      break;
    }
  }
  const entries = rows.map(({ id }) => ({
    id,
    backTranslation: reuse[id]?.backTranslation ?? generated.get(id),
  }));
  const invalid = entries.find((entry) => typeof entry.backTranslation !== 'string' || !entry.backTranslation);
  if (invalid || new Set(entries.map(({ id }) => id)).size !== rows.length) {
    throw new Error(`Pass A is missing or duplicating rows near ${invalid?.id || 'unknown'}.`);
  }
  const backtranslationDigest = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
  writeFileSync('i18n/backtranslations.json', `${JSON.stringify({
    policy: 'Independent Pass A back-translations made from the target-only packet with source English sealed out.',
    targetDigest: input.targetDigest,
    backtranslationDigest,
    entries,
  }, null, 2)}\n`);
  console.log(`Pass A ingested: ${entries.length} sealed rows (${backtranslationDigest})`);
} else if (process.argv[2] === '--prepare-b') {
  const comparison = JSON.parse(readFileSync('i18n/backtranslation-comparison.json', 'utf8'));
  const reuse = JSON.parse(readFileSync(join(workDir, 'reuse.json'), 'utf8'));
  const missing = comparison.entries.filter((entry) => !reuse[entry.id]?.judgment);
  for (const [index, batch] of chunks(missing).entries()) {
    const prompt = `Review each translation using its original English and independent back-translation.

Return only a strict JSON array in the same order. Each object must be shaped exactly as
{"id":"...","status":"PASS","verdict":"..."}. Use FAIL only for a real meaning, force, negation,
number, unit, citation, or designation defect. Every verdict must be a substantive row-specific
English sentence of at least 24 characters; do not reuse boilerplate. No Markdown.

PASS_B_ROWS:
${JSON.stringify(batch)}`;
    writeFileSync(join(workDir, `pass-b-${String(index + 1).padStart(2, '0')}.prompt`), prompt);
  }
  console.log(`Pass B prepared: ${missing.length} new judgments in ${chunks(missing).length} batches; ${comparison.entries.length - missing.length} unchanged judgments reused.`);
} else if (process.argv[2] === '--ingest-b') {
  const passA = JSON.parse(readFileSync('i18n/backtranslations.json', 'utf8'));
  const reuse = JSON.parse(readFileSync(join(workDir, 'reuse.json'), 'utf8'));
  const generated = new Map();
  for (let index = 1; ; index += 1) {
    const file = join(workDir, `pass-b-${String(index).padStart(2, '0')}.response`);
    try {
      for (const entry of readResponse(file)) generated.set(entry.id, entry);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      break;
    }
  }
  const entries = rows.map(({ id }) => {
    const judgment = reuse[id]?.judgment ?? generated.get(id);
    return { id, status: judgment?.status, verdict: judgment?.verdict };
  });
  const invalid = entries.find((entry) =>
    !['PASS', 'FAIL'].includes(entry.status)
    || typeof entry.verdict !== 'string'
    || entry.verdict.length < 24);
  if (invalid) throw new Error(`Pass B has an invalid judgment near ${invalid.id}.`);
  writeFileSync('i18n/backtranslation-review.json', `${JSON.stringify({
    policy: 'Pass B row-specific meaning judgments after originals were introduced.',
    targetDigest: input.targetDigest,
    backtranslationDigest: passA.backtranslationDigest,
    entries,
  }, null, 2)}\n`);
  console.log(`Pass B ingested: ${entries.length} substantive judgments.`);
} else {
  throw new Error('Use --prepare-a, --ingest-a, --prepare-b, or --ingest-b.');
}
