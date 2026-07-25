# CEC Ampacity Derating — Verified Research (2026-07-25)

Companion to `AMPACITY_DERATING_TABLES.md` (US/NEC side). This file covers CSA C22.1.

## Source inventory (what each fact rests on)

| Source | Edition it quotes | Strength |
|---|---|---|
| Full licensed CEC PDF, C22.1-12 (678 pp), `~/Desktop/cec-research/cec-full.pdf` | **2012 (23rd)** verbatim | Actual code text |
| IAEI Magazine, Ark Tsisserev (chair, CEC Part I Technical Committee), "Rules 4-004 and 12-2210 — Intricacies of Application", Sept/Oct 2015, iaeimagazine.org | **2015 (24th)** verbatim Rule 4-004 | Industry journal quoting code verbatim |
| APEGNB "2024 CE Code presentation" (84 pp), apegnb.com | **2024 (26th)** verbatim rule quotes | Engineering association deck |
| Nexans Canada, "Key 2024 CE Code Changes Impacting Wire & Cable" (65 pp) | **2024** changes | Manufacturer deck |
| Alberta STANDATA 21-ECB-004 (2021) and 24-ECB-004 (2024) | 2021 / 2024 | Government bulletins |
| Unitray technical sizing data 2025 (worked examples) | current-ish | Manufacturer |

Cross-checks: Google AI Overview values, r/electricians quote of the newer-edition Table 5C header, CanSIA PV course — all agree with the 2012 verbatim numbers.

**Verification status:** CONFIRMED VERBATIM against the 26th edition (2024). David
obtained a full C22.1:24 PDF on 2026-07-25 (`~/Desktop/cec-research/cec2024.pdf`);
Table 5A's full 16×9 grid, Table 5C's five rows, and Rule 4-004(3)(4)(6) are
word-for-word identical to the 2012/2015 texts below. One 2024 renumbering to note:
the correction-factor subrule is restructured — 4-004(7) now routes Table 5A via
7)b)i, 5B via 7)b)ii, 5C via 7)b)iii, 5D via 7)b)iv, and exempts auxiliary gutters
(≤30 conductors) and conductors inside equipment; the old standalone "Table 5A where
ambient > 30 °C" subrule (8) is absorbed into 7)b)i. The counting rules (3)/(4)/(6)
are unchanged in wording and number. Table 5A's title now reads "Tables 1, 2, 3, 4,
and 60" and adds the footnote "insulation temperature rating is the temperature marked
on the conductor." For Tables 1–4 base values see `CEC_TABLES_2_4_VERIFIED.md`.

---

## 1. Table 5A — ambient temperature correction

**It has SEPARATE COLUMNS per insulation temperature rating — nine columns, like the NEC structure (not a single column).** Verbatim from C22.1-12, p.307:

> Table 5A — Correction factors applying to Tables 1, 2, 3, and 4 (ampacity correction factors for ambient temperatures above 30 °C) (See Rules 4-004(8) and 12-2210 and Tables 1 to 4, 57, and 58.)

