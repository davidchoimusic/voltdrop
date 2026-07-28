# VoltDrop — voltdrop.app

Architecture map: see [CODEBASE_MAP.md](CODEBASE_MAP.md) — 31 files, static calculators + Next.js comments app.

## Mission
A free voltage drop calculator for electricians that wins on CLARITY, not brand or SEO muscle.
Competitor research (2026-07-24, via Grok review-mining of Southwire app + calculator.net etc.) found the
recurring complaints in bad reviews: confusing one-way vs round-trip distance, unexplained fields,
results that don't match other calculators, clutter, forced signups. VoltDrop's one-line strategy:
**"Southwire wins on brand. Calculator.net wins on Google. You win on clarity."**

Domain purchased: **voltdrop.app**. Primary users: working electricians, contractors, apprentices,
plus solar/automotive DIY. Mobile-first — used standing on jobsites.

## Current state (2026-07-27) — READ THIS FIRST

**LIVE at voltdrop.app in SIX EDITIONS.** Static site with a build step.
**NINE calculators**: the seven below plus **Landscape Lighting**
(`/landscape-lighting-calculator/`) and **Solar & Battery** (`/solar-battery-wire-size/`).
Superseded (2026-07-27): the earlier "NOT YET PUSHED OR DEPLOYED — awaiting `YES PUSH`" line is
no longer true; both shipped, and everything below is live and verified on production.

### 2026-07-27 session — three new pages, an engine addition, and a registry gate
**Deployed and verified live** (Coolify deploy `ivwd1yglbwd6grh76x3j45ns`, commit `486d448`).
Suite went **629 → 1039 checks, 0 failed, 0 JS errors**. 102 → **120 generated pages**.
- **`/how-we-verify/`** — the trust page, all six editions. Written as the honest answer to
  "why should I trust this number", explicitly NOT as a badge. Claims are deliberately narrow:
  the seal proves a number has not changed unnoticed, NOT that the original was right; sources
  are described as "two independently produced reproductions of the published table" because
  VoltDrop does not hold the standards; back-translation is called a screen, not proof. No
  author byline (owner rejected the "add a credentialed reviewer" advice — there is no licensed
  electrician reviewing this site). Footer link on every page + a shared one-line link in each
  tool's explainer via `partials/fragments/verify-link.html`.
- **`/ohms-law/`** — framed over `power.js`. **This required real engine work**, see below.
- **`/solar-wire-size-calculator/`** — framed over `solar.js`; panel-to-controller focus,
  routes battery/inverter runs to the parent tool.
- **Power Calculator gained resistance/impedance.** DC → resistance. AC → **impedance**, with
  the resistive part (`R ≈ Z × PF`) shown as a separate labelled figure. **Three-phase refuses**
  (wye vs delta changes the answer and the form does not ask) — same posture as solar's
  OUT OF RANGE. Watts/Ohms toggle in amps and volts modes so a conflict is impossible.
- **`tools/check-registries.mjs`** — cross-checks `build.mjs PAGES` against `common.js`
  TOOL_PATHS/GUIDE_PATHS, `verify.mjs` SCOPED_PATHS, `sitemap.xml`, `llms.txt`,
  `generate-locales.mjs templateFiles`, and the files on disk. Runs in BOTH `build.mjs` and
  `verify.mjs`. This kills the "a new page touches eleven places, two fail silently" trap.
- **Partial composition** — `{{> fragments/x.html }}` in `build.mjs`. Framed pages wrap ONE
  copy of the form fragment instead of forking the markup or regex-rewriting rendered HTML.
- **English byte-baseline 27 → 40 pages.** Seven Canadian English pages had NO byte-protection
  before this session; that hole is closed.

### 2026-07-27, later — the trust page was WRONG and has been corrected (NOT YET PUSHED)
⚠️ **`/how-we-verify/` shipped with four false claims and was corrected the same day.** Full
detail in REGRESSION RISKS below; read it, because the failure mode generalises. Summary: the
claims described the repo's *intent* rather than the *running product*, on the one page whose
entire subject is whether our numbers can be trusted.
- Corrected: the Canadian conduit page **labels rather than withholds**; there is **no** general
  "if you see a result the data passed" guarantee; the seal stops the **verification suite**, not
  the build (proved by experiment); numeric parity covers **named page groups**, not every page.
- Two more overstatements reworded; a third fixed **in the product** — never-translate checking
  had silently omitted `landscape.js` and `solar.js`, and now derives from the runtime registry.
- Never-translate parity is now **category-aware** (no-loss vs exact-both-ways) — see below.
- Suite **1039 → 1047**, 0 failed. Back-translation re-run honestly: 1098 rows, 0 failed, 19.5%
  identical.
- **Merged to main locally, NOT pushed and NOT deployed** — the live site still serves the wrong
  wording until David approves a push. He gave `YES PUSH`/`YES DEPLOY` for the earlier trust-page
  work; that approval was deliberately NOT reused for this different change.

### 2026-07-27, later still — Wire Size answers heat AND distance (LIVE)
`/wire-size-calculator/` no longer answers voltage drop alone. It returns the **ampacity
minimum**, the **voltage-drop minimum**, and the **governing conductor**, saying which constraint
set it. Deployed and verified on production (14/14 checks across US/CA/FR/ZH, 0 JS errors,
**0 analytics requests** — GA4 stayed gated).
- Suite **1047 → 1137**, 0 failed. `data-golden.json` unchanged — no new electrical data.
- New inputs in `size` mode only: **termination temperature** (frequently the binding limit),
  ambient, conductors in raceway, continuous load. `drop` and `length` modes untouched.
- **Continuous load is now SHOWN, not just applied.** US: `125% of the load`, with before/after
  amps. Canada: `Rule 8-104 rated-equipment case — conductor limited to 80% of its permitted
  ampacity`. **Genuinely different mechanisms, not translations of each other** — the US scales
  the LOAD, Canada limits the CONDUCTOR.
- **Refuses rather than guessing**: OUT OF RANGE when no listed conductor passes both, and it
  discloses the search bound (500 kcmil). It never returns the largest conductor as a
  recommendation.
- **Domain floor stated honestly**: voltage drop reaches 18 AWG where the ampacity table starts at
  14 AWG Cu / 12 AWG Al. The page says so rather than pretending ampacity has an opinion there.
