import { describe, expect, it } from 'vitest';
import {
  breakerFor,
  chargeVoltage,
  computeElectrical,
  currentFromVA,
  selectCable,
  sizeCircuit,
  unitRating,
  voltageDropPct,
} from '../electrical';
import { configureModel } from '../selection';
import { computeThermal } from '../thermal';
import type { BatterySolution } from '../types';
import { computeVentilation } from '../ventilation';
import { inputs, model, project, settings } from './fixtures';

const battery: BatterySolution = {
  blockId: 'B1',
  blockReference: 'Bloc test',
  chemistry: 'VRLA_AGM',
  blockV: 12,
  capacityAh: 40,
  blocksPerString: 40,
  cellsPerString: 240,
  strings: 4,
  internalStrings: 0,
  location: 'cabinet',
  cabinets: [{ id: 'C1', reference: 'Armoire test', qty: 4 }],
  sets: 1,
  setDetails: [{ system: 'A', unitsCovered: 1, designPowerW: 60000 }],
  eodVpc: 1.75,
  autonomyMin: 11.7,
  autonomyNewMin: 25.9,
  autonomyIsLowerBound: false,
  dcNominalV: 480,
  cellPowerRequiredW: 90.5,
  cellPowerAvailableW: 100,
  kAging: 1.25,
  kTemp: 1,
  kMargin: 1.1,
  totalBlocks: 160,
  totalWh: 76800,
  totalWeightKg: 2640,
};

describe('courants et calibres', () => {
  it('I = S ÷ (√3 U) en tri, S ÷ U en mono', () => {
    expect(currentFromVA(100000, 400, 3)).toBeCloseTo(144.34, 2);
    expect(currentFromVA(10000, 230, 1)).toBeCloseTo(43.48, 2);
  });
  it('calibre = première valeur normalisée ≥ Ib', () => {
    const s = settings.electrical.breakerSeriesA;
    expect(breakerFor(144.3, s)).toBe(160);
    expect(breakerFor(160, s)).toBe(160);
    expect(breakerFor(5000, s)).toBeNull();
  });
});

describe('sections de câbles (IEC 60364-5-52, méthode E, PR/XLPE)', () => {
  const base = {
    kind: 'ac3' as const,
    ib: 144.34,
    inA: 160,
    lengthM: 20,
    voltageV: 400,
    cosPhi: 1,
    settings,
  };
  it('Iz × k_G ≥ In : 160 A → 70 mm² (246 × 0,8 = 196,8 A)', () => {
    const c = selectCable(base)!;
    expect(c.sectionMm2).toBe(70);
    expect(c.parallel).toBe(1);
    expect(c.izA).toBeCloseTo(196.8);
    // ΔU = √3 × 144,34 × 20 × 0,0225 ÷ 70 ÷ 400 = 0,40 %
    expect(c.voltageDropPct).toBeCloseTo(0.4018, 3);
  });
  it('la chute de tension impose une section plus forte sur une grande longueur', () => {
    // 70 mm² sur 300 m : 6,0 % > 3 % → il faut S ≥ 141 mm² → 150 mm²
    expect(selectCable({ ...base, lengthM: 300 })!.sectionMm2).toBe(150);
  });
  it('courant continu : 2 conducteurs chargés, chute ≤ 1 %', () => {
    const c = selectCable({ ...base, kind: 'dc', ib: 300, inA: 320, lengthM: 5, voltageV: 480 })!;
    expect(c.sectionMm2).toBe(120);
    expect(c.voltageDropPct).toBeCloseTo(((2 * 300 * 5 * 0.0225) / 120 / 480) * 100, 6);
    expect(c.maxVoltageDropPct).toBe(1);
  });
  it('câbles en parallèle au-delà de 300 mm²', () => {
    const c = selectCable({ ...base, ib: 950, inA: 1000 })!;
    expect(c.parallel).toBe(3);
    expect(c.sectionMm2).toBe(185);
  });
  it('correction de température ambiante', () => {
    // 50 °C : 246 × 0,82 × 0,8 = 161,4 A ≥ 160 → 70 mm² ; 55 °C : 246 × 0,76 × 0,8 = 149,6 A → 95 mm²
    expect(selectCable({ ...base, ambientC: 50 })!.sectionMm2).toBe(70);
    expect(selectCable({ ...base, ambientC: 55 })!.sectionMm2).toBe(95);
  });
  it('aucune solution si le courant est hors de portée', () => {
    expect(selectCable({ ...base, inA: 10000, ib: 10000 })).toBeNull();
  });
  it('chute de tension monophasée avec cos φ', () => {
    const d = voltageDropPct('ac1', 40, 30, 10, 1, 230, 0.9);
    const expected =
      (100 * 2 * 40 * 30 * ((0.0225 * 0.9) / 10 + 0.08e-3 * Math.sqrt(1 - 0.81))) / 230;
    expect(d).toBeCloseTo(expected, 9);
  });
  it('sizeCircuit trace le calibre et le câble', () => {
    const r = sizeCircuit(
      { kind: 'ac3', ib: 100, lengthM: 20, voltageV: 400, cosPhi: 1 },
      settings,
    );
    expect(r.value.breakerA).toBe(100);
    expect(r.trace.steps).toHaveLength(2);
    const none = sizeCircuit(
      { kind: 'ac3', ib: 99999, lengthM: 20, voltageV: 400, cosPhi: 1 },
      settings,
    );
    expect(none.value).toEqual({ breakerA: null, cable: null });
  });
});

