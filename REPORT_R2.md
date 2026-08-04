# Round 2 build report — 100 A and 200 A service guides

## Summary

Built four unregistered English guide partials:

- `partials/guide-100amp-service-main.html`
- `partials/ca-guide-100amp-service-main.html`
- `partials/guide-200amp-service-main.html`
- `partials/ca-guide-200amp-service-main.html`

Added only the requested English catalog namespaces and page metadata. The U.S. guides show the NEC 310.12 arithmetic, all four conditions, the plain 310.16 contrast, verified 240 V distance tables, visible FAQs, matching FAQPage JSON-LD, calculator links, sub-panel routing, and U.S.–Canada country links. The Canadian guides publish no Canadian service-conductor size; they explain the verification limit and route readers to the Canadian Ampacity Check tool and sub-panel guide.

Extended the guide derivation, numeric-provenance generator, stored manifests, and focused checker. All 12 R1/R2 partials now pass the same placeholder, FAQ, table, provenance, public-wording, repeated-role, and structural-attribute checks.

No translated catalog, registration file, published page list, `data-golden.json`, or `THEORY.MD` was deliberately changed. No Git command was run.

## Decisions

### Dwelling-service derivation

`tools/derive-guide-tables.mjs` now owns `NEC_310_12_DWELLING_SERVICE_FACTOR = 0.83`. Its code comment carries the four required limits: whole-dwelling service/feeder only, 100–400 A only, no adjustment or correction factors, and 75 °C-or-better conductors with NM/Romex excluded.

The tool scans the verified 75 °C ampacity column from smallest to largest. It hard-fails unless all four expected NEC 310.12 results match:

- 100 A: 4 AWG copper at 85 A; 2 AWG aluminum at 90 A.
- 200 A: 2/0 AWG copper at 175 A; 4/0 AWG aluminum at 180 A.

It separately derives the plain 75 °C Table 310.16 contrast:

- 100 A: 3 AWG copper at 100 A; 1 AWG aluminum at 100 A.
- 200 A: 3/0 AWG copper at 200 A; 250 kcmil aluminum at 205 A.

The tool also proves that the next smaller conductor fails each search. The 0.83 factor remains outside `data-golden.json` as directed.

### Distance tables

The U.S. tables use 240 V, full service rating, 3% calculated voltage drop, and one-way distances of 50, 100, 150, 200, 250, and 300 feet. Each cell chooses the larger of the dwelling-service ampacity minimum and the voltage-drop minimum from the verified calculator.

- 100 A copper: 4, 4, 2, 1, 1/0, 2/0. Aluminum: 2, 2, 1/0, 2/0, 3/0, 4/0.
- 200 A copper: 2/0, 2/0, 2/0, 3/0, 4/0, 250 kcmil. Aluminum: 4/0, 4/0, 4/0, 250, 300, 400 kcmil.

Every table uses literal `data-guide-table="240v"`, stable literal distance attributes, and material/column attributes. The Canadian guides have no table because no Canadian service-sizing rule has been verified here; the checker rejects a table if one is added to either Canadian R2 partial.

### On-page safety boundary

Both U.S. pages show the factor instead of applying it silently. Literal condition markers let the focused checker require all four conditions in order. The checker also requires each page's visible dwelling arithmetic and plain-table contrast to contain the freshly derived rating, required ampacity, conductor sizes, and 75 °C ampacities.

The 100 A page makes the service-versus-sub-panel fork explicit and sends non-whole-dwelling feeder work to the existing sub-panel guide. The 200 A page reconciles the common 2/0 copper, 3/0 copper, and 4/0 aluminum answers by naming the method behind each one. Neither page discusses grounding, bonding, meter bases, SER treatment, or other unverified service-entrance details.

### Canadian scope

The Canadian pages stay short. They identify the U.S. 83% method as U.S.-only context, say that Canadian dwelling services use their own Section 8 calculated-load process, decline to publish a Canadian conductor size, and route a proposed conductor to Ampacity Check. U.S. sizes appear only while explaining why they do not transfer to Canada.

### Keys and provenance

New keys follow the R1b role-based convention. Structural identifiers remain outside the catalog. Table values use the existing `tdN*` pattern. FAQ JSON uses `{{json:…}}`; country links use literal paths and `data-edition-country`.

`tools/generate-guide-provenance.mjs` now covers `hundredAmpService` and `twoHundredAmpService` in both guide and page-metadata namespaces. The manifest grew from 262 to 355 classified numeric strings. Distance cells, ampacity results, shown arithmetic, and approved constants remain separate provenance categories.

## Unverified code claims

None. Every U.S. numeric service-size claim comes from the new 0.83 → verified 75 °C ampacity derivation or the existing voltage-drop calculation. The Canadian Section 8 scope wording comes from the approved brief and does not state a Canadian size or invent a rule number. Aluminum discussion is qualitative.

