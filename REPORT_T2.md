# Round T2 build report — fleet translation ingestion

## Summary

Ingested the reviewed fleet translations for the six new guide namespaces into the durable guide-translation bank, registered all 12 partials for locale discovery, generated the three locale catalogs, and registered every R1/R1b/R2 safety key. No guide page was registered or published in this round. The generated site remains at 132 pages.

The fleet staging file remains in the tree for audit. Its 12 new bundles were validated against the current English key sets before ingestion. Numeric-token parity and protected-token checks ran on all 954 staged strings and hard-fail before a bundle can be written.

No Git command was run. `THEORY.MD` was not touched.

## Translation bundles

The new chunk IDs are:

- `20-30amp` — `twentyAmp` and `thirtyAmp`
- `40-60amp` — `fortyAmp` and `sixtyAmp`
- `services` — `hundredAmpService` and `twoHundredAmpService`

Bundle sizes per translated edition are:

| Edition / locale | `20-30amp` | `40-60amp` | `services` | Total |
|---|---:|---:|---:|---:|
| `us-es` | 82 | 92 | 101 | 275 |
| `us-zh-Hans` | 82 | 92 | 101 | 275 |
| `ca-fr-CA` | 81 | 83 | 38 | 202 |
| `ca-zh-Hans` | 81 | 83 | 38 | 202 |

Re-running `node tools/generate-guide-translations.mjs --ingest-fleet` reproduced `i18n/guide-translations.json` byte-for-byte (`532e55e94a9be1173eb718a733c069a3ad98e3beac31b638064bb7e256ce5bc4`).

## Locale catalogs

The generator discovered the 12 new partials but kept country-only rows out of locales that do not serve that country. Spanish receives the U.S. rows, Canadian French receives the Canadian rows, and Simplified Chinese receives both.

| Catalog | Added keys | Removed keys | Changed existing values | Raw diff |
|---|---:|---:|---:|---|
| `es.json` | 273 | 0 | 0 | 273 added lines, 0 removed lines |
| `zh-Hans.json` | 474 | 0 | 0 | 474 added lines, 0 removed lines |
| `fr-CA.json` | 201 | 0 | 0 | 201 added lines, 0 removed lines |

Three durable staged strings are intentionally absent from the generated catalogs because no partial references them: `guides.twentyAmp.tdN2`, `guides.ca.twentyAmp.tdN2`, and `guides.twentyAmp.uSAnswerLink`. They remain in `i18n/guide-translations.json` for audit and future use. No rough mechanical translation was substituted for them.

The first attempted locale run correctly stopped before overwriting six existing Wire Size metadata values. Their exact reviewed text is now recorded in `i18n/reviewed-legacy.json`, the generator's durable source bank. The U.S. and Canadian country packs are byte-identical to their pre-run snapshots.

### Existing-value fallback and no-op proof

`guardExisting[locale][key]` is the last value source before mechanical translation. It fires only when:

1. the key already exists in the current locale catalog; and
2. none of the durable reviewed sources before it supplies the key — reviewed legacy, pattern, runtime, metadata, safety, tool, legal, core, keyed-exact, landscape/solar, guide-bundle, or keyed word sources.

It does not override a fleet translation: `guideExact` is earlier in the chain. It does not create a translation for a missing key: if the current catalog also lacks the key, the mechanical fallback is reached. Its purpose is to preserve a reviewed value that predates discovery of the template using it. A separate carry-forward pass preserves existing keys that are outside current discovery.

The generator now adds missing catalog rows without rewriting any existing catalog byte. Two consecutive successful runs produced identical bytes for every target the generator writes:

| File | SHA-256 after run 1 and run 2 |
|---|---|
| `i18n/strings/es.json` | `f3aca5f11e47c0bb4f81c5d62a2241fb3c9f79701147c4d5cae215603c122c04` |
| `i18n/strings/zh-Hans.json` | `a3fcd172f2048067b38badbf7d443a0c90f2a31a1b3ed2310784ba18b69c6f58` |
| `i18n/strings/fr-CA.json` | `cf2ca91c6376bbf7810c0a6faa7a269c08d7932b7db03bb5825cfd003e7d055e` |
| `i18n/country-packs/us.json` | `8b0b2335eb5febf7bbfd5d413c4f96a22a4e2439e9eff1a7bbbbb9e4c08700ad` |
| `i18n/country-packs/ca.json` | `31bd45ac2a33246d5e5deaaf52124eb2d4989fad05178a0074e5f8de6a144a1a` |
| `i18n/safety-critical.json` | `82f22d51a39466732b602544fa43b96c6408c4f350b3ef04191e63e928f5633e` |

