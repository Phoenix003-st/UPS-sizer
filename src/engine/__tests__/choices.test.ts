import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import type { UpsModel } from '../../catalog/schemas';
import { runSizing, type SizingResult } from '../index';
import type { FormFactorChoice, PhaseChoice } from '../project';
import { matchesFormFactor, rightSized } from '../selection';
import { project, settings } from './fixtures';

/** 3 kW, 30 min, local dédié : le cas des captures d'écran. */
function size(phases: PhaseChoice, formFactor: FormFactorChoice, kw = 3): SizingResult {
  const p = project('server');
  p.load.value = kw;
  p.load.unit = 'kW';
  p.autonomyMin = 30;
  p.advanced.redundancy = 'N';
  p.advanced.phases = phases;
  p.advanced.formFactor = formFactor;
  p.room.kind = 'dedicated';
  return runSizing(p, DEFAULT_CATALOGS, settings);
}
const modelOf = (id: string) => DEFAULT_CATALOGS.ups.models.find((m) => m.id === id)!;
const all = (r: SizingResult) =>
  [...r.options, ...r.alternatives].map((o) => modelOf(o.ups.modelId));
const phasesOf = (m: UpsModel) => `${m.phases.in}/${m.phases.out}`;

describe('les solutions suivent les choix de l’utilisateur', () => {
  it('la double conversion tour/rack à FP 0,9 est proposée pour 3 kW en monophasé', () => {
    const models = all(size(1, 'auto'));
    expect(
      models.some(
        (m) => m.range === 'UPS on-line double conversion tour/rack 19" mono/mono, FP 0,9',
      ),
    ).toBe(true);
  });
  it('monophasé : uniquement des UPS 1/1', () => {
    const models = all(size(1, 'auto'));
    expect(models.length).toBeGreaterThan(1);
    expect(new Set(models.map(phasesOf))).toEqual(new Set(['1/1']));
  });
  it('triphasé : uniquement des UPS 3/3, même pour une petite charge', () => {
    const models = all(size(3, 'auto'));
    expect(models.length).toBeGreaterThan(0);
    expect(new Set(models.map(phasesOf))).toEqual(new Set(['3/3']));
  });
  it('tri/mono : uniquement des UPS 3/1', () => {
    const models = all(size('3/1', 'auto'));
    expect(models.length).toBeGreaterThan(0);
    expect(new Set(models.map(phasesOf))).toEqual(new Set(['3/1']));
  });
  it('monophasé demandé au-delà du seuil : respecté, avec un avertissement', () => {
    const r = size(1, 'auto', 12);
    expect(r.inputs.phases).toBe(1);
    expect(r.globalAlerts.map((a) => a.code)).toContain('mono_above_threshold');
    expect(all(r).every((m) => phasesOf(m) === '1/1')).toBe(true);
  });
  it('rack : uniquement des modèles montables en baie', () => {
    const models = all(size(1, 'rack'));
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.formFactor === 'rack' || m.formFactor === 'tower_rack')).toBe(
      true,
    );
  });
  it('tour : aucun modèle rack seul', () => {
    const models = all(size(1, 'tower'));
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.formFactor === 'rack')).toBe(false);
  });
  it('modulaire : uniquement des modulaires, en tri/mono si rien en mono (automatique)', () => {
    const r = size('auto', 'modular');
    expect(all(r).length).toBeGreaterThan(0);
    expect(all(r).every((m) => m.technology === 'modular')).toBe(true);
    expect(r.globalAlerts.map((a) => a.code)).toContain('phase_auto_three_mono');
  });
  it('une seule taille par gamme, et des options de gammes différentes', () => {
    const r = size(1, 'auto');
    const group = (o: (typeof r.options)[number]) => {
      const m = modelOf(o.ups.modelId);
      return `${m.range}|${m.formFactor}`;
    };
    const alt = r.alternatives.map(group);
    const tiers = r.options.map((o) => modelOf(o.ups.modelId).range);
    expect(new Set(tiers).size).toBe(tiers.length);
    expect(r.alternatives.every((o) => !r.options.some((t) => t.key === o.key))).toBe(true);
    expect(new Set(alt).size).toBe(alt.length);
    expect(alt.some((g) => r.options.map(group).includes(g))).toBe(false);
  });
});

describe('une unité seule plutôt que plusieurs en parallèle', () => {
  it('9 kVA (FP 0,9) en monophasé rack : un seul 10 kVA, FP 0,9 compris, avec un avertissement', () => {
    const p = project('custom');
    p.load.value = 9;
    p.load.unit = 'kVA';
    p.advanced.outputPf = 0.9;
    p.autonomyMin = 30;
    p.advanced.phases = 1;
    p.advanced.formFactor = 'rack';
    const r = runSizing(p, DEFAULT_CATALOGS, settings);
    const opts = [...r.options, ...r.alternatives];
    expect(opts.every((o) => o.ups.unitsPerSystem === 1)).toBe(true);
    expect(opts.some((o) => o.ups.modelId === 'GEN-ODC-TR-11-10000VA-9000W')).toBe(true);
    for (const o of opts) {
      expect(o.ups.loadRate).toBeLessThanOrEqual(1);
      expect(o.alerts.map((a) => a.code)).toContain('load_rate_above_target');
      expect(o.battery.autonomyMin).toBeGreaterThanOrEqual(30);
    }
  });
  it('dans le taux cible quand une unité seule le permet', () => {
    const r = size(1, 'auto');
    for (const o of [...r.options, ...r.alternatives])
      expect(o.ups.loadRate).toBeLessThanOrEqual(settings.power.targetLoadRate + 1e-9);
  });
});

describe('format et taille', () => {
  const m = (formFactor: UpsModel['formFactor'], technology: UpsModel['technology']) =>
    ({ formFactor, technology }) as UpsModel;
  it('tour/rack convient en tour comme en rack', () => {
    expect(matchesFormFactor(m('tower_rack', 'online_double_conversion'), 'tower')).toBe(true);
    expect(matchesFormFactor(m('tower_rack', 'online_double_conversion'), 'rack')).toBe(true);
    expect(matchesFormFactor(m('tower', 'online_double_conversion'), 'rack')).toBe(false);
    expect(matchesFormFactor(m('cabinet', 'modular'), 'tower')).toBe(false);
    expect(matchesFormFactor(m('cabinet', 'modular'), 'modular')).toBe(true);
  });
  it('rightSized : une unité seule si possible, puis la plus petite puissance', () => {
    const it = (group: string, modelId: string, unitsN: number, installedVA: number) => ({
      group,
      modelId,
      unitsN,
      installedVA,
      blocked: false,
      overTarget: false,
    });
    const items = [
      it('A', 'a5', 1, 5000),
      it('A', 'a10', 1, 10000),
      it('A', 'a3', 2, 6000),
      it('B', 'b6', 1, 6000),
      it('B', 'b6', 1, 6000),
    ];
    expect(rightSized(items)).toEqual([0, 3, 4]);
  });
});
