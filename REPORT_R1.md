# Round 1 build report — branch-circuit amp guides

## Summary

Built the eight unregistered English partials for 20 A, 30 A, 40 A, and 60 A, with U.S. and Canadian editions. Each partial has a direct answer, ampacity explanation, engine-derived distance table, shown math, calculator links, visible FAQ, matching FAQPage JSON-LD, scope notes, and a country-twin link.

Added the requested English catalog namespaces and page metadata only. No translated catalog, country pack, registry, generated page, sealed data, baseline, or publication file was deliberately changed.

Added:

- `tools/lib/sealed-data.mjs`: shared reader for browser-file constants and functions, plus the golden-fingerprint check.
- `tools/derive-guide-tables.mjs`: calls the shipped combined wire-size engine and writes the structured guide → edition → table → material → distance → AWG matrix.
- `tools/guide-table-derivations.json`: stored derivation output.
- `tools/generate-guide-provenance.mjs` and `tools/guide-provenance.json`: explicit numeric-token classifications for every numeric English string in the new guide and metadata namespaces.
- `tools/check-guide-partials.mjs`: renders each unregistered partial and checks placeholders, FAQ parity/JSON, stable table shape and values, and numeric provenance.

## Decisions

### Table columns

- 20 A / 120 V: 50, 100, 150, 200, 250, and 300 one-way feet. The copper row visibly steps from #10 through #3, with more than the required two changes.
- 30 A / 240 V and 120 V: 50, 100, 150, 200, and 250 one-way feet. Five columns keep the two-table page compact while making the 120 V versus 240 V difference unmistakable.
- 40 A / 240 V: 50, 100, 150, 200, 250, and 300 one-way feet.
- 60 A / 240 V: 50, 100, 150, 200, 250, and 300 one-way feet.
- Canadian headings use the existing metric-first pairs: 15 m / 50 ft, 30 m / 100 ft, 46 m / 150 ft, 61 m / 200 ft, 76 m / 250 ft, and 91 m / 300 ft. The stable `data-distance-ft` value remains the exact engine input in both editions.

### Ampacity settings and aluminum rows

Every table uses single-phase AC, the full guide rating, a 3% target, 30°C ambient, three current-carrying conductors, and 90°C insulation. The U.S. edition uses 75°C terminations. The Canadian edition uses the repo's conservative 60°C termination method for equipment at 100 A or less, matching its existing CEC 4-006 copy.

- 20 A: copper only. Small-gauge aluminum branch wiring was excluded as not jobsite-realistic for this page. The decision is stated beside the table and readers are routed to Ampacity Check for another wiring method.
- 30 A: aluminum included. The sealed data makes #8 aluminum pass at both the Canadian 60°C setting and U.S. 75°C setting. The page tells readers to confirm conductor, terminal, and equipment compatibility.
- 40 A and 60 A: aluminum included because the sealed ampacity table supports it. The engine correctly exposes edition differences caused by the chosen termination limit: Canadian 40 A aluminum starts at #6, and Canadian 60 A starts at #4 copper / #3 aluminum.

### Key naming

The existing names are mechanically derived from their English text: camel-case words, `N` before numeric runs, punctuation removed, `AND` for an explicit conjunction symbol, and role suffixes such as `Title`, `Heading`, `Question`, `Answer`, and `Continuation`. Table cells follow the existing `tdN8` / `tdN1N0` pattern. `{{json:…}}` is used in FAQ JSON-LD and `{{attr:…}}` for translated attribute values. `generate-locales.mjs` discovers keys from placeholders but does not generate the key names, so the new keys follow the established mechanical convention directly.

## Unverified code claims

None. Code-specific claims in these partials have repo precedent in the 50-amp, ampacity, voltage-drop, sub-panel, and NEC-vs-CEC copy. The TT-30 120 V statement and the listed job examples came from the approved build brief; they are product/application facts, not new code citations.

## Safety-critical candidates

Add these English keys to the later translation-review gate, together with every derived table-cell key used by its partial:

