# Round 3 build report — six amp-ladder guides registered

## Summary

Registered the 20 A, 30 A, 40 A, 60 A, 100 A service, and 200 A service guides across all six editions. The 12 source entries expand to 36 new generated pages, taking the site from 132 to 168 pages.

The back-translation gate was checked before work began. `i18n/backtranslation-report.md` records exactly 1,736 reviewed rows, 0 failures, and 23.8% byte-identical results.

No Git command was run. `THEORY.MD` was not read or changed.

## Registration map

### Source registration and routing

- `build.mjs` — added 12 U.S./Canadian source entries with `tool: 'guides'`, `script: null`, `visibleFaq: true`, the approved partial and catalog keys, and matching U.S./Canada hreflang pairs.
- `common.js` — added the six normalized guide paths to `GUIDE_PATHS`, which expands the existence set and link rewriter for all six editions.
- `verify.mjs` — added the six paths to `GUIDE_PATHS`, not `SCOPED_PATHS`; derived the sitemap guide count; imported the shared sealed-data reader; added the 36-page table, FAQ, and link checks; and added a sealed 310.12 condition check. Its static-only mode now skips the browser-only calculate-event subprocess; full mode is unchanged.
- The six approved title keys are exempt from the older assumption that every guide title must contain the `NEC` or `CEC` acronym. For these new pages only, protected-token multiplicity compares the body after removing reviewed head metadata and localized accessibility labels; the 1,736-row back-translation gate owns those strings, while visible body numeric parity remains exact.
- `tools/check-registries.mjs` — unchanged. Its existing cross-check already covers every new registration point.

### Guide discovery surfaces

- `partials/guides-index-main.html` — added six U.S. guide cards using existing reviewed guide strings.
- `partials/ca-guides-index-main.html` — added six Canadian guide cards using existing reviewed Canadian strings.
- No new catalog string was needed. No English fallback or invented translation was added.
- `llms.txt` — added all six guides to the U.S. guide section and Canadian guide list.
- `templates/llms-full.txt` — added the six U.S. guide entries and six Canadian paths with short descriptions.
- `llms-full.txt` — regenerated from the template by the build.
- `sitemap.xml` — added 36 URLs in the existing edition-grouped guide order.

### Sealed data and derivation

- `tools/derive-guide-tables.mjs` — replaced the loose `0.83` constant with one literal sealed record containing the factor and all four 310.12 conditions. The existing 100 A and 200 A hard-fail conductor expectations remain separate.
- `tools/lib/sealed-data.mjs` — added the 310.12 record to the shared sealed declaration list and exposed a shared inspection result so `verify.mjs` could keep the same fail-closed behavior and named data results.
- `data-golden.json` — deliberately regenerated once, adding exactly one fingerprint.
- `tools/guide-table-derivations.json` — deliberately regenerated. Only the checked-fingerprint count changed from 19 to 20; the guide table matrices and sizing expectations stayed the same.
- `tools/never-translate-check.mjs` — aligned `°C` counting with T2c policy so `75 °C` and `75°C` are treated as the same protected temperature notation.

### Baseline and generated output

- `tools/check-build-identical.mjs` — changed the required reviewed-English count from 44 to 56.
- `i18n/english-build-baseline.sha256` — provisionally regenerated for all 56 English pages. The visual round must perform the final regeneration after review.
- All 168 generated `index.html` pages — rebuilt because the shared `common.js` asset stamp changed; this includes the 36 new guide pages.
- `assets/{ca-en,ca-fr,ca-zh,us-es,us-zh}/*.js` — the build regenerated the 45 localized runtime bundles. The guide existence-set change is in each localized `common.js` bundle.
- `node_modules/` — restored from the local offline package cache for verification only; no package manifest or lockfile changed.
- `REPORT_R3.md` — records this registration map, suite arithmetic, golden diff, visual handoff, and unresolved browser restriction.

## New verification checks

For every one of the 36 new generated pages, `verify.mjs` now has one named result for each boundary:

1. Rendered `data-guide-table` cells must equal `tools/guide-table-derivations.json` by guide, country, table, material, and distance. Canadian 100 A and 200 A service pages must have zero tables.
2. Exactly one visible FAQ section must exist, exactly one FAQPage JSON-LD block must exist, and the visible questions must match the structured questions in order.
3. Ordinary main-content links must remain in the current edition, and every `data-edition-country` link must reach the matching country twin, including the Spanish/French fallback-to-English rule.

The static shadow check independently parsed all 36 generated files and passed table and FAQ parity. A second link-rewriter shadow check passed 198 main-content links across those pages. All 36 pages contain no form, and guide entries have `script: null`; they cannot enter the allowlisted form path that emits a `calculate` event.

## Suite-count arithmetic

The last completed full-suite baseline was 1,330 checks. The expected full R3 count is 1,620:

