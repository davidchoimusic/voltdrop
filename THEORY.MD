# Theory: VoltDrop — winning trust one verified number at a time

## Problem

VoltDrop exists because electricians repeatedly face the same clarity failure:
calculators give a number without making the assumptions visible. That is most
dangerous in ampacity work. A table lookup can be correct for ordinary
conditions and still be too high in a hot space, a crowded raceway, or at an
equipment termination with a lower temperature rating. The unsafe answer looks
precise because the missing conditions are hidden.

Electrical rules are also territorial. The physics crosses borders, but the
NEC, CEC, wire names, limits, and counting rules do not. A fluent Canadian page
using NEC factors would be more dangerous than a page that plainly refuses the
calculation. Trust therefore depends on both mathematical transparency and
honest limits.

## Operating Theory

Trust is the product. Four commitments make it concrete.

1. **Every electrical fact has a source and a seal.** New tables enter the
   calculator only after row-by-row verification. Eleven live data tables are
   fingerprinted, so copy, localization, and interface work cannot alter a
   safety value unnoticed. The two ampacity derating tables are sealed beside
   the existing base ampacity and small-conductor tables; existing table hashes
   remain independent and unchanged.

2. **Show the calculation in the order the rule operates.** Ampacity begins in
   the conductor's insulation temperature column, then applies ambient
   correction and conductor-count adjustment together. Termination and
   small-conductor limits are caps applied afterward. The result must name the
   binding limit because that tells the worker what actually controls the
   circuit. A dash in a source table is a refusal state, never an invitation to
   interpolate.

3. **Keep different safety questions separate.** Derating asks how much current
   the conductor can safely carry under heat-producing conditions. The
   continuous-load rule asks how large a circuit a long-running load requires.
   They can appear in one result, but they remain two calculations with two
   reasons. Combining them into one multiplier would conceal the direction and
   meaning of each rule.

4. **Country and language are separate dimensions.** Country selects the
   rulebook; language selects the explanation. Six explicit URL editions cover
   US English, Spanish, and Simplified Chinese over the NEC pack, plus Canada
   English, Quebec French, and Simplified Chinese over the CEC pack. The only
   available base ampacity grid is NEC Table 310.16. Canadian base, correction,
   and adjustment tables remain outside the verified country pack until CEC
   Tables 2, 4, 5A, and 5C pass the source gate.

English remains an executable baseline. The 22 reviewed English pages are
pinned by SHA-256, including the Canadian ampacity calculator itself, while
electrical data has its own table seals. A legitimate ampacity copy correction
changes only the affected page hashes; it does not grant permission to refresh
unrelated pages or existing data.

## Strategy

Depth comes before breadth. Tools progress from bounded, verified formulas and
tables toward riskier code logic. Whenever a tool simplifies or lacks local
data, the limitation is visible at the point of use. Canadian conduit sizing
and ampacity derating therefore use prominent planning notes rather than
borrowed US numbers wearing Canadian labels.

The US ampacity interface mirrors the electrical model. Insulation temperature
and termination temperature are distinct inputs because they play different
roles. Ambient temperature and current-carrying conductor count produce the
two derating factors. The result then shows the base value, both multiplication
steps, both caps, and a plain-language binding decision. Counting guidance sits
beside the input because a mathematically perfect result is still wrong when a
neutral, spare, or grounding conductor is counted incorrectly. The Canadian
interface refuses the result and labels the available base grid as NEC data;
its visible note names every unverified CEC grid and the known 14 AWG
difference.

Localization uses stable template keys and locale-owned full thoughts. Country
packs own territorial claims, citations, limits, and scenarios. Locale
catalogs own visible words, metadata, FAQ answers, and complete runtime
sentences with named value slots. Program-facing IDs, selectors, events, URL
pieces, and data keys stay unchanged.

Terminology is safety data. A locked glossary fixes ambient temperature,
correction factor, adjustment factor, derating, current-carrying conductor,
termination temperature rating, and continuous load. A protected registry
keeps citations, wire types, and units unchanged. The standalone letter `A`
needs contextual protection as a unit after a number or placeholder; treating
every article “A” as an ampere symbol would create false failures.

Every ampacity string passes two translation stages. Pass A receives only
target-language text under opaque IDs. Pass B compares that independent
back-translation with the sealed English source and records a specific meaning
verdict. Contamination, repeated boilerplate, changed force, numbers, units, or
citations fail mechanically. Page-wide numeric parity adds a second defense
for fragmented labels and generated table output.

## Key Discoveries

- **The old temperature input represented two different facts.** The base
  ampacity must come from insulation capability, while the final cap comes from
  the termination rating. One selector cannot correctly express 90 °C THHN on
  75 °C equipment.

- **Order is part of the safety data.** `55 × 0.91 × 0.80` reaches 40 A before
  the limits are considered. Applying the 75 °C termination value before the
  factors would answer a different question and can change which rule binds.

- **A refusal is a real result state.** Null cells in Table 310.15(B)(1) carry
  meaning. The engine, interface, and tests must preserve that state all the
  way to a visible “not permitted” message with no numeric ampacity.

- **Honest incompleteness is safer than false conformity.** Sources disagree
  about Canadian ambient factors, Table 5C ranges differ from NEC ranges, and
  the Canadian conductor-count rule is unresolved. The Canadian editions name
  those gaps and return no factor or result.

- **Verification needs independent oracles.** Hand-checkable cases cover
  derating, termination, the small-conductor cap, continuous load separation,
  and the null-cell refusal. These examples protect the rule order rather than
  merely repeating the production function.

- **Rendered behavior is the release unit.** CSS ordering can defeat a correct
  rule, controls can wrap without overflowing, and a localized asset can exist
  without being loaded. Static checks protect the build, while the release
  check still has to exercise all six calculators and measure 360/390 px
  layouts in a real browser.

- **Country honesty belongs in behavior as well as copy.** A Canadian warning
  would be cosmetic if the script still exposed NEC multipliers. The country
  gate must refuse before any factor or computed ampacity enters the result.

- **Verification claims are safety data too.** The earlier Canadian copy said
  CEC Tables 2 and 4 matched NEC Table 310.16 even though the project had never
  produced or checked those CEC grids. The confirmed 14 AWG copper example
  (CEC 20 A versus NEC 15 A at 60 °C) disproves the premise. A conservative
  numerical result does not make a false source label acceptable; the product
  must name the borrowed table and the missing verification.

## Open Questions

- **Canadian ampacity data:** CEC Tables 2 and 4 need verified, row-complete
  base grids. Tables 5A and 5C additionally need two agreeing sources and a
  resolved conductor-count interpretation before the planning note can become
  a calculator.

- **Jurisdiction adoption:** edition-sensitive tools will need to decide
  whether users select a code year or the code actually enforced by their
  state or province.

- **Canada conduit fidelity:** Tables 6A–6K and 9 still need row-by-row
  verification before that planning warning can be removed.

- **External language review:** mechanical gates are strong, but a native
  electrician in each language remains the best check of trade idiom.
