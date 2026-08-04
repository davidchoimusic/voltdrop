import { writeFileSync } from 'node:fs';
import {
  readBrowserFunctions,
  readLiteralConstant,
  readSealedConstant,
  verifyGoldenFingerprints,
} from './lib/sealed-data.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const OUTPUT_FILE = 'tools/guide-table-derivations.json';

// NEC 310.12 dwelling-service allowance, source-verified by the PM on 2026-08-03.
// Conditions: (1) dwelling service or feeder carrying the entire dwelling load only;
// (2) service/feeder ratings from 100 A through 400 A only;
// (3) no ampacity adjustment or correction factors are required; and
// (4) conductors must be rated 75 C or better, so NM/Romex is excluded.
// This deliberately lives in the derivation layer until the later golden-data round.
export const NEC_310_12_DWELLING_SERVICE_FACTOR = 0.83;

const DWELLING_SERVICE_EXPECTATIONS = Object.freeze({
  hundredAmpService: {
    rating: 100,
    dwelling: { cu: '4 AWG', al: '2 AWG' },
  },
  twoHundredAmpService: {
    rating: 200,
    dwelling: { cu: '2/0 AWG', al: '4/0 AWG' },
  },
});

export const GUIDE_TABLE_CONFIG = Object.freeze({
  twentyAmp: {
    amps: 20,
    tables: { '120v': { volts: 120, distances: [50, 100, 150, 200, 250, 300], materials: ['cu'] } },
  },
  thirtyAmp: {
    amps: 30,
    tables: {
      '240v': { volts: 240, distances: [50, 100, 150, 200, 250], materials: ['cu', 'al'] },
      '120v': { volts: 120, distances: [50, 100, 150, 200, 250], materials: ['cu', 'al'] },
    },
  },
  fortyAmp: {
    amps: 40,
    tables: { '240v': { volts: 240, distances: [50, 100, 150, 200, 250, 300], materials: ['cu', 'al'] } },
  },
  sixtyAmp: {
    amps: 60,
    tables: { '240v': { volts: 240, distances: [50, 100, 150, 200, 250, 300], materials: ['cu', 'al'] } },
  },
  hundredAmpService: {
    amps: 100,
    editions: ['us'],
    dwellingService: true,
    tables: { '240v': { volts: 240, distances: [50, 100, 150, 200, 250, 300], materials: ['cu', 'al'] } },
  },
  twoHundredAmpService: {
    amps: 200,
    editions: ['us'],
    dwellingService: true,
    tables: { '240v': { volts: 240, distances: [50, 100, 150, 200, 250, 300], materials: ['cu', 'al'] } },
  },
});

const EDITIONS = Object.freeze({
  us: { country: 'us', terminationTemp: 75 },
  ca: { country: 'ca', terminationTemp: 60 },
});

const WORKED_EXAMPLES = Object.freeze({
  twentyAmp: { table: '120v', material: 'cu', distance: 100 },
  thirtyAmp: { table: '120v', material: 'cu', distance: 100 },
  fortyAmp: { table: '240v', material: 'cu', distance: 150 },
  sixtyAmp: { table: '240v', material: 'cu', distance: 150 },
});

const constants = () => ({
  wireTable: readSealedConstant('app.js', 'WIRE_TABLE'),
  kFactors: readSealedConstant('app.js', 'K_FACTOR'),
  systems: readLiteralConstant('app.js', 'SYSTEMS'),
  ampacityTable: readSealedConstant('ampacity.js', 'AMPACITY'),
  smallCapTable: readSealedConstant('ampacity.js', 'SMALL_CAP'),
  ambientCorrectionTable: readSealedConstant('ampacity.js', 'AMBIENT_CORRECTION'),
  conductorAdjustmentTable: readSealedConstant('ampacity.js', 'CONDUCTOR_ADJUSTMENT'),
  cecAmbientCorrectionTable: readSealedConstant('ampacity.js', 'CEC_AMBIENT_CORRECTION'),
  cecConductorAdjustmentTable: readSealedConstant('ampacity.js', 'CEC_CONDUCTOR_ADJUSTMENT'),
  tempIndex: readLiteralConstant('ampacity.js', 'TEMP_INDEX'),
});

