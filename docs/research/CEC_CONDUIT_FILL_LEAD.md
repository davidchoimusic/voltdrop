# Canadian conduit fill — research lead (2026-07-27)

> ## ⚠️ STATUS: STRONG LEAD, **NOT VERIFIED**. Do not ship any number from this file.
> Single-source arithmetic. It is enough to justify the planning-only note and to aim the next
> verification pass — it is not enough to publish.

## The question

Can we source the Canadian conduit-fill data properly instead of computing from US tables?

## The finding: the Canadian numbers are probably **materially different**, not harmonised

This was expected to go the way ampacity did — CEC Tables 2/4 turned out numerically identical to
NEC 310.16, so the base grid is deliberately shared. **Conduit fill looks different.**

A Canadian Red Seal exam-prep guide quotes CEC Table 6 conductor areas. Converting our sealed NEC
THHN areas to mm² and comparing:

| Size | Canadian type | CEC area (mm²) | NEC THHN (mm²) | ratio |
|---|---|---|---|---|
| 12 AWG | RW90 XLPE, unjacketed | 11.58 | 8.58 | **1.35** |
| 6 AWG | RW90 XLPE, unjacketed | 38.00 | 32.71 | **1.16** |
| 8 AWG | T90 nylon | 23.68 | 23.61 | **1.00** |

Two conclusions, and they point in opposite directions:

1. **T90 nylon ≈ THHN.** Ratio 1.00. T90 is Canada's THHN-equivalent — nylon-jacketed, so the
   overall diameter lands in the same place. This part may well verify as shared, the way Tables
   2/4 did.
2. **RW90 XLPE is much bigger — up to 35%.** No nylon jacket means thicker overall insulation for
   the same conductor. **RW90 is the most common building wire in Canada.**

### Why this matters, and which direction the error runs

Our tool uses THHN areas. For the most common Canadian conductor that **understates** the space
each wire occupies, so it would report a conduit **smaller** than actually required, or a fill
percentage lower than reality. That is the unsafe direction — undersized raceway, overfilled
conduit, harder pulls and derating implications.

**This is not a "we didn't get round to it" gap. The gate caught a real numerical difference.**

## Why Canadian web sources cannot close this

The obvious sources are circular. A Canadian-facing conduit-fill chart (cablify.ca, "CEC 2026")
publishes 9 × 12 AWG in 1/2" EMT — matching the NEC exactly — and **states in its own text that
its wire areas come from NEC Chapter 9, Table 5.**

So it is a Canadian page reusing US data, exactly as we do. Using it as confirmation would be
**circular verification** — the same failure mode as the back-translation gate reporting 353
passes when 350 were the English echoing back. A source that inherited the answer cannot confirm
the answer.

⚠️ One forum post claims Table 6K permits only **5** × #12 in 1/2" EMT. That contradicts the 9
above and may be a confusion with 10 AWG (which is 5). **Unresolved, and worth resolving** — it is
the difference between "areas differ slightly" and "the whole table is on a different basis".

## What would actually close it

1. **Two independently produced reproductions of CEC Table 6A–6K, Table 8 and Table 9** — the same
   bar the NEC data met. Best candidates, in order:
   - Canadian conductor manufacturers' technical guides (Nexans Canada, Southwire Canada, General
     Cable) — the NEC data was verified from exactly this kind of document
   - Canadian conduit manufacturers (IPEX for PVC)
   - Provincial apprenticeship / college training materials, which reproduce tables under licence
   - Provincial code guides (ESA Ontario bulletins; the 4-5-13 scan found was illegible)
2. **Split the job.** T90/THHN equivalence looks tractable and would unlock T90 conduit fill on its
   own. RW90 needs its own verified area table and is the bigger prize, since it is the common wire.
3. **An owner provenance decision**, separately from the Tables 2/4 one made 2026-07-25. That
   decision was about those tables; it does not extend to Section 12 or Table 6.

## Sources consulted
- dakotaprep.com Red Seal conduit fill guide (CEC 2024) — the Table 6 area figures above
- cablify.ca EMT conduit fill chart (CEC 2026) — **self-declared NEC-sourced**, circular
- electriciantalk.com threads — conflicting, forum-grade
- CSA Group store — C22.1:24 is paywalled; **no free public access** exists
- ANSI webstore — same, paid PDF