| Ambient °C | 60 | 75 | 90 | 105* | 110* | 125* | 150* | 200* | 250* |
|---|---|---|---|---|---|---|---|---|---|
| 35 | 0.91 | 0.94 | 0.96 | 0.97 | 0.97 | 0.97 | 0.98 | 0.99 | 0.99 |
| 40 | 0.82 | 0.88 | 0.91 | 0.93 | 0.94 | 0.95 | 0.96 | 0.97 | 0.98 |
| 45 | 0.71 | 0.82 | 0.87 | 0.89 | 0.90 | 0.92 | 0.94 | 0.95 | 0.97 |
| 50 | 0.58 | 0.75 | 0.82 | 0.86 | 0.87 | 0.89 | 0.91 | 0.94 | 0.95 |
| 55 | 0.41 | 0.67 | 0.76 | 0.82 | 0.83 | 0.86 | 0.89 | 0.92 | 0.94 |
| 60 | — | 0.58 | 0.71 | 0.77 | 0.79 | 0.83 | 0.87 | 0.91 | 0.93 |
| 65 | — | 0.47 | 0.65 | 0.73 | 0.75 | 0.79 | 0.84 | 0.89 | 0.92 |
| 70 | — | 0.33 | 0.58 | 0.68 | 0.71 | 0.76 | 0.82 | 0.87 | 0.90 |
| 75 | — | — | 0.50 | 0.63 | 0.66 | 0.73 | 0.79 | 0.86 | 0.89 |
| 80 | — | — | 0.41 | 0.58 | 0.61 | 0.69 | 0.76 | 0.84 | 0.88 |
| 90 | — | — | — | 0.45 | 0.50 | 0.61 | 0.71 | 0.80 | 0.85 |
| 100 | — | — | — | 0.26 | 0.35 | 0.51 | 0.65 | 0.77 | 0.83 |
| 110 | — | — | — | — | — | 0.40 | 0.58 | 0.73 | 0.80 |
| 120 | — | — | — | — | — | 0.23 | 0.50 | 0.69 | 0.77 |
| 130 | — | — | — | — | — | — | 0.41 | 0.64 | 0.74 |
| 140 | — | — | — | — | — | — | 0.29 | 0.59 | 0.71 |

Notes (verbatim): (1) These correction factors apply to Tables 1, 2, 3, and 4. The correction factors in Column 2 also apply to Table 57. (2) The ampacity of a given conductor type at higher ambient temperatures is obtained by multiplying the appropriate value from Table 1, 2, 3, or 4 by the correction factor for that higher temperature.
*Columns marked * "are applicable only under special circumstances where the use of insulated conductors having this temperature rating is acceptable."

Key structural facts vs NEC:
- Rows are **single ambient values** (35, 40, 45 … 140), not ranges.
- Table only covers **above 30 °C**. No rows below 30 → **no ampacity credit for cool ambients** (NEC 310.15(B)(1) gives factors > 1 below 30 °C; CEC gives none).
- The 60/75/90 °C columns are numerically identical to NEC 310.15(B)(1) at the same ambient (same physics: sqrt((Tc−Ta)/(Tc−30))).
- This resolves the 0.82-vs-0.91 conflict at 40 °C: 0.82 is the **60 °C column**, 0.91 is the **90 °C column**. The secondary sources were quoting different columns.

2024 confirmation: APEGNB quotes 2024 Rule 4-004(25) applying "the ampacity correction factors of Table 5A" for cablebus > 30 °C; function unchanged. Column grid itself is the 2012 rendering — see verification note above.

## 2. Table 5C — more than 3 conductors in raceway/cable

Verbatim from C22.1-12, p.308:

> Table 5C — Ampacity correction factors for Tables 2 and 4 (See Rules 4-004 and 12-2210 and Tables 2 and 4.)

| Number of conductors | Ampacity correction factor |
|---|---|
| 1–3 | 1.00 |
| 4–6 | 0.80 |
| 7–24 | 0.70 |
| 25–42 | 0.60 |
| **43 and up** | **0.50** |

Your three secondary sources were right (4–6 = 80%, 7–24 = 70%, 25–42 = 60%) and **yes, there is a row above 42: "43 and up → 0.50"**. Newer editions title the left column "Number of insulated conductors" (per a r/electricians code quote) and drop the 12-2210 cross-ref (that rule was moved into 4-004 in 2018) — rows and values unchanged.

Related tables, same page, for completeness:
- Table 5B (free air, 2–4 single conductors < 25% dia. spacing, for Tables 1 & 3): 2 → 0.90, 3 → 0.85, 4 → 0.80. Note: 4-wire 3Ø+neutral counts as 3; single-phase 3-wire counts as 2.
- Table 5D (tray spacing ≥ 25% ≤ 100% dia., for Tables 1 & 3): grid 0.74–1.00 by 1–6 across × 1–2 layers.

