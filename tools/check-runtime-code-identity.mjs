import { readFileSync } from 'fs';
import {
  extractRuntimeCodeStrings,
  localizeRuntimeSource,
} from './runtime-code-boundary.mjs';

const runtimeMap = JSON.parse(readFileSync('i18n/runtime-map.json', 'utf8'));
const editions = ['us-es', 'us-zh', 'ca-en', 'ca-fr', 'ca-zh'];
let failures = 0;
let checked = 0;

// Boundary proof: an identical English word can be translated as displayed
// copy while remaining unchanged when it is an element ID.
const boundaryExample = "const label = 'current'; $('current').textContent = label;";
const boundaryOutput = localizeRuntimeSource({
  source: boundaryExample,
  file: 'boundary-example.js',
  entries: [{ key: 'example.current', kind: 'quoted', quote: "'" }],
  englishFor: () => 'current',
  localizedFor: () => 'corriente',
  quoteLike: (value, quote) => `${quote}${value}${quote}`,
  localize: true,
});
if (boundaryOutput !== "const label = 'corriente'; $('current').textContent = label;") {
  console.log(`FAIL runtime display/code boundary: ${boundaryOutput}`);
  failures++;
} else {
  console.log('PASS runtime display/code boundary: copy translates while the matching ID does not');
}
try {
  localizeRuntimeSource({
    source: "$('voltage').value;",
    file: 'code-only-example.js',
    entries: [{ key: 'example.voltage', kind: 'quoted', quote: "'" }],
    englishFor: () => 'voltage',
    localizedFor: () => 'tensión',
    quoteLike: (value, quote) => `${quote}${value}${quote}`,
    localize: true,
  });
  console.log('FAIL runtime code-only boundary: translated identifier entered the catalog');
  failures++;
} catch {
  console.log('PASS runtime code-only boundary: translated identifier is rejected at build time');
}

for (const edition of editions) {
  for (const file of Object.keys(runtimeMap)) {
    const source = extractRuntimeCodeStrings(readFileSync(file, 'utf8'));
    const localized = extractRuntimeCodeStrings(
      readFileSync(`assets/${edition}/${file}`, 'utf8'),
    );
    checked++;

    const maximum = Math.max(source.length, localized.length);
    for (let index = 0; index < maximum; index++) {
      const expected = source[index];
      const actual = localized[index];
      if (expected?.category === actual?.category && expected?.raw === actual?.raw) continue;
      failures++;
      console.log(
        `FAIL runtime code changed: assets/${edition}/${file} item ${index + 1}`
        + `\n  source: ${expected ? `${expected.category} ${expected.raw} (line ${expected.line})` : '(missing)'}`
        + `\n  built:  ${actual ? `${actual.category} ${actual.raw} (line ${actual.line})` : '(missing)'}`,
      );
    }
  }
}

if (failures) {
  console.log(`\nRuntime code identity failed: ${failures} divergence(s) in ${checked} bundle files.`);
  process.exit(1);
}

console.log(`PASS runtime code identity: ${checked} localized bundle files match their English sources`);
