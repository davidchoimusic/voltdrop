# Ampacity Derating — source verification

Research pass 2026-07-25, ahead of building the ampacity derating upgrade.
Status: **US verified and buildable. Canada NOT verified — do not ship CEC numbers.**

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
