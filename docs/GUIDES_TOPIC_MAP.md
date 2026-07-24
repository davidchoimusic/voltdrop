# Guides Topic Map — scored content plan
Generated 2026-07-25 from a 3-agent research pass: (A) Google demand mining,
(B) community question mining (Mike Holt, DIY forums, JustAnswer, solar forums),
(C) competitor content audit (fetched + verified pages).
Score = demand × tool-relevance × winnability. All electrical numbers in any
guide MUST go through the source-verification pipeline + data tripwire.

## The strategic finding (all three agents converge)

**Nobody in this market does tool + shown math + verified chart on one page.**
Every ranking result is either a bare calculator (Southwire — no formula shown)
or a static article/chart (Cerrowire — still on the 2017 NEC; battery-brand
content farms with contradictory numbers and invented rules of thumb). Forums
and paid Q&A still rank page 1 for distance-dependent questions because no
tool answers them definitively. That page-1 contradiction density is our
opening: VoltDrop's format (verdict + shown math + verified table + tool)
is precisely the missing artifact.

## FIRST FIVE (write in this order)

| # | Guide | Target queries | Why it wins |
|---|-------|----------------|-------------|
| 1 | **Wire size for a sub-panel (shed / detached garage), with distance tables** | "wire size for 100 amp sub panel 150 feet", "60 amp sub panel 100 feet", "running power to shed" | THE biggest question stream in communities (near-daily); page 1 = JustAnswer/forums with contradictory answers (#1 Cu vs #2 Cu vs 1/0 Al); nobody shows the VD math that reconciles them. Amp × distance grid table + worked example + both calculators. OPEN GOAL. |
| 2 | **What size wire for 50 amps?** (breaker / sub-panel / EV / hot tub framings + distance caveat) | "50 amp wire size", "what size wire for 50 amp breaker", "wire size for 50 amp 100 feet" | Highest-volume amp variant; SERP = contradictory content-farm articles (one says 4 AWG Al fine, next says never Al). Template for the whole 15/20/30/40/60/100/200-amp page family. OPEN GOAL. |
| 3 | **Wire ampacity chart (NEC Table 310.16, current)** + terminal-temperature explainer | "wire ampacity chart", "NEC 310.16", "12 gauge wire amps", "THHN ampacity" | Chart pages collect huge traffic; the top chart (Cerrowire) is on the 2017 edition and mobile-hostile. We already hold source-verified, tripwire-sealed data + an interactive tool. Include 60/75/90°C column chooser — the single most-argued ampacity topic on the forums. BEATABLE. |
| 4 | **How far can you run 12 gauge wire?** (+ table for 14/10/8/6, 120 V vs 240 V) | "how far can you run 12 gauge wire", "max length 12/2 on 20 amp" | Direct funnel to the max-length tool; SERP is prose-only, answers range 50–100+ ft with no math. Also answers the #1 hidden confusion: breaker rating vs actual load in the calculation. HIGH demand, weak coverage. |
| 5 | **Voltage drop, explained: the formula and the 3 %/5 % rule** ("is it actually code?") | "voltage drop formula", "how to calculate voltage drop", "NEC 3 percent voltage drop" | The authority piece the calculators link back to. Answers "is 3 % law or guideline" (relitigated in every forum thread), shows the K-factor formula with worked examples, explains one-way vs round-trip — our founding differentiator in article form. |

## SECOND FIVE (the bench)

6. **Box fill: how to count wires so the inspector agrees** — "inspector failed me" threads show even inspectors disagree; only ONE dedicated competitor site. Open goal + funnels to our tool.
7. **EV charger wire size (32/40/48/60 A)** — fast-growing; the 125 % continuous-load rule + NM-B 60 °C trap is the recurring confusion. Best-covered emerging topic among niche rivals, still no tool+math page.
8. **What size wire for a well pump (long runs)** — rural high-pain niche; answers vary #10→#6 for identical setups; depth-of-well subtlety nobody handles.
9. **Why NM-B/Romex is stuck at the 60 °C column** (and when THHN's 90 °C actually helps) — highest confusion-to-clarity ratio found anywhere; pure authority play.
10. **Wire size for 200 amp service** — page-1 says 2/0, 3/0 AND 4/0; the reconciling fact (NEC 310.12's 83 % dwelling rule) is almost never cited. Open goal.

## Amp-page family (roll out after #2 proves the template)
15 A, 20 A, 30 A (dryer framing), 40 A (range), 60 A, 100 A (service vs feeder). Each: direct answer, Cu + Al, distance table, appliance framings, tool links.

## Deprioritized (and why)
- **Watts→amps / kVA converters as content**: RapidTables is a fortress with massive link equity. Keep our Power Calculator, skip head-on content; maybe long-tail "how many watts can a 20 amp circuit handle" later.
- **Beginner electrical-basics explainers**: Family Handyman territory, low calculator intent.
- **Trailing scenario pages** (welder duty-cycle, RV pad, mini-split MCA, hot tub): real niches with juicy confusion, but after the first ten. The mini-split MCA/MOCP explainer is the strongest of these.

## Product insights that fell out of the research (not content)
- **DC/12 V mode is a differentiator we already have** — landscape-lighting and solar askers are poorly served by 120/240-only calculators. Say it louder on the page.
- **Two-segment drop** (feeder to sub-panel + branch beyond it) is a recurring real question ("does a sub-panel reset voltage drop?") → future calculator feature.
- **Breaker-vs-actual-load input guidance**: forum threads split 50/50 on which amps to enter. Add a hint to the current input. Cheap, high-trust.
- **Conduit-fill ↔ derating cross-link**: people conflate the 40 % fill limit with the >3-conductor ampacity derate; when the derating upgrade ships, cross-link the two tools.

## Guide page requirements (every guide, no exceptions)
Direct answer in the first two sentences → verified chart (sealed in data-golden.json if numeric) → worked example with shown math → calculator link(s) → FAQPage JSON-LD → same source-verification pass as tools → honest scope notes (edition, derating, "not an electrician"). Add each new guide to sitemap.xml + llms.txt.
