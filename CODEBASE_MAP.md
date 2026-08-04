# Codebase Map
Generated: 2026-08-04 00:15 PST | 52 hand-written source files (9 engines + build/verify + 23 tools + 18 comments-app TS) → **168 generated pages** | Static HTML/CSS/JS site + Next.js comments app
Two deployables: static calculators (Coolify static buildpack) + comments-app (Dockerfile, path-routed at `/comments`)
Superseded (2026-08-04): the 2026-07-25 map said "31 source files" and predated i18n, guides, and `tools/`.

## The one thing to understand first
Nothing under an edition directory is hand-written. `build.mjs` takes **chrome** (`index.html`)
+ a **`<main>` partial** + a **locale catalog** and emits every page for all six editions
(us · es · zh · ca · ca-fr · ca-zh). Editing `es/guides/30-amp-wire-size/index.html` is always
wrong — edit the partial or the catalog, then rebuild.

## Directory Structure
```
/ (root = the US-English edition AND the source of chrome)
  index.html          — single source of page chrome (header/sidebar/footer) + voltage-drop calculator
  styles.css          — ALL theme tokens + styles (shared class CSS belongs HERE, never in a partial)
  build.mjs           — BUILD: chrome+partial+catalog → 168 pages; asset hashing; runs check-registries
  verify.mjs          — Playwright suite, 1,622 checks; needs a server on :8642
  common.js           — chrome runtime: country/language state, edition link rewriting, GA4 calculate event
  app.js ampacity.js conduit.js boxfill.js power.js landscape.js solar.js wire-colour.js
                      — the 9 calculator engines (sealed data below)
  partials/ (40)      — per-page <main> bodies + fragments/; 12 are the amp-ladder guides
  templates/          — llms-full.txt SOURCE (root llms-full.txt is generated — edit the template)
  tools/ (23 .mjs)    — build-time checks, i18n pipeline, derivations
  i18n/               — strings/{en,es,fr-CA,zh-Hans}.json, country-packs/, translation banks,
                        never-translate + safety-critical registries, back-translation artifacts,
                        english-build-baseline.sha256
  docs/               — COUNTRY_EXPANSION_METHODOLOGY.md, GUIDES_TOPIC_MAP.md (read before new guides)
  guides/ (12 + index)— US-English guide pages (GENERATED)
  es/ zh/ ca/ ca-fr/ ca-zh/ — the other five editions (ALL GENERATED)
  assets/<edition>/   — localized copies of the engine JS (GENERATED)
  sitemap.xml robots.txt llms.txt llms-full.txt data-golden.json
comments-app/ (Next.js 16 + NextAuth + Prisma/Postgres, basePath /comments)
  app/CommentsClient.tsx — feedback UI: sign-in, privacy name picker, post/reply/edit/delete
  app/api/feedback/      — GET list + POST create; [id]/ DELETE (admin) + PATCH (owner/admin)
  lib/auth.ts            — authOptions: Google+FB, Prisma adapter, ADMIN_EMAILS session flag
  lib/link-blocking.ts   — containsLink() spam filter (shared by POST + PATCH)
  prisma/schema.prisma   — User/Account/Session/VerificationToken + Feedback (replies, isHidden)
  Dockerfile             — standalone build, slim prisma CLI, `migrate deploy` on start
```

## Entry Points
- `node build.mjs` → regenerates all 168 pages + `llms-full.txt`; hard-fails on a missing catalog
  string or a registry mismatch. Run after ANY partial/catalog/engine/style edit.
- `python3 -m http.server 8642` then `node verify.mjs` → the full suite (browser required).
  `STATIC_ONLY=1 node verify.mjs` runs only the ~653 non-browser checks — **never accept that as
  suite-green.** `BASE=https://voltdrop.app/ node tools/check-calculate-event.mjs` checks production.
- `node tools/generate-locales.mjs` → regenerates catalogs; a correct run is a byte-perfect no-op.
- comments-app: Coolify Dockerfile build; starts via `prisma migrate deploy && node server.js`.
- Deploy: manual Coolify trigger (`is_webhook=f` — VoltDrop never auto-deploys on push).

## Sealed Data (the electrical tripwire)
`data-golden.json` fingerprints every table below; `verify.mjs` hard-fails on any change. Changing
one legitimately = (1) independent source verification, THEN (2) deliberate golden regeneration.
| File | Sealed constants |
|---|---|
| app.js | `WIRE_TABLE`, `K_FACTOR` |
| ampacity.js | `AMPACITY`, `SMALL_CAP`, `AMBIENT_CORRECTION`, `CONDUCTOR_ADJUSTMENT`, `CEC_*` |
| conduit.js | `THHN_AREA`, `CONDUIT`, `CEC_CONDUCTOR_AREA`, `CEC_CONDUIT` |
| boxfill.js | `VOL_PER_CONDUCTOR`, `BOXES`, `CEC_VOL_ML` |
| tools/derive-guide-tables.mjs | `NEC_310_12_DWELLING_SERVICE` (0.83 factor + its four conditions) |

## Registries — a new page touches all of these
`tools/check-registries.mjs` cross-checks them bidirectionally, inside BOTH build and verify:
`build.mjs PAGES` ↔ `common.js TOOL_PATHS`/`GUIDE_PATHS` ↔ `verify.mjs GUIDE_PATHS`/`SCOPED_PATHS`
↔ `sitemap.xml` ↔ `llms.txt` ↔ `generate-locales.mjs templateFiles` ↔ directories on disk.
Guides go in **GUIDE_PATHS**, not SCOPED_PATHS. Guide metadata is discovered dynamically — do NOT
add guide namespaces to generate-locales' hardcoded top-level meta-page array (it is for tools).

