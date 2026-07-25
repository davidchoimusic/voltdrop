import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'i18n/english-build-baseline.sha256');
const lines = readFileSync(manifestPath, 'utf8').trim().split('\n');
const entries = lines.map((line) => {
  const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
  if (!match) throw new Error(`Invalid baseline line: ${line}`);
  return { expected: match[1], file: match[2] };
});

if (entries.length !== 21) {
  throw new Error(`Expected 21 generated English pages in the baseline, found ${entries.length}`);
}

let failures = 0;
for (const { expected, file } of entries) {
  const actual = createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');
  if (actual !== expected) {
    console.error(`FAIL byte-identical: ${file}`);
    console.error(`  expected ${expected}`);
    console.error(`  actual   ${actual}`);
    failures += 1;
  }
}

if (failures) {
  console.error(`Byte-identical build check failed for ${failures} of ${entries.length} pages.`);
  process.exit(1);
}

console.log(`PASS byte-identical US English build: all ${entries.length} generated pages match the reviewed Stage-2 SHA-256 baseline.`);
