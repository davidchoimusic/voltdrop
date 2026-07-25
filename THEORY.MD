# Theory: VoltDrop — winning trust one verified number at a time

## Problem

VoltDrop exists because electricians repeatedly face the same clarity failures:
unclear one-way versus round-trip distance, unexplained inputs, and calculators
that disagree without showing why. Competitors win on brand or search rank.
VoltDrop wins only if a worker can understand and independently check the
answer while standing on a jobsite.

That clarity rests on safety. A wrong ampacity row or voltage-drop limit is not
ordinary bad copy; it can put overheated wire in a wall. Electrical rules are
also territorial. The physics crosses borders, but the NEC, CEC, wire names,
limits, units, and legal force do not. A fluent page using the wrong country's
rules is more dangerous than an untranslated page.

## Operating Theory

Trust is the product. Four commitments make it concrete.

1. **Every electrical fact has a source and a seal.** New tables are checked
   against published code reproductions and independent sources before they
   ship. The nine live data tables are fingerprinted, so ordinary copy or
   localization work cannot alter a safety value unnoticed. This process has
   already caught a wrong 8 AWG aluminum value and a backwards box-fill rule.

2. **Show the math.** Tools substitute the user's values into the named
   formula or table. Guides use tables computed from the same sealed constants.
   Explaining the answer is both the clarity advantage and a continuing audit
   of the engine. It is also the site-wide brand promise: every calculator
   explains its own result, not merely that the interface is self-explanatory.

3. **Country and language are separate dimensions.** Country selects the
   rulebook; language selects the explanation. Six explicit URL editions cover
   US English, Spanish, and Simplified Chinese over the NEC pack, plus Canada
   English, Quebec French, and Simplified Chinese over the CEC pack. There is
   no automatic language or country redirect. Stage 3 applies this model to
   guides: twelve country-correct English source pages now render as 36 pages,
   without deriving the Canadian pack from the US pack or changing local
   scenarios during translation.

4. **English is an executable baseline.** The 21 generated English pages are
   pinned by SHA-256, while electrical data has its independent nine-table
   seal. Legitimate copy changes update only the affected page hashes and must
   name the scope. The site-wide tagline change updates 20 non-home pages while
   the voltage-drop homepage stays byte-identical.

## Strategy

Depth comes before breadth. Tools progress from bounded, easily verified
formulas and tables toward riskier code logic such as Article 220. Whenever a
tool simplifies, the limitation is visible. Canadian conduit sizing remains a
planning check because its conductor-area and metric trade-size tables have
not passed the source gate; the country URL is not permission to relabel NEC
dimensions as CEC data.

Localization uses stable template keys and locale-owned full thoughts.
Country packs own territorial claims, citations, limits, and scenarios.
Locale catalogs own visible words, metadata, FAQ answers, and complete runtime
sentences with named value slots. Program-facing IDs, selectors, events, URL
pieces, and data keys stay unchanged.

Shared copy follows the same explicit data model as page headings. `PAGES`
inherits a site-wide default unless a page declares an override. The homepage
declares the voltage-drop-specific tagline because that accurately describes
its engine and preserves its strongest search phrase; every other page inherits
the broader electrical-calculators promise. Tests assert that both values exist
and differ in all six editions.

Terminology is safety data. A locked glossary fixes concepts such as one-way
distance, round trip, ampacity, conductor, mandatory, termination, and
current-carrying conductor. A protected registry keeps brands, citations,
wire types, units, and source-formatted numbers unchanged. Safety text passes
two stages: Pass A receives target-language text under opaque IDs without the
English originals; Pass B introduces the originals and records a specific
meaning verdict. Contamination, repeated boilerplate, changed force, numbers,
units, or citations fail mechanically. High-exposure marketing copy can enter
the same sealed review through a separate extra-review list without falsely
classifying it as safety-critical.

Guides add one stronger invariant: every visible numeric token in a translated
page must have the same value and multiplicity as its country-English twin.
The static mirror strips scripts and markup; the browser pass repeats the
comparison over rendered `body.innerText`. This covers prose, SVG labels, and
computed tables without allowing a translator to localize digits, decimal
separators, or unit spacing. Page existence is also a release gate: the picker,
ordinary internal links, cross-country guide banners, sitemap, and llms.txt
may expose only pages that actually ship.

## Key Discoveries

- **Verification needs independent oracles.** Source review caught real table
  and prose errors. Test expectations now come from sealed constants and
  explicit country counting rules rather than hand-typed answers.

- **A locale is not a country.** The same Simplified Chinese language can sit
  over either NEC or CEC facts. Conversely, US Spanish and Quebec French do
  not imply that the other country has that language. Cross-country links keep
  the reader's language where it exists and fall back visibly where it does
  not.

- **Territorial prose must move as a whole thought.** Token-level NEC-to-CEC
  substitution created contradictions such as a mandatory limit followed by
  “not laws.” Complete country-owned sentences prevent that class of error.

- **Honest incompleteness is safer than false conformity.** Canadian voltage
  drop, ampacity, box fill, and conduit percentages have source-backed
  handling. Canadian conduit dimensions remain explicitly unverified instead
  of being presented as local facts.

- **Byte identity catches hidden extraction mistakes.** SVG text, JSON-LD,
  metadata, table cells, and script strings are easy to miss visually. Hashes,
  rendered parity, and runtime code-identity checks cover those surfaces.

- **Independence must be enforced by data flow.** The first back-translation
  attempt copied source English and produced a meaningless 100% match. The
  sealed target-only pass dropped contamination to a credible rate and found
  real defects. Stage 3 retains that separation and applies review only to the
  country-language guide strings that actually ship.

- **Numbers need their own page-level gate.** Per-string checks caught a
  translation that shortened `1960` to `60`, but tables and fragmented prose
  require a page-wide multiset. The final gate compares every visible digit
  sequence and rejects decimal commas, localized numerals, dropped cells, and
  rewordings that lose a gauge number.

- **Rendered behavior is the release unit.** CSS ordering can defeat a correct
  rule, controls can wrap without overflowing, and a localized asset can exist
  without being loaded. Verification therefore opens all editions, exercises
  the picker and calculators, and measures 360/390 px layout.

- **Placeholders preserve values, not grammar.** Translating fragments such as
  “voltage drop on” and “copper” retained English syntax and weakened
  negations. Full locale-owned sentences allow natural Spanish, French, and
  Chinese word order while named slots preserve exact live values.

- **Brand idioms must be translated as product behavior.** A literal rendering
  of “calculators that explain themselves” can imply self-explanatory software
  or machines speaking to one another. Spanish, French, and Chinese instead
  state that each result shows how it was obtained. This is the verifiable
  promise the tools actually keep.

## Open Questions

- **Jurisdiction adoption:** edition-sensitive tools will need to decide
  whether users select a code year or the code actually enforced by their
  state or province.

- **Canada conduit fidelity:** Tables 6A–6K and 9 still need row-by-row
  verification before the planning warning can be removed.

- **Metric expansion cost:** IEC territories may require different formula
  strategies, not just replacement tables.

- **External language review:** mechanical gates are strong, but a native
  electrician in each language remains the best check of trade idiom.

- **User demand:** the live feedback channel should reorder the roadmap before
  the high-risk load calculator begins.
