# CEC conduit fill — VERIFIED source record (2026-07-27)

## Provenance and owner decision

**Primary source:** CSA C22.1:24 — Canadian Electrical Code, Part I, 26th edition, March 2024.
Full 972-page PDF, the same copy David reviewed and confirmed genuine on 2026-07-25 for the
Tables 2/4 ampacity work (`~/Desktop/cec-research/cec2024.pdf`, dokumen.pub download).

**David extended that decision to Section 4 and the conduit tables on 2026-07-27** ("build it"),
after being shown that the scope was wider than the original recorded decision. Recorded here so
it is not silently re-litigated, per the same convention used for Tables 2/4.

**Second source (independent):** manufacturer datasheets built to **CSA C22.2 No. 38** —
General Cable / Prysmian "RW90 XLPE, Low-Voltage Power, 600 V, CSA Type RW90" and Nexans Canada
RW90 Copper. These publish nominal overall diameters, from which area derives as `π(d/2)²`.

## Verification result — Table 6A (RW90XLPE unjacketed, stranded)

Conductor diameters, mm:

| AWG | CEC Table 6A | General Cable | dev | Nexans | dev |
|---|---|---|---|---|---|
| 14 | 3.36 | 3.38 | 0.6% | 3.30 | 1.8% |
| 12 | 3.84 | **3.84** | **0.0%** | 3.80 | 1.0% |
| 10 | 4.47 | 4.45 | 0.4% | 4.60 | 2.9% |
| 8 | 5.99 | **5.99** | **0.0%** | 5.90 | 1.5% |
| 6 | 6.95 | 6.91 | 0.6% | 6.80 | 2.2% |

Two sizes match General Cable **to the digit**; worst deviation across both manufacturers is 2.9%
(manufacturer nominal dimensions legitimately vary). A third source — a Canadian Red Seal exam
guide quoting Table 6 — gives 11.58 mm² for 12 AWG, against the table's 11.6 mm². **Verified.**

## Verification result — Table 9 series (conduit interior)

**The published fill areas are exactly `π(ID/2)² × percentage`.** Checked against the printed
values in Tables 9C (53%) and 9G (40%) for EMT and rigid PVC: **maximum deviation 0.01%**.

This matters for correctness, not just convenience: the entire 9A–9H series collapses to
**internal diameters + the three percentages**, which is a far smaller dataset to get right, and
every derived value self-checks against a printed one. Transcribing three separate area tables
would have been more error-prone for no benefit.

The internal diameter columns are **identical across 9C and 9G** — only the percentage differs.

## Fill percentages — Rule 12-910 and Table 8

53% (one conductor) · 31% (two conductors) · 40% (three or more). Confirmed from the Table 9
series titles and Rule 12-910(4), which requires fill not to exceed Table 8 and points to Tables
9A–9H for usable interior area.

Rule 12-910(4)(b) additionally **permits** raceway interior cross-section to be taken "from their
measured internal dimensions or from the manufacturer's listed specifications" — which is why the
manufacturer cross-check above is a legitimate second source rather than a workaround.

## ⚠️ Transcription hazard found while reading — do not use the multi-conductor columns

Tables 6A/6K print pre-multiplied areas for 1–10 and 20 conductors. Two values rendered
implausibly when read from the PDF: Table 6K 6 AWG × 6 showed "1975" (should be ≈196) and
2 AWG × 5 showed "3758" (should be ≈374).

**Only the `Dia, mm` and single-conductor `Area, mm²` columns are used.** Everything else is
computed. This is arithmetically identical and removes a whole class of transcription risk.

## What this changes about the current Canadian conduit page

Both inputs were wrong, and **both in the same unsafe direction**:

| | shipped today | CEC reality |
|---|---|---|
| 12 AWG conductor area | 8.58 mm² (THHN) | **11.6 mm² (RW90)** |
| ½" EMT usable @ 40% | 78.5 mm² (NEC) | **74.5 mm² (Table 9G)** |
| **conductors permitted** | **9** | **6** |

**Capacity was overstated by 50%.**

It also resolves a contradiction from the earlier research pass: a polished Canadian conduit-fill
website published 9 (it reuses NEC data, and says so in its own text), while a forum post said
~5. The standard gives 6. **The forum was closer than the professional-looking source** — which is
the entire argument for the verification gate.

## T90 ≈ THHN — confirmed, and useful

Table 6K (TWN75 / T90 NYLON) areas land within ~2% of NEC THHN at every size checked
(14 AWG 6.16 vs 6.26; 12 AWG 8.45 vs 8.58; 10 AWG 13.7 vs 13.61; 8 AWG 23.7 vs 23.61;
6 AWG 32.7 vs 32.71). T90 is the nylon-jacketed Canadian THHN-equivalent, so this is expected —
but it is now measured rather than assumed. **RW90 is the one that differs, and it is the common
Canadian building wire.**
