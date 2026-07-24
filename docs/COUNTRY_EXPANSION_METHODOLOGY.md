# Country Expansion Methodology
How VoltDrop content and tools go international. Written 2026-07-25.
Read this BEFORE writing any new guide or building any country edition.

## The core insight (why this isn't pitchchanger)

Pitchchanger's audio rules are universal — a pitch shift works the same in
Tokyo and Texas, so going international is translation. VoltDrop is different:
**the physics is universal, but the rules are territorial.** Wire size systems
(AWG vs mm²), code tables (NEC vs CEC vs BS 7671 vs AS/NZS 3008 vs IEC 60364),
drop limits (US 3%/5% recommendation vs Canada's MANDATORY limit), wire-type
names (NM-B vs NMD90 vs Twin & Earth), voltages (120/240 vs 230/400), and even
the scenarios people ask about (US "detached garage sub-panel" vs UK "shower
circuit, 6mm or 10mm?") all change at the border. Translating a US article
into German produces a page that is fluent, confident, and **wrong** — the
worst possible artifact for a safety tool.

Therefore: **never translate articles. Regenerate them from templates +
country packs.**

## The three-layer model (every piece of content decomposes into these)

1. **PHYSICS (universal)** — Ohm's law, the drop formula, one-way vs round
   trip, why motors hate low voltage, kW vs kVA. Same everywhere. This layer
   CAN be translated freely.
2. **STANDARDS (per-country)** — tables, limits, rule citations, wire systems,
   units, wire-type names, common voltages, breaker conventions. This layer is
   NEVER translated — it is REPLACED from a verified country pack.
3. **LANGUAGE (per-locale)** — the words. Note country ≠ language: Canada
   needs EN + FR with the SAME country pack; the US Spanish page uses the US
   pack; Germany needs DE with the German pack.

## Authoring rules for every article (US ones too, starting now)

- Country facts (values, citations, wire names, voltages) live in **tables,
  worked examples, and clearly-bounded sections** — never woven casually into
  universal prose. If a paragraph mixes physics with a code citation, split it.
- Structure every guide as: universal sections (problem, physics, why sites
  disagree) + **country slots** (THE TABLE, code citations, wire-type naming,
  local scenarios, worked examples using local voltages).
- Worked examples parameterize on country voltage (120/240 US-CA, 230/400 EU,
  230 UK, 12 V DC is universal).
- Scenario framings are country research outputs, not assumptions — UK
  searchers ask about showers and cookers, not garages and hot tubs.
- Tables are COMPUTED from the country pack's verified constants (the
  /tmp/guide-tables.mjs pattern), never hand-typed, and sealed in the data
  tripwire once shipped.

## The per-country pipeline (repeatable, agent-parallelizable)

Each new country is the same five stages. Stages 1–2 are research agents
(cheap, parallel); stage 3 is the human-checkable gate; nothing ships
without it.

1. **STANDARDS MAP** — agent researches: which code governs, which tables
   (ampacity / fill / box fill equivalents), drop limits and whether they're
   mandatory, wire size system + common sizes, wire-type names and their US
   equivalents, common voltages/systems, edition currently adopted. Output:
   structured diff vs our US baseline. (The CEC-vs-NEC agent running now is
   the template for this stage.)
2. **DEMAND + COMPETITOR MAP** — agents mine local-language autocomplete,
   local forums, and local competitor sites (the 3-agent pass we ran for the
   US, re-run per country/language). Output: local topic map + FAQ bank in
   searchers' words + scenario list.
3. **VERIFICATION GATE (unskippable)** — every numeric table in the country
   pack cross-checked against ≥2 sources anchored on official/verbatim
   reproductions, exactly like the NEC pass. Sealed into data-golden.
   **A country edition without this gate does not ship. Period.**
4. **BUILD** — calculators swap data tables (the architecture is already
   data-driven: COUNTRIES / WIRE_TABLE / AMPACITY are designed for this);
   guides regenerate from their templates with the country pack + local
   scenarios, written natively in the target language (not translated from
   the US text — regenerated, using the US guide as a structural template).
5. **MEASURE + FEEDBACK** — per-country Search Console views, and the
   Feedback page becomes the native-speaker error channel.

## SEO architecture decisions

- **URL structure: subdirectories, not subdomains.** US stays at root;
  others get /ca/, /ca-fr/, /uk/, /au/, /de/ … — consolidates domain
  authority (the pitchchanger locale pattern), each with localized titles,
  descriptions, JSON-LD, and FAQ markup in the local language.
- **hreflang tags** link equivalent pages across editions so Google serves
  the right country's page (and doesn't see them as duplicates).
- **Name the local standard in titles** — the "NEC 310.16" trick generalizes:
  "BS 7671", "AS/NZS 3008", "CEC" are both keywords and trust signals.
- **Per-country sitemap sections + llms.txt sections** so AI assistants learn
  which edition to cite for which country.
- The country picker grows into a geo-suggest banner ("Looks like you're in
  Australia — switch?") once ≥3 editions exist; search should land users on
  their edition directly, so the picker is a safety net, not the main door.

## Rollout order (opportunity × effort)

1. **Canada** — same language, demand confirmed (CEC autocomplete variants
   observed), standards research already running, and the biggest content
   delta is small (a few table rows + rule citations + the mandatory-drop
   difference). Proves the pipeline end-to-end.
2. **UK** (BS 7671) and **Australia/NZ** (AS/NZS 3008) — English, distinct
   codes, mm² system; first true metric builds. Autocomplete showed real
   demand for both.
3. **EU metric/IEC** (start Germany or Spain by demand) — new language AND
   new method (mV/A/m cable ratings); test whether table-swapping suffices
   or the calculators need per-territory calculation strategies (open
   question in THEORY.MD).
- Never expand two codes at once; each country's verification gate gets
  full attention.

## What AI parallelism buys us (and what it must never shortcut)

Agents parallelize stages 1–2 (research) and draft stage 4 (build) across
countries and languages at costs no competitor doing this manually can match —
that's the moat. What agents must NEVER shortcut is stage 3: the verification
gate is serial, careful, and sealed by the tripwire. Speed everywhere else;
none at the gate. A fluent wrong answer in someone's own language is the one
product we refuse to ship.