- `guides.twentyAmp.nECN240N4DCapsN14AWG`
- `guides.twentyAmp.forOrdinaryN20AmpBranchCircuitsAnswer`
- `guides.twentyAmp.workedExampleBody`
- `guides.ca.twentyAmp.ruleN14N104CapsN14AWG`
- `guides.ca.twentyAmp.forOrdinaryN20AmpBranchCircuitsAnswer`
- `guides.ca.twentyAmp.workedExampleBody`
- `guides.thirtyAmp.theStartingAnswerIsN10AWG`
- `guides.thirtyAmp.aluminumDecisionBody`
- `guides.thirtyAmp.noN12AWGCopperIsCappedAnswer`
- `guides.thirtyAmp.aTTN30IsAN120VAnswer`
- `guides.thirtyAmp.workedExampleBody`
- `guides.ca.thirtyAmp.theCanadianStartingAnswerIsN10AWG`
- `guides.ca.thirtyAmp.aluminumDecisionBody`
- `guides.ca.thirtyAmp.noN12AWGCopperIsCappedAnswer`
- `guides.ca.thirtyAmp.aTTN30IsAN120VAnswer`
- `guides.ca.thirtyAmp.workedExampleBody`
- `guides.fortyAmp.temperatureColumnBody`
- `guides.fortyAmp.jobsBody`
- `guides.fortyAmp.aN32AContinuousChargerMathAnswer`
- `guides.fortyAmp.yesAtOrdinaryConditionsAnswer`
- `guides.fortyAmp.workedExampleBody`
- `guides.ca.fortyAmp.terminationRuleBody`
- `guides.ca.fortyAmp.minimumSizeAtN240VBody`
- `guides.ca.fortyAmp.jobsBody`
- `guides.ca.fortyAmp.aN40AConductorLimitSupportsAnswer`
- `guides.ca.fortyAmp.workedExampleBody`
- `guides.sixtyAmp.theAnswerSplitsAtTheTemperatureColumn`
- `guides.sixtyAmp.theN75CTableGivesN6CopperBody`
- `guides.sixtyAmp.jobsBody`
- `guides.sixtyAmp.aN48AContinuousChargerMathAnswer`
- `guides.sixtyAmp.workedExampleBody`
- `guides.ca.sixtyAmp.theCanadianAnswerStartsAtN4AWG`
- `guides.ca.sixtyAmp.theN60CTableGivesN6OnlyBody`
- `guides.ca.sixtyAmp.jobsBody`
- `guides.ca.sixtyAmp.aN60AConductorLimitSupportsAnswer`
- `guides.ca.sixtyAmp.workedExampleBody`

Table cells to include: every `guides[.ca].{twentyAmp,thirtyAmp,fortyAmp,sixtyAmp}.tdN*` key referenced by the eight partials. Numeric parity must remain exact during translation.

## Handoff

Registration and translation were intentionally deferred. A later round must:

- Register all eight pages in `build.mjs`, with `visibleFaq: true`, the new page metadata, and the intended slugs.
- Add all edition paths to `common.js` and `verify.mjs`; have `verify.mjs` import the shared reader in `tools/lib/sealed-data.mjs`, replacing its duplicated sealed-reader/fingerprint block, and assert every rendered `data-guide-table` cell against `tools/guide-table-derivations.json`.
- Add the pages to `sitemap.xml`, `llms.txt`, and `templates/llms-full.txt`.
- Update `tools/check-registries.mjs` and `tools/check-build-identical.mjs` for the registered page set.
- Refresh `i18n/english-build-baseline.sha256` only after the registered English build is reviewed.
- Leave `data-golden.json` values unchanged unless an independent data-verification round deliberately changes sealed data. The new derivation tool currently validates all 19 existing fingerprints before producing output.
- Add the four new guide sections to `tools/generate-guide-translations.mjs` and the eight partials to `tools/generate-locales.mjs` discovery, then produce reviewed entries in `i18n/guide-translations.json`.
- Run and update all three back-translation artifacts after translation: the input/comparison/report files used by the current gate.
- Add the safety candidates above to `i18n/safety-critical.json` and complete the translation-review gate.
- Add any required country-pack routing and populate `es.json`, `zh-Hans.json`, and `fr-CA.json`; do not ship English fallback as a completed translation.
- Generate and review the new output pages only after registration. Existing generated pages remain at the 132-page baseline in this round.

## Blocked

None. The sealed engine produced every requested table cell.

## Verification

`node tools/check-guide-partials.mjs`:

```text
PASS partials/guide-20amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/ca-guide-20amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/guide-30amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/ca-guide-30amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/guide-40amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/ca-guide-40amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/guide-60amp-main.html: placeholders, FAQ, tables, provenance
PASS partials/ca-guide-60amp-main.html: placeholders, FAQ, tables, provenance
8/8 guide partials passed
```

Also passed:

- `node tools/derive-guide-tables.mjs` — stdout exactly matches `tools/guide-table-derivations.json`.
- `node build.mjs` — 132 generated pages.
- `node tools/check-registries.mjs` — registry consistency passed at 132 pages.
- `node tools/generate-guide-provenance.mjs --check` — 270 numeric strings classified and current.