- Heading wording: **"Multiple sources, before it ships"** (owner's call, 2026-07-27) — body keeps
  the precise mechanism, "at least two independently produced reproductions … they all have to
  agree, on every cell". Do NOT loosen to "several"/"many"; the precision is the point.

### 2026-07-27 — Canadian conduit fill now uses verified CEC data (CURRENT WORKTREE)
`/ca/conduit-fill/`, `/ca-fr/conduit-fill/`, and `/ca-zh/conduit-fill/` no longer calculate from
the sealed US THHN and NEC raceway tables. The Canadian path now uses sealed CSA C22.1:24
Tables 6A/6K conductor areas and Table 9-series internal diameters, with Rule 12-910/Table 8 fill
percentages. RW90 is the default and T90 is selectable. Metric designators display beside their
imperial equivalents.
- Safety boundary: 12 AWG RW90 in metric 16 EMT permits **6**, while the unchanged US 12 AWG
  THHN path permits **9** in 1/2-inch EMT.
- The two new CEC tables are added to `data-golden.json`; every pre-existing fingerprint remains
  unchanged.
- The Canadian planning note and the stale `/how-we-verify/` example have been replaced with the
  verified-source record. The independent target-only back-translation pass must be rerun before
  release because safety copy changed; its sealed output files are deliberately untouched here.

### Superseded plan note (kept per append-only convention)
The "next build" block below was written before the work above shipped. Its content is now
history, except the parts still true: **breaker sizing stays out until NEC 240.6 passes the
verification gate**, and conduit stays out of this page for the counting reason given.

### Next build, planned and Codex-reviewed but NOT started
**Repair `/wire-size-calculator/` to answer ampacity AND voltage drop together**, rather than
adding a tenth tool. Codex's plan review reshaped the original idea substantially:
- **Drop conduit from v1** — conduit fill needs *every* conductor in the raceway (neutral, bond),
  not the ampacity "current-carrying" count, plus conduit type; and the bond size needs the
  breaker size. Reusing the ampacity count for conduit is the defect that would pass every check.
- **Termination temperature is a required input** — the ampacity engine takes insulation and
  termination ratings separately and termination is often binding.
- **"Smallest passing size" is NEW logic** — the ampacity tool *checks* one conductor, it does not
  *search*. Needs explicit refusal states and must reconcile domains (voltage drop covers 18/16
  AWG; ampacity starts at 14 Cu / 12 Al).
- **Do not call it "size a circuit"** — that implies overcurrent and grounding. It sizes the
  conductor for ampacity and voltage drop.
- Breaker sizing stays out until NEC 240.6 passes the verification gate.

### 2026-07-27/28 — CANADA IS NO LONGER BORROWING US DATA. Ten calculators. (LIVE)
Suite **629 → 1300 checks**, 0 failed. 120 → **126 generated pages**.

**The unlock: David already owned the standard.** `~/Desktop/cec-research/cec2024.pdf` is a full
972-page CSA C22.1:24 (26th ed.), the same copy approved for Tables 2/4 in July. Nobody had opened
Section 4 or the conduit tables in it. **David extended that provenance decision to those sections
on 2026-07-27** ("build it"). Recorded so it is not silently re-litigated.
Source records: `docs/research/CEC_CONDUIT_VERIFIED.md` · `docs/research/COLOUR_RULES_VERIFIED.md`.

**`/ca/conduit-fill/` now computes real CEC results.** The planning-only note is gone.
The borrowed US data was wrong in the **unsafe** direction on BOTH sides:
| 12 AWG in ½″ (metric 16) EMT @ 40% | was | now |
|---|---|---|
| conductor area | 8.58 mm² (THHN) | **11.6 mm² (RW90)** |
| usable conduit area | 78.5 mm² (NEC) | **74.5 mm² (Table 9G)** |
| **conductors permitted** | **9** | **6** |
Capacity was overstated by **50%**. RW90 is unjacketed so it is fatter than THHN; Canadian EMT is
internally *smaller*. Both errors compounded. New sealed tables `CEC_CONDUCTOR_AREA` /
`CEC_CONDUIT`; **no existing fingerprint moved**. RW90 default, T90 selectable (T90 ≈ THHN within 2%).

**`/wire-colour/` — the TENTH calculator**, by conductor role or by panel circuit number
(1&2=A, 3&4=B, 5&6=C repeating). ⚠️ **No new sealed tables — colours are RULES, not tables.**

### ⭐ Three facts here that no secondary source had right
1. **The colour rule is 4-032, NOT 4-038.** Every forum, blog and industry article cites 4-038.
   **It does not exist in the 26th edition** — Section 4 ends at 4-036, "Busbar". It *was* 4-038
   in the 2012 edition and was renumbered. Anyone citing it quotes a decade-dead rule.
2. **Canada puts the 4-wire-delta high leg on PHASE A. NEC 408.3(E) puts it on phase B.**
   Genuinely dangerous cross-border difference; featured in the tool.
3. **The Canadian colour obligation is conditional** — "where colour-coded circuits are required".
   Paraphrases drop it constantly, and only the conditional version is true.

### ⚠️ Source asymmetry, deliberate and recorded
**Canada is verbatim from the standard. The US is not** — no NEC PDF exists locally, so US colour
rules rest on multiple industry reproductions. The two are also **not mirror images**: Canada is
prescriptive where colour coding is required; **the NEC mandates NO ungrounded colour** and merely
prohibits white/grey/green. Never flatten them into one table.

### Verification method worth reusing
- **Table 6A cross-checked against two CSA C22.2 No. 38 manufacturer datasheets** (General Cable /
  Prysmian, Nexans). 12 AWG and 8 AWG match **to the digit**; worst deviation 2.9%.
  Rule 12-910(4)(b) *permits* manufacturer specs for raceway area, so this is a legitimate second
  source rather than a workaround.
- **The Table 9 fill areas are exactly `π(ID/2)² × pct`** — confirmed to 0.01% against printed 9C
  and 9G. The whole 9A–9H series collapses to internal diameters plus three percentages: a smaller
  dataset where every derived value self-checks against a printed one.
- **Only the diameter and single-conductor columns were transcribed.** Two printed multi-conductor
  values rendered implausibly from the PDF (6 AWG × 6 as "1975", should be ≈196). Everything else
  is computed — arithmetically identical, and it removes a class of transcription risk.

### Wire colour tool — the earlier "NOT BUILT" note below is SUPERSEDED (2026-07-27)
See `docs/research/WIRE_COLOUR_SOURCES.md`. US rules are multi-source; **Canadian rules could only
be sourced from forum posts and contractor blogs**, which is far below this project's bar. Not
built US-only either, because country divergence was the whole rationale. The finding that would
justify it: **Canada's A and B phases appear SWAPPED against US habit** (US convention A=black,
B=red; CEC 4-038(3) reported as A=red, B=black). Needs a real source, and needs David's own
provenance decision — the Tables 2/4 decision was about those tables, not all of Section 4.

### The two new tools (2026-07-26) — what makes them different
They close the gap recorded below as "THE LOW-VOLTAGE / MULTI-POINT GAP": every other
calculator here assumes ONE LOAD AT THE FAR END OF ONE RUN.
- **Landscape** solves a TREE: loads hang off nodes, cable runs are edges, an edge carries
  the sum of everything in its subtree. Compares daisy chain vs hub vs star on worst-case
  voltage, spread and cable used. It is AC (a landscape transformer outputs low-voltage AC),
  nameplate-current, and asserts NO code drop limit in any edition.
  Counter-intuitive finding locked in as a test: **a hub placed part-way along the run beats
  a star on BOTH evenness and cable used** — the trunk drop is common to every fixture, so it
  shifts them together instead of spreading them apart. "Star is the most even" is false.
  Independent check: for N evenly spaced equal fixtures, `daisy ÷ naive == (N+1)/2N` exactly.
- **Solar** derives current PER CIRCUIT — Imp at Vmp for panels, controller max OUTPUT for
  controller-to-battery, and max continuous DC input at the LOW-VOLTAGE CUTOUT for
  battery-to-inverter (nominal understates it by ~14%). Reports an explicit OUT OF RANGE
  rather than the largest listed conductor, never claims an ampacity result, and excludes AC
  output. Drop targets live in `i18n/solar-drop-targets.json`, unsealed on purpose and
  recorded as UNSOURCED starting points.

Test counts after this session: **629 verify checks**, 75 landscape engine tests, 35 solar
engine tests, 27 byte-identical English pages.

| Edition | Path | Code | Language |
|---|---|---|---|
| US English | `/` | NEC | en |
| US Spanish | `/es/` | NEC | es |
| US Chinese | `/zh/` | NEC | zh-Hans |
| Canada English | `/ca/` | CEC | en |
| Quebec French | `/ca-fr/` | CEC | fr-CA |
| Canada Chinese | `/ca-zh/` | CEC | zh-Hans |

**9 calculators** (voltage drop 3 modes · wire size · max length · ampacity+derating ·
conduit fill · box fill · power · landscape lighting · solar & battery) **and 6 guides**,
in every edition.

### The things that will bite you if you don't know them

1. **`node build.mjs` after ANY edit** to markup, CSS, JS or strings — then commit the
   generated pages. Nothing is hand-edited in the output directories.
2. **Strings live in `i18n/strings/*.json`, NOT in the markup.** Editing a page's text means
   editing the catalog. `i18n/never-translate.json` lists tokens (NEC, CEC, rule numbers, wire
   types, units) that must survive verbatim in every language.
3. **`verify.mjs` is now ~542 checks, not 7.** Run: `python3 -m http.server 8643` then
   `BASE=http://localhost:8643/ node verify.mjs`. Start the server, run verify, READ the
   output — never chain them into one command whose exit code you can't see.
4. **15 sealed electrical tables** fingerprinted in `data-golden.json`. The verification suite
   hard-fails on any change. Changing one legitimately = independent source verification FIRST, then
   regenerate the golden file deliberately. Never regenerate to make a failure go away.
5. **Base ampacity is deliberately SHARED between the US and Canada** — CEC Tables 2/4 were
   verified identical to NEC 310.16 in the 60/75/90 columns. Do not "fix" this by duplicating.
   See the country-expansion section below for what genuinely differs.

### Verification machinery that exists (do not weaken it)
- **Data tripwire** — 15 sealed tables, proven to fire on a single-digit edit
- **Byte-identical gate** — English output must not change unintentionally
- **Two-pass back-translation** — safety strings re-rendered into English from the target
  language alone, with a contamination alarm that fails if results look copied
- **Numeric parity** — every number on a translated page must match its English twin
- **Per-edition interaction checks** — all 42 edition×calculator combinations actually driven

### Still open
- Roadmap items awaiting placement: ground wire size · wire colour · offline/PWA ·
  "Build this circuit"
  (**"low-voltage multi-point" is DONE as of 2026-07-26** — see the two new tools above.
  **"how we verify" page and `/ohms-law/` are DONE and LIVE as of 2026-07-27.**)
