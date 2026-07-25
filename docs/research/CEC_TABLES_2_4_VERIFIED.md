# CEC Tables 1–4, Rule 14-104, Rule 4-006 — VERIFIED against the 26th edition (2024)

Research pass 2026-07-25, second round. Follows `CEC_AMPACITY_DERATING.md`.
**Primary source: a full PDF of CSA C22.1:24 (26th edition, March 2024), 972 pp, extracted locally.**
Every value below is verbatim from that edition unless marked otherwise.
Cross-source: C22.1-12 (2012 edition, full PDF) for change history; VoltDrop's verified
NEC 310.16 dataset (`ampacity.js`) for the US diff.

**Headline: in the 2024 edition, the 60/75/90 °C columns of CEC Tables 2 and 4 are
IDENTICAL to NEC 310.16 at every size — 63 rows × 3 columns, zero differing cells.**
The "14 AWG = 20 A in Canada" data point was true in the **2012** edition. It is no
longer true. Details in §3.

---

## 1. Table 2 — copper, ≤3 conductors in raceway or cable (2024, verbatim)

Title (2024): "Ampacities for not more than three insulated copper conductors, rated not
more than 5000 V and unshielded, in raceway or cable (based on an ambient temperature of
30 °C*)" — See Rules 4-004, 26-142, 42-008, 42-016 and Tables 5A, 5C, 19, D3.

Columns: **60 / 75 / 90 / 110 / 125 / 200 °C** (six columns — three more than NEC 310.16).

| Size | 60 | 75 | 90 | 110 | 125 | 200 |
|---|---|---|---|---|---|---|
| 14 AWG | 15 | 20 | 25 | 25 | 30 | 35 |
| 12 AWG | 20 | 25 | 30 | 30 | 35 | 40 |
| 10 AWG | 30 | 35 | 40 | 45 | 45 | 60 |
| 8 AWG | 40 | 50 | 55 | 65 | 65 | 80 |
| 6 AWG | 55 | 65 | 75 | 80 | 90 | 110 |
| 4 AWG | 70 | 85 | 95 | 105 | 115 | 140 |
| 3 AWG | 85 | 100 | 115 | 125 | 135 | 165 |
| 2 AWG | 95 | 115 | 130 | 145 | 155 | 190 |
| 1 AWG | 110 | 130 | 145 | 165 | 175 | 215 |
| 1/0 | 125 | 150 | 170 | 190 | 200 | 245 |
| 2/0 | 145 | 175 | 195 | 220 | 235 | 290 |
| 3/0 | 165 | 200 | 225 | 255 | 270 | 330 |
| 4/0 | 195 | 230 | 260 | 290 | 310 | 380 |
| 250 kcmil | 215 | 255 | 290 | 320 | 345 | — |
| 300 | 240 | 285 | 320 | 360 | 385 | — |
| 350 | 260 | 310 | 350 | 390 | 420 | — |
| 400 | 280 | 335 | 380 | 425 | 450 | — |
| 500 | 320 | 380 | 430 | 480 | 510 | — |
| 600 | 350 | 420 | 475 | 530 | 565 | — |
| 700 | 385 | 460 | 520 | 580 | 620 | — |
| 750 | 400 | 475 | 535 | 600 | 640 | — |
| 800 | 410 | 490 | 555 | 620 | 660 | — |
| 900 | 435 | 520 | 585 | 655 | 700 | — |
| 1000 | 455 | 545 | 615 | 690 | 735 | — |
| 1250 | 495 | 590 | 665 | 745 | — | — |
| 1500 | 525 | 625 | 705 | 790 | — | — |
| 1750 | 545 | 650 | 735 | 820 | — | — |
| 2000 | 555 | 665 | 750 | 840 | — | — |

## 2. Table 4 — aluminum, ≤3 conductors in raceway or cable (2024, verbatim)

Same column structure (60/75/90/110/125/200 °C).

