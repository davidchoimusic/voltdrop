# Search Demand Data — raw Google autocomplete mining
Generated 2026-07-25. Source: Google autocomplete API, 285 queries
(seeds × 7 tools, letter-soup on 4 stems, amp family, amp×distance probes,
gauge family). Raw dump: `autocomplete_raw.json` (274 queries with results).

Purpose: the raw keyword layer under `../GUIDES_TOPIC_MAP.md`. The topic map
says WHAT to write; this file says exactly HOW PEOPLE TYPE IT, sizes the
programmatic page families, and supplies FAQ-schema questions per page.

Legend: everything below is a real Google autocomplete suggestion — i.e.
enough people typed it that Google predicts it.

---

## 1. Amp × Distance combo matrix (the page factory build list)

Google-suggested distances per amp rating, from
"what size wire for {N} amp {digit…}" probes:

| Amp | Suggested distances (feet) |
|-----|----------------------------|
| 20  | 50, 100, 150, 200, 300, 1000 |
| 30  | 50, 100, 150, 200, 300 |
| 40  | 100 |
| 50  | 50, 100, 120, 150, 200, 300, 400 |
| 60  | 50, 100, 150, 200, 300 |
| 100 | 50, 100, 125, 150, 200, 250, 300, 350, 400, 500 |
| 150 | 100, 150, 200, 300 |
| 200 | 50, 100, 120, 150, 200, 250, 300, 350, 400, 450, 500, 1000 |

Build priority: 50A and 100A have the widest grids = most demand.
Suggested first batch (~20 pages): all 50A, 60A, 100A combos + 30A/150ft,
30A/200ft, 20A/100ft, 200A/200ft, 200A/300ft.
Each page: pre-filled calculator + verdict + shown math + FAQ JSON-LD.

## 2. Appliance / use-case framings (what people attach the wire to)

Clustered from "what size wire for …" letter-soup. Cluster size = rough
demand signal.

- **EV charging (HUGE)**: tesla charger, tesla wall connector, tesla level 2
  charger, electric car charger, level 2 ev charger, nema 14-50 (×2),
  nema 6-50, nema 6-50r, car charger
- **Mini-split / HVAC (BIG)**: mini split, 9000 btu, 18 000 btu, mr cool
  mini split, split unit ac, central air conditioner, heat pump, hvac unit,
  outdoor ac unit, furnace
- **Dryer / range / oven (BIG)**: dryer (×6 variants), electric range,
  stove (×3), oven (×2), double oven, induction cooktop/range/stove,
  kitchen range/stove
- **Water heating**: water heater, hot water heater, electric water heater,
  tankless water heater, on demand water heater, instant hot water heater,
  immersion heater, baseboard heater, 240 volt 2000 watt heater
- **Hot tub / pool**: hot tub, jacuzzi (×2), pool pump, pool heater,
  pool heat pump, pool bonding
- **Outbuildings / panels**: sub panel, garage sub panel, garage outlets,
  shed-adjacent: "underground", "underground service", mobile home service
- **Welders**: welder, welder plug, lincoln 225 arc welder, mig welding,
  flux core welding, welding leads
- **Well/septic**: well pump, submersible well pump, septic pump
- **12V / automotive / marine (BIG — DC mode!)**: trolling motor (×2),
  minn kota, winch (×2), utv winch, battery cables, battery relocation,
  big 3 upgrade, car battery (×2), car stereo/speakers, 800 watt amp,
  headlights, fuel pump, ignition coil, starter solenoid, alternator,
  trailer brakes (×2), trailer brake controller, trailer lights/wiring,
  utility trailer, boat lights/accessories, bilge pump, fish finder (×2),
  navigation lights, marine speakers, vhf radio, cigarette lighter,
  jon boat, jumper cables, rv battery, rv hookup, electric trailer brakes
- **Solar / inverter (DC mode!)**: solar panels, solar battery bank,
  inverter, 3000 watt inverter, victron mppt (×4 specific models!)
- **Low voltage / LED (DC mode!)**: landscape lighting, led strip lights,
  led light bar, led lights, under cabinet lighting, rock lights,
  low voltage variants, doorbell, video doorbell, thermostat-adjacent
- **Misc residential**: outlets (many), light switch, ceiling fan,
  bathroom fan, dishwasher, garbage disposal, microwave, fridge,
  washing machine, gfci outlet, kitchen/bedroom/garage circuits,
  ground rod, ufer ground, gate opener, invisible/underground dog fence,
  irrigation, fire alarm (×2), sauna heater 9kw, 7.5 hp motor

NOTE the DC/12V cluster is enormous — validates the topic map's product
insight that DC mode is a differentiator. Say it in titles/H1s, not just
on the page.

