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
the word-of-mouth. This decomposes into three commitments:

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
   it. Canada can therefore offer English and French over one CEC data pack,
   while the US can offer English and Spanish over one NEC pack. The header
   leads with country, always names the active code, and offers only languages
   actually reviewed for that country. The architecture assumes every table,
   preset, and citation is swappable by country, while copy is swappable by
   language. Each valid pair has an edition URL prefix, but a separate
   existence list prevents the picker and guide banners from linking to
   editions before their reviewed pages ship. Crucially, "recent" is
   territory-relative: codes revise every ~3 years and jurisdictions adopt
   editions unevenly. Today we can ship without a code-year selector only
   because we verified our current tables are *identical across NEC
   2008–2023*; the moment we build edition-sensitive tools (the Article 220
   load calculator), code year becomes explicit user-facing state too.

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
- **A locale is not a country.** Treating `ca|fr` and `us|es` as explicit
  country-language pairs keeps safety data attached to territory and prevents
  translation from quietly changing which code applies. A dependent language
  picker makes that model visible: impossible pairs are not offered, and
  switching countries falls back visibly instead of serving mismatched copy.
- **Same-specificity CSS ordering silently eats rules** (desktop tabs, brand
  sizing). Cosmetic, but the meta-lesson matches the data lesson: verify the
  discriminating observable (computed style, live measurement), never the
  intention.

## Open Questions

- **Jurisdiction adoption**: when we add edition-sensitive tools, do we model
  "NEC 2020 vs 2023" or the messier truth ("what does *your state* enforce")?
  Evidence needed: whether field electricians actually think in editions.
- **Canada fidelity**: the CEC's tables largely mirror the NEC's for our
  current tools, but "largely" is not "verified row-for-row." Before marketing
  the Canada edition hard, its tables deserve the same verification pass
  against CSA sources — and honest divergence handling where they differ.
- **Metric expansion cost**: IEC territories swap not just tables but method
  (mV/A/m ratings, different derating philosophy). The data-driven
  architecture assumes table-swapping suffices; the first non-AWG country
  build will test whether that assumption holds or the calculators need
  per-territory formula strategies too.
- **What do users actually ask for?** The feedback channel is live but empty.
  The roadmap's deliberate pause exists to let real field requests reorder it.