## 3. The counting question — SETTLED

The CEC does **NOT** count all conductors. It counts power-and-lighting conductors, with explicit exclusions. Verbatim Rule 4-004 (C22.1-12; the 2015 IAEI quote is word-for-word identical on these subrules):

> (3) A neutral conductor that carries only the unbalanced current from other conductors, as in the case of normally balanced circuits of three or more conductors, **shall not be counted** in determining ampacities as provided for in Subrules (1) and (2).
>
> (4) When a load is connected between a single-phase conductor and the neutral, or between each of two phase conductors and the neutral, of a three-phase, 4-wire system, the common conductor carries a current comparable to that in the phase conductors and **shall be counted** in determining the ampacities as provided for in Subrules (1) and (2).
>
> (6) **A bonding conductor shall not be counted** in determining the ampacities as provided for in Subrules (1) and (2).
>
> (7) The correction factors specified in this Rule (a) **shall apply only to, and shall be determined from, the number of power and lighting conductors** in a cable or raceway; and (b) shall not apply to conductors installed in auxiliary gutters.

So:
- **Bonding/grounding conductor: never counts.** Explicit, Rule 4-004(6).
- **Neutral: depends on the load.** Balanced 3Ø4W true neutral → not counted (3). Neutral carrying real load current (line-to-neutral loads on a 3Ø4W system, e.g. the 120/208 V case, and by extension harmonic-heavy neutrals) → counted (4).
- **Spares / unenergized conductors:** the rule text does not name spares. Literally, the count is "power and lighting conductors" (7)(a) — a spare that is not connected to serve a load is not a power or lighting conductor in service, so the literal reading excludes it. There is no explicit spare-conductor clause in either direction; flag edge cases to the AHJ. (This is the same practical position as the NEC.)
- The "CEC counts ALL conductors" claim circulating online is **wrong**. It probably comes from the newer Table 5C column header "Number of insulated conductors" read in isolation, without Rule 4-004(3)/(4)/(6)/(7) which define the count.
- Nuance from Tsisserev: the (3) neutral relaxation applies to Subrules (1)/(2) only. For free-air Table 5B/5D cases the neutral still generates heat and is counted (Table 5B Note 1 handles this: 3Ø+neutral 4-wire uses the 3-conductor factor).

## 4. Order of operations

Both factors **multiply against the base ampacity**. Rule basis: 4-004(1)(c)/(2)(c) ("as specified in Table 2/Table 4 **with the correction factors applied** as specified in Table 5C"), 4-004(8) (Table 5A applies when ambient > 30 °C), and Table 5A Note (2) ("obtained by **multiplying** the appropriate value from Table 1, 2, 3, or 4 by the correction factor"). Unitray's worked examples show the same chain (e.g. `Table 4 × 0.70 (5C) × 0.85 (5A)`).

Worked example (CEC Table 2 values, 2012 p.303): six current-carrying 12 AWG RW90 copper conductors in one raceway, 40 °C ambient:
- Base, Table 2, 90 °C column, 12 AWG Cu: **30 A**
- Table 5C, 6 conductors: × 0.80
- Table 5A, 40 °C, 90 °C column: × 0.91
- Derated ampacity = 30 × 0.80 × 0.91 = **21.8 A** → max 20 A overcurrent device.
- Then Rule 4-006 (termination temperature) and Rule 8-104 (continuous load) are checked separately against this; 8-104(6) [2012] says when other derating factors reduce ampacity, use the **greater** of the derated size vs the 8-104(4)/(5)-driven size.

## 5. Base tables

Confirmed by Rule 4-004(1)(a)(b) and (2)(a)(b) and the table titles (2012 index, pp.302–306):
- **Table 1** — copper, single conductors in free air, 30 °C ambient
- **Table 2** — copper, ≤ 3 conductors in raceway or cable ✔
- **Table 3** — aluminum, single conductors in free air
- **Table 4** — aluminum, ≤ 3 conductors in raceway or cable ✔
- Table 5A applies to **Tables 1, 2, 3, and 4** (its Note 1; plus Column 2 to Table 57).
- Table 5C applies to **Tables 2 and 4 only** (its title; 4-004(1)(c)/(2)(c)).