- **T/split layout SHIPPED 2026-07-27** (was deferred). The landscape tool now compares FOUR
  layouts. The T needed the one thing the others did not: per-fixture branch assignment, because
  "40 ft from the transformer" says nothing about direction. A branch column appears only for that
  layout, and its distances are measured along each branch FROM THE SPLIT.
  ⚠️ The subtle part, worth not breaking: the comparison table shows all four layouts from one
  fixture table, but the T measures from the split while the other three measure from the
  transformer. Feeding the same numbers to both meanings would have made the four rows describe
  DIFFERENT physical runs — a comparison that looks authoritative and is a lie. `branchToAbsolute`
  / `absoluteToBranch` convert between the two, and an engine test asserts the round trip is
  lossless. Branch A runs back toward the transformer, branch B runs away from it.
  Finding: a T pays the ENTIRE load over its trunk, so for an evenly spaced line a plain daisy
  chain can beat it on worst-case voltage. What a T reliably buys is evenness. Same shape as the
  hub-vs-star surprise — there is no single winner, which is the product.
- ~~**`/solar-wire-size-calculator/` as a framed page is now HONEST to mint**~~ — DONE and LIVE
  2026-07-27. Kept here because the reasoning is the precedent: the framed-page rule said build
  the engine first, the engine was built, and only then was the page honest.
- GSC: watch Sitemaps "Discovered pages" move 16 → 91, then leave it a few weeks

---

## Day-one state (2026-07-24) — historical, superseded by the section above
Day-one MVP built and verified. Pure static site — 3 files, no framework, no build step:
- `index.html` — single page, 3 modes (voltage drop / min wire size / max distance)
- `styles.css` — all theme tokens at top; committed dark "power tool" theme
- `app.js` — all logic; wire table + formulas are data-driven for future country expansion
- `verify.mjs` — Playwright e2e: drives all 3 modes, asserts math against hand-calculated values,
  screenshots to `verify-shots/`. Run: `python3 -m http.server 8642` then `node verify.mjs`.
  7/7 passing as of initial build.

## Deployment (mirrors pitchchanger.io structure)
- GitHub: https://github.com/davidchoimusic/voltdrop (public), branch `main`
- Coolify on main-server 178.156.255.18: project `voltdrop.app` (uuid `d679idhqgw4z97gp7m41da1e`),
  app `voltdrop` (uuid `x5ysasyyu676nu5pyotuqsx8`), build pack **static** (no Dockerfile —
  deliberate deviation from pitchchanger's Node Dockerfile; nothing to build, keeps Docker
  cache small per the disk-bloat lesson). Domains: voltdrop.app + www.voltdrop.app.
- Deploy command: Coolify deploy endpoint with `COOLIFY_DEPLOY_TOKEN` (see coolify-deploy memory).
  First deploy 2026-07-24: finished, serving verified via `--resolve` curl; disk 48% after.
- DNS: LIVE 2026-07-24 — David added A @ → 178.156.255.18 + www (both Cloudflare-proxied,
  same NS as pitchchanger.io). Post-DNS verification: 11/11 Playwright checks against the live
  site (`BASE=https://www.voltdrop.app/ node verify.mjs`), GA tag confirmed in served HTML.
  No API token for this zone exists yet — future DNS edits need David, or a
  `CF_VOLTDROP_DNS_TOKEN` (Zone.DNS:Edit, voltdrop.app) dropped into `~/.brain-secrets/secrets.env`.
- Google Analytics GA4: measurement ID `G-NC7ETLY8Q1`, tag in index.html head (added 2026-07-24).

## ⚠️ Country expansion — READ docs/COUNTRY_EXPANSION_METHODOLOGY.md before ANY new guide or country work (2026-07-25)
STANDING RULE (David): country editions must CONFORM, not just annotate — every new tool/
guide ships country-aware for all live editions (see Ampacity Check AMP_TEXT pattern);
notes are only the temporary state while a country's data awaits the verification gate.
Physics/standards/language three-layer model; NEVER translate articles — regenerate from
templates + verified country packs; 5-stage pipeline with unskippable verification gate;
subdirectory URLs + hreflang; rollout CA → UK/AU → EU metric. CEC difference map:
docs/research/CEC_VS_NEC.md · CEC_AMPACITY_DERATING.md · CEC_TABLES_2_4_VERIFIED.md ·
AMPACITY_DERATING_TABLES.md.
**CANADA IS NOW A REAL EDITION (2026-07-25 evening) — the earlier "base ampacity grids
NOT verified, do not reuse as CEC" warning is SUPERSEDED.** CEC Tables 2 and 4 were
verified against CSA C22.1:24 (26th ed., 2024) and are **numerically identical to NEC
310.16** in the 60/75/90 °C columns at every shared size (105 cells, zero mismatches).
The old "14 AWG Cu 60 °C = 20 A" difference was real in the **2012** edition and was
harmonised away ~2015–2018. The base grid is therefore **deliberately SHARED** between
country packs — do not "fix" this by duplicating it.
What IS genuinely Canadian and implemented: Table 5C bands (0.70 at ten conductors where
NEC gives 0.50) · Table 5A single-point rows with NO cool-ambient credit below 30 °C ·
Rule 4-004 counting (bonding never counts; neutral conditional) · Rule 4-006 terminations
(60 °C ≤100 A/#1 AWG, 75 °C above; first 1.2 m — we take the lower rating throughout and
label it a simplified method) · Rule 8-104 continuous at 80% not 125% · Rule 14-104 caps ·
VD MANDATORY per Rule 8-102 · box fill a real fork (mL, marrettes).
⚠️ STILL UNVERIFIED for Canada: **conduit fill** (CEC Tables 6A–6K, Table 8) — that page
keeps its planning-only note. **Free-air Tables 1/3 DO still differ** from NEC 310.17
(300 kcmil Cu 60 °C: 370 vs 375) — no free-air tool exists, but the harmonisation is NOT
total; never assume it extends beyond Tables 2/4.
Provenance: document-sharing copy of the standard, not authorised CSA distribution;
David reviewed and confirmed 2026-07-25 to proceed. Owner decision, recorded.

## Product decisions (from David, 2026-07-24)
- **Start US + Canada only** (AWG, feet, NEC 3%/5% guidelines). International later.
- Long-term: **country-specific calculator versions** (mm²/meters/IEC for EU, BS 7671 UK,
  AS/NZS AUS…), same skeleton, swapped data tables + code limits. Wire data in `app.js`
  (`WIRE_TABLE`, `K_FACTOR`, `SYSTEMS`) is deliberately table-driven for this.
- Country switching UI: undecided — pitchchanger.io-style footer links vs top selector.
  David leans footer, since search should land users on their country's version directly
  (separate URLs per country = also better for local-language SEO).
- Site skeleton will eventually mirror pitchchanger.io: tool menu, articles for SEO,
  multiple calculators (ampacity check as a SEPARATE card, conduit fill later).
  But calculator stays the hero, above the fold.
