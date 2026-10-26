import { describe, expect, it } from 'vitest';
import { normalizeAlerts, worstLevel } from '../alerts';
import { altitudeFactor, checkEnvironment } from '../environment';
import { computeLoad, sumEquipment } from '../load';
import { ceilSafe, clamp, interpLinear, interpLogLog, nextInSeries } from '../math';
import { framesForModules, modulesNeeded } from '../modular';
import { resolvePhases, systemVoltage } from '../phases';
import { fmt, trace } from '../trace';
import { catalogs, project, settings } from './fixtures';

describe('math', () => {
  it('ceilSafe ignore les erreurs flottantes', () => {
    expect(ceilSafe(0.1 * 3 * 10)).toBe(3);
    expect(ceilSafe(3.0001)).toBe(4);
  });
  it('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
  it('interpolation linéaire avec bornes', () => {
    const t = [
      { x: 0, y: 0 },
      { x: 10, y: 100 },
    ];
    expect(interpLinear(t, 5)).toBe(50);
    expect(interpLinear(t, -5)).toBe(0);
    expect(interpLinear(t, 50)).toBe(100);
    expect(() => interpLinear([], 1)).toThrow();
  });
  it('interpolation log-log exacte sur une loi de puissance', () => {
    // y = 1000 × x^-1 : la droite log-log est exacte.
    const t = [
      { x: 10, y: 100 },
      { x: 100, y: 10 },
    ];
    expect(interpLogLog(t, 50)).toBeCloseTo(20, 9);
    expect(interpLogLog(t, 200)).toBeCloseTo(5, 9); // extrapolation
    expect(() => interpLogLog([{ x: 1, y: 1 }], 1)).toThrow();
  });
  it('série normalisée', () => {
    expect(nextInSeries([10, 16, 20], 16)).toBe(16);
    expect(nextInSeries([10, 16, 20], 16.1)).toBe(20);
    expect(nextInSeries([10, 16, 20], 21)).toBeNull();
  });
});

describe('trace', () => {
  it('construit une trace et formate les nombres', () => {
    const a = trace('a')
      .step({ label: 'x', formula: 'f', substituted: 's', result: 1, unit: 'W' })
      .build();
    const b = trace('b').append(a).build();
    expect(b.steps).toHaveLength(1);
    expect(fmt(1.23456)).toBe('1.23');
    expect(fmt(2.5, 0)).toBe('3');
    expect(fmt(Infinity)).toBe('Infinity');
  });
});

describe('load — puissance requise', () => {
  it('kW_req = charge × (1 + marge), kVA_req = kW_req ÷ FP', () => {
    const r = computeLoad(
      { mode: 'quick', value: 40, unit: 'kW', items: [] },
      { outputPf: 0.9, growthMargin: 0.2 },
      [],
    );
    expect(r.value.loadW).toBe(40000);
    expect(r.value.designW).toBeCloseTo(48000);
    expect(r.value.designVA).toBeCloseTo(48000 / 0.9);
    expect(r.trace.steps.length).toBeGreaterThan(1);
  });
  it('saisie en kVA convertie avec le FP', () => {
    const r = computeLoad(
      { mode: 'quick', value: 10, unit: 'kVA', items: [] },
      { outputPf: 0.9, growthMargin: 0 },
      [],
    );
    expect(r.value.loadW).toBeCloseTo(9000);
    expect(r.value.designVA).toBeCloseTo(10000);
  });
  it('mode assisté : Σ qté × W, puissance apparente avec FP des équipements', () => {
    const items = [
      { libId: 'ip-camera', qty: 20, unitW: 10 },
      { libId: 'nvr', qty: 1, unitW: 60 },
    ];
    const sum = sumEquipment(items, catalogs.equipment);
    expect(sum.W).toBe(260);
    expect(sum.VA).toBeCloseTo(260 / 0.9);
    const r = computeLoad(
      { mode: 'assisted', value: 0, unit: 'kW', items },
      { outputPf: 1, growthMargin: 0.2 },
      catalogs.equipment,
    );
    expect(r.value.loadW).toBe(260);
    expect(r.value.designW).toBeCloseTo(312);
    expect(r.value.designVA).toBeCloseTo((260 / 0.9) * 1.2);
  });
  it('équipement hors bibliothèque : FP 0,9 par défaut, FP de ligne prioritaire', () => {
    expect(sumEquipment([{ libId: 'x', qty: 1, unitW: 90 }], []).VA).toBeCloseTo(100);
    expect(sumEquipment([{ libId: 'x', qty: 1, unitW: 90, pf: 1 }], []).VA).toBeCloseTo(90);
  });
});

describe('environment', () => {
  it('pas de déclassement jusqu’à 1 000 m, interpolation au-delà', () => {
    const table = settings.power.altitudeDerating;
    expect(altitudeFactor(800, table).value).toBe(1);
    expect(altitudeFactor(1500, table).value).toBeCloseTo(0.95);
    expect(altitudeFactor(1750, table).value).toBeCloseTo(0.93);
  });
  it('alertes de température, humidité et altitude', () => {
    const room = project().room;
    expect(checkEnvironment({ ...room, ambientC: 22 }, settings).value.alerts).toEqual([]);
    const hot = checkEnvironment({ ...room, ambientC: 45 }, settings).value.alerts;
    expect(hot[0]).toMatchObject({ level: 'block', code: 'temp_out_of_range' });
    const warm = checkEnvironment({ ...room, ambientC: 30 }, settings).value.alerts;
    expect(warm[0]).toMatchObject({ level: 'warn', code: 'temp_not_recommended' });
    const wet = checkEnvironment({ ...room, ambientC: 22, humidityPct: 98 }, settings).value.alerts;
    expect(wet[0]).toMatchObject({ level: 'block', code: 'humidity_too_high' });
    const high = checkEnvironment({ ...room, ambientC: 22, altitudeM: 2000 }, settings).value;
    expect(high.kAltitude).toBeCloseTo(0.91);
    expect(high.alerts[0]).toMatchObject({ code: 'altitude_derating', params: { pct: 9 } });
  });
});

describe('phases', () => {
  const adv = { phases: 'auto' as const, voltage: 230, targetLoadRate: 0.8 };
  it('bascule en triphasé quand la puissance d’UPS nécessaire dépasse 10 kVA', () => {
    expect(resolvePhases(7000, adv, settings).value.phases).toBe(1); // 8,75 kVA
    const r = resolvePhases(9000, adv, settings).value; // 11,25 kVA
    expect(r.phases).toBe(3);
    expect(r.voltageV).toBe(400);
  });
  it('mono imposé au-delà du seuil : bascule forcée avec alerte', () => {
    const r = resolvePhases(20000, { ...adv, phases: 1 }, settings).value;
    expect(r.phases).toBe(3);
    expect(r.forced).toBe(true);
    expect(r.alerts[0]?.code).toBe('phase_switched_to_three');
  });
  it('tri imposé reste tri', () => {
    expect(resolvePhases(2000, { ...adv, phases: 3, voltage: 400 }, settings).value).toMatchObject({
      phases: 3,
      voltageV: 400,
    });
  });
  it('tension de calcul', () => {
    expect(systemVoltage(1, 230)).toBe(230);
    expect(systemVoltage(1, 400)).toBe(230);
    expect(systemVoltage(3, 220)).toBe(380);
    expect(systemVoltage(3, 400)).toBe(400);
  });
});

describe('modular', () => {
  it('ajoute un module en N+1', () => {
    expect(modulesNeeded({ loadKW: 100, moduleKW: 25, redundancy: 'N+1' }).value).toBe(5);
  });
  it('applique le taux de charge cible et la contrainte kVA', () => {
    expect(
      modulesNeeded({ loadKW: 100, moduleKW: 25, redundancy: 'N', targetLoadRate: 0.8 }).value,
    ).toBe(5);
    expect(
      modulesNeeded({ loadKW: 50, moduleKW: 25, loadKVA: 80, moduleKVA: 25, redundancy: '2N' })
        .value,
    ).toBe(4);
    expect(modulesNeeded({ loadKW: 0.1, moduleKW: 25, redundancy: 'N' }).value).toBe(1);
  });
  it('répartit les modules dans le minimum de châssis', () => {
    const spec = {
      moduleKVA: 30,
      moduleKW: 30,
      maxModules: 10,
      frameMaxKVA: 300,
      moduleWeightKg: 30,
      emptyFrameWeightKg: 250,
      frameParallelMax: 4,
    };
    expect(framesForModules(7, spec)).toEqual({ frames: 1, modulesPerFrame: [7] });
    expect(framesForModules(13, spec)).toEqual({ frames: 2, modulesPerFrame: [7, 6] });
    expect(framesForModules(41, spec)).toBeNull();
    expect(framesForModules(1, { ...spec, frameMaxKVA: 20 })).toBeNull();
  });
});

describe('alerts', () => {
  it('pire niveau et dédoublonnage', () => {
    const a = [
      { level: 'ok' as const, code: 'a', params: {} },
      { level: 'block' as const, code: 'b', params: {} },
      { level: 'warn' as const, code: 'c', params: {} },
      { level: 'warn' as const, code: 'c', params: {} },
    ];
    expect(worstLevel(a)).toBe('block');
    expect(worstLevel([])).toBe('ok');
    expect(normalizeAlerts(a).map((x) => x.code)).toEqual(['b', 'c', 'a']);
  });
});