const engine = () => readBrowserFunctions([
  ['ampacity.js', 'calculateAmpacity'],
  ['app.js', 'calculateVoltageDrop'],
  ['app.js', 'calculateCombinedWireSize'],
]);

function deriveCell({ guide, edition, table, material, distance, sealed, functions }) {
  const guideConfig = GUIDE_TABLE_CONFIG[guide];
  const tableConfig = guideConfig.tables[table];
  const editionConfig = EDITIONS[edition];
  const result = functions.calculateCombinedWireSize(
    editionConfig.country,
    'ac1',
    material,
    tableConfig.volts,
    guideConfig.amps,
    distance,
    3,
    90,
    editionConfig.terminationTemp,
    false,
    30,
    3,
    sealed.wireTable,
    sealed.kFactors,
    sealed.systems,
    sealed.ampacityTable,
    sealed.smallCapTable,
    sealed.ambientCorrectionTable,
    sealed.conductorAdjustmentTable,
    sealed.cecAmbientCorrectionTable,
    sealed.cecConductorAdjustmentTable,
    sealed.tempIndex,
    functions.calculateAmpacity,
  );
  if (result.status !== 'ok') {
    throw new Error(`${guide}/${edition}/${table}/${material}/${distance}: engine returned ${result.status}`);
  }
  return result;
}

const stripAwg = (label) => label.replace(/ AWG$/, '');

function firstConductorAtOrAbove(ampacityTable, material, requiredAmps) {
  let previous = null;
  for (const [label, columns] of Object.entries(ampacityTable[material])) {
    const ampacity75C = columns[1];
    if (ampacity75C >= requiredAmps) {
      if (previous && previous.ampacity75C >= requiredAmps) {
        throw new Error(`75 C ampacity search invariant failed: ${previous.label} also passes ${requiredAmps} A`);
      }
      return { label, ampacity75C, nextSmaller: previous };
    }
    previous = { label, ampacity75C };
  }
  throw new Error(`No ${material} conductor in the verified ampacity table reaches ${requiredAmps} A`);
}

function deriveDwellingServiceSizing(guide, ampacityTable) {
  const expectation = DWELLING_SERVICE_EXPECTATIONS[guide];
  if (!expectation) throw new Error(`${guide}: missing dwelling-service expectation`);
  const requiredAmpacity = expectation.rating * NEC_310_12_DWELLING_SERVICE_FACTOR;
  const dwelling = {};
  const standard = {};

  for (const material of ['cu', 'al']) {
    dwelling[material] = firstConductorAtOrAbove(ampacityTable, material, requiredAmpacity);
    standard[material] = firstConductorAtOrAbove(ampacityTable, material, expectation.rating);
    if (dwelling[material].label !== expectation.dwelling[material]) {
      throw new Error(
        `${guide}/${material}: NEC 310.12 derivation produced ${dwelling[material].label}; expected ${expectation.dwelling[material]}`,
      );
    }
  }

  return {
    rating: expectation.rating,
    factor: NEC_310_12_DWELLING_SERVICE_FACTOR,
    requiredAmpacity,
    dwelling,
    standard,
  };
}

