import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  findNeverTranslateMismatch,
  formatNeverTranslateMismatch,
} from './never-translate-check.mjs';

const neverTranslate = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));
const localizedEditions = [
  { prefix: 'es', twin: '' },
  { prefix: 'zh', twin: '' },
  { prefix: 'ca-fr', twin: 'ca' },
  { prefix: 'ca-zh', twin: 'ca' },
];

const stripParityExemptElements = (html) => html.replace(
  /<([a-z][\w:-]*)\b(?=[^>]*\bdata-parity-exempt(?:\s|=|>))[^>]*>[\s\S]*?<\/\1\s*>/gi,
  ' ',
);

const indexFilesBelow = (directory) => {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...indexFilesBelow(path));
    else if (entry.name === 'index.html') files.push(path);
  }
  return files;
};

let checked = 0;
let failures = 0;
for (const edition of localizedEditions) {
  for (const localizedFile of indexFilesBelow(edition.prefix)) {
    const pathWithinEdition = relative(edition.prefix, localizedFile);
    const twinFile = edition.twin
      ? join(edition.twin, pathWithinEdition)
      : pathWithinEdition;
    const source = stripParityExemptElements(readFileSync(twinFile, 'utf8'));
    const target = stripParityExemptElements(readFileSync(localizedFile, 'utf8'));
    const mismatch = findNeverTranslateMismatch(source, target, neverTranslate);
    checked += 1;
    const ok = !mismatch;
    console[ok ? 'log' : 'error'](
      `${ok ? 'PASS' : 'FAIL'} ${localizedFile} static never-translate parity: `
      + formatNeverTranslateMismatch(mismatch),
    );
    if (!ok) failures += 1;
  }
}

console[failures ? 'error' : 'log'](
  `Static never-translate parity checked ${checked} generated pages `
  + `across ${localizedEditions.length} localized editions; ${failures} failed.`,
);
if (failures) process.exit(1);
