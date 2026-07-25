# Theory: VoltDrop — winning electricians' trust one verified number at a time

## Problem

Every electrician on earth has to size wire, check voltage drop, and stay
inside their local code — and the existing tools make them work for it.
Review-mining of the incumbents (Southwire's app, calculator.net) surfaced the
same complaints on repeat: did the tool want one-way or round-trip distance?
What does this field mean? Why does this calculator disagree with that one?
The incumbents win on brand and on Google; nobody wins on clarity. That is the
gap VoltDrop exists to fill.

But clarity has a precondition that makes this product genuinely hard, and it
is the load-bearing principle of the whole project: **a calculator for
electricians is a safety instrument — if our numbers are wrong, people can get
hurt or die.** A wrong ampacity number or a stale code table isn't a UX bug —
it's overheated wire in someone's wall, a fire, an electrocution. Every process
decision below follows from taking that literally. Electricians
also work under *territorial* law: the US NEC, the Canadian CEC, the IEC world
of mm² and meters, BS 7671, AS/NZS — different tables, different limits,
different units, revised on multi-year cycles, adopted unevenly by
jurisdiction. A tool that quietly serves one territory's numbers to another
territory's electrician is worse than no tool.

## Operating Theory

Trust is the product. The UI's plain-English explanations earn the first
visit; verified-correct, territory-correct numbers earn the return visits and
the word-of-mouth. This decomposes into four commitments:

1. **Every number traces to a source.** No electrical constant, table row, or
   code limit ships from memory — mine, an AI's, or a blog's. Each data table
   is cross-checked against at least two independent published sources,
   anchored on verbatim reproductions of the code text itself, by a dedicated
   verification pass before deploy. This has already paid for itself twice in
   one day: the process caught a wrong draft value (8 AWG aluminum at 60°C:
   35 A, not 30) and a backwards rule in explainer copy (unbroken pass-through
   wires DO count toward box fill). The lesson generalizes: the verification
   pass catches errors in *prose* as readily as in *data*, so it reviews both.

2. **Show the math, always.** Every tool has a "How we calculated this" section
   that substitutes the user's own numbers into the named formula or table
   (with the NEC table number cited). This converts the incumbents' biggest
   trust-killer — "why doesn't this match the other calculator?" — into our
   biggest trust-builder: the user can check us against anything. It also
   keeps us honest; a formula you must display is a formula you must get right.

3. **Territory and language are separate first-class dimensions.** Country
   chooses the safety rulebook; language chooses the words used to explain
   it. Stage 2 makes that model concrete with six deliberate URLs: US English,
   Spanish, and Simplified Chinese over the NEC pack; Canada English, Quebec
   French, and Simplified Chinese over the CEC pack. The URL, never browser
   language, storage, or geolocation, fixes the edition. The header leads with
   country, always names the active code, and offers only languages actually
   reviewed for that country. A separate existence list prevents the picker
   and guide banners from linking to editions before their reviewed pages
   ship. Crucially, "recent" is territory-relative: codes revise every ~3
   years and jurisdictions adopt editions unevenly. Today we can ship without
   a code-year selector only because we verified our current tables are
   *identical across NEC 2008–2023*; the moment we build edition-sensitive
   tools (the Article 220 load calculator), code year becomes explicit
   user-facing state too.

4. **English is the executable baseline, not a draft to “clean up.”** The 21
   generated English pages are pinned by SHA-256. A baseline change is allowed
   only for an item named and explained in the release report, such as the
   Stage-2 country-fact slot, local-standard titles, edition metadata, or the
   corrected `CEC Rule 14-104` citation. Brand names, code citations, cable
   designations, units, and numbers are protected by a registry whose parity
   check covers both rendered HTML and localized runtime JavaScript. The nine
   electrical tables remain independently sealed, so changing explanatory
   copy or asset hashes cannot conceal a changed safety value. Runtime
   refactors carry a second obligation: the same inputs must produce the same
   English result characters. The pattern migration is checked across every
   result branch, not inferred from unchanged prose in the source.

## Strategy

Depth before breadth, and honesty about scope at every step. The sequence —
voltage drop first, then the adjacent lookups (ampacity, conduit fill, box
fill, power math), then derating and grounding, then the load calculator —
is ordered by (value × verifiability) ÷ risk. Simple bounded tables shipped
first because they can be verified to near-certainty; the load calculator
waits because Article 220 is where wrong answers are easiest to produce and
hardest to notice.

Where a tool simplifies, it says so in the tool itself: the ampacity check
names what it ignores (derating, continuous loads), box fill flags the >4
grounds rule it approximates, every page carries the "planning aid, not an
electrician" line, and the Terms make the legal version of that promise. The
product never claims code certification — plain-language honesty about limits
is itself a differentiator in this market.

Distribution follows the pitchchanger.io playbook: every tool gets its own URL
so search engines rank each intent separately; the shared chrome (sidebar,
mobile Tools menu — navigation available from every page, per David) makes
each landing page a doorway to the whole toolbox. The feedback system exists
to let field electricians tell us which tool is next and where clarity fails —
the roadmap deliberately pauses after the current tool batch to read it.
Country/language URLs follow one computed prefix model rather than hand-wired
page twins. That keeps the number of routing rules proportional to editions,
not editions multiplied by every guide, while the page-existence list remains
the release gate.

Copy follows the same model. HTML source templates contain stable, surface-led
keys; locale catalogs supply headings, labels, metadata, FAQ answers, and legal
copy. Runtime calculator messages are cataloged separately from electrical
tables and compiled into content-hashed assets. Their extraction boundary is
syntactic: display strings may enter the catalog, while element IDs, selectors,
classes, data keys and values, events, storage keys, and URL pieces remain
program code even when they contain the same English word. Runtime sentences
with inserted values are locale-owned data: each locale supplies the complete
sentence or formula block and positions named slots such as `{size}`,
`{material}`, `{amps}`, and `{volume}`. A static gate rejects user-facing `+`
concatenation and natural-language template interpolation in calculator
scripts, so a future tool cannot quietly restore English word order. A locked
glossary removes variation from load-bearing
concepts such as one-way distance, round trip, ampacity, conductor, mandatory,
and recommendation. Safety strings also pass a two-stage back-translation
record: Pass A sees only opaque IDs and target text; only Pass B can load the
originals and judge differences. Contamination, boilerplate verdicts, altered
numbers, units, citations, and designations all fail mechanically. Source
number formatting remains unchanged in every language.

## Key Discoveries

- **Verification-by-independent-agent works.** Having a separate research pass
  adversarially source-check tables before deploy caught real errors both
  times it ran. This is now a mandatory gate for any tool that ships
  electrical facts, and it must re-run whenever a table is touched — enforced
  mechanically: verify.mjs fingerprints every electrical data table, so an
  unreviewed change to any constant fails the test suite by construction.
- **The clarity complaints are specific and finite.** One-way vs round-trip
  distance, unexplained fields, disagreeing results. Each maps to a concrete
  design commitment (explicit one-way language, hint text under every field,
  shown math) rather than a vague "be simpler" aspiration.
- **Edition stability is checkable, not assumable.** We verified (not assumed)
  that our tables match across NEC editions — that check is what licenses the
  current absence of a code-year picker.
- **A test oracle is safety data too.** The first full country matrix correctly
  reported three Canadian box-fill mismatches, but the calculator was right:
  the typed expectation of 256 mL had no source, while CEC Table 22 and Rule
  12-3034 derive 229.6 mL. Per-edition expectations now flow from the same
  sealed territory data and explicit counting rules as the engine. Equal
  results across countries are accepted only when the underlying formulas or
  independently verified rows are equal; Canada conduit remains explicitly
  tied to its disclosed NEC-data planning mode until Canadian size tables pass
  the verification gate.
- **A locale is not a country.** Treating `ca|fr` and `us|es` as explicit
  country-language pairs keeps safety data attached to territory and prevents
  translation from quietly changing which code applies. A dependent language
  picker makes that model visible: impossible pairs are not offered, and
  switching countries falls back visibly instead of serving mismatched copy.
- **Territorial prose must be swapped as a whole thought.** Replacing only
  `NEC` with `CEC` and a few nearby spans created the live Canadian
  contradiction: a mandatory limit followed immediately by “not laws.”
  Country packs now own the complete territorial sentence and its runtime
  verdicts. Universal physics stays shared; legal force, limits, citations,
  presets, and counting rules do not.
- **Terminology is safety data too.** The product’s core distinction fails if
  “one-way distance” drifts toward “total wire length.” The locked renderings
  are deliberately explicit: Spanish “distancia en un solo sentido,” Quebec
  French “distance à l’aller (un seul trajet),” and Simplified Chinese
  “单程距离（仅去程）.” Elegant variation is less valuable than invariant
  meaning for these terms.
- **Honest incompleteness is safer than false conformity.** The verified CEC
  conduit fill percentages are 53/31/40%, but Canadian conductor areas and
  metric trade sizes from Tables 6A–6K and 9 have not passed the data gate.
  The Canadian conduit page therefore ships only as a clearly marked planning
  check and tells the user to confirm the size with the CEC or inspection
  authority. A country URL is not permission to relabel NEC dimensions as CEC
  data.
- **Byte identity is a stronger extraction test than review.** Text embedded
  inside SVGs, JSON-LD, metadata attributes, table cells, and JavaScript
  interpolation is easy to miss in a visual pass. Catalog substitution plus a
  21-page hash manifest proves the complete English render, while the existing
  data seals independently prove that safety tables did not move.
- **Independence must be enforced by data flow, not claimed in prose.** The
  first back-translation report copied each original directly into the
  “independent” column, producing a 100% match and 350 meaningless PASS
  verdicts. Separating target-only input, sealed English renderings, and the
  later comparison made contamination structurally visible. The honest pass
  dropped byte identity to 7.7% and exposed four real catalog defects: three
  missing largest-wire instructions and one weakened Chinese not-rated
  warning.
- **Rendered behavior is the release unit, not a generated file.** CSS order
  can defeat a correct-looking rule, wrapping can stay inside the viewport
  while doubling a control's height, and a translated asset can exist without
  any page loading it. Verification therefore measures computed layout, opens
  the picker in all six editions, checks the loaded asset URL, and drives every
  calculator in every edition.
- **Localization must distinguish meaning from syntax.** A raw text replacer
  translated the `voltage` and `current` arguments to the element lookup
  helper, killing listener setup in four editions while visible uses of the
  same words legitimately needed translation. Runtime localization now scans
  JavaScript structure and replaces display occurrences only; a separate
  identity gate compares all code-facing strings in all 30 localized bundle
  files. The test suite then exercises the full 6 × 7 edition/tool matrix,
  because a calculator proven in one edition says nothing about the other
  five.
- **Placeholders preserve values, not grammar.** Translating “voltage drop on”
  and “copper” separately preserved English syntax while producing malformed
  Spanish, French, and Chinese results. The stable boundary is the complete
  thought: Spanish can place material before gauge, French can attach the
  material naturally to the conductor, and Chinese can render
  `12 AWG 铜线的电压降`. The same rule matters most for negation. The ampacity
  failure is now one indivisible pattern, so Spanish and French carry explicit
  `NO` / `N’EST PAS`, while Chinese states that the rated ampacity is
  insufficient to carry the load. Named slots preserve source-formatted
  values and protected units without dictating sentence order.

## Open Questions

- **Jurisdiction adoption**: when we add edition-sensitive tools, do we model
  "NEC 2020 vs 2023" or the messier truth ("what does *your state* enforce")?
  Evidence needed: whether field electricians actually think in editions.
- **Canada conduit fidelity**: voltage-drop force, ampacity values and caps,
  box-fill volumes, and the 53/31/40% conduit percentages have source-backed
  Canadian handling. The remaining blocked item is the conduit size result:
  conductor areas and metric trade sizes from CEC Tables 6A–6K and 9 still
  require a row-by-row verification pass before the planning warning can be
  removed.
- **Metric expansion cost**: IEC territories swap not just tables but method
  (mV/A/m ratings, different derating philosophy). The data-driven
  architecture assumes table-swapping suffices; the first non-AWG country
  build will test whether that assumption holds or the calculators need
  per-territory formula strategies too.
- **External language review**: the catalogs, glossary enforcement,
  context-isolated back-translation record, contamination alarm, and
  structural parity gates are in place, but a native electrician in each
  language remains the strongest final check for trade idiom. Future edits
  should change the locked glossary only through an explicit review, then
  regenerate both passes and the safety report.
- **What do users actually ask for?** The feedback channel is live but empty.
  The roadmap's deliberate pause exists to let real field requests reorder it.
