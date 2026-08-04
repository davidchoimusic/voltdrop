import { readFileSync, writeFileSync } from 'node:fs';

const english = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const glossary = JSON.parse(readFileSync('i18n/glossary.json', 'utf8'));
const never = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));
const outputFile = 'i18n/guide-translations.json';
const fleetStagingFile = 'i18n/fleet-staging.json';

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
  {
    id: '20-30amp',
    sections: [['twentyAmp', '20amp'], ['thirtyAmp', '30amp']],
  },
  {
    id: '40-60amp',
    sections: [['fortyAmp', '40amp'], ['sixtyAmp', '60amp']],
  },
  {
    id: 'services',
    sections: [['hundredAmpService', '100amp-service'], ['twoHundredAmpService', '200amp-service']],
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
const exactProtectedLiterals = [
  ...never.brand,
  ...never.standards,
  ...never.citations,
].sort((left, right) => right.length - left.length);
const noLossWireLiterals = [
  ...never.wireAndCableDesignations,
].sort((left, right) => right.length - left.length);
const noLossUnitLiterals = [
  ...never.unitSymbols,
].sort((left, right) => right.length - left.length);
const contextualUnitLiterals = never.contextualUnitSymbols ?? [];
const countLiteral = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
};
const countUnitLiteral = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?<![\\p{Script=Latin}])${escaped}(?![\\p{Script=Latin}])`, 'gu')) || []).length;
};
const countContextualUnit = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`(?:#?\\d+(?:[.,/-]\\d+)*|\\{[A-Za-z][A-Za-z0-9]*\\})\\s*${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
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

const stringsForJob = (job) => Object.fromEntries(Object.entries(sourceStrings)
  .filter(([key]) => job.prefixes.some((prefix) => key.startsWith(prefix))));

const validateTranslation = (job, strings, translated) => {
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
    const changedLiteral = exactProtectedLiterals.find((token) =>
      countLiteral(strings[key], token) !== countLiteral(translated[key], token));
    if (changedLiteral) {
      throw new Error(`${job.id}:${key} changed protected token ${changedLiteral}.\nEN: ${strings[key]}\nTR: ${translated[key]}`);
    }
    const lostLiteral = noLossWireLiterals.find((token) =>
      countLiteral(strings[key], token) > countLiteral(translated[key], token));
    if (lostLiteral) {
      throw new Error(`${job.id}:${key} lost protected token ${lostLiteral}.\nEN: ${strings[key]}\nTR: ${translated[key]}`);
    }
    const lostUnit = noLossUnitLiterals.find((token) =>
      countUnitLiteral(strings[key], token) > countUnitLiteral(translated[key], token));
    if (lostUnit) {
      throw new Error(`${job.id}:${key} lost protected unit ${lostUnit}.\nEN: ${strings[key]}\nTR: ${translated[key]}`);
    }
    const lostContextualUnit = contextualUnitLiterals.find((token) =>
      countContextualUnit(strings[key], token) > countContextualUnit(translated[key], token));
    if (lostContextualUnit) {
      throw new Error(`${job.id}:${key} lost protected contextual unit ${lostContextualUnit}.\nEN: ${strings[key]}\nTR: ${translated[key]}`);
    }
  }
  return expectedKeys.length;
};

if (process.argv[2] === '--ingest-fleet') {
  const fleet = JSON.parse(readFileSync(fleetStagingFile, 'utf8'));
  const fleetChunkIds = ['20-30amp', '40-60amp', 'services'];
  const fleetJobs = jobs.filter(({ id }) =>
    fleetChunkIds.some((chunkId) => id.endsWith(`-${chunkId}`)));
  const expectedFleetIds = [...new Set(fleetJobs.map(({ edition, locale }) => `${edition}-${locale}`))].sort();
  const actualFleetIds = Object.keys(fleet).sort();
  if (JSON.stringify(expectedFleetIds) !== JSON.stringify(actualFleetIds)) {
    throw new Error(`Fleet staging has the wrong edition set: ${actualFleetIds.join(', ')}.`);
  }

  const pending = {};
  const consumedByFleet = new Map(expectedFleetIds.map((id) => [id, new Set()]));
  for (const job of fleetJobs) {
    const fleetId = `${job.edition}-${job.locale}`;
    const strings = stringsForJob(job);
    const translated = Object.fromEntries(Object.entries(fleet[fleetId])
      .filter(([key]) => job.prefixes.some((prefix) => key.startsWith(prefix))));
    const count = validateTranslation(job, strings, translated);
    for (const key of Object.keys(translated)) consumedByFleet.get(fleetId).add(key);
    pending[job.id] = translated;
    console.log(`validated ${job.id}: ${count} reviewed strings`);
  }
  for (const fleetId of expectedFleetIds) {
    const stagedKeys = Object.keys(fleet[fleetId]).sort();
    const consumedKeys = [...consumedByFleet.get(fleetId)].sort();
    if (JSON.stringify(stagedKeys) !== JSON.stringify(consumedKeys)) {
      throw new Error(`${fleetId} contains rows outside the six registered guide namespaces.`);
    }
  }
  Object.assign(existing, pending);
  writeFileSync(outputFile, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`ingested ${fleetJobs.length} reviewed fleet bundles from ${fleetStagingFile}`);
  process.exit(0);
}

const jobId = process.argv[3];
const job = jobs.find((candidate) => candidate.id === jobId);
if (!job) {
  throw new Error(`Choose a translation job: ${jobs.map(({ id }) => id).join(', ')}`);
}
const strings = stringsForJob(job);
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
  const translatedCount = validateTranslation(job, strings, translated);
  existing[job.id] = translated;
  writeFileSync(outputFile, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`translated ${job.id}: ${translatedCount} guide strings`);
} else {
  throw new Error('Use --prepare, --ingest, or --ingest-fleet.');
}
