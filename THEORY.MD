# Theory: VoltDrop — trust through visible boundaries

## Problem

VoltDrop exists because electrical calculators often present a precise number
without making its assumptions, source boundary, or failure modes visible. A
table lookup can be right for ordinary conditions and still be unsafe in a hot
space, a crowded raceway, or at a lower-rated termination. A universal formula
can become misleading when applied outside its physical domain. A fluent
translation can preserve every number and still lose the warning that gives
those numbers meaning.

Electrical rules are territorial. Physics crosses borders, but the NEC, CEC,
wire names, limits, counting rules, and adoption schedules do not. Some present
NEC and CEC base values are deliberately harmonized while the rules applied
after that lookup remain different. A result can therefore match VoltDrop's
implemented edition and still be wrong under an earlier locally adopted
edition or a municipal amendment.

The harder product problem is not merely producing a correct result. It is
giving a worker a truthful answer to “why should I trust this number?” A badge,
invented reviewer, or unexplained claim would repeat the problem. The answer
has to expose the real protections, what each protection proves, and what none
of them proves.

## Operating Theory

Trust is the product. Six commitments make it concrete.

1. **Electrical tables enter through multi-source checking.** Each built-in
   table is compared cell by cell against at least two independently produced
   reproductions of the published table. Every reproduction has to agree.
   Disagreement stops publication. This establishes the source value before
   software automation is allowed to protect it.

2. **A seal protects checked data from drift.** Thirteen live electrical tables
   are fingerprinted. A one-digit change stops the verification suite before
   its browser checks and reports the mismatch. Re-verification and updating
   the stored fingerprint remain deliberate human steps; the seal cannot
   enforce them by itself. The seal proves that a value did not change
   unnoticed; it does not prove that the original value was correct. The
   multi-source check and the seal are separate because they answer separate
   questions.

3. **A boundary can be a label or a refusal.** Missing evidence must not become
   a plausible-looking result presented under the wrong authority. Canadian
   conduit fill computes with sealed US conductor areas and US trade sizes,
   but a prominent planning note refuses to present that output as a Canadian
   code answer and requires confirmation against CEC Tables 6A–6K and 9. Null
   ambient cells remain “not permitted.” Three-phase resistance refuses the
   missing wye/delta assumption. The response should match the boundary the
   product actually implements: label borrowed data plainly, and refuse where
   a missing assumption prevents a defensible calculation.

4. **Show calculations in the order the rule operates.** Ampacity starts in
   the insulation column, applies heat factors, then applies termination,
   small-conductor, and continuous-load limits as distinct checks. Conduit and
   box fill are sums of conductor rows, not one-size shortcuts. Conductor
   sizing searches ampacity and voltage drop independently, proves the smallest
   supported ampacity pass by also checking the next smaller size, and then
   takes the larger result. Visible order lets a worker see which rule controls
   and prevents independent safety questions from disappearing into one
   unexplained multiplier. A rule that changes the selected conductor must
   appear in the result before the expandable maths, with its factor,
   before-and-after values, and scope assumption.

5. **Country and language are independent dimensions.** Country selects the
   rulebook; language selects the explanation. Six explicit URL editions place
   US English, Spanish, and Simplified Chinese over the NEC pack and Canada
   English, Quebec French, and Simplified Chinese over the CEC pack. Country
   packs own institutional names, authority language, and data-edition facts.
   Locale catalogs own complete translated thoughts. No valid US fallback is
   allowed to become a quiet Canadian claim. Runtime parity compares a
   translation with its own country's English twin; comparing Canadian French
   with US English would force one rulebook's protected terms into another.