## Safety-critical registry

The registry grew from 422 to 557 keys: 135 additions and no removals. The additions are the 69 named R1/R2 candidates, 64 table-cell keys actually referenced by the 12 partials, and the two R1b split-body keys `guides.ca.fortyAmp.terminationMethodBody` and `guides.ca.sixtyAmp.theN6VsN4DivideBody`.

There is no `pendingKeys` field. The generator writes only `policy`, `keys`, and `extraReviewKeys`; it does not preserve or recreate an abolished pending/deferred tier. The policy text remained byte-identical through regeneration. Its SHA-256 is `88401afefdfc71919f521a1c814e4b7c335c580c578b63d8f4a3993bb37d011d`.

## Back-translation status

`node tools/generate-backtranslation-input.mjs` produced a new target-only Pass A packet:

- previous sealed rows: 1,466
- new rows: 270
- total target-only rows: 1,736
- target digest: `4ef516b686ba0c2eae20afebb0a3602b7e8e20ba4e63845edd86169d9bc28e45`

The packet's row fields are only `id`, `locale`, and `targetText`; it contains no source English, catalog key, or original-text field. `tools/complete-backtranslation-gate.mjs --prepare-a` reused the 1,466 unchanged prior rows and prepared five target-only prompt batches under `.guide-i18n-tmp/backtranslation/` for the 270 new rows.

The independent translator/manual step was not available in this run. Therefore the 270 rows are **not** marked reviewed. `i18n/backtranslations.json`, `i18n/backtranslation-comparison.json`, `i18n/backtranslation-review.json`, and `i18n/backtranslation-report.md` deliberately remain at the previous 1,466-row seal. The previous sealed report has 0 failures and 19.2% byte-identical back-translations, but that verdict does not cover the new rows.

The contamination alarm remains armed in `tools/generate-backtranslation-report.mjs` at more than 60% byte-identical. It cannot honestly be evaluated for the new rows until Pass A is independently completed.

## Checks

- `node build.mjs` — passed; 132 generated pages. A second build reproduced every generated HTML file and `llms-full.txt` byte-for-byte.
- `node tools/check-build-identical.mjs` — passed; 44/44 reviewed English generated pages byte-identical.
- `node tools/check-registries.mjs` — passed at 132 pages.
- `node tools/check-guide-partials.mjs` — passed, 12/12.
- `node tools/generate-guide-provenance.mjs --check` — passed; 355 numeric strings current.
- `node tools/generate-guide-translations.mjs --ingest-fleet` — passed; 12 bundles and 954 strings validated; durable file byte-identical.
- `node tools/generate-locales.mjs` — passed twice consecutively; every written target byte-identical on the second run.

## UNRESOLVED — PM back-translation actions

The PM must complete the isolated two-pass review before this translation round can be called fully reviewed:

1. Run an independent target-only translator on each `.guide-i18n-tmp/backtranslation/pass-a-0N.prompt` without exposing any repository file or English original. Save strict JSON arrays as matching `.response` files.
2. Run `node tools/complete-backtranslation-gate.mjs --ingest-a .guide-i18n-tmp/backtranslation`.
3. Run `node tools/generate-backtranslation-comparison.mjs`. This is the first point where English originals may be introduced.
4. Run `node tools/complete-backtranslation-gate.mjs --prepare-b .guide-i18n-tmp/backtranslation`, complete the five row-specific Pass B judgment batches, and save matching response files.
5. Run `node tools/complete-backtranslation-gate.mjs --ingest-b .guide-i18n-tmp/backtranslation`.
6. Run `node tools/generate-backtranslation-report.mjs`, then `node tools/generate-backtranslation-report.mjs --check`.

