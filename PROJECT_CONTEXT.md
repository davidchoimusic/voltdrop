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

## Current state (2026-07-24)
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
subdirectory URLs + hreflang; rollout CA → UK/AU → EU metric. CEC difference map (verified):
docs/research/CEC_VS_NEC.md — ampacity harmonized (reuse), VD MANDATORY in Canada (fixed in
product 2026-07-25), box fill is a real fork (mL, marrettes count). CA edition today = honest
NEC-based with auto note on NEC-citing pages (common.js vdCaNote) + country-aware
recommendation/mandatory wording (code-basis span).

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
EV charger, well pump, NM-B 60°C, 200A service). NEW GUIDE checklist: partial in
partials/, PAGES entry (tool:'guides', script:null), sitemap, llms.txt, FAQ LD,
verify.mjs list. GSC + Bing: site verified, sitemaps submitted (2026-07-25).
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
