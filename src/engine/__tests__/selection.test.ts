import { describe, expect, it } from 'vitest';
import { upsCatalogSchema } from '../../catalog/schemas';
import {
  configureModel,
  efficiencyAt,
  marginScore,
  modelExclusion,
  pickTiers,
  upsCandidates,
  weightedScores,
  type ScoredInput,
} from '../selection';
import { inputs, model, settings } from './fixtures';

const ctx = (over = {}) => ({
  inputs: inputs(),
  roomKind: 'dedicated' as const,
  ambientC: 25,
  ...over,
});

describe('filtrage des modèles', () => {
  it('technologie, phases, tension, fréquence, température, format', () => {
    expect(modelExclusion(model(), ctx())).toBeNull();
    expect(modelExclusion(model({ technology: 'line_interactive' }), ctx())).toBe('technology');
    expect(modelExclusion(model({ phases: { in: 1, out: 1 } }), ctx())).toBe('phases');
    expect(modelExclusion(model({ phases: { in: 1, out: 3 } }), ctx())).toBe('phases');
    expect(modelExclusion(model({ voltages: { out: [208], freqHz: [50] } }), ctx())).toBe(
      'voltage',
    );
    expect(modelExclusion(model({ voltages: { out: [400], freqHz: [60] } }), ctx())).toBe(
      'frequency',
    );
    expect(modelExclusion(model(), ctx({ ambientC: 45 }))).toBe('temperature');
    expect(modelExclusion(model(), ctx({ roomKind: 'rack' }))).toBe('form_factor');
    expect(
      modelExclusion(model({ formFactor: 'tower_rack' }), ctx({ roomKind: 'rack' })),
    ).toBeNull();
  });
});

describe('configuration', () => {
  it('rendement interpolé selon le taux de charge', () => {
    expect(efficiencyAt(model(), 0.75)).toBeCloseTo(0.955);
    expect(efficiencyAt(model(), 0.1)).toBe(0.94);
  });
  it('N : une unité, taux de charge = P_req ÷ P_unité', () => {
    const c = configureModel(model(), inputs())!;
    expect(c).toMatchObject({
      units: 1,
      unitsN: 1,
      systems: 1,
      loadRate: 0.6,
      normalLoadRate: 0.6,
      installedVA: 100000,
    });
  });
  it('N+1 : une unité de plus, charge partagée', () => {
    const c = configureModel(model(), inputs({ redundancy: 'N+1' }))!;
    expect(c).toMatchObject({ units: 2, unitsN: 1, loadRate: 0.6, normalLoadRate: 0.3 });
  });
  it('2N : deux systèmes indépendants dimensionnés à 100 %', () => {
    const c = configureModel(model(), inputs({ redundancy: '2N' }))!;
    expect(c).toMatchObject({
      systems: 2,
      units: 2,
      unitsPerSystem: 1,
      loadRate: 0.6,
      normalLoadRate: 0.3,
    });
  });
  it('parallèle quand une unité ne suffit pas, impossible sans parallèle', () => {
    const c = configureModel(model(), inputs({ designW: 150000, designVA: 150000 }))!;
    expect(c.unitsN).toBe(2);
    expect(c.loadRate).toBeCloseTo(0.75);
    expect(
      configureModel(
        model({ parallel: { capable: false, maxUnits: 1 } }),
        inputs({ designW: 150000, designVA: 150000 }),
      ),
    ).toBeNull();
    expect(
      configureModel(
        model({ parallel: { capable: false, maxUnits: 1 } }),
        inputs({ redundancy: 'N+1' }),
      ),
    ).toBeNull();
  });
  it('le déclassement en altitude augmente le taux de charge', () => {
    expect(configureModel(model(), inputs({ kAltitude: 0.8 }))!.loadRate).toBeCloseTo(0.75);
  });
  it('modulaire : modules, châssis, N+1', () => {
    const mod = model({
      technology: 'modular',
      modular: {
        moduleKVA: 25,
        moduleKW: 25,
        maxModules: 4,
        frameMaxKVA: 100,
        moduleWeightKg: 30,
        emptyFrameWeightKg: 300,
        frameParallelMax: 2,
      },
    });
    const n = configureModel(mod, inputs())!;
    expect(n).toMatchObject({
      modulesN: 3,
      modulesPerSystem: 3,
      units: 1,
      installedVA: 75000,
      loadRate: 0.8,
    });
    const n1 = configureModel(mod, inputs({ redundancy: 'N+1' }))!;
    expect(n1).toMatchObject({ modulesPerSystem: 4, units: 1 });
    // 150 kW ÷ (25 × 0,8) = 8 modules + 1 = 9 → 3 châssis de 4 > 2 châssis en parallèle autorisés
    expect(
      configureModel(mod, inputs({ designW: 150000, designVA: 150000, redundancy: 'N+1' })),
    ).toBeNull();
    const two = configureModel(mod, inputs({ designW: 120000, designVA: 120000 }))!;
    expect(two).toMatchObject({ modulesN: 6, unitsPerSystem: 2, modulesPerFrame: [3, 3] });
  });
});

