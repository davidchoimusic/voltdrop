# Conductor colour rules — source record (2026-07-27)

## Canada — VERBATIM from the standard. Highest confidence.

**CSA C22.1:24, 26th edition (March 2024), Section 4, page 81 — Rule 4-032 "Identification of
insulated conductors".** Same PDF and same owner provenance decision as the conduit work.

> **1)** Insulated grounding or bonding conductors shall
> **a)** have a continuous outer finish that is either green or green with one or more yellow
> stripes; or
> **b)** if larger than No. 2 AWG, be permitted to be suitably labelled or marked in a permanent
> manner with a green colour or green with one or more yellow stripes at each end and at each
> point where the conductor insulation is accessible.
>
> **2)** Insulated conductors coloured or marked in accordance with Subrule 1) shall be used only
> as grounding or bonding conductors.
>
> **3)** **Where colour-coded circuits are required**, the following colour coding shall be used,
> except in the case of service entrance cable and when Rules 4-026, 4-028, and 6-308 modify
> these requirements:
> **a)** 1-phase ac or dc (2-wire) — 1 black and 1 red, or 1 black and 1 white* (where an
> identified conductor is required);
> **b)** 1-phase ac or dc (3-wire) — 1 black, 1 red, and 1 white*; and
> **c)** 3-phase ac — **1 red (phase A), 1 black (phase B), 1 blue (phase C)**, and 1 white
> (where a neutral is required).
> \* Or white with a coloured stripe (see Rule 4-024).
>
> **4)** Where the midpoint of one phase of a 4-wire delta-connected secondary is grounded to
> supply lighting and similar loads, the conductor insulation shall be colour-coded in accordance
> with Subrule 3) and **the phase A insulated conductor shall be the insulated conductor having
> the higher voltage-to-ground**.

## ⭐ Three findings that only checking the actual standard would produce

### 1. The rule number everyone cites is obsolete
Every secondary source found — forums, contractor blogs, and industry articles — cites
**"Rule 4-038"** for colour coding. **There is no Rule 4-038 in CSA C22.1:24.** Section 4 ends at
**4-036, which is "Busbar".**

The confusion is traceable: in the **2012 edition (22nd)** the rule *was* 4-038 "Colour of
conductors", and 4-032 was "Identification of insulated neutral conductors larger than No. 2 AWG".
They were **renumbered**. Anyone quoting 4-038 today is citing a rule that has not existed for
over a decade.

### 2. Canada's high leg is on PHASE A. The NEC's is on phase B.
Subrule 4) puts the higher-voltage-to-ground conductor on **phase A**.
**NEC 408.3(E) puts the high leg on phase B (the centre bus).**

This is a genuine, safety-relevant, cross-border difference. An electrician looking for the wild
leg in the position their home code taught them will find the wrong conductor.

### 3. The obligation is conditional, and the conditional is load-bearing
"**Where colour-coded circuits are required**" — it is not a blanket mandate on every Canadian
circuit. Paraphrases routinely drop this. "Red is phase A in Canada" and "red is phase A where
colour coding is required" are different rules, and only the second is true.

## United States — WEAKER SOURCING. Must be labelled differently.

No NEC PDF is available locally. The US rules below come from **multiple independent industry
reproductions** — EC&M, Electrical Contractor Magazine (NECA), eepower, UpCodes,
electricallicenserenewal — which is the same class of source that verified the NEC ampacity
tables, but **not verbatim standard text the way Canada now is**.

- **200.6** — grounded (neutral): continuous **white or grey**, or three continuous white/grey
  stripes on other-than-white/grey insulation.
- **250.119** — equipment grounding: continuous **green**, or green with one or more yellow
  stripes, or bare. 4 AWG and larger may instead be permanently re-identified at each accessible
  point.
- **110.15** — high leg of a 4-wire delta: **orange**, *or other effective means*, at every point
  where a connection is made and the neutral is present.
- **408.3(E)** — phase arrangement **A, B, C** front-to-back, top-to-bottom, or left-to-right,
  viewed from the front. **High leg terminates on B (centre).**
- **Ungrounded conductors: the NEC mandates NO colour.** It only *prohibits* white, grey and
  green. Black/red/blue and brown/orange/yellow are **convention and job spec, not code.**

⚠️ **Because of that last point, the US and Canadian pages are not mirror images.** Canada has a
prescriptive (if conditional) colour rule; the US largely does not. The tool must present the US
side as *convention* and the Canadian side as *code where colour coding is required* — never
flatten the two into one table.

## Circuit number → phase (both countries, standard panelboard)

Circuits **1 & 2 = A**, **3 & 4 = B**, **5 & 6 = C**, **7 & 8 = A**, repeating.
Odd numbers left column, even right; each *row* is one phase pair.
For circuit `n`: `row = ceil(n / 2)`, `phase = (row - 1) mod 3`.

⚠️ **This is a property of how the bus is physically stabbed, not a numbering rule in either
code.** Near-universal on standard panelboards, but not a guarantee. The tool must never present
it as one, and must never be usable as a way to identify an existing conductor.

## Standing safety constraint (unchanged, from the original roadmap entry)

The tool states what a conductor **should be for NEW work**. It must never read as a way to
identify an **existing** conductor — legacy installs, non-compliant work and faded insulation all
break colour assumptions. **Every screen carries "verify with a meter before touching anything."**