Until those steps pass, the stale comparison/report check is expected to fail on the new target digest. No page-registration, sitemap, runtime path, `PAGES`, `GUIDE_PATHS`, `llms.txt`, or publication change belongs in this round.

## T2c — back-translation unit-policy alignment

The earlier back-translation action is now complete. The report checker follows the documented no-loss unit policy and adds only these two equivalences:

- `circular mils` and `cmil` share one count in either direction. If neither form remains in a translation, the row still fails.
- `°C` counting treats `75 °C`, `75　°C` (full-width space), and `75°C` alike. An absent `°C` still fails.

All other units remain independent no-loss checks. A dropped unit or a changed unit such as `V` → `A` still fails.

### Deliberate-corruption proof

The test copied the checker and its inputs to a fresh `/tmp/voltdrop-t2c.*` directory. A scratch-only Node step changed exactly one `zh-Hans` target row, `guides.fortyAmp.workedExampleBody`, from `5.90 V` to `5.90 A`. It then recalculated only the scratch packet's target digest and its two scratch digest references so the run reached the unit gate. The sealed back-translation content and digest were not changed.

Commands:

```sh
scratch_dir=$(mktemp -d /tmp/voltdrop-t2c.XXXXXX)
mkdir -p "$scratch_dir/tools" "$scratch_dir/i18n/strings" "$scratch_dir/i18n/country-packs"
cp tools/generate-backtranslation-report.mjs "$scratch_dir/tools/"
cp i18n/safety-critical.json i18n/never-translate.json i18n/backtranslation-input.json i18n/backtranslations.json i18n/backtranslation-review.json "$scratch_dir/i18n/"
cp i18n/strings/en.json i18n/strings/es.json i18n/strings/fr-CA.json i18n/strings/zh-Hans.json "$scratch_dir/i18n/strings/"
cp i18n/country-packs/us.json i18n/country-packs/ca.json "$scratch_dir/i18n/country-packs/"

node --input-type=module - "$scratch_dir" <<'NODE'
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[2];
const zhPath = join(root, 'i18n/strings/zh-Hans.json');
const inputPath = join(root, 'i18n/backtranslation-input.json');
const outputPath = join(root, 'i18n/backtranslations.json');
const reviewPath = join(root, 'i18n/backtranslation-review.json');
const zh = JSON.parse(readFileSync(zhPath, 'utf8'));
const key = 'guides.fortyAmp.workedExampleBody';
const originalTarget = zh[key];
const corruptedTarget = originalTarget.replace('5.90 V', '5.90 A');
zh[key] = corruptedTarget;
writeFileSync(zhPath, `${JSON.stringify(zh, null, 2)}\n`);
const input = JSON.parse(readFileSync(inputPath, 'utf8'));
const row = input.entries.find((entry) =>
  entry.locale === 'zh-Hans' && entry.targetText === originalTarget);
row.targetText = corruptedTarget;
input.targetDigest = createHash('sha256')
  .update(JSON.stringify(input.entries)).digest('hex');
writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`);
for (const path of [outputPath, reviewPath]) {
  const sealed = JSON.parse(readFileSync(path, 'utf8'));
  sealed.targetDigest = input.targetDigest;
  writeFileSync(path, `${JSON.stringify(sealed, null, 2)}\n`);
}
console.log(`${key}: 5.90 V -> 5.90 A`);
NODE

scratch_exit=0
(cd "$scratch_dir" && node tools/generate-backtranslation-report.mjs) || scratch_exit=$?
echo "scratch exit code: $scratch_exit"
rm -R -- "$scratch_dir"
```

Output:

```text
guides.fortyAmp.workedExampleBody: 5.90 V -> 5.90 A
back-translation report: 1736 reviews, 1 failed, 23.8% byte-identical
scratch exit code: 1
```

The scratch directory was removed. No repository input, translation, or judge file was changed by the proof.

### Final report

```text
$ node tools/generate-backtranslation-report.mjs
back-translation report: 1736 reviews, 0 failed, 23.8% byte-identical
$ node tools/generate-backtranslation-report.mjs --check
back-translation report: 1736 reviews, 0 failed, 23.8% byte-identical
```

The more-than-60% contamination alarm remained armed and silent at 23.8% byte-identical.
