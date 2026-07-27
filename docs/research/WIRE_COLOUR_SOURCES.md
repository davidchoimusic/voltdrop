# Wire colour code — source research (2026-07-27)

> ## ⚠️ GATE STATUS: **NOT VERIFIED. DO NOT SHIP ANY OF THIS AS PRODUCT DATA.**
>
> This file is a **starting point for a future verification pass**, not a verified table.
> The US material below is multi-source and probably close to right. **The Canadian material
> is sourced only from forum posts and contractor blogs** and does not come close to this
> project's bar of *two independently produced reproductions of the published rule*.
>
> The wire colour tool was started on 2026-07-27 and **deliberately stopped here**, because
> shipping colour data on these sources would contradict `/how-we-verify/`, which went live the
> same day promising the opposite.

## Why this tool was paused rather than built US-only

The owner's rationale for ranking it high was **country divergence** — colour is the most
country-divergent topic in the trade, so it exploits the six-edition machinery instead of paying
6× for nothing. A US-only version is the weakest form of the strongest idea, so it was not built
as a consolation prize. Build it when Canada can be sourced properly.

## What still needs to happen before any of this ships

1. Two independently produced reproductions of **each** rule below, per country.
2. An explicit owner decision on CEC provenance, the same way Tables 2/4 got one on 2026-07-25
   (recorded in PROJECT_CONTEXT under the country-expansion section). **Do not infer that the
   Tables 2/4 decision extends to Section 4 — it was made about specific tables.**
3. Sealing the resulting tables into `data-golden.json` like every other electrical table.

---

## US / NEC — multi-source, still needs formal gate treatment

Consistent across several independent industry sources (EC&M, IAEI/ECMag, eepower,
electricallicenserenewal reproductions):

| Conductor | Rule | Requirement |
|---|---|---|
| Grounded (neutral) | **200.6** | continuous **white or grey** outer finish, or **three continuous white/grey stripes** on other-than-white/grey insulation |
| Equipment grounding | **250.119** | continuous **green**, or **green with one or more yellow stripes**, or bare. 4 AWG and larger may instead be permanently re-identified at each accessible point |
| High leg (4-wire delta) | **110.15** | the leg with ~208 V to ground marked **orange**, *or other effective means*, at every point where a connection is made and the neutral is present |
| Ungrounded (hot) | **210.5 / 200.6 / 250.119 by exclusion** | **NEC does NOT mandate any colour.** It only *prohibits* white, grey and green for ungrounded conductors. Black/red/blue and brown/orange/yellow are **convention and job spec, not code** |
| Panelboard phase order | **408.3(E)** | phase arrangement **A, B, C** front-to-back, top-to-bottom, or left-to-right, viewed from the front. High leg terminates on **B** (centre) |

### Circuit number → phase (standard North American panelboard)
Circuits **1 & 2 = A**, **3 & 4 = B**, **5 & 6 = C**, **7 & 8 = A**, repeating.
Odd numbers are the left column, even the right; each *row* is one phase pair.
So for circuit `n`: `row = ceil(n / 2)`, `phase = ((row - 1) mod 3)` → A/B/C.
For a split-phase (1φ) panel the same row logic alternates between two legs instead of three.

⚠️ **This is a property of how the bus bar is physically stabbed, not a numbering rule in the
code.** It is near-universal on standard panelboards but it is not a guarantee, and a
tool must never present it as one.

### ⚠️ The convention conflict found while researching
Sources disagree about which colour is which phase in the US. Several teaching sources give
**A=Black, B=Red, C=Blue**; at least one gives **A=Red, B=Black, C=Blue**. Both are "right"
in the sense that neither is code. **This disagreement is itself the product insight** — it is
the strongest possible evidence that US ungrounded colours must be presented as convention.

---

## Canada / CEC — **THIN SOURCING, DO NOT USE**

Reported (forums + contractor blogs only — *not acceptable as a source*):