## Safety-critical candidates

Add these U.S. keys to the later translation-review gate:

- `guides.hundredAmpService.shortAnswerBody`
- `guides.hundredAmpService.dwellingArithmeticBody`
- `guides.hundredAmpService.wholeDwellingCondition`
- `guides.hundredAmpService.rangeCondition`
- `guides.hundredAmpService.noDeratingCondition`
- `guides.hundredAmpService.temperatureMethodCondition`
- `guides.hundredAmpService.standardSizingBody`
- `guides.hundredAmpService.standardArithmeticBody`
- `guides.hundredAmpService.distanceBody`
- `guides.hundredAmpService.onlyQualifyingDwellingAnswer`
- `guides.hundredAmpService.notForRomexAnswer`
- `guides.twoHundredAmpService.theThreeAnswersBody`
- `guides.twoHundredAmpService.dwellingArithmeticBody`
- `guides.twoHundredAmpService.standardArithmeticBody`
- `guides.twoHundredAmpService.wholeDwellingCondition`
- `guides.twoHundredAmpService.rangeCondition`
- `guides.twoHundredAmpService.noDeratingCondition`
- `guides.twoHundredAmpService.temperatureMethodCondition`
- `guides.twoHundredAmpService.distanceBody`
- `guides.twoHundredAmpService.twoN0OrThreeN0ForkAnswer`
- `guides.twoHundredAmpService.useN4N0WhenConditionsPassAnswer`
- `guides.twoHundredAmpService.n4N0DwellingAnswer`
- `guides.twoHundredAmpService.notForRomexAnswer`

Add these Canadian scope keys to the same review:

- `guides.ca.hundredAmpService.shortAnswerBody`
- `guides.ca.hundredAmpService.scopeBody`
- `guides.ca.hundredAmpService.siteCanCheckBody`
- `guides.ca.hundredAmpService.noVerifiedCanadianEquivalentAnswer`
- `guides.ca.hundredAmpService.useLocalServiceDesignAnswer`
- `guides.ca.twoHundredAmpService.shortAnswerBody`
- `guides.ca.twoHundredAmpService.scopeBody`
- `guides.ca.twoHundredAmpService.siteCanCheckBody`
- `guides.ca.twoHundredAmpService.noVerifiedCanadianEquivalentAnswer`
- `guides.ca.twoHundredAmpService.useLocalServiceDesignAnswer`

Also include every `guides.{hundredAmpService,twoHundredAmpService}.tdN*` table-cell key. Numeric parity must remain exact.

## Handoff

A later registration/translation round must:

- Register `guides/100-amp-service-wire-size` and `guides/200-amp-service-wire-size` for U.S. and Canadian editions with `visibleFaq: true`.
- Add the new paths to the runtime and verification page lists, sitemap, `llms.txt`, and `templates/llms-full.txt`, then update the registry and reviewed-English baseline only after review.
- Add both guide namespaces and all four partials to locale discovery and guide-translation generation; populate reviewed Spanish, Chinese, and Canadian French strings rather than shipping English fallback.
- Add the safety-critical keys above to `i18n/safety-critical.json` and run the full translation/back-translation gates.
- Extend rendered-page verification to compare the registered tables against `tools/guide-table-derivations.json`.
- Seal the 0.83 factor and its four conditions into `data-golden.json` through the planned two-step protocol. This R2 source record is step 1; deliberate golden regeneration remains for the later round.

## Blocked

None. The verified 75 °C table produced all four required NEC 310.12 results exactly.

## Verification

- `node tools/derive-guide-tables.mjs | cmp - tools/guide-table-derivations.json` — passed; stored and fresh derivations are identical.
- `node tools/generate-guide-provenance.mjs --check` — passed; 355 numeric strings classified and current.
- `node tools/check-guide-partials.mjs` — passed; 12/12 partials.
- `node build.mjs` — passed.
- `node tools/check-build-identical.mjs` — passed; all 44 reviewed English pages are byte-identical.
- `node tools/check-registries.mjs` — passed; 132 generated pages.

Public-wording sweep over the four new guide namespaces and four new page-metadata namespaces:

```sh
jq -r '
  .guides as $guides |
  .pages as $pages |
  ["hundredAmpService", "twoHundredAmpService"][] as $guide |
  $guides[$guide][], $guides.ca[$guide][], $pages.us.guides[$guide][], $pages.ca.guides[$guide][]
' i18n/strings/en.json | rg -n -i '\b(repo|engine|sealed|partial|registry)\b'
```

Output: empty.

Out-of-scope service-topic sweep over the four new partials for grounding, bonding, ground-wire, meter-base, service-entrance, and SER-cable wording: empty.