describe('installation complète', () => {
  const m = model();
  const config = configureModel(m, inputs())!;
  it('courants de l’unité et circuits par système', () => {
    const r = computeElectrical({
      model: m,
      config,
      battery,
      inputs: inputs(),
      installation: project().installation,
      settings,
    }).value;
    expect(r.unitOutputA).toBeCloseTo(144.34, 1);
    // (100 000 ÷ 0,95 + 20 × 240 × 2,27) ÷ (√3 × 400 × 0,99)
    expect(r.unitRectifierA).toBeCloseTo(
      (100000 / 0.95 + 20 * 240 * 2.27) / (Math.sqrt(3) * 400 * 0.99),
      3,
    );
    // 100 000 ÷ 0,95 ÷ (240 × 1,75)
    expect(r.unitBatteryA).toBeCloseTo(100000 / 0.95 / (240 * 1.75), 3);
    const ids = r.circuits.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(['rectifier', 'bypass', 'output', 'battery', 'feeder']),
    );
    expect(r.generatorKVA).toBeNull();
  });
  it('2N, groupe électrogène et bypass de maintenance', () => {
    const c2 = configureModel(m, inputs({ redundancy: '2N' }))!;
    const inst = {
      generator: true,
      externalMaintenanceBypass: true,
      cableLengthsM: { input: 30, bypass: 30, output: 10, battery: 3 },
    };
    const r = computeElectrical({
      model: m,
      config: c2,
      battery: { ...battery, sets: 2 },
      inputs: inputs(),
      installation: inst,
      settings,
    }).value;
    expect(r.circuits.filter((c) => c.system === 'B').length).toBeGreaterThan(0);
    expect(r.circuits.some((c) => c.id === 'ats')).toBe(true);
    expect(r.circuits.some((c) => c.id === 'maintenanceBypass')).toBe(true);
    expect(r.generatorKVA).toBeCloseTo(1.5 * 100 * 2);
    expect(r.circuits.find((c) => c.id === 'output')!.lengthM).toBe(10);
  });
  it('puissance assignée d’un châssis modulaire équipé', () => {
    const mod = model({
      technology: 'modular',
      modular: {
        moduleKVA: 25,
        moduleKW: 25,
        maxModules: 4,
        frameMaxKVA: 100,
        moduleWeightKg: 30,
        emptyFrameWeightKg: 300,
        frameParallelMax: 4,
      },
    });
    const cfg = configureModel(mod, inputs())!;
    expect(cfg.modulesPerFrame).toEqual([3]);
    expect(unitRating(mod, cfg)).toEqual({ va: 75000, w: 75000 });
  });
  it('tension de recharge : floating VRLA, nominale × 1,08 en lithium', () => {
    expect(chargeVoltage(battery, settings)).toBeCloseTo(240 * 2.27);
    expect(
      chargeVoltage({ ...battery, chemistry: 'LI_LFP', dcNominalV: 512 }, settings),
    ).toBeCloseTo(552.96);
  });
});

describe('thermique et ventilation', () => {
  const m = model();
  const config = configureModel(m, inputs())!;
  it('pertes onduleur + recharge, conversion BTU/h', () => {
    const r = computeThermal({
      model: m,
      config,
      battery,
      inputs: inputs(),
      hvac: { present: true, kW: 10 },
      settings,
    });
    // η(0,6) = 0,958 ; 60 000 × (1 ÷ 0,958 − 1) = 2 630 W ; recharge 20 × 544,8 × 0,15 = 1 634 W
    expect(r.value.upsLossesW).toBeCloseTo(60000 * (1 / 0.958 - 1), 0);
    expect(r.value.chargeLossesW).toBeCloseTo(20 * 240 * 2.27 * 0.15, 6);
    expect(r.value.totalBtuH).toBeCloseTo(r.value.totalW * 3.412142, 6);
    expect(r.alerts).toEqual([]);
  });
  it('climatisation insuffisante ou absente', () => {
    const low = computeThermal({
      model: m,
      config,
      battery,
      inputs: inputs(),
      hvac: { present: true, kW: 1 },
      settings,
    });
    expect(low.alerts[0]).toMatchObject({ code: 'hvac_insufficient', level: 'warn' });
    const none = computeThermal({
      model: m,
      config,
      battery,
      inputs: inputs(),
      hvac: { present: false, kW: 0 },
      settings,
    });
    expect(none.alerts[0]?.code).toBe('hvac_required');
  });
  it('dissipation catalogue prioritaire si renseignée', () => {
    const mm = model({ heatDissipationW: 3000 });
    const r = computeThermal({
      model: mm,
      config,
      battery,
      inputs: inputs(),
      hvac: { present: true, kW: 10 },
      settings,
    });
    expect(r.value.upsLossesW).toBe(3000);
  });
  it('IEC 62485-2 : Q = 0,05 × n × I_gaz × C_rt × 10⁻³', () => {
    const v = computeVentilation(battery, settings).value;
    expect(v.cells).toBe(960);
    expect(v.flowM3h).toBeCloseTo(0.05 * 960 * 1 * 40 * 1e-3, 9);
    expect(v.freeAreaCm2).toBeCloseTo(28 * v.flowM3h, 9);
    const li = computeVentilation({ ...battery, chemistry: 'LI_LFP' }, settings).value;
    expect(li.applicable).toBe(false);
  });
});
