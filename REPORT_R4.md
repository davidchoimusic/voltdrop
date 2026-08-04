# Round 4 report — visual-round content fixes

## Summary

All three screenshot-found content defects are fixed. No new guide text was added, no reviewed guide sentence was rewritten, and no translation was invented. The work only moved existing reviewed answer strings, copied already-reviewed sibling headings, and narrowed one FAQ link in markup.

No Git command was run. `THEORY.MD` was not read or changed.

## Defect 1 — the 30 A distance heading

The retired `distanceTablesHeading` key was replaced by `distanceChangesTheAnswerHeading` in both 30 A namespaces. Every target value is byte-for-byte identical to the named sibling value.

| Edition / locale | Before | After | Copied from |
|---|---|---|---|
| U.S. English | Voltage belongs in the table heading | Distance changes the answer | `guides.twentyAmp.distanceChangesTheAnswerHeading` |
| U.S. Spanish | La tensión va en el encabezado de la tabla | La distancia cambia la respuesta | `guides.twentyAmp.distanceChangesTheAnswerHeading` |
| U.S. Chinese | 表格标题里必须标清电压 | 距离会改变答案 | `guides.twentyAmp.distanceChangesTheAnswerHeading` |
| Canadian English | Voltage belongs in the table heading | Distance changes the answer — and Rule 8-102 is mandatory | `guides.ca.fortyAmp.distanceChangesTheAnswerHeading` |
| Canadian French | La tension doit figurer dans le titre du tableau | La distance change la réponse — et la Rule 8-102 est obligatoire | `guides.ca.fortyAmp.distanceChangesTheAnswerHeading` |
| Canadian Chinese | 电压就该写在表格标题里 | 距离会改变答案——Rule 8-102 是强制的 | `guides.ca.fortyAmp.distanceChangesTheAnswerHeading` |

The copies were made in `i18n/strings/en.json`, the three translated catalogs, `i18n/guide-translations.json`, and the matching fleet-staging records. The old key is gone from the partials, catalogs, translation bundle, staging bundle, and provenance record.

A generated-page grep across every edition found zero copies of the old English wording.

## Defect 2 — the short answer now leads with the answer

The following reviewed headline strings moved from each intro subtitle to the first paragraph under the short-answer heading:

| Guide | U.S. headline | Canadian headline |
|---|---|---|
| 20 A | `theEverydayAnswerIsN12AWG` | `theCanadianAnswerIsN12AWGCopper` |
| 30 A | `theStartingAnswerIsN10AWG` | `theCanadianStartingAnswerIsN10AWG` |
| 40 A | `theAnswerIsN8AWGCopper` | `theCanadianAnswerIsN8AWGCopper` |
| 60 A | `theAnswerSplitsAtTheTemperatureColumn` | `theCanadianAnswerStartsAtN4AWG` |

In all eight partials, the previous supporting sentence remains as the second paragraph. Each intro subtitle now contains only the existing country-twin link. That subtitle is visually spare, but it is a clear compact navigation row; no filler was added.

The targeted rendered check covered all six language editions of the eight U.S./Canadian sources: 24 of 24 pages put the headline in the first short-answer paragraph, retained the supporting sentence second, removed the headline from the subtitle, and rendered both strings exactly once.

### Duplicate-render finding for 40 A and 60 A

The suspected supporting-sentence duplication was not present before this fix and is not present after it.

- U.S. 40 A: `temperatureColumnBody` appeared once under the short-answer heading. The later `temperatureColumnHeading` led directly into the diagram; it did not repeat that paragraph.
- U.S. 60 A: `theN75CTableGivesN6CopperBody` appeared once under the short-answer heading. The later `theN6VsN4DivideHeading` led directly into the diagram; it did not repeat that paragraph.
- Canadian 40 A: the short-answer support is `terminationRuleBody`; the later section uses the different `terminationMethodBody` string.
- Canadian 60 A: the short-answer support is `theN60CTableGivesN6OnlyBody`; the later section uses the different `theN6VsN4DivideBody` string.

The 24-page rendered check confirms each headline and each supporting sentence appears exactly once in visible page content.

## Defect 3 — the 100 A FAQ link

The full reviewed `subPanelGuideAnswer` sentence remains unchanged in English, Spanish, and Chinese. A template marker now finds the already-reviewed `subPanelGuide` value inside that sentence and wraps only that substring in the anchor. Matching is case-insensitive so the reviewed Spanish sentence can keep its lowercase “guía” while the standalone guide-name key keeps its initial capital.

The visible FAQ and its structured FAQ data still contain the same complete sentence. The build guard now ignores inline anchor tags when comparing visible FAQ text with structured data.

A scan of all 36 new generated pages found no other FAQ answer shaped as one whole anchor. The reported page was the only occurrence. The final rendered check passed the guide-name-only link in all three U.S. language editions.

## Generated output and final baseline

`node build.mjs` rebuilt all 168 registered pages and regenerated `llms-full.txt`. The final English baseline was deliberately refreshed for the nine changed English pages: the eight branch-circuit pages and the U.S. 100 A service page. The baseline still contains exactly 56 reviewed English pages.

Guide provenance was regenerated after the Canadian 30 A heading key changed. It is current at 356 numeric guide strings; the rise from 355 is the copied heading's reviewed `8-102` token under its new namespace.

## Checks

- `node build.mjs` — passed; all 168 registered pages rebuilt.
- `node tools/check-registries.mjs` — passed at 168 generated pages.
- `node tools/check-build-identical.mjs` — passed at 56 reviewed English pages after the final regeneration.
- `node tools/check-guide-partials.mjs` — 12/12 passed.
- `node tools/generate-guide-provenance.mjs --check` — current at 356 numeric strings.
- `STATIC_ONLY=1 node verify.mjs` — 653 static checks passed, including 20 data-integrity checks; 0 failed. The count rose from R3's 651 and did not fall.
- `node tools/generate-backtranslation-report.mjs --check` — 1,736 reviews, 0 failed, 23.8% byte-identical.
- Targeted rendered structure check — 24/24 localized branch pages passed; 36/36 new pages had no whole-answer FAQ anchor; 3/3 localized U.S. 100 A links were guide-name-only.
- Generated-page grep for the retired English wording — 0 matches.

## BLOCKED

None. No requested fix required new English guide text.
