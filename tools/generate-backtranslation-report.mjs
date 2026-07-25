import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const english = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const registry = JSON.parse(readFileSync('i18n/safety-critical.json', 'utf8'));
const reviewKeys = [...registry.keys, ...(registry.extraReviewKeys ?? [])];
const never = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));
const passAInput = JSON.parse(readFileSync('i18n/backtranslation-input.json', 'utf8'));
const passAOutput = JSON.parse(readFileSync('i18n/backtranslations.json', 'utf8'));
const review = JSON.parse(readFileSync('i18n/backtranslation-review.json', 'utf8'));
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
  { id: 'us-es', label: 'US Spanish', country: 'us', locale: 'es' },
  { id: 'us-zh', label: 'US Simplified Chinese', country: 'us', locale: 'zh-Hans' },
  { id: 'ca-fr', label: 'Canada Quebec French', country: 'ca', locale: 'fr-CA' },
  { id: 'ca-zh', label: 'Canada Simplified Chinese', country: 'ca', locale: 'zh-Hans' },
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
const plain = (value) => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const cell = (value) => plain(value).replace(/\|/g, '\\|');
const bytesEqual = (left, right) => Buffer.from(plain(left)).equals(Buffer.from(plain(right)));
const numberTokens = (value) => plain(value).match(/#?\d+(?:[.,/-]\d+)*/g) || [];
const literalCount = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
};
const unitCountsMatch = (source, target) => never.unitSymbols.every((unit) =>
  literalCount(source, unit) === literalCount(target, unit));

const expectedDigest = createHash('sha256')
  .update(JSON.stringify(passAInput.entries))
  .digest('hex');
if (passAInput.targetDigest !== expectedDigest) {
  throw new Error('Pass A input digest is invalid; regenerate the target-only input.');
}
if (passAOutput.targetDigest !== passAInput.targetDigest) {
  throw new Error('Pass A output is stale; its target digest does not match the target-only input.');
}
const actualBacktranslationDigest = createHash('sha256')
  .update(JSON.stringify(passAOutput.entries))
  .digest('hex');
if (passAOutput.backtranslationDigest !== actualBacktranslationDigest) {
  throw new Error('Pass A output digest is invalid; the saved back-translations changed after sealing.');
}

const backById = new Map(passAOutput.entries.map((entry) => [entry.id, entry.backTranslation]));
const reviewById = new Map(review.entries.map((entry) => [entry.id, entry]));
if (passAOutput.entries.length !== passAInput.entries.length || backById.size !== passAInput.entries.length) {
  throw new Error(`Pass A row count mismatch: ${passAOutput.entries.length} outputs (${backById.size} unique) for ${passAInput.entries.length} inputs.`);
}
if (review.targetDigest !== passAInput.targetDigest || review.backtranslationDigest !== passAOutput.backtranslationDigest) {
  throw new Error('Pass B review is stale; regenerate it from the current originals and Pass A output.');
}
if (review.entries.length !== passAInput.entries.length || reviewById.size !== passAInput.entries.length) {
  throw new Error(`Pass B row count mismatch: ${review.entries.length} reviews (${reviewById.size} unique) for ${passAInput.entries.length} inputs.`);
}

const lines = [
  '# Safety-string back-translation report',
  '',
  'Scope: every tool, legal, metadata, runtime, and Stage-3 guide string classified as an instruction, warning, or stated limit, plus selected high-exposure copy.',
  '',
  'Pass A rendered English from the target-language-only packet in `i18n/backtranslation-input.json`.',
  'That packet contains no source English and uses opaque row IDs. Its saved output is',
  '`i18n/backtranslations.json`. Pass B then compared those saved renderings with the originals',
  'and recorded a row-specific meaning judgment in `i18n/backtranslation-review.json`.',
  '',
];