- **Rule 4-038(3)**: where colour-coded circuits **are required**, three-phase shall be
  **red (A), black (B), blue (C)**, with white for the neutral.
- The obligation is **conditional** — "where colour-coded circuits are required" — so it is not
  a blanket mandate on every Canadian circuit.
- Neutral/identified: white or natural grey, or three continuous white stripes, up to and
  including No. 2 AWG.
- Bonding: green, or green with one or more yellow stripes; larger than No. 2 AWG may be
  permanently marked instead.
- Rule 4-036 covers common neutrals and the use of identified conductors.

### ⭐ The finding that would make this tool worth building
**Canada's A and B appear to be SWAPPED relative to the common US convention.**
US habit is A=Black, B=Red. The Canadian rule is reported as A=**Red**, B=**Black**.

If that holds up under proper sourcing, it is exactly the kind of fact this site exists to
surface, and it is genuinely safety-relevant for anyone working across the border. It is also
precisely the kind of fact that must NOT be published on a forum post.

---

## Second pass, 2026-07-27 — still NOT cleared, and here is exactly why

A second sourcing attempt was made after the conduit-fill work succeeded. **Colour did not.**

What the second pass added:
- The **red (A) / black (B) / blue (C) / white (neutral)** assignment for Rule 4-038(3) is now
  reported consistently across several independent secondary sources, including **IAEI Magazine**
  (International Association of Electrical Inspectors) and Electrical Industry News Week — both
  genuine industry authorities rather than forums. The claim is very probably right.
- The conditional framing keeps recurring: the requirement applies **"where colour-coded circuits
  are required"**, not to every Canadian circuit. Any tool must carry that qualifier.
- Bonding: green, or green with one or more yellow stripes; conductors larger than No. 2 AWG may
  instead be permanently marked at each end.

Why it still fails the gate:
- Every source is a **paraphrase**, not a verbatim reproduction of the rule text. For ampacity we
  had verbatim table reproductions; for conduit we now have manufacturer dimensional data that can
  be independently derived. Colour has neither — it is a *rule*, not a *table*, so there is no
  manufacturer datasheet that can corroborate it the way an OD corroborates an area.
- `iaeimagazine.org` returned **HTTP 403**; `electricalindustry.ca` refused the connection;
  the Alberta CEC Section 4 PDF returned **403**; the ESA Ontario bulletin scan is illegible.
- **The trap that makes colour worse than conduit:** a paraphrase can silently drop the
  conditional. "Red is phase A in Canada" and "red is phase A *where colour coding is required*"
  are different rules, and the second is the true one. Publishing the first on a page an
  electrician might use to identify an existing conductor is precisely the safety failure the
  standing constraint at the top of this file forbids.

**Conclusion: colour needs the actual rule text.** Realistic routes: a provincial code guide that
quotes Section 4 verbatim, a licensed training provider's manual, or simply buying CSA C22.1:24.
Given this tool's value, **buying the standard is probably the cheapest honest path** — and it
would unblock conduit Tables 6A–6K in the same purchase.

## Sources consulted (none of these are a substitute for the published rule)
- EC&M — "Code Q&A: Identification of Circuit Conductors"; "Stumped by the Code: Identifying the
  High-Leg"; "NEC Requirements for Switchboards and Panelboards"
- ECMag — "The Wild Leg: High Leg Delta System Requirements"
- eepower — "NEC 2023 Basics: Identifying Wire-Type Equipment Grounding Conductors"
- electricallicenserenewal.com — 250.119 text reproduction
- IAEI Magazine — "Guide to the Canadian Electrical Code, Part I — A Road Map"
- becoming-an-electrician.com — panelboard circuit numbering
- ESA Ontario bulletin 4-5-13 (scanned, **not legible enough to cite**)
- open.alberta.ca CEC Section 4 PDF (**HTTP 403 — could not retrieve**)
