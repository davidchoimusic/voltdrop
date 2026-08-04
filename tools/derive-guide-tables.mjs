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

export function deriveGuideTables() {
  const fingerprints = verifyGoldenFingerprints();
  const sealed = constants();
  const functions = engine();
  const guides = {};
  const ampacity = {};
  const workedExamples = {};

  for (const [guide, guideConfig] of Object.entries(GUIDE_TABLE_CONFIG)) {
    guides[guide] = {};
    ampacity[guide] = {};
    workedExamples[guide] = {};
    for (const edition of Object.keys(EDITIONS)) {
      const tables = {};
      for (const [table, tableConfig] of Object.entries(guideConfig.tables)) {
        tables[table] = {};
        for (const material of tableConfig.materials) {
          tables[table][material] = {};
          for (const distance of tableConfig.distances) {
            tables[table][material][distance] = deriveCell({
              guide, edition, table, material, distance, sealed, functions,
            }).finalLabel.replace(/ AWG$/, '');
          }
        }
      }

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
      guides[guide][edition] = tables;
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
      sealedFingerprintsChecked: fingerprints.length,
    },
    guides,
    ampacity,
    workedExamples,
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