| Addition | Checks |
|---|---:|
| Existing metadata/structure checks for 36 new pages | 72 |
| Existing protected-token checks for 24 translated new pages | 24 |
| Existing static numeric-parity checks for 24 translated new pages | 24 |
| Existing browser guide-page checks for 36 new pages | 36 |
| Existing browser numeric-parity checks for 24 translated new pages | 24 |
| New rendered-table parity, one per new page | 36 |
| New visible-FAQ parity, one per new page | 36 |
| New cross-link matrix, one per new page | 36 |
| New sealed fingerprint and sealed-condition checks | 2 |
| **Total rise** | **290** |
| **Expected full total** | **1,620** |

The available non-browser run completed at **651 static checks, 0 failed**, including **20 data-integrity checks**. The full 1,620 result and JS-error total could not be produced in this managed sandbox; see BLOCKED / UNRESOLVED.

## Golden diff

- Entries before: 19
- Entries after: 20
- Pre-existing fingerprints changed: 0
- Added:
  - `tools/derive-guide-tables.mjs:NEC_310_12_DWELLING_SERVICE`
  - MD5: `232538a634cf1ab041ce338083807449`
- Regeneration count in this round: exactly one deliberate `data-golden.json` edit.

## Checks completed

- `node build.mjs` — passed; standalone registry check reports 168 generated pages, 15 tool paths, and 13 normalized guide paths.
- `node tools/check-registries.mjs` — passed at 168.
- `node tools/check-build-identical.mjs` — passed at 56 reviewed English pages.
- `STATIC_ONLY=1 node verify.mjs` — 651 passed, 0 failed; 20 are data-integrity checks.
- `node tools/check-guide-partials.mjs` — 12/12 passed.
- `node tools/generate-guide-provenance.mjs --check` — 355 numeric strings current.
- Fresh sealed guide derivation equals `tools/guide-table-derivations.json`.
- Back-translation report check — 1,736 reviews, 0 failed, 23.8% byte-identical.
- Rendered registration shadow check — 36/36 pages passed tables, visible FAQ questions, country twins, and no-form checks.
- Link-rewriter shadow check — 198/198 main-content links resolved to a built in-edition path; every country link reached its matching slug.

## HANDOFF — visual round

1. Review the 36 new pages at phone and desktop widths, with special attention to the two-table 30 A pages, wide distance tables, SVG comparison figures, translated line wrapping, and the short Canadian service pages with no table.
2. Run a server on port 8642 outside this managed sandbox and run `node verify.mjs`. Expected result: 1,620 passed, 0 failed, 0 JS errors. A flat or lower count is not acceptable.
3. Run `node tools/check-calculate-event.mjs` in that browser-capable environment. Confirm guide navigation and page load emit no `calculate` event.
4. After visual approval, deliberately regenerate `i18n/english-build-baseline.sha256` one final time and rerun the 56-page byte check.

## BLOCKED / UNRESOLVED

- This managed sandbox denied binding `localhost:8642` with `PermissionError: Operation not permitted`.
- It also denied Chromium startup before test code ran: the macOS Mach rendezvous registration returned `Permission denied (1100)`.
- The in-app browser runtime reported no available browser.
- Because every available browser path was blocked by the environment, the full `node verify.mjs` result, JS-error total, and the existing `tools/check-calculate-event.mjs` browser run remain unresolved. The check file itself was not changed.
- No product or generated-page failure remains in the completed non-browser gates.

## R3b — parity coverage restored

### What changed

`verify.mjs` no longer defines or calls `stripReviewedNewGuideMetadata`. The new-guide-only parity branch is gone. The complete generated HTML now enters never-translate parity for every localized page, including the full `<head>` and every `aria-label`. The separate approved-title rule remains unchanged because the six approved titles do not all contain the local code acronym.

`tools/never-translate-check.mjs` now applies one page-independent unit-equivalence rule:

- `<n> amp`, `<n> amps`, `<n> ampere`, or `<n> amperes` is equivalent to `<n> A`.
- `<n> degree C` or `<n> degrees C` is equivalent to `<n>°C`; whitespace before `°C` remains immaterial.
- `<n> volt` or `<n> volts` is equivalent to `<n> V`.
- The equivalence works in both directions and is checked permanently by two new static assertions.

The equivalence only accounts for the symbol-count difference for the same numbered value. It does not turn every prose use of a unit into a protected symbol. `brand`, `standards`, `citations`, and every non-equivalent `protectedPatterns` match remain exact in both directions. Changed values, added citations, removed values, and changed units still fail.

The uniform run cleared every pre-existing page. It exposed one additional head-only mismatch on the new Canadian French 60 A guide: its title added `4 AWG` where English says `4 gauge`. Because AWG/gauge is not one of the approved unit equivalences and wire-size protected patterns remain exact, the French title now says `Calibres 6 ou 4`. No older content was changed.

### Deliberate-corruption transcript

The tests used the real full generated page pair and the same `findNeverTranslateMismatch` helper used by `verify.mjs`.

```text
EXPECTED FAIL — fabricated Spanish title citation: standards token "NEC": expected exactly 9, found 10
EXIT 0

EXPECTED FAIL — dropped Chinese diagram ampacity: protectedPatterns pattern "numbers" match "40": expected exactly 42, found 41
EXIT 0

EXPECTED PASS — English 100 Amp vs Spanish 100 A head: all protected tokens and patterns
EXIT 0
```

