# Ampacity Derating — source verification

Research pass 2026-07-25, ahead of building the ampacity derating upgrade.

> ⚠️ **STATUS CHANGED LATER THE SAME DAY — read the SUPERSEDED section at the bottom of this
> file before acting on anything here.** The original status line read "Canada NOT verified —
> do not ship CEC numbers." That is no longer true: CEC Tables 2 and 4 were subsequently
> verified and found identical to NEC 310.16 in the 60/75/90 columns. The US content below is
> unchanged and still correct.

---

## US / NEC — VERIFIED (2 independent sources, exact agreement on every row)

Sources:
1. HELUKABEL, "Allowable Ampacity Tables — NFPA 70: NEC 2023" (manufacturer technical
   document, verbatim table reproduction)
2. conduit.site table reference for 310.15(B)(1)
3. Partial third confirmation of the adjustment factors via ecalpro.com

### Table 310.15(B)(1) — Ambient temperature correction, based on 30 °C (86 °F)
Multiply the table ampacity by the factor. "—" = not permitted / no value published.

| Ambient °C | Ambient °F | 60 °C | 75 °C | 90 °C |
|---|---|---|---|---|
| 10 or less | 50 or less | 1.29 | 1.20 | 1.15 |
| 11–15 | 51–59 | 1.22 | 1.15 | 1.12 |
| 16–20 | 60–68 | 1.15 | 1.11 | 1.08 |
| 21–25 | 69–77 | 1.08 | 1.05 | 1.04 |
| 26–30 | 78–86 | 1.00 | 1.00 | 1.00 |
| 31–35 | 87–95 | 0.91 | 0.94 | 0.96 |
| 36–40 | 96–104 | 0.82 | 0.88 | 0.91 |
| 41–45 | 105–113 | 0.71 | 0.82 | 0.87 |
| 46–50 | 114–122 | 0.58 | 0.75 | 0.82 |
| 51–55 | 123–131 | 0.41 | 0.67 | 0.76 |
| 56–60 | 132–140 | — | 0.58 | 0.71 |
| 61–65 | 141–149 | — | 0.47 | 0.65 |
| 66–70 | 150–158 | — | 0.33 | 0.58 |
| 71–75 | 159–167 | — | — | 0.50 |
| 76–80 | 168–176 | — | — | 0.41 |
| 81–85 | 177–185 | — | — | 0.29 |

### Table 310.15(C)(1) — Adjustment for more than three current-carrying conductors

| Number of current-carrying conductors | Percent of table ampacity |
|---|---|
| 4–6 | 80 |
| 7–9 | 70 |
| 10–20 | 50 |
| 21–30 | 45 |
| 31–40 | 40 |
| 41 and above | 35 |

**Counting rules (NEC):** count ungrounded conductors and any neutral that carries current
under normal conditions (including neutrals on non-linear loads carrying harmonics). Do NOT
count equipment grounding conductors or grounding electrode conductors. Spare conductors in
the raceway ARE counted. Conductors that cannot be energized simultaneously are not counted.

**Order of operations:** apply BOTH factors to the base table ampacity — ambient correction
and conductor adjustment multiply together. HELUKABEL's own worked example confirms it:
55 A at 90 °C × 0.80 (adjustment) × 0.91 (40 °C ambient) = 40 A.

**Also note, separately from these tables:** the 125 % continuous-load rule
(NEC 210.19(A)(1) / 215.2) is a *rule*, not a table, and is a different calculation from
derating. Do not conflate them in the UI — an electrician hitting both needs to see them as
two distinct steps.

---

## Canada / CEC — NOT VERIFIED. DO NOT SHIP NUMBERS.

Attempted: CEC Table 5A (ambient correction) and Table 5C (more than 3 conductors).

**The sources contradict each other**, which is exactly why the gate exists:

| Ambient | Source A | Source B |
|---|---|---|
| 40 °C | 0.82 | 0.91 |
| 50 °C | 0.58 | 0.75 |

Those are not rounding differences. Most likely each source is quoting a different
insulation-rating column without saying so — but "most likely" is a guess, and guesses do
not ship in this project.

**Table 5C ranges genuinely differ from the NEC** and cannot be reused:
reported as 4–6 → 80 %, 7–24 → 70 %, 25–42 → 60 %. The NEC's 7–9 / 10–20 / 21–30 / 31–40 /
41+ structure does not map onto it.