| Size | 60 | 75 | 90 | 110 | 125 | 200 |
|---|---|---|---|---|---|---|
| 12 AWG | 15 | 20 | 25 | 25 | 25 | 35 |
| 10 AWG | 25 | 30 | 35 | 40 | 40 | 50 |
| 8 AWG | 35 | 40 | 45 | 50 | 55 | 65 |
| 6 AWG | 40 | 50 | 55 | 65 | 70 | 80 |
| 4 AWG | 55 | 65 | 75 | 80 | 90 | 105 |
| 3 AWG | 65 | 75 | 85 | 95 | 100 | 125 |
| 2 AWG | 75 | 90 | 100 | 115 | 120 | 150 |
| 1 AWG | 85 | 100 | 115 | 125 | 135 | 165 |
| 1/0 | 100 | 120 | 135 | 150 | 160 | 195 |
| 2/0 | 115 | 135 | 150 | 170 | 180 | 220 |
| 3/0 | 130 | 155 | 175 | 195 | 210 | 255 |
| 4/0 | 150 | 180 | 205 | 225 | 245 | 295 |
| 250 kcmil | 170 | 205 | 230 | 260 | 275 | — |
| 300 | 195 | 230 | 260 | 290 | 310 | — |
| 350 | 210 | 250 | 280 | 315 | 335 | — |
| 400 | 225 | 270 | 305 | 340 | 365 | — |
| 500 | 260 | 310 | 350 | 390 | 420 | — |
| 600 | 285 | 340 | 385 | 430 | 460 | — |
| 700 | 315 | 375 | 425 | 475 | 505 | — |
| 750 | 320 | 385 | 435 | 485 | 520 | — |
| 800 | 330 | 395 | 445 | 500 | 535 | — |
| 900 | 355 | 425 | 480 | 535 | 575 | — |
| 1000 | 375 | 445 | 500 | 560 | 600 | — |
| 1250 | 405 | 485 | 545 | 615 | — | — |
| 1500 | 435 | 520 | 585 | 655 | — | — |
| 1750 | 455 | 545 | 615 | 690 | — | — |
| 2000 | 470 | 560 | 630 | 710 | — | — |

## 3. Differences from NEC 310.16 — the important part

**2024 edition vs VoltDrop's verified NEC 310.16: ZERO differences in the 60/75/90 °C
columns.** Programmatic diff, 36 copper rows + 27 aluminum rows × 3 columns: no cell
differs. CEC's 110/125/200 °C columns have no NEC counterpart (NEC 310.16 has no such
columns). Context from Ark Tsisserev (CEC technical committee chair): CEC and NEC
ampacity tables were deliberately **harmonized** — pre-harmonization, CEC's 90 °C column
looked like today's 75 °C column (e.g. 3 AWG Cu was 105 A, raised to 115 A).

**Your known example is outdated.** "14 AWG copper 60 °C: CEC 20 A vs NEC 15 A" was true
in the **2012 (23rd) edition**. Change history, verbatim both ends:

| Cell | 2012 (C22.1-12) | 2024 (C22.1:24) | NEC 310.16 |
|---|---|---|---|
| Table 2, 14 AWG, 60 °C | 20 | **15** | 15 |
| Table 2, 12 AWG, 60 °C | 25 | **20** | 20 |
| Table 4, 12 AWG, 60 °C | 20 | **15** | 15 |

So by 2024 the small-size 60 °C gaps were closed and the tables match NEC exactly. A
secondary source (Google AI overview citing elsynergy.ca and r/electricians) says the
2018 edition already showed 15 A — so the change happened in the **2015 or 2018**
edition; the exact edition is not pinned (would need a 2015/2018/2021 copy — only
2012 and 2024 full texts were available this run).

Also changed between 2012 and 2024, in columns VoltDrop does not use:
- Table 2, **200 °C column cut sharply** at every size (e.g. 8 AWG 105→80, 6 AWG
  155→110, 4/0 590→380, 10 AWG 65→60).
- Table 4, 200 °C column unchanged. Table 3 (free air Al) 10 AWG 90 °C: 40→45.

## 4. Small-conductor overcurrent limits — Rule 14-104 (2024, verbatim)

> 2) Except as provided for by Subrule 1) c), the rating of overcurrent protection shall
> not exceed
> a) 15 A for No. 14 AWG copper conductors;
> b) 20 A for No. 12 AWG copper conductors;
> c) 30 A for No. 10 AWG copper conductors;
> d) 15 A for No. 12 AWG aluminum conductors; and
> e) 25 A for No. 10 AWG aluminum conductors.

Identical to NEC 240.4(D), including the 10 AWG Al 25 A cap (item e) did **not** exist in
the 2012 edition — added since). Subrule 1) is the general "OCPD ≤ conductor ampacity"
rule, with a Table 13 next-higher-rating allowance (now up to **800 A**; was 600 A in
2012) when the exact rating isn't available, and 1)c) "as provided for by other Rules"
(e.g. heating-circuit rules) exceptions.