function deriveDwellingServiceCell({ guide, table, material, distance, sealed, functions, serviceSizing }) {
  const guideConfig = GUIDE_TABLE_CONFIG[guide];
  const tableConfig = guideConfig.tables[table];
  const voltageDrop = functions.calculateVoltageDrop(
    'size',
    'ac1',
    material,
    tableConfig.volts,
    guideConfig.amps,
    distance,
    0,
    3,
    sealed.wireTable,
    sealed.kFactors,
    sealed.systems,
  );
  if (!voltageDrop.found) {
    throw new Error(`${guide}/us/${table}/${material}/${distance}: voltage-drop search returned no size`);
  }
  const dwellingLabel = serviceSizing.dwelling[material].label;
  const dwellingIndex = sealed.wireTable.findIndex(([label]) => label === dwellingLabel);
  if (dwellingIndex < 0) throw new Error(`${guide}/${material}: ${dwellingLabel} is missing from the wire table`);
  const finalIndex = Math.max(dwellingIndex, voltageDrop.found.wireIndex);
  return stripAwg(sealed.wireTable[finalIndex][0]);
}

export function deriveGuideTables() {
  const fingerprints = verifyGoldenFingerprints();
  const sealed = constants();
  const functions = engine();
  const guides = {};
  const ampacity = {};
  const workedExamples = {};
  const dwellingServiceSizing = {};

  for (const [guide, guideConfig] of Object.entries(GUIDE_TABLE_CONFIG)) {
    guides[guide] = {};
    ampacity[guide] = {};
    workedExamples[guide] = {};
    const serviceSizing = guideConfig.dwellingService
      ? deriveDwellingServiceSizing(guide, sealed.ampacityTable)
      : null;
    if (serviceSizing) dwellingServiceSizing[guide] = serviceSizing;
    for (const edition of guideConfig.editions || Object.keys(EDITIONS)) {
      const tables = {};
      for (const [table, tableConfig] of Object.entries(guideConfig.tables)) {
        tables[table] = {};
        for (const material of tableConfig.materials) {
          tables[table][material] = {};
          for (const distance of tableConfig.distances) {
            tables[table][material][distance] = guideConfig.dwellingService
              ? deriveDwellingServiceCell({
                guide, table, material, distance, sealed, functions, serviceSizing,
              })
              : deriveCell({
                guide, edition, table, material, distance, sealed, functions,
              }).finalLabel.replace(/ AWG$/, '');
          }
        }
      }

      guides[guide][edition] = tables;
      if (guideConfig.dwellingService) continue;

      const exampleConfig = WORKED_EXAMPLES[guide];
      const example = deriveCell({
        guide,
        edition,
        table: exampleConfig.table,
        material: exampleConfig.material,
        distance: exampleConfig.distance,
        sealed,
        functions,
      });
      ampacity[guide][edition] = {
        copperMinimum: example.ampacityMinimum.label.replace(/ AWG$/, ''),
        copperPermittedAmps: example.ampacityMinimum.result.permitted,
      };
      workedExamples[guide][edition] = {
        table: exampleConfig.table,
        material: exampleConfig.material,
        distanceFt: exampleConfig.distance,
        awg: example.finalLabel.replace(/ AWG$/, ''),
        circularMils: example.finalDrop.cm,
        voltsDropped: Number(example.finalDrop.vd.toFixed(2)),
        percentDropped: Number(example.finalDrop.pct.toFixed(2)),
      };
    }
  }

  return {
    meta: {
      generatedBy: 'tools/derive-guide-tables.mjs',
      targetPercent: 3,
      system: 'single-phase AC',
      ambientC: 30,
      currentCarryingConductors: 3,
      insulationC: 90,
      terminationC: { us: 75, ca: 60 },
      dwellingServiceFactor: NEC_310_12_DWELLING_SERVICE_FACTOR,
      dwellingServiceTemperatureC: 75,
      sealedFingerprintsChecked: fingerprints.length,
    },
    guides,
    ampacity,
    workedExamples,
    dwellingServiceSizing,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = deriveGuideTables();
  const json = `${JSON.stringify(output, null, 2)}\n`;
  const fileIndex = process.argv.indexOf('--file');
  if (fileIndex >= 0) {
    const file = process.argv[fileIndex + 1] || OUTPUT_FILE;
    writeFileSync(file, json);
    console.error(`wrote ${file}`);
  } else {
    process.stdout.write(json);
  }
}
