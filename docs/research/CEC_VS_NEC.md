# CEC (CSA C22.1) vs NEC — verified difference map for the Canada edition
Agent research pass 2026-07-25, cross-checked ≥2 sources per area (incl. ESA
Bulletin 8-6-5 primary PDF, IAEI, Canadian supplier tables). This is Stage 1
of the country pipeline (see ../COUNTRY_EXPANSION_METHODOLOGY.md) for Canada.
CONFIRMED items may drive product copy; UNCERTAIN items need the Stage-3
verification gate before shipping in any tool or guide.

## Engineering summary — what a real CEC mode changes

1. **Ampacity: REUSE our verified 310.16 numbers.** CEC Table 2 (Cu) and
   Table 4 (Al) are harmonized with NEC 310.16 — verified value-by-value for
   14 AWG–4/0 against Canadian sources (electdesign.ca, celtex.ca; IAEI
   confirms harmonization). Termination rule (CEC 4-006) ≈ NEC 110.14(C).
   Small-conductor caps (CEC 14-104(2)) = same 15/20/30 A for Cu 14/12/10.
   CONFIDENCE: HIGH. (Al small-conductor caps: CONFIRMED 2026-07-25 — #12 Al 15 A, #10 Al 25 A; IAEI + verbatim forum quote of 14-104(2).)
2. **Voltage drop: THE marquee difference.** CEC Rule 8-102 is a "shall" —
   MANDATORY and enforceable, unlike the NEC's informational note. Same
   numbers (3% branch / 3% feeder / 5% total), different legal force. 2024
   CEC: calculate at connected load if known, else 80% of breaker rating.
   Official method is metric Table D3 (same physics as our K-factor engine).
   Dwelling carve-outs: Rule 8-102(3)+Table 68 max lengths (ESA Bulletin
   8-6-5). CONFIDENCE: HIGH. → Already reflected in product: CA edition
   explainer says "a MANDATORY limit in the CEC" (common.js code-basis swap).
3. **Conduit fill: same 53/31/40 percentages** (CEC 12-910/Table 8; 60% for
   nipples ≤600 mm). BUT conductor areas come from CEC Tables 6A–6K in mm²
   with metric trade sizes (16/21/27/35 mm). Do NOT assume RW90 areas = THHN
   areas (RW90 is XLPE = RHW-2/XHHW-2 analog, thicker). T90 Nylon = THHN
   (often dual-marked). CONFIDENCE: percentages HIGH; areas BLOCKED — second research pass proved
   CEC Table 9 ≠ NEC areas (trade-16 EMT 72.51 mm² vs NEC ½" 78.4 mm²) and
   public sources can't supply full 6A/6K/9 tables. Shipping a CA conduit
   mode requires purchasing CSA C22.1 access. Until then: honesty note.
4. **Box fill: a REAL fork — do not reuse NEC numbers.** CEC Table 22 is in
   millilitres and one NEC "step" smaller across the board: 14 AWG = 24.6 mL
   (≈1.5 in³ vs NEC 2.0), 12 = 28.7 (≈1.75 vs 2.25), 10 = 36.9 (≈2.25 vs 2.5),
   8 = 45.1 (≈2.75 vs 3.0), 6 = 73.7 (≈4.5 vs 5.0). Counting differs too:
   marrettes/wire connectors COUNT (1 allowance per PAIR, sized by largest
   conductor entering — NEC counts wire nuts as free); deep devices deduct
   32 cm³ × cm of depth (no NEC analog). Bond-wire counting and clamp
   allowances: UNCERTAIN — read 12-3034 text at the verification gate.
   GATE PASSED 2026-07-25: Table 22 values CONFIRMED (Alberta STANDATA
   21/24-ECI-012 verbatim rule text + T&B Iberville catalog). Verbatim rule
   findings: bare bonds NEVER counted, NO NEC-style all-grounds allowance
   (offsetnotes' calculator wrongly imports it — we don't), clamps get NO
   allowance (12-3034(5) verbatim), marrettes = 1 allowance per PAIR (2(b)),
   deep devices deduct 32 cm³/cm. SHIPPED: box fill CA mode live, table
   sealed as boxfill.js:CEC_VOL_ML.
5. **Voltages: add 347 V and 600 V** (Canadian commercial standard 347/600 wye
   vs US 277/480; 575 V motors). Residential 120/240 identical. Already
   partially reflected in CA presets (347/600 present). CONFIDENCE: HIGH.
6. **Wire-type naming for CA copy:** NMD90 ↔ NM-B (but NOT 60°C-capped as a
   cable type — governed by 4-006/14-104 instead; residential answers land
   the same), T90 Nylon ↔ THHN, TWN75 ↔ THWN, RW90(XLPE) ↔ RHW-2/XHHW-2
   (Canada's default building wire), TECK90 ≈ MC, AC90 ↔ AC ("BX").
7. **Derating by bundled-conductor count DIFFERS** (CEC Table 5C vs NEC
   310.15(C)(1) — e.g., CEC holds 70% to 24 conductors where NEC hits 50% at
   10). Numbers UNVERIFIED — matters for the planned derating upgrade; CEC
   derating needs its own verified table.

## Sources
IAEI 4-006 article · electdesign.ca CEC Table 1/2 · celtex.ca Tables 2&4 ·
ESA Bulletin 8-6-5 PDF (Rule 8-102) · Dakota Prep CEC-2024 VD guide ·
cablify.ca CEC conduit fill · offsetnotes CEC box fill + 8-102 ·
electriciantalk (12-3034, NMD90, wire types) · sparkshift CEC 14-104 ·
Mike Holt forums (347/600, CEC Table 5C) · sycor RW90/T90 product pages.
