import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  findNeverTranslateMismatch,
  formatNeverTranslateMismatch,
} from './never-translate-check.mjs';

export const checkRuntimeNeverTranslate = () => {
  const neverTranslate = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));
  const runtimeFiles = Object.keys(JSON.parse(readFileSync('i18n/runtime-map.json', 'utf8')));
  const localizedEditions = ['us-es', 'us-zh', 'ca-fr', 'ca-zh'];
  const results = [];

  for (const edition of localizedEditions) {
    for (const file of runtimeFiles) {
      const source = readFileSync(file, 'utf8');
      const localized = readFileSync(`assets/${edition}/${file}`, 'utf8');
      const mismatch = findNeverTranslateMismatch(source, localized, neverTranslate);
      results.push({
        name: `${edition}/${file} runtime never-translate parity`,
        ok: !mismatch,
        detail: formatNeverTranslateMismatch(mismatch),
      });
    }
  }

  return { results, runtimeFiles, localizedEditions };
};

const run = () => {
  const { results, runtimeFiles, localizedEditions } = checkRuntimeNeverTranslate();
  const failures = results.filter(({ ok }) => !ok).length;
  for (const { name, ok, detail } of results) {
    console[ok ? 'log' : 'error'](`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }
  console[failures ? 'error' : 'log'](
    `Runtime never-translate parity checked ${results.length} edition × bundle pairs `
    + `(${runtimeFiles.length} bundles across ${localizedEditions.length} localized editions); `
    + `${failures} failed.`,
  );
  return failures;
};

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) process.exitCode = run() ? 1 : 0;