## 6. Continuous loads — Rule 8-104 (the CEC's 125 % equivalent)

Yes — CEC Rule 8-104 "Maximum circuit loading". Verbatim 2012 (subrules 4/5) and 2024 (subrules 5/6, renumbered, APEGNB verbatim quote):

- Continuous load definition, 8-104(3) [2012]: a load **is continuous unless** it won't persist more than **1 h in any 2 h (≤ 225 A)** or **3 h in any 6 h (> 225 A)**.
- 100 %-rated equipment: continuous load ≤ **100 %** of circuit rating (ampacity from Table 2/4 columns) or **85 %** where based on Table 1/3 (free air) — 2012 (4); 2024 (5): "shall not exceed the continuous operation marking … and (a) 100 % of the allowable ampacities … or (b) 85 % … of single conductors".
- Standard 80 %-rated equipment: continuous load ≤ **80 %** (Table 2/4 basis) or **70 %** (Table 1/3 basis) — 2012 (5); 2024 (6).
- The 80 % figure is the reciprocal of the NEC's 125 %: same conductor result for raceway/cable work. **The free-air 70 % case has no NEC counterpart.**

## 7. Where CEC and NEC give different answers for the same installation

1. **Conductor-count derating ranges differ.** CEC 5C: 4–6 / 7–24 / 25–42 / 43+. NEC 310.15(C)(1): 4–6 / 7–9 / 10–20 / 21–30 / 31–40 / 41+. At 10 current-carrying conductors: **CEC 0.70 vs NEC 0.50** — a 40 % spread. Never map one onto the other.
2. **Ambient correction:** same values for 60/75/90 °C columns at the same temperature, but CEC uses single-point ambients (interpolate or use the next higher row), extends to 140 °C with 9 insulation columns, and gives **no credit below 30 °C** (NEC does, down to 1.15/1.12/1.08 at ≤ 10 °C… and below-30 rows).
3. **Counting:** functionally aligned (bond excluded, true neutral excluded), but achieved by different rule text — CEC 4-004(3)(4)(6)(7) vs NEC 310.15(C)(1) + (C)(2) etc. The internet claim that "CEC counts everything" is false.
4. **Continuous load definition differs:** CEC 8-104(3) uses 1 h-in-2 h / 3 h-in-6 h thresholds keyed to 225 A; NEC uses a flat "3 hours or more" (Art. 100). A load can be "continuous" under one code and not the other. Also the CEC 85 %/70 % free-air cases.
5. **Short bundled runs:** CEC exempts contact runs < 600 mm from Table 5C (4-004(13)/(14)); NEC exempts nipples ≤ 24 in (610 mm). Nearly the same, 10 mm apart.
6. **Base ampacities differ slightly** (e.g. CEC Table 2: 14 AWG Cu 60 °C = 20 A vs NEC 310.16 = 15 A — CEC is more permissive at small sizes; compare column-by-column, never reuse NEC base values).
7. **Termination defaults:** 2012 CEC 4-006(2) used 90 °C when equipment is unmarked; 2024 4-006(1) ties the column to the marked termination temperature "with all relevant correction factors being applied as required by Rule 4-004". Verify current-edition 4-006(2) before shipping the unmarked-equipment path.

## Edition map for Rule 4-004 subrule drift

- (1)–(21) essentially stable 2012 → 2015; 2015 added the multi-cable-in-contact subrule (14) and fixed the 2012 Table 5B misreference in (10).
- 2018: Rule 12-2210 (cable trays) deleted and relocated into 4-004 as later subrules (tray content now 22+).
- 2024: 4-004(22) revised (Table 12E / Type DLO mention added); (25) cablebus + Table 5A. Neutral-sizing rule is 4-018 in 2021/2024 (was 4-024 in older editions).

