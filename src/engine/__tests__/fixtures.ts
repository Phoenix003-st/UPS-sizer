/** Données de test : modèles et blocs simples dont les résultats se calculent à la main. */
import { DEFAULT_CATALOGS } from '../../catalog';
import type { BatteryBlock, BatteryCabinet, UpsModel } from '../../catalog/schemas';
import { defaultSettings } from '../../settings/schema';
import { createProject } from '../project';
import type { NormalizedInputs } from '../types';

export const settings = defaultSettings();
export const catalogs = DEFAULT_CATALOGS;

export function project(scenario: Parameters<typeof createProject>[0] = 'server') {
  return createProject(scenario, settings, { id: 'test', now: '2026-01-01T00:00:00.000Z' });
}

/** Bloc VRLA à table plate simple : 100 W/élément à 10 min, 50 W à 30 min, 20 W à 90 min. */
export function block(over: Partial<BatteryBlock> = {}): BatteryBlock {
  return {
    id: 'B1',
    sample: true,
    reference: 'Bloc test',
    chemistry: 'VRLA_AGM',
    nominalV: 12,
    cells: 6,
    capacityAh: 40,
    capacityRate: 'C10',
    dimensionsMm: { w: 200, d: 170, h: 170 },
    weightKg: 14,
    designLifeYears: 10,
    discharge: {
      unit: 'W_per_cell',
      refTempC: 25,
      tables: [
        {
          eodVpc: 1.75,
          points: [
            { min: 10, W: 100 },
            { min: 30, W: 50 },
            { min: 90, W: 20 },
          ],
        },
        {
          eodVpc: 1.67,
          points: [
            { min: 10, W: 110 },
            { min: 30, W: 55 },
            { min: 90, W: 22 },
          ],
        },
      ],
    },
    tempCorrection: [
      { tC: 10, k: 0.8 },
      { tC: 25, k: 1 },
      { tC: 40, k: 1.1 },
    ],
    ...over,
  };
}

export function cabinet(over: Partial<BatteryCabinet> = {}): BatteryCabinet {
  return {
    id: 'C1',
    sample: true,
    brand: '',
    partNumber: '',
    reference: 'Armoire test',
    kind: 'cabinet',
    dimensionsMm: { w: 800, d: 800, h: 1900 },
    emptyWeightKg: 100,
    clearancesMm: { front: 1000, rear: 0, left: 0, right: 0, top: 300 },
    capacity: [{ blockId: 'B1', maxBlocks: 40 }],
    breakerA: 250,
    ...over,
  };
}

export function model(over: Partial<UpsModel> = {}): UpsModel {
  return {
    id: 'U1',
    sample: true,
    brand: '',
    partNumber: '',
    estimated: [],
    reference: 'UPS test 100 kVA',
    range: 'Test',
    technology: 'online_double_conversion',
    formFactor: 'cabinet',
    rackUnits: null,
    power: { kVA: 100, kW: 100, pf: 1 },
    phases: { in: 3, out: 3 },
    voltages: { out: [380, 400, 415], freqHz: [50, 60] },
    efficiency: {
      online: [
        { load: 0.25, eta: 0.94 },
        { load: 0.5, eta: 0.96 },
        { load: 1, eta: 0.95 },
      ],
      eco: 0.99,
      battery: 0.95,
    },
    dimensionsMm: { w: 600, d: 850, h: 1900 },
    weightKg: 400,
    clearancesMm: { front: 1000, rear: 0, left: 0, right: 0, top: 500 },
    ip: 'IP20',
    ambientC: { min: 0, max: 40 },
    noiseDb: 60,
    battery: {
      blockVoltage: 12,
      blocksPerString: { allowed: [40], default: 40 },
      internal: null,
      maxChargeCurrentA: 20,
      compatibleCabinetIds: ['C1'],
      sharedBattery: false,
      maxExternalCabinets: 4,
    },
    heatDissipationW: null,
    parallel: { capable: true, maxUnits: 4 },
    modular: null,
    datasheetUrl: '',
    ...over,
  };
}

export function inputs(over: Partial<NormalizedInputs> = {}): NormalizedInputs {
  return {
    loadW: 50000,
    loadVA: 50000,
    designW: 60000,
    designVA: 60000,
    growthMargin: 0.2,
    outputPf: 1,
    targetLoadRate: 0.8,
    phases: 3,
    inputPhases: 3,
    formFactor: 'auto',
    voltageV: 400,
    freqHz: 50,
    redundancy: 'N',
    autonomyMin: 10,
    kAltitude: 1,
    technologies: ['online_double_conversion', 'modular'],
    eodVpc: 1.75,
    floorLoadKgM2: 500,
    ...over,
  };
}