## R1b corrections

### Structural table identifiers

All ten catalog-backed table identifiers (five U.S. and five Canadian) were replaced with literal `data-guide-table="120v"` or `data-guide-table="240v"` values in the eight partials. These fully qualified keys were deleted:

- `guides.twentyAmp.n120VId`
- `guides.thirtyAmp.n120VId`
- `guides.thirtyAmp.n240VId`
- `guides.fortyAmp.n240VId`
- `guides.sixtyAmp.n240VId`
- `guides.ca.twentyAmp.n120VId`
- `guides.ca.thirtyAmp.n120VId`
- `guides.ca.thirtyAmp.n240VId`
- `guides.ca.fortyAmp.n240VId`
- `guides.ca.sixtyAmp.n240VId`

`tools/check-guide-partials.mjs` now rejects both catalog-backed `data-guide-table` values and any return of these structural keys.

### Public wording

These 19 existing keys changed value without changing their numeric facts or provenance classification:

- `guides.twentyAmp.workedExampleBody`; `guides.ca.twentyAmp.workedExampleBody`
- `guides.thirtyAmp.aluminumDecisionBody`; `guides.thirtyAmp.minimumSizeBody`; `guides.thirtyAmp.workedExampleBody`
- `guides.ca.thirtyAmp.aluminumDecisionBody`; `guides.ca.thirtyAmp.minimumSizeBody`; `guides.ca.thirtyAmp.workedExampleBody`
- `guides.fortyAmp.temperatureColumnBody`; `guides.fortyAmp.workedExampleBody`
- `guides.ca.fortyAmp.theCanadianAnswerIsN8AWGCopper`; `guides.ca.fortyAmp.terminationRuleBody`; `guides.ca.fortyAmp.workedExampleBody`; `guides.ca.fortyAmp.yesAtOrdinaryConditionsAnswer`
- `guides.sixtyAmp.theN75CTableGivesN6CopperBody`; `guides.sixtyAmp.workedExampleBody`
- `guides.ca.sixtyAmp.theCanadianAnswerStartsAtN4AWG`; `guides.ca.sixtyAmp.theN60CTableGivesN6OnlyBody`; `guides.ca.sixtyAmp.workedExampleBody`

The stable role-based names (`workedExampleBody`, `minimumSizeBody`, and the existing answer/body names) still describe their jobs after the wording pass, so R1's convention does not require mechanical renames. No existing key was renamed.

### Repeated reader sentences

The reported Canadian 60-amp duplication was split: `guides.ca.sixtyAmp.theCanadianAnswerStartsAtN4AWG` remains the one-line subtitle, and new `guides.ca.sixtyAmp.theN6VsN4DivideBody` supplies the divide explanation. The eight-partial sweep found one additional duplicate in the Canadian 40-amp partial; `guides.ca.fortyAmp.theCanadianAnswerIsN8AWGCopper` remains its subtitle, and new `guides.ca.fortyAmp.terminationMethodBody` supplies the body explanation. Both new numeric strings are classified as ampacity derivations. The focused checker now rejects the same full catalog sentence in multiple visible reader roles while allowing table cells, material labels, links, and the visible-FAQ/JSON-LD mirror.

### Updated dependent artifacts

- `tools/guide-provenance.json` regenerated from 270 to 262 numeric strings: ten structural entries removed and two role-specific ampacity entries added.
- `tools/generate-guide-provenance.mjs` classifies both new body keys as ampacity derivations.
- `tools/guide-table-derivations.json` did not change; every electrical value and derivation setting remains identical.

### Internal-word sweep

Command:

```sh
jq -r '
  .guides as $guides |
  ["twentyAmp", "thirtyAmp", "fortyAmp", "sixtyAmp"][] as $guide |
  $guides[$guide][], $guides.ca[$guide][]
' i18n/strings/en.json | rg -i '\b(repo|engine|sealed)\b'
```

Output:

```text
```

### R1b verification

- `node build.mjs` — passed; 132 generated pages.
- `node tools/check-build-identical.mjs` — all 44 reviewed English generated pages are byte-identical.
- `node tools/check-registries.mjs` — registry consistency passed at 132 pages.
- `node tools/derive-guide-tables.mjs` — output remains identical to `tools/guide-table-derivations.json`.
- `node tools/check-guide-partials.mjs` — 8/8 passed.
- `node tools/generate-guide-provenance.mjs --check` — 262 numeric strings classified and current.
