# Theory: VoltDrop — trust through visible boundaries

## Problem

Electrical calculators present a precise number without making its assumptions,
source boundary, or failure modes visible. A table lookup can be right for
ordinary conditions and unsafe in a hot space, a crowded raceway, or at a
lower-rated termination. A fluent translation can preserve every number and lose
the warning that gives those numbers meaning.

Electrical rules are territorial. Physics crosses borders; the NEC, CEC, wire
names, counting rules, and adoption schedules do not. Some present NEC and CEC
base values are deliberately harmonized while the rules applied after that lookup
differ. A result can match VoltDrop's implemented edition and still be wrong
under an earlier locally adopted edition or a municipal amendment.

The harder product problem is not producing a correct result. It is answering
"why should I trust this number?" truthfully. A badge or invented reviewer would
repeat the problem. The answer has to expose the real protections, what each
proves, and what none of them proves.

## Operating Theory

Trust is the product. Seven commitments make it concrete.

1. **Electrical data enters through multi-source checking.** Each built-in table
   is compared cell by cell against at least two independently produced
   reproductions of the published table. Disagreement stops publication. This
   establishes the value before automation is allowed to protect it. Rules enter
   the same way as tables: the NEC 310.12 dwelling-service allowance was admitted
   only after two reproductions and an arithmetic cross-check against our own
   sealed 75 °C column agreed on every headline size.

2. **A seal protects checked data from drift.** Every live electrical table — and
   now that 310.12 factor with its four conditions — is fingerprinted. A one-digit
   change stops the verification suite. Re-verification and updating the stored
   fingerprint remain deliberate human steps. The seal proves a value did not
   change unnoticed; it does not prove the original was correct. The multi-source
   check and the seal answer separate questions and cannot substitute for each other.

3. **A boundary can be a label, a refusal, or a verified country fork.** Missing
   evidence must not become a plausible result under the wrong authority. Canadian
   conduit fill labelled its borrowed US data until CSA C22.1:24 tables passed the
   gate and earned a separate sealed path. Null ambient cells stay "not permitted."
   Three-phase resistance refuses the missing wye/delta assumption. The Canadian
   service guides publish no conductor size at all, because no verified CEC service
   rule exists here — a refusal a checker enforces, not a wording choice.

4. **Show calculations in the order the rule operates.** Ampacity starts in the
   insulation column, applies heat factors, then termination, small-conductor, and
   continuous-load limits as distinct checks. Conductor sizing searches ampacity
   and voltage drop independently, proves the smallest supported ampacity pass by
   also checking the next smaller size, then takes the larger result. A rule that
   changes the selected conductor must appear in the visible arithmetic with its
   factor and before/after values. Applied silently is still unexplained.

5. **Country and language are independent dimensions.** Country selects the
   rulebook; language selects the explanation. Six URL editions place US English,
   Spanish, and Simplified Chinese over the NEC pack, and Canada English, Quebec
   French, and Simplified Chinese over the CEC pack. Country packs own
   institutional names and authority language; locale catalogs own complete
   translated thoughts. Parity compares a translation with its own country's
   English twin — comparing Canadian French with US English would force one
   rulebook's protected terms into another.

6. **Verification must reach the rendered product.** Every calculator route is
   driven in all six editions against independently derived expectations, with one
   named result per localized page and per edition × bundle. Protected values carry
   different risk: brands, standards, citations, and numeric values require exact
   agreement in both directions, because an addition fabricates a claim; wire
   designations and unit symbols use a no-loss rule, because a translator may
   correctly write `cmil` where English wrote prose — or `100 A` where English
   wrote `100 amp`. Safety copy passes target-only back-translation before its
   meaning is compared with the sealed English. English output has its own
   byte-identity gate, separate from the electrical seals.

7. **Installation rules must not masquerade as identification.** Conductor colour
   answers what new work should use; it cannot establish what an existing wire is.
   Legacy work, faded insulation, and incorrect installation break that inference.

## Strategy

Depth before breadth. Tools progress from bounded formulas and verified tables
toward riskier logic. Pages follow the engine rather than promising capabilities
the engine does not own: the Ohm's law frame exists only because the Power
Calculator learned to distinguish DC resistance, single-phase impedance, and the
three-phase refusal state. Before minting a URL, grep the engine for the quantity
the URL promises.

**Editorial content is a derived artifact, not a second body of data.** This is
the newest and most load-bearing extension of the theory. A guide's distance
tables are views of the shipped engines: a derivation tool reads the sealed
constants through one shared reader, verifies every fingerprint *before* emitting
anything, calls the same governing-constraint function the calculator calls, and
writes a matrix that the rendered `data-*` cells are asserted against on all
thirty-six pages. Prose that quotes a number carries a provenance classification
— distance derivation, ampacity derivation, visible arithmetic, or approved
constant — and an unclassified numeric fails the build. The alternative, hand-
entered editorial tables, drifts silently from a calculator that stays correct,
and drift on this subject is the one failure the product cannot survive.

The interface mirrors the electrical model: insulation and termination
temperatures stay separate, fill tools itemize mixed conductor sizes, and
contextual hints follow the selected system so static help cannot misstate the
task in front of the user. Country-specific conduit fill is a real data fork —
shared 53/31/40% limits do not justify sharing conductor or raceway tables.

