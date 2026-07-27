import { readdirSync, readFileSync } from 'node:fs';
import { codeStringCategory, scanJavaScriptStrings } from './runtime-code-boundary.mjs';

const english = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const catalogs = {
  es: JSON.parse(readFileSync('i18n/strings/es.json', 'utf8')),
  'fr-CA': JSON.parse(readFileSync('i18n/strings/fr-CA.json', 'utf8')),
  'zh-Hans': JSON.parse(readFileSync('i18n/strings/zh-Hans.json', 'utf8')),
};
const patternGroups = {
  'app.js': 'drop',
  'ampacity.js': 'ampacity',
  'conduit.js': 'conduit',
  'boxfill.js': 'boxFill',
  'power.js': 'power',
  'landscape.js': 'landscape',
  'solar.js': 'solar',
  'wire-colour.js': 'wireColour',
};
const toolFiles = readdirSync('.')
  .filter((file) => file.endsWith('.js') && file !== 'common.js')
  .sort();

let failures = 0;
let checkedPatterns = 0;
const placeholders = (value) =>
  [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((match) => match[1]).sort();

for (const file of toolFiles) {
  const group = patternGroups[file];
  if (!group || !english.runtimePatterns[group]) {
    console.log(`FAIL runtime result pattern registry: ${file} has no whole-pattern catalog group`);
    failures += 1;
    continue;
  }

  const source = readFileSync(file, 'utf8');
  const scanned = scanJavaScriptStrings(source);
  for (const token of scanned.strings) {
    const before = source.slice(0, token.start).match(/\S+\s*$/)?.[0] || '';
    const after = source.slice(token.end).match(/^\s*\S+/)?.[0] || '';
    const touchesPlus = /\+\s*$/.test(before) || /^\s*\+/.test(after);
    if (!touchesPlus || codeStringCategory(source, token)) continue;
    console.log(`FAIL user-facing string concatenation: ${file}:${token.line} ${token.raw}`);
    failures += 1;
  }

  // Dynamic template literals are allowed only for the structural result-grid
  // wrapper. Natural-language templates must use a named whole-string pattern.
  for (const match of source.matchAll(/`[^`]*\$\{[^`]*`/gs)) {
    const compact = match[0].replace(/\s+/g, ' ');
    const structural = compact === '`<div class="result-cell"><div class="k">${k}</div><div class="v">${v}</div></div>`'
      || compact === '`<div class="result-cell"><div class="k">${k}</div><div class="v">${val}</div></div>`';
    if (structural) continue;
    const line = source.slice(0, match.index).split('\n').length;
    console.log(`FAIL user-facing template assembly: ${file}:${line}`);
    failures += 1;
  }

  for (const [name, original] of Object.entries(english.runtimePatterns[group])) {
    const key = `runtimePatterns.${group}.${name}`;
    const expected = placeholders(original);
    if (!expected.length) {
      console.log(`FAIL unnamed runtime pattern: ${key} has no named placeholder`);
      failures += 1;
    }
    for (const [locale, catalog] of Object.entries(catalogs)) {
      const translated = catalog[key];
      if (typeof translated !== 'string') {
        console.log(`FAIL missing runtime pattern: ${locale}:${key}`);
        failures += 1;
        continue;
      }
      const actual = placeholders(translated);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.log(
          `FAIL placeholder parity: ${locale}:${key}`
          + ` expected {${expected.join('}, {')}} got {${actual.join('}, {')}}`,
        );
        failures += 1;
      }
    }
    checkedPatterns += 1;
  }
}

if (failures) {
  console.log(`\nRuntime result-pattern check failed: ${failures} issue(s).`);
  process.exit(1);
}

console.log(
  `PASS runtime result patterns: ${checkedPatterns} whole patterns;`
  + ' no user-facing concatenation or natural-language template assembly',
);
