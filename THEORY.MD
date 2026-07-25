# Theory: VoltDrop — winning trust one verified number at a time

## Problem

VoltDrop exists because electricians repeatedly face the same clarity failure:
calculators give a number without making the assumptions visible. That is most
dangerous in ampacity work. A table lookup can be correct for ordinary
conditions and still be too high in a hot space, a crowded raceway, or at an
equipment termination with a lower temperature rating. The unsafe answer looks
precise because the missing conditions are hidden.

Electrical rules are also territorial. The physics crosses borders, but the
NEC, CEC, wire names, limits, and counting rules do not. Some current NEC and
CEC base values are deliberately harmonized while the rules applied to those
values remain different. Adoption is territorial too: a correct result under
the implemented edition can still be wrong where an earlier edition or local
amendment is in force. Trust therefore depends on making the shared data, the
territorial forks, and the edition boundary explicit.

## Operating Theory

Trust is the product. Four commitments make it concrete.

1. **Every electrical fact has a source and a seal.** New tables enter the
   calculator only after row-by-row verification. Thirteen live data tables are
   fingerprinted, so copy, localization, and interface work cannot alter a
   safety value unnoticed. CEC Tables 5A and 5C are sealed beside their NEC
   counterparts. The existing base-ampacity dataset stays byte-identical and is
   deliberately shared by NEC Table 310.16 and the 60/75/90°C columns of 2024
   CEC Tables 2 and 4 because all 105 cells shipped here were verified with zero
   mismatches.

2. **Show the calculation in the order the rule operates.** Ampacity begins in
   the conductor's insulation temperature column, then applies ambient
   correction and conductor-count adjustment together. Termination and
   small-conductor limits are caps applied afterward. The result must name the
   binding limit because that tells the worker what actually controls the
   circuit. A dash in a source table is a refusal state. Canadian Table 5A
   points create an additional conservative rule: an in-between ambient uses
   the next higher published row, never interpolation or rounding down.

3. **Keep different safety questions separate.** Derating asks how much current
   the conductor can safely carry under heat-producing conditions. The
   continuous-load rule asks how large a circuit a long-running load requires.
   They can appear in one result, but they remain two calculations with two
   reasons. Combining them into one multiplier would conceal the direction and
   meaning of each rule.

4. **Country and language are separate dimensions.** Country selects the
   rulebook; language selects the explanation. Six explicit URL editions cover
   US English, Spanish, and Simplified Chinese over the NEC pack, plus Canada
   English, Quebec French, and Simplified Chinese over the CEC pack. The country
   fork begins after the shared base lookup: CEC Table 5A uses point rows and no
   cool-ambient credit, Table 5C uses Canadian conductor-count bands, Rule
   4-004 supplies Canadian counting, and Rules 4-006, 8-104, and 14-104 supply
   Canadian caps and load checks. Country selection identifies VoltDrop's
   implemented rulebook; it does not identify what a user's authority has
   adopted, so the user must still confirm the local edition and amendments.

English remains an executable baseline. The 23 reviewed English pages are
pinned by SHA-256, including the Canadian ampacity calculator and both English
Terms pages, while electrical data has its own table seals. A legitimate copy
correction changes only the affected page hashes; it does not grant permission
to refresh unrelated pages or existing data.

## Strategy

Depth comes before breadth. Tools progress from bounded, verified formulas and
tables toward riskier code logic. Whenever a tool simplifies or lacks local
data, the limitation is visible at the point of use. Canadian conduit sizing
still carries its planning limitation. Canadian ampacity no longer does:
CSA C22.1:24, 26th edition (2024) now supplies the verified base, ambient,
conductor-count, termination, continuous-load, and small-conductor rules.

The ampacity interface mirrors the electrical model. Insulation temperature
and termination temperature are distinct inputs because they play different
roles. Ambient temperature and conductor count produce the two derating
factors. The result then shows the base value, selected ambient row, both
multiplication steps, both caps, and a plain-language binding decision.
Counting guidance sits beside the input because a mathematically perfect result
is still wrong when a neutral, spare, bond, or control conductor is classified
incorrectly.

The Canadian interface also states its simplifications. Rule 4-006 applies the
termination constraint to the first 1.2 m and permits a transition beyond it;
VoltDrop conservatively applies the lower termination column throughout.
Rule 8-104 is displayed as an 80% continuous-load ceiling for standard
80%-rated equipment, never combined with a 125% multiplier. Installed
power/lighting spares count by default, explicitly labeled as a conservative
reading because the Code is silent and the local authority may differ.

The Terms page carries the same honesty at service level. It names the 2023
NEC and CSA C22.1:24 implementation boundaries, includes every fully
implemented calculator citation, and excludes Canadian conduit tables that
remain planning-only. It also explains that states, provinces, and
municipalities adopt on different schedules, and that a local amendment or
older edition can change the answer. Known simplifications are therefore not
isolated footnotes: they are part of the product's general description.

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

- **Verified sharing is different from accidental reuse.** Current CEC Tables
  2 and 4 match NEC Table 310.16 in the supported 60/75/90°C cells, so one
  shared dataset is the honest design. Comments and independent seals prevent a
  future maintainer from duplicating it or extending the harmonization to
  unrelated columns, free-air tables, or rules.

- **The largest country divergence comes after the shared lookup.** At ten
  countable conductors, CEC Table 5C uses 0.70 while NEC Table 310.15(C)(1)
  uses 0.50. A country gate must therefore select the derating pack before any
  factor is shown.

- **Verification needs independent oracles.** Hand-checkable cases cover
  derating, termination, the small-conductor cap, continuous load separation,
  and the null-cell refusal. These examples protect the rule order rather than
  merely repeating the production function.

- **Text boundaries are script-specific.** A digit beside a Latin letter can
  belong to an identifier such as `COVID19`, but a digit beside a Chinese
  ideograph is ordinary unspaced prose. Numeric and protected-token gates
  therefore block Latin letters and digits at their edges, not every Unicode
  letter; otherwise valid Chinese citations are silently dropped or truncated.

- **Rendered behavior is the release unit.** CSS ordering can defeat a correct
  rule, controls can wrap without overflowing, and a localized asset can exist
  without being loaded. Static checks protect the build, while the release
  check still has to exercise all six calculators and measure 360/390 px
  layouts in a real browser.

- **Country honesty belongs in behavior as well as copy.** A Canadian citation
  would be cosmetic if the script still exposed NEC multipliers. The country
  gate selects CEC point-row ambient logic, CEC conductor bands, Canadian
  counting copy, Canadian cap citations, and the 80% continuous-load display.

- **Edition history can reverse a true claim.** The 2012 CEC really did list
  14 AWG copper at 20 A in the 60°C column, but the current 2024 edition lists
  15 A and matches the NEC. The old difference was evidence about the wrong
  edition, not evidence that the current grids differ.

- **An edition citation is not an adoption claim.** Naming 2023 NEC or
  CSA C22.1:24 tells the user what VoltDrop computes. It does not tell them what
  their state, province, or municipality enforces. The product needs both
  statements to avoid turning source precision into false local certainty.

## Open Questions

- **Jurisdiction adoption:** edition-sensitive tools will need to decide
  whether users select a code year or the code actually enforced by their
  state or province. The Terms now state the limitation, but they do not solve
  edition selection in the calculators.

- **Canada conduit fidelity:** Tables 6A–6K and 9 still need row-by-row
  verification before that planning warning can be removed.

- **External language review:** mechanical gates are strong, but a native
  electrician in each language remains the best check of trade idiom.