**⚠️ MATERIAL STRUCTURAL DIFFERENCE, unconfirmed but load-bearing:** at least one source
states the CEC counts **ALL conductors in the raceway**, where the NEC counts only
**current-carrying** conductors. If true, a cable needing no derating in the US would need it
in Canada. Getting this backwards is dangerous in either direction — over-derating wastes
copper, under-derating overheats wire. This MUST be resolved before any Canadian derating
number is displayed.

### Why Canada keeps hitting this wall
This is the **second** Canadian data gap (conduit fill was the first — CEC Tables 6A–6K and
Table 8 are also unverified). The pattern: NFPA-adjacent manufacturers publish verbatim NEC
tables as free technical literature; CSA C22.1 has no equivalent free reproduction ecosystem.
**Decision for David:** fully conformant Canadian tools may require purchasing CSA C22.1, or
sourcing provincial STANDATA-style reproductions per table (the route that worked for CEC
Table 22 in box fill). Until then, Canadian tools that depend on unverified tables ship with
a visible planning-only note — never with a borrowed NEC number wearing a maple leaf.

---

## Build disposition

- **US editions**: full derating tool, verified data, sealed into `data-golden.json`.
- **Canadian editions**: tool ships with the honest planning-only note, same pattern as
  `/ca/conduit-fill/`. No CEC factor is displayed until Tables 5A and 5C are verified to the
  same standard as the NEC tables above.
- **Queued**: CEC Table 5A + 5C verification, and resolution of the all-conductors vs
  current-carrying-conductors counting question.

---

# ⚠️ SUPERSEDED SECTION ABOVE — Canada resolved 2026-07-25 (later same day)

The "Canada / CEC — NOT VERIFIED. DO NOT SHIP NUMBERS" section above is **out of date**.
Left in place per the append-only convention; do not act on it.

**What changed:** three further research runs (Grok, KIMI K3, ChatGPT) produced CEC Tables 2
and 4 from a complete C22.1:24 (2024, 26th edition) copy. See `CEC_TABLES_2_4_VERIFIED.md` and
the tail of `CEC_AMPACITY_DERATING.md`.

**The headline finding: CEC Tables 2 and 4 are numerically IDENTICAL to NEC 310.16** in the
60/75/90 °C columns, at every shared size. Verified independently here by diffing the research
grids against VoltDrop's shipped `AMPACITY` table: **159 cells, zero mismatches**, and the two
research runs agree with each other cell-for-cell.

**The "14 AWG Cu 60 °C = 20 A vs NEC 15 A" difference recorded earlier was REAL but is from the
2012 edition.** CSA harmonised those cells with the NEC around 2015–2018. In the current code
they match. Any note claiming the base grids differ is describing a code edition from over a
decade ago.

**Consequence:** the Canadian ampacity page was never serving wrong base numbers. What was wrong
was the *claim* — "we verified the values match" was asserted without verification. It is now
verified, and can be stated properly with an edition citation.

**What remains genuinely Canadian** (do NOT let the base-table harmonisation tempt anyone into
reusing NEC logic wholesale):
- **Table 5C bands differ sharply** — 0.70 at ten conductors where the NEC gives 0.50
- **Table 5A** uses single-point ambient rows, not bands, and gives **no cool-ambient credit**
  below 30 °C where the NEC gives factors above 1.00
- **Rule 4-006** termination defaults and the 1.2 m rule
- **Rule 8-104** continuous loads (80 % / 70 % / 100 % / 85 %, not a flat 125 %)
- Six columns (60/75/90/110/125/200 °C) against the NEC's three
- **Free-air Tables 1 and 3 still DIFFER** (300 kcmil Cu 60 °C: CEC 370 A vs NEC 375 A;
  6 AWG Al 60 °C: CEC 65 A vs NEC 60 A). VoltDrop has no free-air tool, so this is not blocking
  — but the harmonisation is NOT total, and nobody should assume it is.

**Provenance, and whose decision it is:** the CEC text is a document-sharing-site copy of the
copyrighted standard, not authorised CSA distribution. The evidence is three-way convergent,
stable across twelve years of editions, and matches an independently verified NEC table.
**David reviewed this and confirmed 2026-07-25 that the copy is genuine and to proceed.**
That is an owner risk decision, recorded here so it is not silently re-litigated.
