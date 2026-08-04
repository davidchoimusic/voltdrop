import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const SEALED_DECLARATIONS = Object.freeze([
  ['app.js', 'WIRE_TABLE'], ['app.js', 'K_FACTOR'],
  ['ampacity.js', 'AMPACITY'], ['ampacity.js', 'SMALL_CAP'],
  ['ampacity.js', 'AMBIENT_CORRECTION'], ['ampacity.js', 'CONDUCTOR_ADJUSTMENT'],
  ['ampacity.js', 'CEC_AMBIENT_CORRECTION'], ['ampacity.js', 'CEC_CONDUCTOR_ADJUSTMENT'],
  ['conduit.js', 'THHN_AREA'], ['conduit.js', 'CONDUIT'],
  ['conduit.js', 'CEC_CONDUCTOR_AREA'], ['conduit.js', 'CEC_CONDUIT'],
  ['boxfill.js', 'VOL_PER_CONDUCTOR'], ['boxfill.js', 'BOXES'],
  ['boxfill.js', 'CEC_VOL_ML'],
  ['landscape.js', 'WIRE_TABLE'], ['landscape.js', 'K_FACTOR'],
  ['solar.js', 'WIRE_TABLE'], ['solar.js', 'K_FACTOR'],
]);

const declarationKey = (file, name) => `${file}:${name}`;

export function verifyGoldenFingerprints({
  goldenFile = 'data-golden.json',
  declarations = SEALED_DECLARATIONS,
} = {}) {
  const golden = JSON.parse(readFileSync(goldenFile, 'utf8'));
  const checked = [];
  const failures = [];

  for (const [file, name] of declarations) {
    const source = readFileSync(file, 'utf8');
    const match = source.match(new RegExp(`const ${name} = [\\s\\S]*?\\n[}\\]];`));
    const key = declarationKey(file, name);
    if (!match) {
      failures.push(`${key}: declaration not found`);
      continue;
    }
    const actual = createHash('md5').update(match[0]).digest('hex');
    if (golden[key] !== actual) {
      failures.push(`${key}: ${actual} != ${golden[key] ?? 'missing golden'}`);
      continue;
    }
    checked.push(key);
  }

  if (failures.length) {
    throw new Error(`SEALED DATA FINGERPRINT CHECK FAILED\n${failures.map((item) => `- ${item}`).join('\n')}`);
  }
  return checked;
}

export function readSealedConstant(file, name, declarations = SEALED_DECLARATIONS) {
  const sealed = declarations.some(([sealedFile, sealedName]) =>
    sealedFile === file && sealedName === name);
  if (!sealed) throw new Error(`Requested unsealed data: ${declarationKey(file, name)}`);

  return readLiteralConstant(file, name);
}

export function readLiteralConstant(file, name) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
  if (!match) throw new Error(`Cannot read literal constant ${name} from ${file}`);
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractFunctionSource(file, name) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Cannot find function ${name} in ${file}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = open; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index++;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index++;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index++;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Cannot parse function ${name} in ${file}`);
}

export function readBrowserFunctions(specifications) {
  const sources = specifications.map(([file, name]) => extractFunctionSource(file, name));
  const names = specifications.map(([, name]) => name);
  return Function(`"use strict";\n${sources.join('\n\n')}\nreturn { ${names.join(', ')} };`)();
}