6. **Verification must reach the rendered product.** Every calculator route is
   driven in all six editions against an independently derived expectation.
   The numeric-parity gate currently covers translated guides, Terms, and three
   newer pages rather than the whole translated site. On those paths, visible
   numbers must match their English twins unless a specific element owns a
   legitimate locale-dependent representation, such as a month rendered as a
   Chinese numeral instead of an English month name. Those exceptions are
   marked at the element and removed in both static and rendered checks; they
   are never global number denylists. Protected values do not all carry the
   same risk: brands, standards, citations, and matched numeric values require
   exact agreement, because an addition can fabricate a claim; wire
   designations and unit symbols use a no-loss rule, because a translator may
   correctly use `cmil` where English used prose. Safety copy passes target-only
   back-translation before comparison with the sealed English meaning. English
   output has its own byte-identity gate, separate from the electrical-data
   seals. Verification reporting follows the same product dimensions as the
   generated output: each localized edition × runtime bundle and each localized
   page receives its own named result. An aggregate summary cannot substitute
   for those results because it hides both coverage growth and the failing
   artifact.

## Strategy

Depth comes before breadth. Tools progress from bounded formulas and verified
tables toward riskier code logic. Search pages follow the engine rather than
promising capabilities the engine does not own. The Power Calculator earns an
Ohm's law frame only because it now distinguishes DC resistance, single-phase
impedance, and the three-phase refusal state. The solar engine earns a focused
panel-to-controller frame because it derives the array current from Imp at Vmp
and keeps controller, battery, and inverter current bases separate.

An honest framed page shares behavior but not purpose. Its form is composed
from the parent's exact fragment and loads the parent's exact content-hashed
script, so there is no second implementation to drift. Its surrounding copy
must still solve a distinct reader problem. The Ohm's law frame explains the
resistance-versus-impedance boundary and three-phase refusal. The solar-wire
frame explains why low-voltage panel runs use a tighter loss budget and the
array operating current rather than a house-wiring rule of thumb. A new title,
heading, and search phrase alone do not create a new page.

The interface mirrors the electrical model. Ampacity keeps insulation and
termination temperatures separate. Fill tools itemize mixed conductor sizes.
Continuous-load checks remain visibly separate from heat derating. Contextual
hints follow the selected system; a three-phase line-to-line instruction is
hidden for DC and single-phase because even harmless-looking static help can
misstate the task in front of the user.

The wire-size page answers one bounded question: conductor size for heat and
distance. It reports the ampacity minimum, voltage-drop minimum, governing
conductor, listed-size movement, amp headroom, and percentage-point voltage
headroom as separate facts. The two engines have different supported floors:
voltage drop can calculate 18 and 16 AWG, while ampacity begins at 14 AWG
copper and 12 AWG aluminum. A smaller voltage-drop answer therefore remains
visible but never becomes an implied ampacity opinion. A published ambient
dash refuses the calculation, an exhausted search returns out of range instead
of the largest conductor, and equal minima are reported as a normal tie.

That answer deliberately stops short of circuit design. It does not size the
breaker, perform Article 220 or CEC Section 8 load calculation, or size conduit.
Conduit fill requires conduit type and counts every conductor, which is not the
same input as ampacity's current-carrying-conductor count. Continuous-load
wording is country-owned: the NEC edition applies the 125% whole-load method;
the CEC edition applies Rule 8-104's 80%-rated-equipment case. Neither switch
models mixed continuous and noncontinuous loads. When the switch is on, the
result states the rule before the collapsed explanation. The NEC path shows
entered load multiplied by 125%; the CEC path shows permitted ampacity limited
to 80%. The calculation section repeats the same arithmetic so the visible
conductor choice reconciles with the shown maths.

Limitations appear at the point of use and on the public verification page.
That page is an explanation, not a trust badge. It names the multi-source check,
seal, label and refusal behavior, translation screen, automatic checks, code
editions, local-adoption boundary, and absence of a licensed reviewer. A footer
link makes it globally available; one shared fragment puts it beside every
calculator's explanation, where the trust question actually arises.

Structured data follows the same visibility rule. FAQ schema is generated from
the same catalog keys as the questions and answers a visitor can read. The
build parses each framed FAQ block and stops if an entry is absent from visible
text. Search metadata therefore cannot become a second, hidden version of the
page's claims.

Localization uses stable template keys and locale-owned full thoughts.
Program-facing IDs, selectors, events, URL pieces, data keys, and storage keys
never enter translation. Country-specific statements live wholly in country
packs instead of mixing replaceable code tokens into shared prose.