## 3. Gauge-ladder families (mirror families to the amp pages)

### "How far can you run N gauge wire" — max-length page family
Google suggests per-gauge × per-amp × per-voltage variants:
- 14 AWG: on 15A, on 20A, "without a voltage drop", 14/2 on 15A
- 12 AWG: on 15A/20A/30A, "without a voltage drop", 12/2 on 15A/20A,
  romex, extension cord, speaker wire, low voltage
- 10 AWG: for 30A/50A, for 220v (×2), on 15A/20A/30A, solar wire,
  "for voltage drop"
- 8 AWG: for 30A/40A/50A, for 220v, on 20A, "before voltage drop"
- 6 AWG: for 30A/40A/50A/60A, on 20A/50A, "for voltage drop"
- 4 AWG: for 50A
- 2 AWG, 1/0, 2/0, 3/0, 4/0: aluminum + copper, "4/0 aluminum 200 amp"
- service: "how far can you run 200 amp service (underground)",
  50 amp service/wire, 30 amp wire, 20 amp circuit
- cable-assembly forms: 10/2, 10/3, 12/2, 14/2, 8/2, 6/3, 4/3
- DC: "how far can you run 24v dc", "24v wire", "5v dc", low voltage
  landscape lighting wire (×3 variants)

### "How many amps can N gauge wire handle" — ampacity page family
Every gauge 14→4/0 suggested, WITH VOLTAGE QUALIFIERS — people ask
"at 12 volts", "at 120 volts", "at 240 volts" separately. The 12V
variants are the automotive/solar crowd being failed by NEC-only answers.
Material variants: automotive, stranded, solid, romex, thhn, ofc vs cca
(car audio!), battery cable, welding cable, jumper cables, solar wire,
extension cord.

## 4. Voltage drop topic cluster (for guide #5 + FAQ)

- Rules: "3 voltage drop rule", "3 or 5", "3 percent", "5 percent",
  "5 rule", "rule of thumb", "nec", "nec 2023", "nec code article",
  "nec section", "nec table", "law", "limits", "requirements",
  "percentage allowed", "tolerance", "recommendation"
- Charts: "chart 120v", "chart 12v", "chart 240v", "chart 480v",
  "chart nec", "chart pdf", "distance chart", "by distance",
  "per 100 ft", "per foot", "table pdf"
- By gauge: "voltage drop 10/12/14/18 gauge wire", "on 2/0 wire",
  "4/0 aluminum", "8 awg", "8 gauge", "#8 thhn"
- By distance: "50 feet", "150 ft", "200 feet", "300 feet", "400 feet",
  "500 feet", "600 ft", "at 700 feet", "how many feet"
- Calculators: 12v, 24v (×3), 3 phase, dc, solar, excel/xls, southwire,
  resistor, 0-10v, 70v speaker
- Formula: "formula" (×9 variants incl. nec, 3 phase, single phase, uk),
  "k factor", "k value", "equation" (×3)
- Concept questions (FAQ gold): "is voltage drop dangerous", "is it the
  same as resistance/voltage/potential difference", "caused by
  resistance", "same for ac and dc", "measured in series or parallel"
- Students: "practice problems", "practice questions", "example problems
  with solutions", "questions and answers (pdf)", "quizlet" (×2),
  "procedure", "simulator", "math"
- International: australia, uk (bs 7671 ×2), canada, nz, south africa,
  pec (Philippines), jkr (Malaysia), iec 60364, ashrae 90.1, nfpa 72,
  mm2 cables (0.5–35mm), hindi/tamil/korean queries
- Automotive diagnostics (mostly out of scope but 12V calc serves it):
  "test starter", "when cranking", "battery cables", "alternator"

## 5. Conduit fill cluster

- Chart demand: "conduit fill chart" (emt nec, pvc, pvc sch 40, rigid,
  flex, fmc, cat6), "emt conduit fill chart/table nec/pdf"
- Service family: "what size conduit for 50/100/200/400 amp service",
  "100 amp sub panel", "200 amp underground service", "80 amp service",
  "70 amp sub panel" → programmatic family, pairs with amp pages
- Wire-set family: "for 3 #6 wires", "for 4 #4 wires", "for 3 1/0 wires",
  "for 3 250 mcm", "for 2-2-2-4 (aluminum)" — a count×gauge grid
- Cable-assembly: 6/3 (×5 variants), 6/2, 6/4, 8/2, 8/3, 10/2, 10/3,
  12/2 romex (×3), 14/2, "romex in conduit" (people do this wrong!)