The wire-size page answers one bounded question — conductor size for heat and
distance — and deliberately stops short of circuit design. It does not size the
breaker, perform Article 220 or CEC Section 8 load calculation, or size conduit,
because conduit counts every conductor while ampacity counts only current-carrying
ones. Continuous-load wording is country-owned: NEC's 125% whole-load method, CEC
Rule 8-104's 80% rated-equipment case, neither modelling mixed loads.

Guides earn attention the same way tools do. The amp-ladder family (20/30/40/60 A
and the 100/200 A services) exists because demand research showed the amp-by-amp
question is where readers actually are, and because the field is full of
contradictory answers. The 200 A page reconciles the 2/0-versus-3/0-versus-4/0
split by naming the method behind each answer rather than asserting one. A guide
is all-or-nothing across six editions, so one slug is six pages and a full
translation round — scope is a translation decision, not a writing decision.

Limitations appear at the point of use and on a public verification page that is
an explanation, not a badge. Structured data is generated from the same catalog
keys as the visible questions, so search metadata cannot become a hidden second
version of the page's claims. The page registry is a distributed contract:
`PAGES`, browser routing, verification scope, sitemap, generated directories,
locale discovery, and machine-readable context must all agree, and a bidirectional
registry check enforces it inside both build and verification.

## Key Discoveries

- **Verified sharing differs from accidental reuse.** Current CEC Tables 2 and 4
  match NEC 310.16 in the supported cells, so one base dataset is honest. The
  harmonization does not extend to free-air tables or to post-lookup rules.

- **Matching percentages can hide unsafe input divergence.** Both codes use
  53/31/40% fill limits, but reusing THHN areas and NEC raceway areas overstated
  Canadian capacity from six conductors to nine. Country selection must precede
  the input tables. Similarly, at ten countable conductors CEC uses 0.70 where
  NEC uses 0.50 — the largest divergence can occur *after* a shared value.

- **Order is safety data.** Applying a termination cap before heat factors answers
  a different question from derating first and capping afterward.

- **Independent oracles matter and cannot substitute for each other.** Derived
  expectations protect rule selection and arithmetic; source-blind back-translation
  protects meaning; a seal protects later drift.

- **A search is new safety logic even when every check it calls is verified.**
  Composing two verified engines still adds failure modes, so the search proves
  both sides: the chosen size passes and the next smaller size fails.

- **Coverage cardinality is product cardinality.** A check that expands from 24 to
  32 comparisons while reporting one aggregate pass makes the suite look smaller
  and hides the failing artifact. Reported totals must multiply with output.

- **"Another gate covers this" is a claim to execute, not read.** Registering the
  amp ladder, the builder hit parity failures on the new pages and resolved them by
  exempting those pages' `<head>` and `aria-label`s, justified as "the
  back-translation gate owns those strings." Checked by name against all 558 keys
  in that gate: it did not. Twelve titles, twelve descriptions, and two diagram
  labels stating real ampacity values had gone from one check to zero. The
  underlying phenomenon was benign — translations using `100 A` where English wrote
  `100 amp` — so the fix was a uniform, site-wide unit equivalence rather than a
  page-shaped blind spot, proven by planting a fabricated `NEC 310.15` in a Spanish
  title and watching parity fail. Closing the hole immediately surfaced a real
  defect: a French title claiming `4 AWG` where the English said `4 gauge`. When a
  builder narrows a check so its own output passes, verify the replacement coverage
  by name before accepting the reasoning.

- **Automated checks ask whether a string is handled correctly, never whether a
  reader should see it.** A sentence written *to* the builder — "voltage belongs in
  the table heading" — became a catalog key, was translated into four languages,
  passed the critique pass, the safety registry, sealed back-translation, and 1,620
  assertions, and shipped as a live `<h2>` in six editions. In the same pass, "The
  short answer" led with a footnote on four guides while the real answer sat in the
  subtitle. Both were found by looking at a screenshot. Every mechanical gate here
  validates handling; none evaluates editorial intent. That is a permanent gap, not
  a missing check — which is why the first screenshot keeps beating the whole suite,
  and why briefs must describe the *kind* of heading wanted, never its text.

- **Rendered context matters.** A localized string can exist without loading, a
  root-relative link can silently route a Canadian reader to US English, and grid
  dividers drawn with background gaps turn an empty final cell into a grey box.
  Source correctness is not enough; the release unit is what a worker sees.

- **The builder's sandbox is not the test environment.** It could not bind a port
  or launch a browser, so its "all green" covered only the static half of the
  suite. A static-only pass is never suite-green.

## Open Questions

- **Jurisdiction adoption:** edition-sensitive tools may eventually need code-year
  or jurisdiction selection rather than one country-wide implemented edition.

- **External language review:** mechanical gates are strong, but a native
  electrician in each language remains the best check of trade idiom.

- **Editorial review has no mechanism.** Provenance and parity now protect every
  number and token, but nothing yet asks whether a heading earns its place. The
  screenshot pass is a human habit, not a gate — and the two defects it caught
  this cycle suggest that gap is where the next real failure comes from.

- **Crawler adoption:** no major answer engine confirms it consumes `llms.txt`;
  it remains a compatibility surface, not a traffic claim.