describe('candidats', () => {
  const cat = upsCatalogSchema.parse({
    meta: { schemaVersion: 1, catalogVersion: 't', sample: true },
    models: [
      model({ id: 'S', power: { kVA: 40, kW: 40, pf: 1 } }),
      model({ id: 'M' }),
      model({ id: 'T', formFactor: 'tower', power: { kVA: 120, kW: 120, pf: 1 } }),
      model({ id: 'X', technology: 'line_interactive' }),
    ],
  });
  it('une seule unité privilégiée, exclusions tracées', () => {
    const r = upsCandidates(cat, ctx()).value;
    expect(r.candidates.map((c) => c.model.id)).toEqual(['M', 'T']);
    expect(r.excluded).toContainEqual({ modelId: 'S', reason: 'parallel' });
    expect(r.excluded).toContainEqual({ modelId: 'X', reason: 'technology' });
  });
  it('bureau : formats tour / rack privilégiés', () => {
    const r = upsCandidates(cat, ctx({ roomKind: 'office' })).value;
    expect(r.candidates.map((c) => c.model.id)).toEqual(['T']);
  });
  it('modèle non configurable exclu', () => {
    const r = upsCandidates(cat, ctx({ inputs: inputs({ designW: 2e6, designVA: 2e6 }) })).value;
    expect(r.candidates).toEqual([]);
    expect(r.excluded.find((e) => e.modelId === 'M')?.reason).toBe('capacity');
  });
});

describe('choix des trois options', () => {
  const item = (o: Partial<ScoredInput>): ScoredInput => ({
    key: 'k',
    installedVA: 100000,
    priceIndex: 100,
    efficiency: 0.95,
    footprintM2: 3,
    loadRate: 0.6,
    marginScore: 0.6,
    techRank: 1,
    lithium: false,
    blocked: false,
    ...o,
  });
  it('marge utile saturée au taux idéal', () => {
    expect(marginScore(0.8, 0.8, 0.5)).toBe(0);
    expect(marginScore(0.65, 0.8, 0.5)).toBeCloseTo(0.5);
    expect(marginScore(0.3, 0.8, 0.5)).toBe(1);
    expect(marginScore(0.5, 0.5, 0.5)).toBe(1);
    expect(marginScore(0.9, 0.5, 0.5)).toBe(0);
  });
  it('scores pondérés entre 0 et 1', () => {
    const s = weightedScores(
      [item({}), item({ efficiency: 0.97, priceIndex: 200 })],
      settings.selection.weights,
    );
    expect(s.every((x) => x >= 0 && x <= 1)).toBe(true);
  });
  it('Économique, Recommandée et Performance distinctes', () => {
    const items = [
      item({
        key: 'cheap',
        priceIndex: 80,
        installedVA: 80000,
        loadRate: 0.75,
        marginScore: 0.17,
        efficiency: 0.94,
      }),
      item({
        key: 'mid',
        priceIndex: 100,
        installedVA: 100000,
        loadRate: 0.6,
        marginScore: 0.67,
        efficiency: 0.96,
      }),
      item({
        key: 'big',
        priceIndex: 200,
        installedVA: 150000,
        loadRate: 0.4,
        marginScore: 1,
        efficiency: 0.965,
        lithium: true,
      }),
      item({
        key: 'huge',
        priceIndex: 300,
        installedVA: 400000,
        loadRate: 0.15,
        marginScore: 1,
        efficiency: 0.97,
      }),
    ];
    const r = pickTiers(items, settings);
    expect(r.map((x) => [x.tier, items[x.index]!.key])).toEqual([
      ['economy', 'cheap'],
      ['recommended', 'mid'],
      ['performance', 'big'],
    ]);
  });
  it('options bloquantes écartées s’il existe une alternative', () => {
    const items = [item({ key: 'a', blocked: true, priceIndex: 10 }), item({ key: 'b' })];
    const r = pickTiers(items, settings);
    expect(r).toHaveLength(1);
    expect(items[r[0]!.index]!.key).toBe('b');
    expect(pickTiers([item({ blocked: true })], settings)).toHaveLength(1);
    expect(pickTiers([], settings)).toEqual([]);
  });
});
