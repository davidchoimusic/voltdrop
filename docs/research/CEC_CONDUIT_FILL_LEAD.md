# Canadian conduit fill — research lead (2026-07-27)

> ## ⚠️ STATUS: **CONFIRMED that our US areas are WRONG for Canada's common wire.**
> **NOT yet a verified CEC Table 6 reproduction.** Do not ship a Canadian conduit number from
> this file. What IS now established (three independent sources, below) is that RW90 differs from
> THHN materially and in the unsafe direction — which settles that the planning-only note must
> stay until a real table is sourced.

## ⭐ UPDATE — manufacturer datasheets confirm it (2026-07-27, second pass)

Two CSA-certified manufacturer datasheets, both built to **CSA C22.2 No. 38**, published
nominal overall diameters for RW90 copper. Deriving area as `π(d/2)²`:

| AWG | General Cable / Prysmian OD | Nexans OD | agreement | GC area | THHN area | **ratio** |
|---|---|---|---|---|---|---|
| 14 str | 3.38 mm | 3.30 mm | 2.4% | 8.97 mm² | 6.26 mm² | **1.43** |
| 12 str | 3.84 mm | 3.80 mm | 1.0% | 11.58 mm² | 8.58 mm² | **1.35** |
| 10 str | 4.45 mm | 4.60 mm | 3.4% | 15.55 mm² | 13.61 mm² | **1.14** |
| 8 str | 5.99 mm | 5.90 mm | 1.5% | 28.18 mm² | 23.61 mm² | **1.19** |
| 6 str | 6.91 mm | 6.80 mm | 1.6% | 37.50 mm² | 32.71 mm² | **1.15** |

**The decisive cross-check:** the Red Seal guide's CEC Table 6 figure for 12 AWG RW90 is
**11.58 mm²**. General Cable's OD of 3.84 mm gives **11.58 mm²** — an exact match, from a
completely different direction. 6 AWG lands at 37.50 vs the quoted 38.00 (CEC rounds).

So three independent sources now agree: **RW90 is 14–43% larger in area than THHN.**
Our tool uses THHN areas, so Canadian RW90 conduit results are **undersized** — the unsafe
direction. Confirmed, not suspected.

Also confirmed from the same datasheet: RW90 ampacity is stated as "based on **CEC Part I, Table
2** for three conductors in raceway", consistent with our existing verified Table 2 work.

### What this does and does not license

- ✅ It **settles the direction and rough magnitude**. The planning-only note stays.
- ✅ It confirms **T90 nylon ≈ THHN** is worth pursuing separately — T90 is the nylon-jacketed
  Canadian THHN-equivalent, and 8 AWG matched at ratio 1.00 in the first pass.
- ❌ It is **not** a verified CEC Table 6 reproduction. Five stranded sizes of one insulation type
  is not Tables 6A–6K. Manufacturer *nominal* dimensions also are not the *code table* values —
  they corroborate, they do not substitute.

### A legitimate alternative worth an owner decision
Compute Canadian fill from **CSA-certified manufacturer nominal dimensions**, and label it exactly
that — *"computed from manufacturer dimensions for RW90, not from CEC Table 6"*. That is a
different, honestly-describable methodology rather than a claim to reproduce the code. It would be
strictly better than today's silent use of THHN areas. **Owner decision, not ours.**

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