## Raw evidence folder

`~/Desktop/cec-research/` — cec-full.pdf (2012 code), iaei.txt, apegnb-2024.pdf, nexans-2024.pdf, STANDATA PDFs, unitray.pdf, plus the Chrome-scrape scripts used to pull them.

---

# Cross-validation, added 2026-07-25 (Claude)

Three independent research runs were compared. Recording the outcome so the confidence level
behind these numbers is auditable later.

## Table 5A — 144 cells, zero mismatches, across 12 years of editions

| Run | Source | Result |
|---|---|---|
| DeepSeek | C22.1-12 (2012, 22nd ed.) PDF | full 16×9 grid |
| ChatGPT | CSA C22.1:24 (2024, 26th ed.) | full 16×9 grid |

The two grids are **character-identical**, all 144 cells. This closes the open flag in the
section above ("the only thing not seen on a 2021/2024-dated code page is the 5A/5C grid
itself") — the values are stable 2012 → 2024.

**Third, independent check:** the 60/75/90 columns are numerically identical to NEC
Table 310.15(B)(1), which VoltDrop verified separately against two verbatim reproductions
(see `AMPACITY_DERATING_TABLES.md`). So those three columns carry corroboration from a route
that never touched CEC material at all.

## Table 5C, counting rules, order, base-table mapping — three-way agreement

DeepSeek, Grok and ChatGPT independently agree, each quoting Rule 4-004(3)(4)(6)(7). The
"CEC counts ALL conductors" claim that appeared in early secondary sources is **wrong**, and
all three runs identify it as an oversimplification of "power and lighting conductors."

## Rule 4-006 — the flag was right, and the answer CHANGED

The 2012 text read a 90 °C default for unmarked equipment. Grok and ChatGPT independently give
the current rule as **60 °C for equipment rated ≤100 A or marked for #1 AWG and smaller, 75 °C
above that**, applied to the first **1.2 m** from the termination with a transition permitted
beyond. Shipping from the 2012 reading would have been wrong. Flag resolved.

## Where the runs disagreed, and who was right

- **Grok** claimed CEC ambient factors are "not identical to the NEC column." They are
  identical in the 60/75/90 columns — verified directly. Grok wrong.
- **Grok** attributed 0.88 to an "85–90 °C column"; the grid shows 0.88 is the **75 °C**
  column. Grok wrong.
- **Grok** described Rule 8-104 as a 125 % rule; DeepSeek and ChatGPT both give the CEC's
  80 %/70 %/100 %/85 % structure tied to equipment marking. The 125 % framing is the reciprocal
  of the common case only. DeepSeek/ChatGPT better sourced.

## Design consequence for the Canadian build

ChatGPT raises a point the earlier runs did not: **Canada must not copy the US
"derate from 90 °C then cap" pattern.** Rule 4-006 is a separate constraint applying to the
first 1.2 m, with a compliant transition permitted beyond it. A calculator that takes the lower
of conductor and termination ratings throughout is conservative and acceptable — but must be
labelled a simplified method rather than presented as the full Code procedure.

## STILL BLOCKING: CEC Tables 2 and 4

The derating factors are settled. The **base ampacity grids are not** — no run has produced
Tables 2 and 4. They are known to differ from the NEC (14 AWG Cu 60 °C: CEC 20 A vs NEC 15 A),
so correct factors applied to NEC base values still yield a wrong Canadian answer.

Research request drafted at `~/Desktop/CEC Tables 2 and 4 - research request.md`.

## Provenance, stated plainly

The sources here are a watermarked licensed PDF and document-sharing sites hosting the
copyrighted code — not authoritative distribution. Three-way convergence is strong evidence and
materially better than the contradictory secondary sources we started with, but a single
spot-check against a purchased copy of the locally adopted edition would close the gate
properly. Until then, Canadian outputs stay labelled planning-only.
