/* Merge REVIEWED tool translations into the locale catalogs.

   Shared by the landscape and solar tools:
     node tools/apply-tool-translations.mjs landscape [--check]
     node tools/apply-tool-translations.mjs solar     [--check]

   Why this exists instead of `node tools/generate-locales.mjs`: that generator is
   currently stale and destructive — on a pristine main it rewrites ~96 reviewed
   values per locale into mangled half-English and drops 44 keys (see
   PROJECT_CONTEXT.md). This tool touches ONLY landscape keys, so nothing else in
   the catalogs can move.

   It is also the gate. Every check below refuses to write rather than shipping a
   defect, because the failure mode here is silent: a page that looks finished
   with a safety instruction missing in three languages. That already happened
   once on this project (the Canadian marrette instruction), which is why the
   checks are hard failures and not warnings.

   --check validates and reports without writing.
*/
import { readFileSync, writeFileSync } from 'fs';

const LOCALES = ['es', 'fr-CA', 'zh-Hans'];
const checkOnly = process.argv.includes('--check');
const tool = process.argv[2];
const TOOLS = {
  landscape: { bank: 'i18n/landscape-translations.json', navKey: 'nav.landscapeLighting' },
  solar: { bank: 'i18n/solar-translations.json', navKey: 'nav.solarBattery' },
};
if (!TOOLS[tool]) {
  console.error(`Usage: node tools/apply-tool-translations.mjs <${Object.keys(TOOLS).join('|')}> [--check]`);
  process.exit(1);
}

const en = JSON.parse(readFileSync('i18n/strings/en.json', 'utf8'));
const reviewed = JSON.parse(readFileSync(TOOLS[tool].bank, 'utf8'));
const never = JSON.parse(readFileSync('i18n/never-translate.json', 'utf8'));

const valueAt = (source, key) => key.split('.').reduce((cursor, part) => cursor?.[part], source);

// Every landscape-owned key in the English catalog.
const englishKeys = [
  ...Object.keys(en[tool]).map((k) => `${tool}.${k}`),
  ...Object.keys(en.runtimePatterns[tool]).map((k) => `runtimePatterns.${tool}.${k}`),
  ...Object.keys(en.runtime[tool]).map((k) => `runtime.${tool}.${k}`),
  ...Object.keys(en.pages.us[tool]).map((k) => `pages.us.${tool}.${k}`),
  TOOLS[tool].navKey,
];

// Tokens that must survive verbatim into every language.
/* ⚠️ "V" is NOT in i18n/never-translate.json — the volt symbol is unprotected on
   a voltage-drop site, while VA, kVA, kW and mL are all listed. Found by
   deliberately injecting "15 voltios" for "15 V" and watching the gate stay
   silent. Protected here locally rather than by editing never-translate.json,
   because that file feeds never-translate parity checks across every page in six
   editions and those cannot be re-run until the full build is green. Promoting
   "V" into never-translate.json is its own small, verifiable change. */
const protectedTokens = [
  ...never.brand, ...never.standards, ...never.citations,
  ...never.wireAndCableDesignations, ...never.unitSymbols, ...never.contextualUnitSymbols,
  'V',
];
const placeholdersIn = (value) => (value.match(/\{[A-Za-z]+\}/g) ?? []).sort().join(',');

/* Counting a protected token is not a substring search, and getting that wrong
   makes the gate useless by crying wolf: plain `includes` matched the ampere
   symbol inside "A daisy chain", metres inside "material", and feet inside
   "afterwards" — 90 false alarms on the first run.
     - A single-letter unit (A, V, m, W) only counts as a unit when it follows a
       number or a {placeholder}, which is how units actually appear.
     - "%" likewise.
     - Everything else (AWG, NEC, VA, kcmil, Rule 8-102, VoltDrop…) counts on
       word boundaries, so "ft" no longer hides inside "afterwards". */
const occurrences = (text, token) => {
  if (token === '%') return (text.match(/[\d}]\s*%/g) ?? []).length;
  if (/^[A-Za-z]$/.test(token)) {
    return (text.match(new RegExp(`[\\d}]\\s*${token}(?![A-Za-z])`, 'g')) ?? []).length;
  }
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'g')) ?? []).length;
};

const problems = [];
for (const locale of LOCALES) {
  const bank = reviewed[locale];
  if (!bank) { problems.push(`${locale}: no bank in landscape-translations.json`); continue; }

  for (const key of englishKeys) {
    const source = valueAt(en, key);
    const target = bank[key];

    if (typeof target !== 'string' || target.trim() === '') {
      problems.push(`${locale} ${key}: MISSING translation`);
      continue;
    }

    if (placeholdersIn(source) !== placeholdersIn(target)) {
      problems.push(`${locale} ${key}: placeholder mismatch — English has [${placeholdersIn(source)}], translation has [${placeholdersIn(target)}]`);
    }

    for (const token of protectedTokens) {
      if (occurrences(source, token) > 0 && occurrences(target, token) === 0) {
        problems.push(`${locale} ${key}: protected token "${token}" is in the English but missing from the translation`);
      }
    }

    /* An untranslated leftover reads as finished work. Short strings and symbols
       are legitimately identical across languages ("V", "ft", "Hub", "—",
       "{volts} V"), so only flag real prose. */
    const isProse = source.replace(/\{[A-Za-z]+\}/g, '').trim().length > 25;
    if (isProse && source === target) {
      problems.push(`${locale} ${key}: IDENTICAL to English — looks untranslated`);
    }
  }

  const spare = Object.keys(bank).filter((key) => !englishKeys.includes(key));
  for (const key of spare) problems.push(`${locale} ${key}: translated but no such English key (dead string)`);
}

if (problems.length) {
  console.error(`REFUSING TO WRITE — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`${tool}: validated ${englishKeys.length} keys × ${LOCALES.length} locales — no problems`);

if (checkOnly) {
  console.log('--check: nothing written');
  process.exit(0);
}

/* Locale catalogs are FLAT: "landscape.someKey": "…". Merge only our keys, then
   write with the same formatting the file already uses so the diff stays to
   exactly the lines we own. */
for (const locale of LOCALES) {
  const path = `i18n/strings/${locale}.json`;
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  const before = Object.keys(catalog).length;

  for (const key of englishKeys) catalog[key] = reviewed[locale][key];

  // Safety-critical keys drive the back-translation review set. Landscape copy is
  // full of instructions and limits, so register ours rather than relying on an
  // English keyword scan that cannot see a translated page.
  const meta = catalog._meta ?? {};
  const existing = new Set(meta.safetyCriticalKeys ?? []);
  const safetyPattern = /\b(?:must|should|limit|maximum|minimum|do not|don't|not rated|required|warning|always|keep|safe|mandatory|exceed|overheat|danger|shorten|increase|reduce|cannot)\b/i;
  for (const key of englishKeys) {
    if (safetyPattern.test(valueAt(en, key))) existing.add(key);
  }
  meta.safetyCriticalKeys = [...existing].sort();
  catalog._meta = meta;

  const sorted = Object.fromEntries(
    Object.entries(catalog).sort(([a], [b]) => (a === '_meta' ? -1 : b === '_meta' ? 1 : a.localeCompare(b))),
  );
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`${locale}: ${before} → ${Object.keys(sorted).length} keys`);
}
