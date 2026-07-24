# VoltDrop — voltdrop.app

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

NOT yet deployed. No hosting/DNS wired up yet.

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
Next up: split-phase/residential-240 helper · mm² for non-US · share link + print ·
simple ampacity check (separate card). Don't rush: motor starting, landscape daisy-chains,
any "NEC certified" claims (never claim that).

## Math (so nobody re-derives it wrong)
K-factor method: `Vd = mult × K × I × L_oneway / CM`. mult = 2 (DC & single-phase round trip),
√3 = 1.732 (three-phase, line-to-line). K = 12.9 Cu, 21.2 Al (ohm·cmil/ft, ~75°C).
Distance input is ALWAYS one-way; the tool doubles it. This is the #1 confusion the product
exists to fix — never change the input to round-trip.

## EDGE CASES & GOTCHAS
- `[hidden]` attribute vs CSS: any element with a `display:` class rule ignores the HTML
  `hidden` attribute. Fixed globally with `[hidden] { display: none !important; }` in styles.css.
  Keep that rule.
- Wire-size mode answers voltage drop ONLY — UI must always carry the ampacity warning
  ("wire must also be rated for X amps"). Removing it would make the tool dangerous.
- Playwright is installed locally (node_modules gitignored); Chrome extension was not
  connected this session, headless Playwright used instead.

## REGRESSION RISKS
- verify.mjs asserts exact expected values for all 3 modes — run it after ANY change to
  app.js math, WIRE_TABLE, or form wiring. Needs the local server on port 8642 first.
- Select index for wire sizes is positional (`awgSelect.value = 3` = 12 AWG default;
  verify.mjs uses index 11 = 1/0 AWG, index 4 = 10 AWG). Inserting rows into WIRE_TABLE
  shifts these — update defaults and verify.mjs together.
