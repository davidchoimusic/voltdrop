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

## Current state (2026-07-26) — READ THIS FIRST

**LIVE at voltdrop.app in SIX EDITIONS**, ~100 pages. Static site with a build step.

| Edition | Path | Code | Language |
|---|---|---|---|
| US English | `/` | NEC | en |
| US Spanish | `/es/` | NEC | es |
| US Chinese | `/zh/` | NEC | zh-Hans |
| Canada English | `/ca/` | CEC | en |
| Quebec French | `/ca-fr/` | CEC | fr-CA |
| Canada Chinese | `/ca-zh/` | CEC | zh-Hans |

**7 calculators** (voltage drop 3 modes · wire size · max length · ampacity+derating ·
conduit fill · box fill · power) **and 6 guides**, in every edition.

### The things that will bite you if you don't know them

1. **`node build.mjs` after ANY edit** to markup, CSS, JS or strings — then commit the
   generated pages. Nothing is hand-edited in the output directories.
2. **Strings live in `i18n/strings/*.json`, NOT in the markup.** Editing a page's text means
   editing the catalog. `i18n/never-translate.json` lists tokens (NEC, CEC, rule numbers, wire
   types, units) that must survive verbatim in every language.
3. **`verify.mjs` is now ~542 checks, not 7.** Run: `python3 -m http.server 8643` then
   `BASE=http://localhost:8643/ node verify.mjs`. Start the server, run verify, READ the
   output — never chain them into one command whose exit code you can't see.
4. **13 sealed electrical tables** fingerprinted in `data-golden.json`. The build hard-fails on
   any change. Changing one legitimately = independent source verification FIRST, then
   regenerate the golden file deliberately. Never regenerate to make a failure go away.
5. **Base ampacity is deliberately SHARED between the US and Canada** — CEC Tables 2/4 were
   verified identical to NEC 310.16 in the 60/75/90 columns. Do not "fix" this by duplicating.
   See the country-expansion section below for what genuinely differs.

### Verification machinery that exists (do not weaken it)
- **Data tripwire** — 13 sealed tables, proven to fire on a single-digit edit
- **Byte-identical gate** — English output must not change unintentionally
- **Two-pass back-translation** — safety strings re-rendered into English from the target
  language alone, with a contamination alarm that fails if results look copied
- **Numeric parity** — every number on a translated page must match its English twin
- **Per-edition interaction checks** — all 42 edition×calculator combinations actually driven

### Still open
- `/ca/conduit-fill/` carries a planning-only note — CEC Tables 6A–6K and 9 unverified
- Roadmap items awaiting placement: "how we verify" page · ground wire size · wire colour ·
  `/ohms-law/` · offline/PWA · low-voltage multi-point · "Build this circuit"
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