The page registry is a distributed contract. `PAGES` declares the source, but
edition-aware browser routing, verification scope, sitemap URLs, generated
directories, locale discovery, and machine-readable context all have to agree.
Registry checks protect most of that contract; built-page inspection still
confirms country copy, localization, and fragment composition.

## Key Discoveries

- **Verified sharing differs from accidental reuse.** Current CEC Tables 2 and
  4 match NEC Table 310.16 in the supported 60/75/90°C cells, so one base
  dataset is honest. The harmonization does not extend to free-air tables or
  the rules applied after lookup.

- **The largest country divergence can occur after a shared value.** At ten
  countable conductors, CEC Table 5C uses 0.70 while NEC Table 310.15(C)(1)
  uses 0.50. Country selection must happen before factors are displayed.

- **Order is safety data.** Applying a termination cap before heat factors
  answers a different question from derating the insulation-column value and
  applying caps afterward.

- **Independent oracles matter.** Independently derived result expectations
  protect rule selection and arithmetic. Back-translation without the English
  source protects meaning. A seal protects later drift. None can stand in for
  the others.

- **Rendered context matters.** A localized string can exist without being
  loaded, a root-relative link can silently route a Canadian reader to US
  English, and a static hint can describe three-phase input while DC is active.
  CSS can also uppercase a result label after the catalog supplies mixed case,
  so assertions against rendered text compare with the edition's own casing
  rules. Source correctness is not enough; the release unit is the behavior a
  worker sees.

- **Dividers belong to occupied cells, not empty grid space.** Using a grid
  container's background to draw one-pixel gaps turns an incomplete final row
  into a solid grey rectangle. Cell borders draw the same divisions at any
  column count without creating a visual object where no result exists. This
  class of defect still requires screenshots; counting result cells cannot
  prove that empty space looks empty.

- **Engine reuse and page duplication are different questions.** Byte-identical
  form markup and script URLs are desirable because they prevent calculator
  drift. Byte-identical surrounding explanations are undesirable because they
  create renamed copies that compete for the same reader job. Composition is
  the lever that enforces both sides at once.

- **Visible schema needs one source of truth.** Repeating FAQ prose once in
  markup and again as independently written JSON-LD creates a quiet drift path.
  Reusing the same locale keys and checking the rendered result turns visibility
  into a build invariant.

- **An edition citation is not an adoption claim.** Naming 2023 NEC or
  CSA C22.1:24 states what VoltDrop computes. The local authority still decides
  which edition and amendments apply at the jobsite.

- **Coverage cardinality is product cardinality.** A registry-derived check can
  expand from 24 to 32 edition × bundle comparisons while making the suite look
  smaller if it reports one aggregate pass. The check counter and failure name
  must preserve every multiplied output dimension or the reported total stops
  describing the tested surface.

- **A search is new safety logic even when each check is already verified.**
  Reusing the pure voltage-drop and ampacity engines prevents formula drift,
  but selecting the minimum conductor adds its own failure modes. The search
  therefore proves both sides of the boundary: the chosen supported size
  passes and the next smaller supported size fails.

- **One combined margin would erase meaning.** Moving two listed wire sizes,
  having 25 A of ampacity headroom, and having 0.54 percentage points of
  voltage-drop headroom describe different constraints. Keeping their units
  visible makes the governing result auditable.

- **Applied silently is still unexplained.** The continuous-load engine,
  country factor, basis, and headroom can all be correct while the product is
  wrong if the visible result omits the factor. A collapsed explanation does
  not repair that gap. The result must expose the rule and its numerical
  effect, and the maths must account for the same step.

## Open Questions

- **Jurisdiction adoption:** future edition-sensitive tools may need code-year
  or jurisdiction selection rather than one country-wide implemented edition.

- **Canada conduit fidelity:** Tables 6A–6K and 9 still need full multi-source
  verification before the US-data planning label can be removed.

- **External language review:** mechanical gates are strong, but a native
  electrician in each language remains the best check of trade idiom.

- **Crawler adoption:** no major answer engine confirms that it consumes the
  proposed `llms.txt` convention; it remains a compatibility surface, not a
  traffic claim.