- Use-cases: hot tub (×3), ev charger/tesla (×3), generator/generac (×3),
  whole house generator, solar (×2), starlink (×2), mini split,
  well pump, pool pump, landscape lighting, underground (×5), ethernet/
  cat6/fiber (×6 — low-voltage crowd), mobile home feeder, ser cable,
  direct burial, meter base, greenhouse, kitchen island, pool lights
- Apps/tools: "calculator app", "excel", "for multiple wire sizes"
  (our differentiator — mixed sizes!), southwire, belden, canada/cec

## 6. Box fill cluster

- "box fill calculator" (nec, app, chart, canada/cec/ontario, southwire,
  500 mcm)
- "box fill chart" (nec, nec 2017/2020/2023 — EDITION VARIANTS suggested!
  people search by code year), pdf
- Questions: "how many wires in a junction box", "in a single gang box",
  "in a 4x4 junction box", "in a 3/4 conduit", "in a red wire nut"
- "electrical box fill rules", "formula", "capacity",
  "calculation table", "junction box fill chart"

## 7. Power calculator cluster

- Fortress head terms confirmed: amps↔watts, kw to amps, kva to kw
  (RapidTables territory — map already says skip head-on)
- Winnable long-tail: "how many watts on a 15 amp breaker/circuit
  (120v/240v)", "20 amp" (×3), "30 amp circuit" — ties to breaker sizing
- "volts amps watts explained / triangle / water analogy / and ohms
  explained" — beginner explainer demand (low priority per map)
- kva→kwh, kva to kw generator, kw to amps 3 phase / single phase

## 8. Cross-cutting observations

1. **Edition-year searches are real**: "box fill chart nec 2023",
   "voltage drop nec 2023", "nec 310.16". Always name the NEC edition in
   titles/H2s — it's both a ranking keyword and a trust signal vs
   Cerrowire's 2017 chart.
2. **"calculator app" and "excel/xls/pdf" queries everywhere** — people
   want take-away artifacts. A printable PDF chart per guide = link bait.
3. **International demand is significant** (UK/BS7671, Australia, Canada/
   CEC, Philippines PEC, mm2 cables). Recommend: stay US/NEC-only for now,
   note as expansion axis — the mm2 audience is unserved by AWG tools.
4. **Student/apprentice segment**: practice problems, worked examples,
   quizlet-style. Guide #5 should include 2-3 worked example problems —
   captures this segment AND trains the shown-math brand.
5. **Victron MPPT model-specific queries** (100/20, 100/30, 100/50) —
   solar DIYers are extremely specific. A solar/DC voltage-drop page with
   Victron examples would have zero competition.
6. **CEC (Canada) variants** on conduit/box fill — one "how Canada
   differs" note per page could capture these cheaply later.

## 9. FAQ-schema question bank (ready to use, in searchers' words)

Guide 1 (sub-panel): what size wire for 100 amp sub panel 150 feet ·
how far can you run 200 amp service underground · does a sub panel reset
voltage drop (forum finding) · what size conduit for 100 amp sub panel ·
what size ground wire for sub panel

Guide 2 (50 amp): what size wire for 50 amp breaker · 50 amp 100 feet ·
can you use 8 gauge for 50 amp · what size conduit for 50 amp ·
50 amp hot tub wire · 50 amp rv hookup wire

Guide 3 (ampacity chart): how many amps can 12 gauge wire handle ·
at 12 volts vs 120 volts · thhn vs romex ampacity · why is NM-B limited
to 60°C · nec 310.16 2023 vs 2020 changes

Guide 4 (how far 12 gauge): how far can you run 12 gauge wire on a 20 amp
breaker · without a voltage drop · 12/2 on 15 amp · 12 gauge at 240 volts
· do you enter breaker amps or actual load

Guide 5 (VD explained): is the 3% rule code or guideline · is voltage
drop dangerous · one-way vs round trip distance · k factor formula ·
ac vs dc voltage drop · how to fix voltage drop

## 10. Validation check vs GUIDES_TOPIC_MAP.md

- "50 amp highest-volume amp variant": CONFIRMED (widest distance grid
  after 100A/200A which are service-driven; 50A has 7 distances).
- Sub-panel as biggest stream: CONFIRMED (appears across wire-size,
  conduit, and distance clusters simultaneously).
- DC/12V differentiator: CONFIRMED and arguably understated — the 12V
  cluster spans automotive, marine, solar, RV, LED, and Victron niches.
- Amp-page family order (15/20/30/40/60/100/200): adjust — autocomplete
  distance grids suggest priority 50 → 100 → 60 → 30 → 200 → 20 → 40.
- Mini-split noted as "trailing scenario": autocomplete shows FOUR
  variants (generic, 9k, 18k BTU, Mr Cool) — consider promoting into
  second five.
