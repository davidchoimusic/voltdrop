import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ORIGIN = 'https://voltdrop.app';
// The comments app is deployed separately and is not part of the static PAGES build.
const SITEMAP_NON_STATIC_URLS = new Set([`${ORIGIN}/comments`]);

const readSource = (file) => readFileSync(join(ROOT, file), 'utf8');

const readArrayDeclaration = (file, name) => {
  const source = readSource(file);
  const marker = `const ${name} =`;
  const declaration = source.indexOf(marker);
  const start = source.indexOf('[', declaration + marker.length);
  if (declaration < 0 || start < 0) {
    throw new Error(`Cannot read ${name} from ${file}`);
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(start, index + 1);
        return Function(`"use strict"; return (${literal});`)();
      }
    }
  }
  throw new Error(`Cannot find the end of ${name} in ${file}`);
};

const isGuide = (page) =>
  page.dir.startsWith('guides') || page.dir.startsWith('ca/guides');

const routeFor = (dir) => `/${dir ? `${dir}/` : ''}`;
const normalizedGuideDir = (dir) => dir.replace(/^ca\//, '');
const sorted = (values) => [...values].sort();
const rootRelative = (file) => relative(ROOT, resolve(ROOT, file)).replaceAll('\\', '/');

const duplicatesIn = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return sorted(duplicates);
};

const compareRegistry = (errors, label, actual, expected) => {
  for (const value of duplicatesIn(actual)) {
    errors.push(`${label} lists ${value} more than once`);
  }
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  for (const value of sorted(expectedSet)) {
    if (!actualSet.has(value)) errors.push(`${label} is missing ${value}`);
  }
  for (const value of sorted(actualSet)) {
    if (!expectedSet.has(value)) errors.push(`${label} lists undeclared path ${value}`);
  }
};

const collectGeneratedIndexes = (dir = ROOT) => {
  const files = [];
  const ignoredDirectories = new Set(['.git', 'node_modules', 'comments-app']);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectGeneratedIndexes(join(dir, entry.name)));
      }
      continue;
    }
    if (entry.isFile() && entry.name === 'index.html') {
      const path = relative(ROOT, join(dir, entry.name));
      if (path !== 'templates/index.html') files.push(path);
    }
  }
  return files;
};

export const checkRegistries = () => {
  const pages = readArrayDeclaration('build.mjs', 'PAGES');
  const editions = readArrayDeclaration('build.mjs', 'EDITIONS');
  const commonTools = readArrayDeclaration('common.js', 'TOOL_PATHS');
  const commonGuides = readArrayDeclaration('common.js', 'GUIDE_PATHS');
  const verifyTools = readArrayDeclaration('verify.mjs', 'SCOPED_PATHS');
  const verifyGuides = readArrayDeclaration('verify.mjs', 'GUIDE_PATHS');
  const localeTemplates = readArrayDeclaration('tools/generate-locales.mjs', 'templateFiles');
  const errors = [];

  for (const dir of duplicatesIn(pages.map((page) => page.dir))) {
    errors.push(`build.mjs PAGES declares ${dir || '/'} more than once`);
  }

  const scopedPages = pages.filter((page) => !isGuide(page));
  const guidePages = pages.filter(isGuide);
  const expectedCommonTools = scopedPages.map((page) => routeFor(page.dir));
  const expectedCommonGuides = sorted(new Set(
    guidePages.map((page) => routeFor(normalizedGuideDir(page.dir))),
  ));
  const expectedVerifyTools = expectedCommonTools.map((path) =>
    path === '/' ? '' : path.slice(1));
  const expectedVerifyGuides = expectedCommonGuides.map((path) => path.slice(1));

  compareRegistry(errors, 'common.js TOOL_PATHS', commonTools, expectedCommonTools);
  compareRegistry(errors, 'common.js GUIDE_PATHS', commonGuides, expectedCommonGuides);
  compareRegistry(errors, 'verify.mjs SCOPED_PATHS', verifyTools, expectedVerifyTools);
  compareRegistry(errors, 'verify.mjs GUIDE_PATHS', verifyGuides, expectedVerifyGuides);

  const llms = readSource('llms.txt');
  for (const page of pages) {
    const pathname = routeFor(page.dir);
    if (!llms.includes(pathname)) {
      errors.push(`llms.txt is missing ${pathname} from build.mjs PAGES`);
    }
  }

  const requiredLocaleTemplates = new Set();
  const collectLocaleTemplate = (file) => {
    const normalized = rootRelative(file);
    if (requiredLocaleTemplates.has(normalized)) return;
    requiredLocaleTemplates.add(normalized);
    const source = readSource(normalized);
    for (const match of source.matchAll(/\{\{>\s*([^{}\s]+)\s*\}\}/g)) {
      collectLocaleTemplate(join(dirname(normalized), match[1]));
    }
  };
  for (const page of pages) {
    if (page.main) collectLocaleTemplate(page.main);
  }
  const localeTemplateSet = new Set(localeTemplates.map(rootRelative));
  for (const file of sorted(requiredLocaleTemplates)) {
    if (!localeTemplateSet.has(file)) {
      errors.push(`tools/generate-locales.mjs templateFiles is missing ${file} required by build.mjs PAGES`);
    }
  }

  const expectedUrls = [];
  const expectedOutput = [];
  for (const edition of editions) {
    for (const page of scopedPages) {
      const pathname = `${edition.prefix}${routeFor(page.dir)}`;
      expectedUrls.push(`${ORIGIN}${pathname}`);
      expectedOutput.push(`${pathname.slice(1)}index.html`);
    }
    const editionGuides = guidePages.filter((page) =>
      (edition.country === 'ca') === page.dir.startsWith('ca/'));
    for (const page of editionGuides) {
      const pathname = `${edition.prefix}${routeFor(normalizedGuideDir(page.dir))}`;
      expectedUrls.push(`${ORIGIN}${pathname}`);
      expectedOutput.push(`${pathname.slice(1)}index.html`);
    }
  }

  const sitemapUrls = [...readSource('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith(ORIGIN) && !SITEMAP_NON_STATIC_URLS.has(url));
  compareRegistry(errors, 'sitemap.xml', sitemapUrls, expectedUrls);

  const generatedIndexes = collectGeneratedIndexes();
  compareRegistry(errors, 'generated output', generatedIndexes, expectedOutput);

  if (errors.length) {
    throw new Error(`Registry consistency check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }
  return {
    pages: expectedOutput.length,
    tools: expectedCommonTools.length,
    guides: expectedCommonGuides.length,
  };
};

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = checkRegistries();
    console.log(`Registry consistency check passed: ${result.pages} generated pages.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