let rowIndex = 0;
let reviewed = 0;
let failed = 0;
let identical = 0;
const verdictCounts = new Map();
for (const edition of editions) {
  lines.push(`## ${edition.label}`, '', '| Key | Original English | Translation | Independent back-translation | Verdict |', '|---|---|---|---|---|');
  for (const key of reviewKeys) {
    if (!keyApplies(key, edition.country)) continue;
    const pack = packs[edition.country];
    const original = pack.strings[key] ?? valueAt(english, key);
    if (typeof original !== 'string' || original === '') continue;
    const translation = pack.strings[key] !== undefined
      ? pack.localizedStrings[edition.locale][key]
      : valueAt(catalogs[edition.locale], key);
    const input = passAInput.entries[rowIndex];
    if (!input || input.locale !== edition.locale || input.targetText !== translation) {
      throw new Error(`Target-only row alignment failed at ${edition.id}:${key}.`);
    }
    const backTranslation = backById.get(input.id);
    const judgment = reviewById.get(input.id);
    const numbersOk = JSON.stringify(numberTokens(original).sort()) === JSON.stringify(numberTokens(translation).sort());
    const unitsOk = unitCountsMatch(original, translation);
    const reviewOk = judgment?.status === 'PASS' && typeof judgment.verdict === 'string' && judgment.verdict.length >= 24;
    const ok = typeof backTranslation === 'string' && backTranslation.length > 0 && numbersOk && unitsOk && reviewOk;
    if (bytesEqual(original, backTranslation)) identical += 1;
    reviewed += 1;
    if (!ok) failed += 1;
    const verdict = !numbersOk
      ? 'FAIL — number mismatch between the original and translation.'
      : !unitsOk
        ? 'FAIL — unit mismatch between the original and translation.'
        : judgment
          ? `${judgment.status} — ${judgment.verdict}`
          : 'FAIL — missing substantive Pass B judgment.';
    verdictCounts.set(verdict, (verdictCounts.get(verdict) || 0) + 1);
    lines.push(`| \`${key}\` | ${cell(original)} | ${cell(translation)} | ${cell(backTranslation)} | ${cell(verdict)} |`);
    rowIndex += 1;
  }
  lines.push('');
}

const contaminationRate = reviewed ? identical / reviewed : 1;
const contaminated = contaminationRate > 0.6;
const mostRepeatedVerdict = Math.max(0, ...verdictCounts.values());
const boilerplateRate = reviewed ? mostRepeatedVerdict / reviewed : 1;
const boilerplate = boilerplateRate > 0.6;
lines.push(
  '## Summary',
  '',
  `- ${reviewed} localized safety-string reviews recorded.`,
  `- ${identical} back-translations were byte-identical to source English (${(contaminationRate * 100).toFixed(1)}%).`,
  `- ${failed} failed structural or meaning review.`,
  `- Contamination alarm threshold: more than 60.0% byte-identical (${contaminated ? 'FAILED' : 'passed'}).`,
  `- Verdict boilerplate alarm: the most repeated exact verdict appears ${mostRepeatedVerdict} times (${(boilerplateRate * 100).toFixed(1)}%; ${boilerplate ? 'FAILED' : 'passed'}).`,
  '- Safe/unsafe direction, maximum/minimum force, required/advised force, boundary inclusion, every number, and every unit were reviewed.',
  '',
);
const renderedReport = `${lines.join('\n')}\n`;
if (process.argv.includes('--check')) {
  const savedReport = readFileSync('i18n/backtranslation-report.md', 'utf8');
  if (savedReport !== renderedReport) {
    console.error('BACK-TRANSLATION REPORT STALE: regenerate i18n/backtranslation-report.md.');
    process.exit(1);
  }
} else {
  writeFileSync('i18n/backtranslation-report.md', renderedReport);
}
console.log(`back-translation report: ${reviewed} reviews, ${failed} failed, ${(contaminationRate * 100).toFixed(1)}% byte-identical`);
if (contaminated) {
  console.error('BACK-TRANSLATION CONTAMINATION: more than 60% of Pass A output is byte-identical to the source English.');
  process.exit(1);
}
if (boilerplate) {
  console.error('BACK-TRANSLATION VERDICTS ARE BOILERPLATE: one exact verdict was reused for more than 60% of rows.');
  process.exit(1);
}
if (failed) process.exit(1);