**Interaction with derating:** the 14-104(2) caps are absolute caps on the OCPD for
those sizes — they are not reduced by Table 5A/5C factors, but the factors still apply
to the ampacity side. Practical logic: OCPD ≤ min(derated ampacity, 14-104(2) cap).
(The caps matter most when the 75/90 °C columns would otherwise allow more — e.g.
12 AWG Cu at 30 A table value is still capped to a 20 A breaker.)

## 5. Table notes (2024, verbatim, abridged to what the values assume)

Both Tables 2 and 4: "based on an ambient temperature of 30 °C"; values are "maximum
allowable conductor temperatures for one, two, or three insulated conductors run in a
raceway, or two or three insulated conductors run in a cable"; footnote * sends ambient
>30 °C to Table 5A; footnote ††/§ sends >3 conductors to Table 5C; the 110/125/200 °C
columns carry the Note "These ampacities apply to bare conductors or under special
circumstances where the use of insulated conductors having this temperature rating is
acceptable"; the ‡ note explains how to map Table 19 insulation types onto the columns.
Gone in 2024: the 2012 single-dwelling service-conductor allowance footnotes (former
†† on 6 AWG / 2/0 — that content moved to Rule 4-028/Table 39 deletions etc.; not
ampacity-relevant for VoltDrop).

## 6. Free-air Tables 1 and 3 vs NEC 310.17

Same harmonized pattern — 60/75/90 °C values match NEC 310.17. Example (2024 Table 1,
verbatim): 12 AWG Cu free air = 30/35/40 A at 60/75/90 °C — identical to NEC 310.17.
CEC extras: 110/125/200 °C columns (Table 1's 200 °C column is headed "Bare wire" in
2012; 2024 keeps the values under Note 3) and Table 5B/5D correction factors for
grouped single conductors (NEC has no free-air grouping factors).

## 7. Rule 4-006 current wording (2024, verbatim) — your info is correct

> 2) …where the maximum conductor termination temperature for equipment is not marked,
> the maximum conductor termination temperature shall be considered to be
> a) 60 °C for equipment i) rated not more than 100 A; or ii) marked for use with
> No. 1 AWG or smaller conductors; and
> b) 75 °C for equipment i) rated more than 100 A; or ii) marked for use with
> conductors larger than No. 1 AWG.

Plus: (1) marked equipment → use the column of the marked temperature "with all relevant
correction factors being applied as required by Rule 4-004"; (3) HV equipment may
consult the manufacturer; (4) applies **only to the first 1.2 m** of conductor from the
termination; (5) transition conductors ≥ 1.2 m; (6) applies to D8–D11/D17/12E ampacities.

The 2012 text ("90 °C shall be used by default" for unmarked equipment) is dead — the
60/75 split is in the 2018 (per Tsisserev quoting it as the 2018 text), 2021, and 2024
editions. So it changed in **2015 or 2018** (same window as the Table 2/4 small-size
change — likely the same harmonization cleanup).

Derating interplay (Tsisserev, AES Engineering Feb 2026): Rule 4-006 caps only the
termination zone (1.2 m). Correction factors (5A/5C) may be applied from the **90 °C
column** when the conductor insulation is 90 °C — you do NOT have to derate from the
75 °C column just because terminations are 75 °C. Final check is:
min(derated 90 °C-column ampacity, termination-column ampacity, 8-104 continuous-load
requirement).

## Status vs the verification gate

- Tables 2 and 4 (60/75/90 columns, all sizes): **verbatim 2024** — cleared.
- Tables 1 and 3 (spot values + structure): verbatim 2024 — cleared for the rows cited.
- Rule 14-104(2), Rule 4-006: verbatim 2024 — cleared.
- Change-history cells (2012 column): verbatim 2012.
- Only unpinned fact: which of 2015/2018/2021 made the small-size 60 °C and 200 °C
  changes. Cosmetic for a tool that targets the current edition — but worth one line in
  any "edition" picker: **numbers in this file are the 2024 (26th) edition; pre-2015ish
  installations used slightly different small-size 60 °C values.**

Source files: `~/Desktop/cec-research/cec2024.pdf` (26th ed., from David's dokumen.pub
download), `cec-full.pdf` (2012), extracted texts alongside.
