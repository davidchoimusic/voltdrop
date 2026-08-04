import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROVENANCE_FILE = 'tools/guide-provenance.json';
export const NUMERIC_TOKEN_PATTERN = /#?\d+(?:[.,/-]\d+)*/g;
const GUIDES = ['twentyAmp', 'thirtyAmp', 'fortyAmp', 'sixtyAmp'];
const CATEGORIES = new Set([
  'distance-derivation',
  'ampacity-derivation',
  'visible-arithmetic',
  'approved-constant',
]);

const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') output[path] = child;
    else flatten(child, path, output);
  }
  return output;
};

const isInScope = (key) => GUIDES.some((guide) =>
  key.startsWith(`guides.${guide}.`)
  || key.startsWith(`guides.ca.${guide}.`)
  || key.startsWith(`pages.us.guides.${guide}.`)
  || key.startsWith(`pages.ca.guides.${guide}.`));

const categoryFor = (key) => {
  if (/\.tdN/.test(key) || /\.workedExampleBody$/.test(key)) return 'distance-derivation';
  if (/\.(?:aN32A|aN40A|aN48A|aN60A)/.test(key)
      || /guides(?:\.ca)?\.(?:fortyAmp|sixtyAmp)\.jobsBody$/.test(key)) return 'visible-arithmetic';
  if (/\.(?:aluminumDecisionBody|forOrdinary|nECN240|ruleN14|temperatureColumnBody|terminationMethodBody|theN6VsN4DivideBody|theN75CTable|theN60CTable|theCanadianAnswer|theAnswer|theEverydayAnswer|theStartingAnswer|noN12|yesN12|yesAtOrdinary|startWithN8|aTTN30|whatSizeWireForAN30AmpDryer|itDependsOnTheTemperature|theTerminationColumn|n[468]CopperN|diagram)/.test(key)) {
    return 'ampacity-derivation';
  }
  return 'approved-constant';
};

export function generateGuideProvenance() {
  const catalog = flatten(JSON.parse(readFileSync('i18n/strings/en.json', 'utf8')));
  const entries = {};
  for (const [key, value] of Object.entries(catalog).filter(([key]) => isInScope(key))) {
    const tokens = value.match(NUMERIC_TOKEN_PATTERN) || [];
    if (!tokens.length) continue;
    const category = categoryFor(key);
    if (!CATEGORIES.has(category)) throw new Error(`Invalid category for ${key}: ${category}`);
    entries[key] = { category, tokens };
  }
  return {
    meta: {
      generatedBy: 'tools/generate-guide-provenance.mjs',
      categories: [...CATEGORIES],
      scope: GUIDES,
    },
    entries,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = `${JSON.stringify(generateGuideProvenance(), null, 2)}\n`;
  const check = process.argv.includes('--check');
  if (check) {
    const existing = readFileSync(PROVENANCE_FILE, 'utf8');
    if (existing !== output) throw new Error(`${PROVENANCE_FILE} is stale; regenerate it.`);
    console.log(`guide provenance current: ${Object.keys(JSON.parse(existing).entries).length} numeric strings`);
  } else {
    writeFileSync(PROVENANCE_FILE, output);
    console.log(`wrote ${PROVENANCE_FILE}`);
  }
}