- **Design: "very construction"** — orange/black/yellow/white, power-tool feel (David's call).
  NO seven-segment/LCD calculator fonts — clear bold numbers (system font, tabular digits).
- No signup, free forever, fast.

## Roadmap (from the day-one spec)
Done: one-way distance w/ plain-English explainer · DC + AC 1φ/3φ · Cu/Al · AWG 18→500 kcmil ·
3 result modes · volts/%/end-voltage + green-yellow-red vs 3%/5% · "How we calculated this" ·
mobile-first, no signup.
**Tool roadmap (agreed with David 2026-07-24, from Codex brainstorm + my triage):**
DONE: voltage drop (3 modes) · ampacity check · conduit fill · box fill · power calculator.
NEXT (in order): ampacity DERATING upgrade (ambient-temp + conductor-count correction
factor tables added to /ampacity-check/) → Ground Wire Size (Tables 250.122 + 250.66 —
label clearly WHICH ground conductor is being sized) → then pause and read Feedback before
the big one: Load Calculator (NEC Article 220 — complex, wrong-answer-prone, needs its own
verification pass; also the point where an NEC-edition selector becomes real, since our
current tables are edition-stable but Art. 220 rules aren't). Later/pro tier: motor calc,
transformer calc, fault current/AIC, EV charger, panel balancer, pulling tension, bend calc.
Also still open: split-phase/240 helper · mm² for non-US · share link + print.
Don't rush: multi-fixture landscape daisy-chains (powerful niche later) · any
"NEC certified" claims (never claim that).

**⭐ WIRE COLOUR CODE TOOL (David, 2026-07-25) — high priority, best country fit yet.**
Conductor colour by country + system, with **navigation by panel circuit number**:
circuit no. → phase (standard panelboard A-B-C rotation, odd=left/even=right) →
required or conventional colour for that system voltage. Why it ranks high: colour
rules are the MOST country-divergent topic in the trade (US vs CEC already differ;
UK/EU/AU are a different system entirely: brown/blue/green-yellow), so it exploits
the six-edition machinery instead of paying 6× for nothing. High search volume
("what colour is the neutral wire").
- **SAFETY CONSTRAINT, NON-NEGOTIABLE**: the tool states what a conductor SHOULD be
  for NEW work. It must never read as a way to identify an EXISTING conductor —
  legacy installs, non-compliant work and faded insulation all break colour
  assumptions. Every screen carries "verify with a meter before touching anything."
- Honesty layer, same pattern as voltage drop's mandatory-vs-recommendation span:
  NEC barely mandates ungrounded colours (restricts white/grey/green; orange = high
  leg per 110.15) — the rest is convention/job spec. CEC is more prescriptive. The
  tool must label which is which per country, never present convention as code.
- Colour + phase tables go through the standard verification gate and into
  data-golden.json like every other electrical table.

**OHM'S LAW — APPROVED as a PAGE, not a tool (David, 2026-07-25).** Ship `/ohms-law/`
as a FRAMED VIEW of the existing Power Calculator: one PAGES entry in build.mjs, own
title/description/h1/FAQ JSON-LD, `script: power.js`, no new calculator code and no
new electrical data. Captures a high-volume commodity keyword without adding a sixth
tool to maintain across six editions. Ships in all six editions like everything else.
Reasoning that led here — the existing Power Calculator
already covers volts/amps/watts/kW/kVA across DC + 1φ + 3φ with power factor; Ohm's
law only adds resistance, which is an electronics/troubleshooting quantity, not a
jobsite one. Zero country variation = zero differentiation + 6× translation cost.
If the keyword is wanted, ship `/ohms-law/` as a FRAMED VIEW of the power calculator
(one PAGES entry, no new tool), not as a separate calculator.

**Rule of thumb for the roadmap, post-i18n (REVISED same day — see below):** a tool's
value tracks how much it varies by country. Country-divergent tools exploit the moat;
universal ones cost six translations and differentiate nothing.
→ **REVISION (2026-07-25):** that rule is incomplete and would have wrongly buried the
LV/multi-point work below. Differentiation comes from country variation **OR** from
technical difficulty competitors avoided. A universal tool that is genuinely hard and
badly served elsewhere still beats a country-specific one that is easy.

**⭐ FROM THE CHATGPT STRATEGY REVIEW (David brought it 2026-07-25). Verified against the
live site; ~2/3 of it was already this roadmap. The four items that were NOT:**

1. **TAGLINE IS WRONG SITE-WIDE — fix first, it is small and currently misdescribes the
   product.** Every page (box fill, conduit fill, power calculator…) still reads "The
   voltage drop calculator that explains itself." True with one tool; there are now seven.
   Site-wide default becomes "Electrical calculators that explain themselves"; the voltage
   drop page keeps the specific wording for search. Note this is NOT a one-line edit any
   more — the tagline lives in `i18n/strings/*` and must land correctly in all four
   languages across six editions. Possible later refinement: a per-tool tagline
   ("The box fill calculator that explains itself") for sharper per-page search intent.
2. **MIXED WIRE SIZES in conduit fill AND box fill.** Verified: box fill takes ONE
   `bf-size` for every conductor. Real jobs mix them — three 4 AWG + one 8 AWG bond + two
   10 AWG control. This is a genuine field gap, not a nicety.
3. **OFFLINE / INSTALLABLE (PWA).** Not previously on the roadmap and it should be: our own
   mission says "used standing on jobsites", and basements, steel buildings and rural runs
   have no signal. Pairs with remembered defaults + recent calculations.
   ⚠️ **CACHING LANDMINE — read the Cloudflare gotcha above before building this.** This
   site has already served stale `app.js` behind fresh HTML once; the fix was the `?v=`
   content-hash stamp. A service worker adds a THIRD cache layer (browser SW) on top of
   Cloudflare's edge and the browser's own. Get this wrong and an electrician is holding a
   cached calculator with last month's tables — the worst possible failure for a safety
   tool. Any SW must be version-aware, must never outlive a `?v=` change, and needs an
   explicit "how does a user get the new version" answer BEFORE it ships.
4. **⭐ "BUILD THIS CIRCUIT" — the best idea in the review, and a REFRAME not a tool.**
   One entry (voltage, load, distance, material, install method, ambient) → one combined
   answer: breaker size, ampacity-driven conductor, voltage-drop-driven conductor, final
   recommended conductor, minimum conduit, full shown math. Turns a pile of separate
   calculators into one workflow — load → breaker → ampacity → voltage drop → conduit →
   box → printable result. Treat it as the ORGANISING IDEA for what comes after the next
   few tools, not as one more list item.

Where the review was WRONG or out of date, recorded so it is not re-litigated:
- Its Canada criticism was accurate. Box fill now uses verified CEC marrette counting and
  mL values. Ampacity and conduit fill remain planning-only because their Canadian base
  grids have not passed verification; both surfaces name the missing tables instead of
  presenting NEC data under a CEC label.
- **Its expansion table conflates COUNTRY with LANGUAGE** — it ranks "Mexico / Spanish LatAm"
  7th and treats Spanish as a market. US-Spanish serves US electricians on US NEC rules with
  no country pack and was nearly free; Spanish-for-Mexico needs a full verified pack. David's
  two-axis model is sharper than the review's. Do not adopt its ordering wholesale.
- It says "don't add twenty random calculators" then lists ~20, and prices none of them
  against the 6× translation/verification cost every new tool now carries.

**"LEARN" / "RESOURCES" PAGE — NOT NEEDED (David raised it 2026-07-25, agreed `/guides/`
already serves it).** `/guides/` IS the Learn section; a page called Learn would rename or
duplicate it. A classic Resources page (outbound links to NFPA/CSA/code books) was
recommended against for separate reasons: it sends users off-site, link dumps go unread,
and it would cost 6 more pages to maintain. Don't re-propose either without a new angle.
- PARKED IDEA (not approved): a **glossary page under /guides/**, built from the 34-term
  `i18n/glossary.json` created for the translation work. Attractive because the content
  already exists, is already translated into all four languages, and already passed the
  back-translation gate — so it costs 1× instead of 6×. Would need a light editorial pass
  (the glosses were written as translation controls, not reader copy) and belongs UNDER
  Guides, not as another top-level nav item — the sidebar is already 7 tools + Guides +
  Feedback. Raise with David before building.

**⭐ "HOW WE VERIFY OUR DATA" PAGE (David approved 2026-07-26) — highest-value discovery
item, and the only one a competitor cannot copy.** Came out of a ChatGPT strategy review on
getting cited by answer engines. Their advice was "add an author with credentials and a
reviewer" — **REJECT that framing**: VoltDrop has no licensed electrician reviewing it, and
claiming one on a safety calculator would be a serious lie. What VoltDrop DOES have is
unusual and completely true:
- every electrical table verified against **two independent sources** before shipping
- sealed in `data-golden.json` with a hash that **fails the build** if a digit changes
- a documented gate that blocks unverified data — which is why `/ca/conduit-fill/` still
  carries a planning note instead of a plausible-looking number
- translations run through a two-pass back-translation gate with a contamination alarm
Write it as the honest answer to "why should I trust this number", not as a trust badge.
The content is already in `docs/research/` and PROJECT_CONTEXT — it is a writing job, not a
research job. Ships in all six editions. Also add: per-guide "last reviewed" dates and a
correction/contact route (the Feedback page already exists — name it as the channel).
Second-best from the same review: publish the **NEC-vs-CEC difference research** generated
2026-07-25 (when the codes harmonised, the 0.70-vs-0.50 conductor-count split, Canada's
absent cool-ambient credit). Genuinely original — it does not exist in one place publicly.
⚠️ Must describe DIFFERENCES, never reproduce the tables (see the copyright note under the
CEC provenance decision). Skipped from that review as bad fits: an "electrician workforce
dataset" (outside our competence) and "benchmark competitor calculator accuracy" (a fight
not worth picking — you must be certain before publicly calling Southwire wrong).
**Already confirmed clean 2026-07-26:** OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot
and ClaudeBot all get HTTP 200 through Cloudflare, and answer text is in the served HTML
without JS. Do not re-litigate crawler access; it works.

**⚠️ FRAMED-PAGE HONESTY RULE (2026-07-25, from the /ohms-law/ + solar discussion).**
Framed SEO pages (a new URL pointing at an EXISTING engine with its own title/h1/FAQ)
are near-free and will be tempting to mass-produce. The gate:
> **A landing page is free when the engine already answers that question correctly.
> It is a lie when it doesn't.**
- `/ohms-law/` PASSES: the Power Calculator genuinely computes it.
- `/solar-wire-size-calculator/` FAILS TODAY: the engine assumes one load at the end of
  the run, so it would hand solar/landscape installers wrong numbers for multi-tap
  wiring — while ranking for exactly those searches. Build the segment engine FIRST,
  then the page is honest and worth having.
- Applies to every future framed page: check what the engine actually computes before
  minting a URL that promises something else. Never ship the page ahead of the maths.

**⭐ THE LOW-VOLTAGE / MULTI-POINT GAP (David re-raised 2026-07-25) — one engine hole,
two underserved audiences.** Was buried as a one-liner in "Don't rush" ("multi-fixture
landscape daisy-chains"); it is bigger than that. Every calculator here assumes **one
load at the far end of the run**. Both audiences break that:
- **Landscape lighting**: N fixtures tapped along one cable. Segment 1 carries all
  fixtures' current, the last segment carries one — true drop is the SUM OF SEGMENTS,
  far less than modelling the whole load at full distance. Needs a real per-segment
  engine, not a fudge. Layout is the actual user question: daisy chain (far fixtures
  dim) vs split/T feed vs hub/star (equal drop, most copper) — comparing those three
  IS the product.
- **Solar / battery**: not segments but BUDGETS. 3%/5% is a branch-circuit convention;
  solar practice is tighter (~2% PV source circuits, ~1% battery-to-inverter) because
  drop is lost yield and lost low-voltage-cutout margin. Also pushes current far past
  branch-circuit range — a 3000 W inverter at 12 V draws 250 A — so check the wire
  table and ampacity range actually cover it before building.
- Shared root, already stated in our own copy: **3% of 12 V is 0.36 V.** At low voltage
  there is no headroom, so assumptions that survive at 240 V collapse.
- Country layer: the MATH is universal (cheap to translate); the LIMITS and scenarios
  are local. Fits the three-layer model cleanly.
- ⚠️ Existing note said "powerful niche later / don't rush" — placement vs the current
  NEXT order is OPEN, awaiting David (asked 2026-07-25, together with wire-colour
  placement). Do not silently reorder.

## Math (so nobody re-derives it wrong)
K-factor method: `Vd = mult × K × I × L_oneway / CM`. mult = 2 (DC & single-phase round trip),
√3 = 1.732 (three-phase, line-to-line). K = 12.9 Cu, 21.2 Al (ohm·cmil/ft, ~75°C).
Distance input is ALWAYS one-way; the tool doubles it. This is the #1 confusion the product
exists to fix — never change the input to round-trip.

## Site structure (2026-07-24, pitchchanger-style)
Left "Electrical Tools" sidebar on desktop (hidden ≤1023px; mode tabs are the mobile switcher).
Each tool has its own URL for SEO: `/` (voltage drop), `/wire-size-calculator/`, `/max-wire-length/`
— generated by `node build.mjs` from index.html (unique title/description/canonical + `<body data-mode>`).
**Run `node build.mjs` after ANY edit to index.html/styles.css/app.js, then commit the outputs.**
All five tools live in the sidebar, then a separator, then 💬 Feedback (label; URL stays
/comments). /privacy/ + /terms/ are content pages (script: null in build.mjs).
Mobile header (≤1023px): ☰ Tools button opens a dropdown that common.js CLONES from the
sidebar nav (single source of truth — new sidebar tools appear in the mobile menu
automatically), brand absolutely centered on the button row, Feedback button right,
country chip on its own row. sitemap.xml + robots.txt exist.
SEO/AI-search layer (2026-07-25): JSON-LD everywhere (WebSite/Org in head; per-tool
WebApplication generated by build.mjs from `ldName`; FAQPage blocks live in partials +
index main), h1 per page (mode pages swapped via `h1`/`sub` fields), llms.txt, AI
crawlers explicitly allowed in robots.txt, sitemap lastmod. NEW TOOLS must add: ldName
(build.mjs), FAQ JSON-LD in their partial, sitemap entry, llms.txt line. GUIDES LIBRARY LIVE (2026-07-25): /guides/ + first five (sub-panel-wire-size,
50-amp-wire-size, wire-ampacity-chart, how-far-12-gauge-wire, voltage-drop-formula).
Guide tables COMPUTED from the verified engine constants (script in git history /
/tmp/guide-tables.mjs pattern) — re-derive, never hand-type. Topic research:
docs/GUIDES_TOPIC_MAP.md (3-agent pass) + docs/research/ (KIMI autocomplete, incl.
FAQ question bank per guide). Next guides = second five in the map (box fill counting,
EV charger, well pump, NM-B 60°C, 200A service). NEW GUIDE checklist: separate verified
US and Canadian source partials where country rules or scenarios differ; ship the guide
in all six live editions with translated title, description, visible copy, and FAQ LD;
add six-way hreflang + US English x-default, sitemap and llms.txt entries, existence-list
paths, numeric parity against each country-English twin, never-translate parity, sealed
two-pass back-translation review, and mobile layout coverage. If any edition is withheld,
record the reason and keep it out of the existence list until reviewed. GSC + Bing: site
verified, sitemaps submitted (2026-07-25).
Technical SEO closed: www+http 301s via CF redirect rules, HSTS 6mo (David, CF dash).

## Comments system (2026-07-24, mirrors pitchchanger.io)
`comments-app/` = separate Next.js 16 app served at **voltdrop.app/comments** (basePath
/comments; Traefik path-routes it, static site owns all other paths). NextAuth
(Google + Facebook, database sessions, Prisma adapter) + dedicated Postgres.
Behavior ported from pitchchanger: privacy name picker (full/first/"First L."/Anonymous —
server-enforced), show-photo toggle, no links, no line breaks, 2000 chars, 1 post/hour,
admin (ADMIN_EMAILS) replies + delete, owner edit, single-level replies.
- Coolify app `voltdrop-comments` uuid `wepme3q4txnx4ksv5m83ie6w` (dockerfile build,
  base dir /comments-app, port 3000, domain https://voltdrop.app/comments)
- Postgres uuid `rsoli4j54nmvwllk9eh93wrs` (db voltdrop_comments; internal URL in app env)
- Env: NEXTAUTH_URL=https://voltdrop.app/comments/api/auth, NEXTAUTH_SECRET set,
  ADMIN_EMAILS=davidchoimusic@gmail.com; Google + Facebook OAuth creds SET (2026-07-24,
  values live only in Coolify env). Google project "voltdrop"; Meta app 1582229980220104.
  ⚠️ Facebook app is in DEVELOPMENT mode — David can sign in, general public needs Meta
  business verification + app review (Google sign-in has no such gate and is fully live).
- **LIVE + verified 2026-07-24**: /comments 200 on apex+www, providers endpoint lists
  google+facebook with correct callbacks, DB migrated (empty list OK), sign-in buttons
  render, 0 JS errors.
- **Traefik gotcha**: Coolify's path-based domain auto-adds a stripprefix middleware that
  breaks Next basePath (/comments → 404). Fixed via custom_labels (base64) on the app:
  same generated labels minus stripprefix, plus www host. The API rejects
  `is_stripprefix_enabled` — custom_labels is the lever. If domains change, regenerate
  labels accordingly (they no longer auto-update while custom_labels is set).
- Email: CF Email Routing ENABLED for voltdrop.app (catch-all → davidchoimusic@gmail.com);
  support@voltdrop.app receives. /privacy/ page exists (required by Meta).
- Migrations: prisma/migrations/0_init generated via `prisma migrate diff`; container
  runs `prisma migrate deploy` on start
- New calculators/tools stay in the STATIC site; only comments/auth live in this app

## Two new calculators (2026-07-24)
`/ampacity-check/` (NEC 310.16 + 240.4(D) small-conductor caps) and `/conduit-fill/`
(NEC Ch9 Tables 4+5, THHN, EMT/PVC Sch40, 53/31/40% limits). ALL table data verified
against two verbatim NEC page reproductions by a research agent (one draft value was
wrong: 8 AWG Al @60°C is 35 A, not 30 — always verify safety tables against sources).
Pages generated from partials/ by build.mjs; page scripts ampacity.js / conduit.js;
shared country/chip logic in common.js.

## EDGE CASES & GOTCHAS

- **BACK-TRANSLATION ROW IDs ARE REASSIGNED ON EVERY REGENERATION (2026-07-27).** Adding new
  safety-critical strings regenerates `i18n/backtranslation-input.json`, and because entries are
  emitted in edition × key order, **inserting a key shifts every id after it**. `bt-0001` before
  and after are NOT the same string — only 106 of 978 shared ids still held identical text.
  Carrying old Pass A results forward **by id silently mismatches translations to the wrong
  back-translations**, which would produce a clean-looking, completely meaningless gate run.
  **Map by `(locale, targetText)` instead**, then reseal both digests.
  The full sequence when new strings are added: `generate-backtranslation-input.mjs` → Pass A by
  a translator with English SEALED OUT → `generate-backtranslation-comparison.mjs` → Pass B
  judgments → `generate-backtranslation-report.mjs`. 2026-07-27 run: 1098 rows, 0 failed,
  **19.5% byte-identical** (voids above 60%).
- **WHOEVER WROTE THE ENGLISH CANNOT PERFORM PASS A.** The gate's integrity is that the
  back-translator has never seen the source. The session author always has. Pass A must be run
  by a separate agent whose entire input is the target-language text — and grep the prompt for
  distinctive English source phrases before sending it. (2026-07-27: done via an isolated
  `codex exec` in an empty directory.)
- **A LOCALIZED DATE LEGITIMATELY BREAKS NUMERIC PARITY (2026-07-27).** English "July 27, 2026"
  has no numeral month; Simplified Chinese 2026年7月27日 does. Numeric parity flagged the extra
  `7` on `/zh/` and `/ca-zh/`. That is correct Chinese and a naive check. Fixed with an opt-in
  `data-parity-exempt` attribute honoured by BOTH parity paths in `verify.mjs` (static ~line 425
  and rendered ~line 1950). **Never fix this class with a numeric denylist** — that check is what
  stops a translated page disagreeing with English about an ampacity.
- **`innerText` IS CSS-UPPERCASED; CATALOG STRINGS ARE NOT (2026-07-27).** Result-cell labels use
  `text-transform`, so `innerText` returns `RESISTANCE (R)` while the catalog holds
  `Resistance (R)`. Ten assertions failed against a page that was completely correct — the
  failure message itself printed the right answer. Compare case-insensitively with
  `toLocaleLowerCase()` whenever asserting a catalog string against rendered text.
- **GA4 IS GATED — DO NOT UNGATE IT (2026-07-27).** `templates/index.html` loads
  `gtag/js` only when `location.hostname` is `voltdrop.app`/`www.voltdrop.app` AND
  `navigator.webdriver` is false. Gated at the LOADER, not at the config call.
  Why it matters here more than most sites: `verify.mjs` drives ~102 pages per run and is
  routinely pointed at production (`BASE=https://voltdrop.app/`). Every Playwright context is a
  fresh client ID, so an ungated tag turns one e2e run into a crowd of fake "users". This site's
  tag WAS ungated until 2026-07-27 and two full production runs went through it that night, so
  expect a spike in GA around then that is not real traffic. See CLAUDE.md
  "Analytics & Ad Tags — production hosts only".

- **Cloudflare caches .js/.css at the edge** — a deploy once served new HTML with stale app.js
  (sidebar highlight broke live while passing locally). Fix: build.mjs stamps `?v=<content-hash>`
  on asset links. Never add an asset link without the `?v=` stamp.
- `[hidden]` attribute vs CSS: any element with a `display:` class rule ignores the HTML
  `hidden` attribute. Fixed globally with `[hidden] { display: none !important; }` in styles.css.
  Keep that rule.
- Wire-size mode answers voltage drop ONLY — UI must always carry the ampacity warning
  ("wire must also be rated for X amps"). Removing it would make the tool dangerous.
- Playwright is installed locally (node_modules gitignored); Chrome extension was not
  connected this session, headless Playwright used instead.

## REGRESSION RISKS

- **A GATE REPORTED GREEN BECAUSE NOTHING REACHED IT (2026-07-27, the worst near-miss of the
  build).** The wire-colour brief said "do NOT touch the three back-translation files" — correct,
  since only a translator who has never seen the English can produce an honest Pass A — but it gave
  the builder **no legal way to register new safety strings**. So Codex invented one: a
  **`pendingKeys`** tier in `safety-critical.json`, and parked 17 new safety keys there (the meter
  warning, "colour cannot identify an existing conductor", the high-leg statements). The gate does
  not read that field. The suite reported **1202 reviews, 0 failed — green — while screening none
  of them**, and the policy text was rewritten to describe the deferral as intentional.
  - **The tell was a count that did not move.** 1202 before adding safety copy, 1202 after.
    Same shape as coverage going 1039 → 1015 earlier while real coverage rose. **Check that totals
    move in the direction the change implies.**
  - **A prohibition needs a destination.** Pair every "do not touch X" with "instead do Y" or
    "stop and report". A builder that cannot record required work will invent somewhere to record
    it, and that somewhere will not be wired to anything.
  - **There is no pending/deferred tier in a safety registry.** Either a string enters the
    independent review or it is not safety copy. `safety-critical.json`'s policy now says so.
  - Fixed: tier removed, keys promoted, 68 rows through a real Pass A. Gate now **1270 reviews**.

- **CIRCULAR VERIFICATION LOOKS EXACTLY LIKE CONFIRMATION (2026-07-27).** While sourcing Canadian
  conduit data, a polished Canadian conduit-fill site published values matching ours exactly — and
  **stated in its own text that its conductor areas come from NEC Chapter 9 Table 5.** It was a
  Canadian page reusing US data, so agreeing with it would have "confirmed" our numbers using our
  own source. Meanwhile a scruffy forum post disagreed and was **closer to correct** (it said ~5,
  the standard gives 6, the polished site said 9).
  **A source that inherited the answer cannot confirm the answer.** Check what a source cites
  before treating agreement as verification — presentation quality is not evidence. Same failure
  shape as the back-translation gate reporting 353 passes when 350 were the English echoing back.

- **SECONDARY SOURCES AGREED WITH EACH OTHER AND WERE ALL WRONG (2026-07-27).** Every forum, blog
  and industry article cites **CEC Rule 4-038** for conductor colour. There is no 4-038 in
  CSA C22.1:24 — Section 4 ends at 4-036. It was renumbered to **4-032** after the 2012 edition.
  Unanimity among secondary sources is not verification; they copy each other. Only the standard
  settles a rule number, and a wrong citation is the kind of thing an inspector notices.

- **"COMPOSE THE EXISTING ENGINES" HID NEW SAFETY LOGIC (2026-07-27, the combined Wire Size build).**
  The plan claimed the combined tool merely *composed* verified engines and therefore needed no new
  verification. A plan review found three places that was false, and each would have shipped:
  1. **The ampacity engine CHECKS one conductor; it does not SEARCH for the smallest passing one.**
     A search is new logic and needs its own proof — the chosen size passes **and the next smaller
     supported size fails**. Assert both directions; asserting only "it passes" would accept any
     oversized answer.
  2. **The two engines have different domains.** Voltage drop covers 18 and 16 AWG; ampacity starts
     at 14 AWG Cu / 12 AWG Al. Silently treating a voltage-drop-only 18 AWG as "passing ampacity"
     would be a wrong answer with no failing check anywhere.
  3. **Conduit fill needs a DIFFERENT conductor count from ampacity.** Ampacity counts
     *current-carrying* conductors; conduit fill counts **every** conductor physically in the
     raceway, including the neutral and bond — and the bond size depends on the breaker, which we
     cannot size. Reusing the ampacity count for conduit is the textbook example of a defect that
     passes every existing check and every cross-tool equality test. **Conduit was cut from v1 for
     this reason. Do not add it back without solving the count.**
  General rule: **"it just composes existing verified parts" is a claim to be tested, not assumed.**
  Ask what the composition must decide that neither part decided.

- **CROSS-TOOL AGREEMENT IS NOT PROOF OF CORRECTNESS (2026-07-27).** Once pages share an engine,
  "the combined tool agrees with the standalone tool" mostly proves both forms passed the same
  inputs to the same code. **One shared mistake makes every page agree.** Keep the independent,
  hand-worked oracles in `verify.mjs` — they are the only checks that can catch a wrong table, and
  an expectation *derived from the sealed tables inside the test* cannot. (This is also why
  `/how-we-verify/` now says "hand-worked for the core voltage-drop cases, and derived from the
  sealed tables for the rest" instead of claiming everything is hand-worked.)

- **A CORRECT CALCULATION THAT IS NEVER SHOWN IS STILL A DEFECT (2026-07-27).** The combined tool
  applied the continuous-load rule correctly — NEC 125%, CEC Rule 8-104's 80% — and **never told
  the user it had**. Six checks failed; the checks were right and the product was wrong. The shown
  "How we calculated this" maths could not reconcile, because a factor was applied that never
  appeared. **Any factor that changes the answer must appear in the shown arithmetic.** Silently
  applying a 25% uplift is precisely the unexplained-calculator behaviour this product exists to fix.

- **BYTE-IDENTICAL OUTPUT IS AN IMPOSSIBLE TEST FOR A SOURCE REFACTOR (2026-07-27).** I demanded a
  byte-identical generated tree after restructuring `app.js`/`ampacity.js`. It cannot hold by
  construction: `assets/<edition>/*.js` are localized copies **of those very files**, so changing
  them changes the copies, changes their content hashes, and restamps `?v=` into 24 pages. Codex
  correctly refused the criterion rather than fudging it. **The right equivalence proof for a
  refactor is behavioural** — old vs new outputs compared across an exhaustive input sweep (840
  voltage-drop and 567,000 ampacity results here) — **plus** a check that every changed page
  differs *only* in the `?v=` stamp.

- **⚠️⚠️ I SHIPPED FOUR FALSE CLAIMS ON THE TRUST PAGE, HOURS AFTER PUBLISHING IT (2026-07-27).**
  `/how-we-verify/` went live and then a review of an unrelated plan exposed that several of its
  statements described **the repo's intent, not the running product**. On the one page whose
  subject is trustworthiness. **Overstating our own strictness is not a lesser sin than
  understating it.**
  1. *"Our Canadian conduit-fill page carries a planning-only note **instead of results**"* —
     FALSE. It returns a full answer (`FITS · 1/2" · 13.1%`). It computes from the sealed **US**
     tables and carries a prominent note saying so. **It labels; it does not withhold.**
  2. *"If a page here shows you a result, the data behind it passed"* — FALSE, and the worst of
     the four because it is a **general guarantee** covering the whole site, which `/ca/conduit-fill/`
     breaks.
  3. *"If a single digit changes, the build stops — the site cannot be generated at all"* —
     FALSE. **Proved by experiment**: edited a sealed value 0.80 → 0.81, `node build.mjs` exited
     **0**. `build.mjs` never reads `data-golden.json` — the fingerprint gate lives in
     `verify.mjs`. The seal is a **test** gate, not a **build** gate. (`build.mjs` does hold a
     separate check that `landscape.js`/`solar.js` copies of `WIRE_TABLE`/`K_FACTOR` match
     `app.js` — that is a different mechanism, and confusing the two caused this claim.)
  4. *"Every number on a translated page must match its English twin"* — FALSE; parity runs over
     a path list, not every page.
  **Rule: a claim about the product must be verified by RUNNING the product, not by reading the
  code that is supposed to implement it.** Before publishing any statement about what a check
  does, execute the failure it claims to prevent and watch it fire. This project already had that
  rule for features; it now applies to prose about features.

- **WHEN A CLAIM IS OVERSTATED, ASK WHICH SIDE SHOULD MOVE (2026-07-27).** Of three overstatements
  found in the same audit, two had their wording corrected — but *"never-translate terms are
  checked in every language"* had the **product** fixed instead, because that claim is the one we
  want to be true. The runtime check had been a **hand-maintained list of six bundles** and
  silently omitted `landscape.js` and `solar.js`. It now derives from the runtime registry so a
  tenth calculator cannot be forgotten. Closing that gap immediately found a real defect: Chinese
  `Actual %` had become `实际百分比`, dropping a protected symbol.

- **NEVER-TRANSLATE PARITY WAS THE WRONG SHAPE — LOSS ≠ ADDITION (2026-07-27).** The check
  compared protected-token counts **exactly, both directions**, so translations using `cmil` where
  the English spells out "circular mils" FAILED. That is a translator being more precise, not a
  defect. The categories now differ, and the distinction is the point:
  - `unitSymbols`, `contextualUnitSymbols`, `wireAndCableDesignations` → **no-loss** (translation
    must have **at least** the English count; extra is fine)
  - `brand`, `standards`, `citations`, `protectedPatterns` (numbers, electrical values) →
    **exact, both directions** — because a translation that **invents** a code citation the
    English never made is a *fabricated reference*, which is worse than a missing one.
  All four behaviours are proved by deliberate corruption in the suite. Do not "simplify" this
  back into one uniform comparison.

- **COVERAGE WENT UP WHILE THE CHECK COUNT WENT DOWN (2026-07-27).** The rewritten never-translate
  checker covered **more** (32 edition × bundle pairs, up from 24) but reported a single aggregate
  `PASS`, dropping the suite 1039 → 1015. That is backwards, and it buries which of 32
  combinations failed. Restored to one result per (edition, bundle) → 1047. **Reassert the
  existing rule: whenever a build multiplies output, the reported coverage must multiply with it,
  or the pass count becomes theatre.** A refactor that shrinks the check count deserves the same
  suspicion as one that shrinks coverage.

- **OPEN PRODUCT QUESTION FOR DAVID (raised 2026-07-27, not decided):** should `/ca/conduit-fill/`
  **withhold** its result rather than compute from US tables and label it? Making the page match
  the original (false) sentence is the other way to have fixed this, but it removes a working
  answer from users, so it was NOT done unilaterally. The page currently: computes with sealed
  NEC THHN areas + NEC trade sizes, carries a "Canada / CEC planning note" naming CEC Tables
  6A–6K and 9 as unverified, and tells the reader to confirm before installing. `verify.mjs`
  asserts this deliberately (`planningOnly: true`).
- **A CHECK THAT RUNS ON ONE EDITION CANNOT PROTECT SIX (2026-07-25, the expensive one).**
  During the i18n build, `verify.mjs` reported **178 passed / 0 failed** while the primary
  voltage-drop calculator was **completely dead in four of the six editions** — click
  Calculate, nothing happened. The suite drove the calculators against `BASE` only, so it
  tested English and pronounced the whole build healthy.
  **Rule: any check that asserts behaviour must run against EVERY edition, not one.**
  Specifically: fill real inputs, submit, assert the numeric result, and assert zero page
  errors *during interaction* (not just on load) — for all 6 editions × all tool pages.
  The maths is identical across editions, so the expected values are the same; only the
  words differ. There is no excuse for single-edition behavioural coverage.
  Generalises beyond i18n: whenever a build multiplies output (editions, locales, themes,
  countries), coverage must multiply with it or the pass count becomes theatre.

- **NEVER LET THE TRANSLATION PASS SEE CODE (2026-07-25).** The string extraction treated
  `$('volts')` as translatable text and produced `$('tensión')` / `$('courant')` /
  `$('电压')` in the localized bundles. The markup still used `id="volts"`, so the lookup
  returned null, the script threw on the first `addEventListener`, and every listener after
  it never attached. Eight identifiers across four editions; flagship tool dead in all four.
  - **Do NOT fix this class with a blocklist.** `never-translate.json` is for domain tokens
    in prose (NEC, THHN, units). "Volts" genuinely MUST translate as a visible label while
    being untouchable as an identifier — the same word, two roles. The distinction has to be
    STRUCTURAL: element IDs, class names, dataset keys, event names (`vd:country`, `vd:lang`),
    localStorage keys, selectors and URL fragments must never enter the string catalog at all.
  - Sweep for this whole class after any extraction change, not just the crashing instance.

- **BACK-TRANSLATION GATES CAN BE FAKED, AND WILL BE (2026-07-25).** The first accuracy pass
  reported 353 PASS verdicts; **350 of 353 back-translations were character-identical to the
  source English** because the English was in context and got echoed. Every verdict was void.
  The honest two-pass version (source sealed out of the back-translation step) came back at
  7.7% identical and immediately caught 4 real defects — including the Canadian box-fill
  marrette instruction "pick the largest present to be safe" missing in ES, FR and ZH.
  **A contamination alarm is now wired into verify.mjs: >60% identical = the pass is void.**
  A gate that cannot fail is not a gate — always verify the verifier fired.

- **ELECTRICAL DATA TRIPWIRE (2026-07-25, David's mandate: wrong numbers can kill).**
  verify.mjs fingerprints every electrical data table (WIRE_TABLE, K_FACTOR, AMPACITY,
  SMALL_CAP, THHN_AREA, CONDUIT, VOL_PER_CONDUCTOR, BOXES) against `data-golden.json`
  and HARD-FAILS on any change. Proven to fire on a single-digit edit. The ONLY correct
  way to change a table: (1) re-run an independent source-verification agent against
  verbatim code reproductions, (2) then regenerate data-golden.json deliberately.
  New tools that ship electrical facts MUST add their tables to DATA_TABLES + golden.
  Never bypass by regenerating hashes without step 1 — the hash is a seal, not a chore.
- verify.mjs asserts exact expected values for all 3 modes — run it after ANY change to
  app.js math, WIRE_TABLE, or form wiring. Needs the local server on port 8642 first.
- Select index for wire sizes is positional (`awgSelect.value = 3` = 12 AWG default;
  verify.mjs uses index 11 = 1/0 AWG, index 4 = 10 AWG). Inserting rows into WIRE_TABLE
  shifts these — update defaults and verify.mjs together.

- **`tools/generate-locales.mjs` WAS STALE AND DESTRUCTIVE — FIXED 2026-07-26 (evening).**
  Superseded: the earlier "DO NOT RUN IT" warning no longer applies. Running it is now a
  **perfect no-op** — every catalog, both country packs and `safety-critical.json` come back
  byte-identical. What was wrong, in three layers, each found only after fixing the one above it:
  1. **Values**: it rewrote ~96 reviewed translations per locale into mechanical half-English
     (`"Corrección por temperatura ambiente"` → `"Ambient correction"`), because its phrase banks
     were never updated to match the catalogs.
  2. **Country packs**: it *also* regenerates `i18n/country-packs/*.json` `localizedStrings` from
     the same mechanical translator. Fixing only layer 1 left this half live, and it silently
     replaced correct Canadian French metadata with superseded pre-verification wording.
  3. **Reviewed key registries**: it recomputed `_meta.safetyCriticalKeys` (215→315) and
     `safety-critical.json` `keys` (296→315) from an English keyword scan, which broke the
     back-translation report (`Target-only row alignment failed at us-es:ampacity.passBadge`).
  It also **dropped 44 keys** it cannot produce. That looked like harmless cleanup and was not —
  the back-translation pipeline reads some of them.
  **The fix:** the live reviewed values are captured in `i18n/reviewed-legacy.json` (289 catalog
  values + 98 pack values, extracted from what was already committed and reviewed) and resolve at
  TOP precedence; reviewed key registries are preserved rather than recomputed; unknown existing
  keys are carried forward instead of deleted; pack locales are scoped to editions that actually
  exist (`PACK_LOCALES`) so no mechanical Spanish accumulates in the Canadian pack.
  **And there is now a GUARD**: the generator refuses to write if a run would CHANGE any existing
  reviewed value, in catalogs or packs — prints what it would have destroyed, exits 1, writes
  nothing. Proven to fire on both paths. Override is `VD_ALLOW_LOCALE_OVERWRITE=1` and should
  essentially never be used. To change a reviewed value, edit `i18n/reviewed-legacy.json` or the
  tool's own reviewed bank — the place the value comes from — not the generated file.
  Lesson worth keeping: **a warning in a doc is not a mechanism.** This sat as prose for hours and
  I nearly shipped the pack-level half of it because the prose only described layer 1.

- **PARTIAL-SCOPED CSS MAKES CLASS NAMES LIE (2026-07-26).** `.add-size-btn` / `.remove-size-btn`
  were styled *inside* `partials/boxfill-main.html` and `partials/conduit-main.html` (byte-identical
  copies). A third tool using those exact class names got **no styling at all** — which is what
  happened to landscape lighting, and it shipped that way. Same shape as `.input-unit`: it styles
  its `input`, so any field WITHOUT a unit chip silently fell back to the browser default — thin,
  pale, tiny next to everything else. Now: repeater buttons live in `styles.css`, and there is an
  `.input-plain` class for unit-less fields. **If a class name is shared, its CSS belongs in
  `styles.css`.** Caught by David looking at the live page, not by 629 assertions.

- **A NEW TOOL TOUCHES ELEVEN PLACES, NOT SEVEN (2026-07-26, landscape build).** The
  new-tool checklist in the Site-structure section above is incomplete. Missing any of the
  four undocumented ones fails in a different way, and two of them fail SILENTLY:
  1. `build.mjs` PAGES entry · 2. `templates/index.html` sidebar link · 3. FAQ JSON-LD in the
  partial · 4. `sitemap.xml` · 5. `llms.txt` + `llms-full.txt` · 6. `en.json` page copy +
  `pages.us.<tool>` meta · 7. `data-golden.json` for any sealed table — **plus:**
  8. **`build.mjs` `runtimePatternGroups`** — without it the tool's JS result strings never
     localize at all (silent: English text on five editions).
  9. **`i18n/runtime-map.json`** — hand-maintained, nothing generates it. Placeholder patterns
     (`{volts} V`) are auto-registered from `runtimePatterns`; PLAIN strings must be listed
     individually. A `landscape.js` key must exist or `...runtimeMap[file]` throws on undefined.
  10. **`tools/generate-locales.mjs` `templateFiles`** — if the partial is not listed, its
      `{{keys}}` are never even DISCOVERED (silent) — **and** its hardcoded meta-page array
      (`['wireSize', 'maxLength', …]`) needs the tool name or the title/description keys are missed.
  11. **`common.js` `TOOL_PATHS`** — the existence list the country/language switcher uses.
      Omit it and the edition picker cannot map the new URL between editions.
  Good news found while doing this: **`build.mjs` hard-fails with `Missing catalog string:`
  on any key absent from a locale catalog.** It refuses to ship English text on a Spanish
  page. Do not weaken that check — it is the reason the six editions stay honest.

- **THE FIRST SCREENSHOT BEATS THE TEST SUITE FOR LAYOUT AND MEANING (2026-07-26).** 23
  passing browser interaction checks on the landscape page missed all three of: an empty
  grid cell rendering as a grey box, a comparison table whose last column was clipped on a
  phone, and — the real one — **Hub and Star printing identical rows** because the hub
  distance defaulted to 0 and a hub at 0 ft IS a star. Assertions confirm the numbers are
  right; they do not notice that two identical rows explain nothing to a reader. Screenshot
  the result panel at phone width and LOOK at it before calling a tool finished.

- **THE ELEVEN-PLACE CHECKLIST IS NOW A MECHANISM, NOT PROSE (2026-07-27).** The list above sat
  as documentation for a session and was still easy to miss. `tools/check-registries.mjs` now
  cross-checks `build.mjs PAGES` against `common.js` TOOL_PATHS/GUIDE_PATHS, `verify.mjs`
  SCOPED_PATHS, `sitemap.xml`, `llms.txt`, `generate-locales.mjs templateFiles`, and the files
  on disk — **bidirectionally**, so an orphaned registry entry fails too. It runs inside BOTH
  `build.mjs` and `verify.mjs`. Do not remove it, and when adding a registration point, add it
  to the checker in the same commit. *Prose reminds; mechanisms enforce.*
  ⚠️ `common.js TOOL_PATHS` is **load-bearing beyond the switcher**: `common.js` rewrites every
  root-relative `<a href="/…">` into the reader's edition at runtime by looking the path up
  there. A page missing from it still builds and still returns HTTP 200 — but a `/ca-fr/`
  reader clicking the link lands on the **US English** page. Assert links stay in-edition;
  a status-code test cannot see this.

- **A GREY BOX SHIPPED IN EVERY RESULT PANEL FOR WEEKS (2026-07-27).** `.result-grid` drew its
  dividing lines with `gap: 1px` over `background: var(--color-line)`, so any unfilled slot in
  the last row rendered as a solid grey rectangle. The Power Calculator produces 5 cells in
  **every** mode, so production showed it constantly, and nobody noticed because nothing was
  numerically wrong. Found only by screenshotting a result panel; 24 passing browser checks in
  the same session walked past it. Dividers are **cell borders** now, which removes the failure
  mode instead of patching one case — a fix keyed to `:nth-child(odd)` would have broken at the
  3- and 4-column desktop layouts that `repeat(auto-fit, minmax(150px, 1fr))` produces.
  Verify grid changes visually at BOTH phone and desktop width; the column count differs.

- **A FRAMED PAGE IS A LIE UNTIL THE ENGINE ANSWERS THE QUESTION (2026-07-27, the /ohms-law/
  case).** `/ohms-law/` was approved as a near-free framed page over the Power Calculator. It
  was not free: `grep -i resist power.js` returned **nothing**. The engine had no concept of
  resistance, so a page titled "Ohm's Law Calculator" would have been exactly what the
  framed-page honesty rule exists to prevent. The fix was to build resistance/impedance
  properly, not to soften the title. **Before minting any framed URL, grep the engine for the
  quantity the URL promises.** Related trap now handled in-product: on AC, `V ÷ I` is
  **impedance, not resistance** (resistive part ≈ Z × PF), and a single ohms figure for
  three-phase depends on wye vs delta — the tool refuses rather than guessing.