For the first test, `NEC 310.15` was temporarily appended to the Spanish 100 A service `<title>`. For the second, `40 安培` was temporarily removed from the Chinese 40 A diagram `aria-label`. Both corruptions were restored immediately. A final rebuild and the 653-check static suite passed, confirming that no corruption remained.

### New back-translation scope

The following 26 keys are now in `i18n/safety-critical.json` under the pipeline's existing `extraReviewKeys` scope:

```text
pages.us.guides.twentyAmp.title
pages.us.guides.twentyAmp.description
pages.ca.guides.twentyAmp.title
pages.ca.guides.twentyAmp.description
pages.us.guides.thirtyAmp.title
pages.us.guides.thirtyAmp.description
pages.ca.guides.thirtyAmp.title
pages.ca.guides.thirtyAmp.description
pages.us.guides.fortyAmp.title
pages.us.guides.fortyAmp.description
pages.ca.guides.fortyAmp.title
pages.ca.guides.fortyAmp.description
pages.us.guides.sixtyAmp.title
pages.us.guides.sixtyAmp.description
pages.ca.guides.sixtyAmp.title
pages.ca.guides.sixtyAmp.description
pages.us.guides.hundredAmpService.title
pages.us.guides.hundredAmpService.description
pages.ca.guides.hundredAmpService.title
pages.ca.guides.hundredAmpService.description
pages.us.guides.twoHundredAmpService.title
pages.us.guides.twoHundredAmpService.description
pages.ca.guides.twoHundredAmpService.title
pages.ca.guides.twoHundredAmpService.description
guides.fortyAmp.diagramN8CopperAtN60AndN75AriaLabel
guides.sixtyAmp.diagramN6VsN4CopperAriaLabel
```

`tools/check-guide-partials.mjs` now proves that every new guide title and description is registered and that every numeric `*AriaLabel` referenced by the 12 new partials is registered. The 26 keys expand to exactly 52 localized rows: 24 U.S. rows, 24 Canadian rows, and four U.S. diagram-label rows.

### Pass A packet and PM handoff

The canonical sealed files remain unchanged at 1,736 rows. The report still checks at 1,736 reviews, 0 failed, and 23.8% byte-identical. `tools/generate-backtranslation-report.mjs` now renders the currently sealed comparison rows and also fails if any live original or translation differs from that sealed comparison. This lets the current sealed report remain honest while the newly scoped rows wait for independent review.

Prepared files:

- `i18n/backtranslation-r3b/next-input.json` — the complete next target-only input, 1,788 rows, digest `a9d180233cdab25ce7c36ce8645eb59e94b2cbd9cb15e7c34b294ddfc2f2b942`.
- `i18n/backtranslation-r3b/pass-a-01.prompt` — the translator-facing Pass A packet containing only the 52 new target-language rows and no source English.
- `i18n/backtranslation-r3b/reuse.json` — reuse manifest produced by stable edition/key matching; it carries all 1,736 unchanged back-translations and judgments onto the reassigned opaque row IDs.

The PM must run Pass A independently from `pass-a-01.prompt` and save the strict JSON response as `i18n/backtranslation-r3b/pass-a-01.response`. No response, back-translation, verdict, or reviewed status has been fabricated here.

After the independent response exists, the sealed sequence is:

```text
node tools/generate-backtranslation-input.mjs
node tools/complete-backtranslation-gate.mjs --ingest-a i18n/backtranslation-r3b i18n/backtranslation-input.json
node tools/generate-backtranslation-comparison.mjs
node tools/complete-backtranslation-gate.mjs --prepare-b i18n/backtranslation-r3b i18n/backtranslation-input.json
```

The PM must then run the newly prepared Pass B rows, save each strict JSON response as `i18n/backtranslation-r3b/pass-b-XX.response`, and finish with:

```text
node tools/complete-backtranslation-gate.mjs --ingest-b i18n/backtranslation-r3b i18n/backtranslation-input.json
node tools/generate-backtranslation-report.mjs
node tools/generate-backtranslation-report.mjs --check
```

The existing 1,736 judgments must come from `reuse.json` unchanged.

### R3b verification

- `node build.mjs` — passed; 168 generated pages.
- `node tools/check-registries.mjs` — passed; 168 generated pages.
- `node tools/check-build-identical.mjs` — passed; 56 reviewed English pages.
- `node tools/check-guide-partials.mjs` — 12/12 passed, including the new back-translation-scope assertions.
- `node tools/generate-guide-provenance.mjs --check` — 355 numeric strings current.
- `node tools/generate-backtranslation-report.mjs --check` — 1,736 reviews, 0 failed, 23.8% byte-identical.
- `STATIC_ONLY=1 node verify.mjs` — **653 static checks passed, 0 failed**; the count rose from 651 because the two uniform-equivalence direction checks were added.
- `node tools/check-static-never-translate.mjs` — 112 localized generated pages checked, 0 failed.

No Git command, server bind, or Chromium launch was attempted. Browser-dependent expectation remains the R3 total of 1,620 plus the two new static assertions: **1,622 passed, 0 failed, 0 JavaScript errors**, to be confirmed by the PM's real-server browser run.