## Tools
- **Checks:** `check-registries`, `check-build-identical` (56-page English byte baseline),
  `check-guide-partials` (renders UNregistered partials), `check-calculate-event`,
  `check-static-never-translate`, `check-runtime-never-translate`, `check-runtime-code-identity`,
  `check-runtime-result-patterns`, `never-translate-check` (unit-equivalence policy lives here)
- **Derivation:** `lib/sealed-data.mjs` (shared sealed-constant reader + fingerprint verify),
  `derive-guide-tables.mjs` → `guide-table-derivations.json` (every guide table cell),
  `generate-guide-provenance.mjs` → `guide-provenance.json` (355 numeric strings classified)
- **i18n pipeline:** `generate-locales.mjs`, `generate-guide-translations.mjs` (`--ingest-fleet`),
  `apply-tool-translations.mjs`, and the sealed two-pass gate:
  `generate-backtranslation-input` → `complete-backtranslation-gate --prepare-a/--ingest-a`
  → `generate-backtranslation-comparison` → `--prepare-b/--ingest-b`
  → `generate-backtranslation-report [--check]` (1,788 reviews; >60% identical = contamination alarm)
- **Engine tests:** `landscape-engine-tests`, `solar-engine-tests`, `landscape-browser-check`

## Routes
| URL | Source | Notes |
|-----|--------|-------|
| `/` | index.html + app.js | voltage drop (tabs: drop/size/length) |
| `/wire-size-calculator/`, `/max-wire-length/` | app.js | preselected via `<body data-mode>` |
| `/ampacity-check/` `/conduit-fill/` `/box-fill/` `/power-calculator/` | partial + own engine | |
| `/landscape-lighting-calculator/` `/solar-battery-wire-size/` `/wire-colour/` | partial + own engine | |
| `/ohms-law/` `/solar-wire-size-calculator/` | framed over power.js / solar.js | |
| `/guides/<12 slugs>/` | partial, no page script | `visibleFaq: true` |
| `/how-we-verify/` `/privacy/` `/terms/` | partial, no script | |
| `/{es,zh,ca,ca-fr,ca-zh}/…` | same partials, localized catalogs | every URL above ×6 |
| `/comments`, `/comments/api/*` | comments-app (Traefik PathPrefix, stripprefix DISABLED) | |

## Guides (12 + index, each × 6 editions)
`sub-panel-wire-size`, `50-amp-wire-size`, `wire-ampacity-chart`, `how-far-12-gauge-wire`,
`voltage-drop-formula`, `nec-vs-cec`, plus the 2026-08-03 amp ladder: `20-`, `30-`, `40-`,
`60-amp-wire-size`, `100-` and `200-amp-service-wire-size`.
A guide is **all-or-nothing across all six editions** (GUIDE_PATHS declares existence per edition),
so one new slug = 6 pages and a full translation round. Canadian service pages deliberately publish
no conductor size — `check-guide-partials` fails if a table appears on them.

## Key Definitions
### engines (browser globals, not modules)
- `app.js`: `WIRE_TABLE` (AWG→cmil), `K_FACTOR`, `SYSTEMS`, `calculateVoltageDrop()`,
  `calculateCombinedWireSize()` (heat + distance, returns the governing constraint)
- `common.js`: `COUNTRIES`, `EDITION_PREFIXES`, `TOOL_PATHS`, `GUIDE_PATHS`, `CALC_FORM_IDS`,
  `VDEdition.pathFor()`, `vd:country` / `vd:lang` events, runtime link rewriting
- `ampacity.js`: `AMPACITY{cu,al}`, `SMALL_CAP`, ambient/conductor correction (NEC + CEC), `calculateAmpacity()`
- `conduit.js`: `THHN_AREA`, `CONDUIT`, fill limits 53/31/40% · `boxfill.js`: `VOL_PER_CONDUCTOR`, `BOXES`
- `power.js`: `SYSTEMS` (1/1/√3, usesPF), solves amps/watts/volts/resistance-impedance
- `landscape.js`: `solveTree()` (hub/star distribution) · `solar.js`: scenario percents ·
  `wire-colour.js`: `WIRE_COLOUR_RULES` (no submit — reports first interaction)
- `build.mjs`: `PAGES[]` ({dir, tool, script, main, titleKey, descriptionKey, hreflang, visibleFaq}),
  partial composition `{{> fragments/x.html }}`, `runtimePatternGroups`

### comments-app
- `CommentsClient.tsx`: `CommentsClient`, `CommentCard`, `nameChoices()`, PAGE_SIZE 20
- `api/feedback/route.ts`: GET paginated (replies ride with parents), POST (name allowlist,
  link block, 1/hr rate limit, admin-only replies) · `[id]/route.ts`: DELETE admin, PATCH owner/admin

## Import Graph
> Static-site engines load via `<script>`, not modules — this is the composition graph.
```
build.mjs        → partials/*, templates/*, i18n/strings/*, i18n/country-packs/*,
                   tools/check-registries.mjs
verify.mjs       → tools/lib/sealed-data.mjs, tools/check-registries.mjs, data-golden.json,
                   tools/guide-table-derivations.json, playwright
derive-guide-tables → tools/lib/sealed-data.mjs → reads app.js, ampacity.js (parsed, not imported)
generate-locales → i18n/reviewed-legacy.json, guide-translations.json,
                   landscape-translations.json, solar-translations.json
generate-guide-translations → i18n/fleet-staging.json, glossary.json, never-translate.json
index.html       → common.js + app.js;  tool pages → common.js + <tool>.js (swapped by build.mjs)
CommentsClient   → next-auth/react;  api routes → lib/auth, lib/prisma, lib/link-blocking
```
