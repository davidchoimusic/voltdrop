import { readFileSync, writeFileSync } from 'node:fs';

const english = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const glossary = JSON.parse(readFileSync('i18n/glossary.json', 'utf8'));
const never = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));
const outputFile = 'i18n/guide-translations.json';

const flatten = (source, prefix = '', output = {}) => {
  for (const [key, value] of Object.entries(source || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') output[path] = value;
    else flatten(value, path, output);
  }
  return output;
};

const sourceStrings = flatten(english);
const usChunks = [
  {
    id: 'index-subpanel',
    sections: [['index', 'index'], ['subPanel', 'subpanel']],
  },
  {
    id: '50amp-ampacity',
    sections: [['fiftyAmp', '50amp'], ['ampacityChart', 'ampacity']],
  },
  {
    id: '12gauge-voltage',
    sections: [['twelveGauge', '12gauge'], ['voltageDrop', 'vdformula']],
  },
];
const caChunks = usChunks;
const jobs = [];
for (const [edition, locale, language, chunks] of [
  ['us', 'es', 'Latin American / U.S. trade Spanish', usChunks],
  ['us', 'zh-Hans', 'Simplified Chinese for electricians in the United States', usChunks],
  ['ca', 'fr-CA', 'Quebec French for Canadian electricians', caChunks],
  ['ca', 'zh-Hans', 'Simplified Chinese for electricians in Canada', caChunks],
]) {
  for (const chunk of chunks) {
    const guideRoot = edition === 'ca' ? 'guides.ca' : 'guides';
    jobs.push({
      id: `${edition}-${locale}-${chunk.id}`,
      edition,
      locale,
      language,
      prefixes: chunk.sections.flatMap(([catalogSection]) => [
        `${guideRoot}.${catalogSection}.`,
        `pages.${edition}.guides.${catalogSection}.`,
      ]),
      templates: chunk.sections.map(([, fileSection]) =>
        fileSection === 'index'
          ? `partials/${edition === 'ca' ? 'ca-' : ''}guides-index-main.html`
          : `partials/${edition === 'ca' ? 'ca-' : ''}guide-${fileSection}-main.html`),
    });
  }
}

const numericTokens = (value) => value.match(/#?\d+(?:[.,/-]\d+)*/g) || [];
const sameNumbers = (source, target) =>
  JSON.stringify(numericTokens(source).sort()) === JSON.stringify(numericTokens(target).sort());
const protectedLiterals = [
  ...never.brand,
  ...never.standards,
  ...never.citations,
  ...never.wireAndCableDesignations,
  ...never.unitSymbols,
].sort((left, right) => right.length - left.length);
const countLiteral = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
};

const parseObject = (raw) => {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error(`Translator returned no JSON object:\n${raw.slice(0, 500)}`);
  return JSON.parse(cleaned.slice(first, last + 1));
};

const existing = (() => {
  try {
    return JSON.parse(readFileSync(outputFile, 'utf8'));
  } catch {
    return { _meta: { generatedBy: 'tools/generate-guide-translations.mjs' } };
  }
})();

const jobId = process.argv[3];
const job = jobs.find((candidate) => candidate.id === jobId);
if (!job) {
  throw new Error(`Choose a translation job: ${jobs.map(({ id }) => id).join(', ')}`);
}
const strings = Object.fromEntries(Object.entries(sourceStrings)
  .filter(([key]) => job.prefixes.some((prefix) => key.startsWith(prefix))));
const templateContext = job.templates
  .map((file) => `\n--- ${file} ---\n${readFileSync(file, 'utf8')}`)
  .join('');
const prompt = `Translate every value in SOURCE_STRINGS into ${job.language}.

This is language-only work. The country and electrical rules are already correct and MUST NOT change.
Return one strict JSON object with exactly the same keys and no commentary or Markdown.

Rules:
- Preserve every number byte-for-byte, including decimal points, slashes, minus signs, and number signs.
- Preserve all standard names, rule citations, wire types, units, brands, formulas, HTML, and emoji byte-for-byte.
- Preserve each value's leading/trailing spaces and punctuation because neighboring fragments join in the supplied HTML.
- Use the glossary's exact target-language term every time its concept appears.
- Keep the original meaning, force, negation, limits, and boundary words. Do not add facts.
- Write natural jobsite language for a working electrician, not word-for-word machine prose.
- FAQ answers, titles, and descriptions must read naturally and retain the local standard name.

LOCKED_GLOSSARY:
${JSON.stringify(glossary.terms)}

NEVER_TRANSLATE:
${JSON.stringify({ brand: never.brand, standards: never.standards, citations: never.citations, wireAndCableDesignations: never.wireAndCableDesignations, unitSymbols: never.unitSymbols })}

SOURCE_STRINGS:
${JSON.stringify(strings)}

HTML_CONTEXT:
${templateContext}`;

if (process.argv[2] === '--prepare') {
  const promptFile = process.argv[4];
  if (!promptFile) throw new Error('Pass a temporary prompt file path.');
  writeFileSync(promptFile, prompt);
  console.log(`prepared ${job.id}: ${Object.keys(strings).length} strings`);
} else if (process.argv[2] === '--ingest') {
  const responseFile = process.argv[4];
  if (!responseFile) throw new Error('Pass the temporary translator response file path.');
  const translated = parseObject(readFileSync(responseFile, 'utf8'));
  const expectedKeys = Object.keys(strings).sort();
  const actualKeys = Object.keys(translated).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
    throw new Error(`${job.id} returned the wrong key set (${actualKeys.length} for ${expectedKeys.length}).`);
  }
  for (const key of expectedKeys) {
    if (typeof translated[key] !== 'string' || !translated[key]) {
      throw new Error(`${job.id}:${key} is empty or not a string.`);
    }
    if (!sameNumbers(strings[key], translated[key])) {
      throw new Error(`${job.id}:${key} changed a number.\nEN: ${strings[key]}\nTR: ${translated[key]}`);
    }
    const changedLiteral = protectedLiterals.find((token) =>
      countLiteral(strings[key], token) !== countLiteral(translated[key], token));
    if (changedLiteral) {
      throw new Error(`${job.id}:${key} changed protected token ${changedLiteral}.\nEN: ${strings[key]}\nTR: ${translated[key]}`);
    }
  }
  existing[job.id] = translated;
  writeFileSync(outputFile, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`translated ${job.id}: ${expectedKeys.length} guide strings`);
} else {
  throw new Error('Use --prepare or --ingest.');
}
