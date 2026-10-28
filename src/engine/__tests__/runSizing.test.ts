import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS, defaultCatalogs } from '../../catalog';
import { SAMPLE_CATALOGS } from '../../catalog/samples';
import {
  batteryCatalogSchema,
  equipmentLibrarySchema,
  formatZodError,
  upsCatalogSchema,
} from '../../catalog/schemas';
import { DEFAULT_SETTINGS, mergeSettings, SCENARIOS, settingsSchema } from '../../settings/schema';
import { buildBom } from '../bom';
import { createProject, projectSchema, runSizing } from '../index';
import { project, settings } from './fixtures';

const run = (p: ReturnType<typeof project>) => runSizing(p, DEFAULT_CATALOGS, settings);
/** Gamme d'exemple complète (toutes puissances, bruit renseigné) pour les cas limites du moteur. */
const runSample = (p: ReturnType<typeof project>) => runSizing(p, SAMPLE_CATALOGS, settings);

describe('runSizing — scénarios par défaut', () => {
  for (const sc of SCENARIOS) {
    it(`${sc} : au moins une option, autonomie et taux de charge respectés`, () => {
      const p = project(sc);
      const r = run(p);
      expect(r.options.length).toBeGreaterThan(0);
      expect(r.options.some((o) => o.tier === 'recommended')).toBe(true);
      for (const o of r.options) {
        expect(o.battery.autonomyMin).toBeGreaterThanOrEqual(p.autonomyMin - 1e-6);
        expect(o.ups.loadRate).toBeLessThanOrEqual(p.advanced.targetLoadRate + 1e-9);
        expect(o.bom.length).toBeGreaterThan(0);
        expect(o.traces.battery!.steps.length).toBeGreaterThan(2);
        expect(o.layout.items.length).toBeGreaterThan(0);
      }
      const order = r.options.map((o) => o.tier);
      expect(order).toEqual(
        [...order].sort(
          (a, b) =>
            ['economy', 'recommended', 'performance'].indexOf(a) -
            ['economy', 'recommended', 'performance'].indexOf(b),
        ),
      );
    });
  }

  it('fonction pure : même entrée, même sortie', () => {
    const p = project('datacenter');
    expect(JSON.stringify(run(p))).toBe(JSON.stringify(run(p)));
  });

  it('projet valide au regard du schéma', () => {
    for (const sc of SCENARIOS) expect(projectSchema.safeParse(project(sc)).success).toBe(true);
  });
});

describe('runSizing — cas particuliers', () => {
  it('charge nulle : alerte bloquante', () => {
    const p = project();
    p.load.value = 0;
    const r = run(p);
    expect(r.options).toEqual([]);
    expect(r.globalAlerts[0]?.code).toBe('no_load');
  });

  it('charge assistée : bibliothèque d’équipements', () => {
    const p = project('cctv');
    p.load = {
      mode: 'assisted',
      value: 0,
      unit: 'kW',
      items: [
        { libId: 'ip-camera', qty: 32, unitW: 12 },
        { libId: 'nvr', qty: 2, unitW: 80 },
        { libId: 'poe-switch-24', qty: 2, unitW: 300 },
      ],
    };
    const r = run(p);
    expect(r.inputs.loadW).toBe(32 * 12 + 160 + 600);
    expect(r.options.length).toBeGreaterThan(0);
  });

  it('2N : deux systèmes A et B, chacun dimensionné pour 100 %', () => {
    const p = project('airport');
    const o = run(p).options[0]!;
    expect(o.ups.systems).toBe(2);
    expect(o.battery.setDetails.filter((s) => s.system === 'B').length).toBeGreaterThan(0);
    expect(o.battery.setDetails.every((s) => s.designPowerW <= run(p).inputs.designW + 1e-6)).toBe(
      true,
    );
    expect(o.layout.items.some((i) => i.system === 'B')).toBe(true);
  });

  it('N+1 en modulaire : un module redondant', () => {
    const p = project('datacenter');
    p.settingsOverrides = { scenarios: { datacenter: { technologies: ['modular'] } } };
    const r = run(p);
    const o = r.options[0]!;
    expect(o.ups.technology).toBe('modular');
    expect(o.ups.modulesPerSystem).toBe(o.ups.modulesN! + 1);
    expect(o.traces.modular).toBeDefined();
  });

  it('1 600 kVA en parallèle', () => {
    const p = project('custom');
    p.load.value = 1300;
    p.autonomyMin = 10;
    p.room = {
      ...p.room,
      lengthMm: 20000,
      widthMm: 10000,
      door: { ...p.room.door, widthMm: 2000, heightMm: 2500 },
    };
    const r = runSample(p);
    expect(r.options.length).toBeGreaterThan(0);
    expect(r.options.every((o) => o.ups.capacityVA >= r.inputs.designVA / 0.8 - 1)).toBe(true);
  });

  it('préférence lithium et repli VRLA avec alerte', () => {
    const li = project('server');
    li.advanced.growthMargin = 0.2; // charge où une offre lithium existe
    li.advanced.batteryChemistry = 'LI';
    expect(run(li).options.every((o) => o.battery.chemistry === 'LI_LFP')).toBe(true);
    const small = project('office');
    small.advanced.batteryChemistry = 'LI';
    const r = run(small);
    expect(r.options.length).toBeGreaterThan(0);
    expect(r.options[0]!.alerts.some((a) => a.code === 'lithium_unavailable')).toBe(true);
    const vrla = project('server');
    vrla.advanced.batteryChemistry = 'VRLA';
    expect(run(vrla).options.every((o) => o.battery.chemistry !== 'LI_LFP')).toBe(true);
  });

  it('autonomie courte : 1,67 V/élément par défaut, valeur forcée prioritaire', () => {
    const p = project('server');
    p.autonomyMin = 8;
    expect(run(p).inputs.eodVpc).toBe(1.67);
    p.advanced.eodVpc = 1.7;
    expect(run(p).inputs.eodVpc).toBe(1.7);
  });

  it('altitude : déclassement appliqué', () => {
    const p = project('server');
    p.room.altitudeM = 2500;
    const r = run(p);
    expect(r.inputs.kAltitude).toBeCloseTo(0.86);
    expect(r.globalAlerts.some((a) => a.code === 'altitude_derating')).toBe(true);
  });

  it('bureau : niveau sonore affiché', () => {
    const r = runSample(project('office'));
    expect(
      r.options[0]!.alerts.some((a) => a.code === 'noise_level' || a.code === 'noise_high'),
    ).toBe(true);
  });

  it('baie existante : uniquement des formats rack', () => {
    const p = project('office');
    p.room.kind = 'rack';
    const r = run(p);
    expect(
      r.options.every(
        (o) => o.display.formFactor === 'rack' || o.display.formFactor === 'tower_rack',
      ),
    ).toBe(true);
  });

  it('aucun UPS ne convient : alerte bloquante', () => {
    const p = project('office');
    p.load.value = 500;
    const r = run(p);
    expect(r.options).toEqual([]);
    expect(r.globalAlerts.some((a) => a.code === 'no_ups')).toBe(true);
  });

  it('aucune batterie ne convient : alerte bloquante', () => {
    const p = project('office');
    p.autonomyMin = 600;
    expect(run(p).globalAlerts.some((a) => a.code === 'no_battery')).toBe(true);
  });

  it('groupe électrogène : inverseur de source dans la nomenclature', () => {
    const p = project('server');
    p.installation.generator = true;
    const o = run(p).options[0]!;
    expect(o.electrical.generatorKVA).toBeGreaterThan(0);
    expect(o.bom.some((l) => l.category === 'ats')).toBe(true);
  });

  it('nomenclature : colonne prix vide, quantités cohérentes', () => {
    const o = run(project('server')).options[0]!;
    expect(o.bom.every((l) => l.unitPrice === null && l.qty > 0)).toBe(true);
    const blocks = o.bom.find((l) => l.category === 'battery')!;
    expect(blocks.qty).toBe(
      o.battery.blocksPerString * (o.battery.strings - o.battery.internalStrings) * o.battery.sets,
    );
  });

  it('nomenclature modulaire : châssis et modules', () => {
    const p = project('datacenter');
    p.settingsOverrides = { scenarios: { datacenter: { technologies: ['modular'] } } };
    const o = run(p).options[0]!;
    expect(o.bom.some((l) => l.category === 'frame')).toBe(true);
    expect(o.bom.find((l) => l.category === 'module')!.qty).toBe(
      o.ups.modulesPerSystem! * o.ups.systems,
    );
    const rebuilt = buildBom({
      model: DEFAULT_CATALOGS.ups.models.find((m) => m.id === o.ups.modelId)!,
      config: o.ups,
      battery: o.battery,
      electrical: o.electrical,
      blockSample: true,
      cabinetSample: () => true,
    });
    expect(rebuilt).toEqual(
      o.bom.map((l) => ({ ...l, sample: l.category === 'cabinet' ? true : l.sample })),
    );
  });
});

describe('catalogues et paramètres', () => {
  it('les catalogues d’exemple sont valides et marqués EXEMPLE', () => {
    const c = structuredClone(SAMPLE_CATALOGS);
    expect(c.ups.models.length).toBeGreaterThanOrEqual(30);
    expect(
      c.ups.models.every((m) => m.sample && m.source && m.reference.startsWith('EXEMPLE')),
    ).toBe(true);
    expect(c.batteries.blocks.every((b) => b.sample && b.source)).toBe(true);
    expect(c.batteries.blocks.some((b) => b.chemistry === 'LI_LFP')).toBe(true);
    const techs = new Set(c.ups.models.map((m) => m.technology));
    expect(techs.size).toBe(4);
    const tri = c.ups.models.filter(
      (m) => m.phases.out === 3 && m.technology === 'online_double_conversion',
    );
    expect(Math.max(...tri.map((m) => m.power.kVA * m.parallel.maxUnits))).toBeGreaterThanOrEqual(
      1600,
    );
    const modules = new Set(c.ups.models.filter((m) => m.modular).map((m) => m.modular!.moduleKW));
    expect([...modules].sort((a, b) => a - b)).toEqual([20, 25, 30, 50]);
    // Toutes les armoires compatibles existent.
    const cabs = new Set(c.batteries.cabinets.map((x) => x.id));
    expect(
      c.ups.models.every((m) => m.battery.compatibleCabinetIds.every((id) => cabs.has(id))),
    ).toBe(true);
    expect(equipmentLibrarySchema.safeParse(c.equipment).success).toBe(true);
  });

  it('le catalogue livré ne contient que des UPS génériques, sans marque ni référence', () => {
    const c = defaultCatalogs();
    const models = c.ups.models;
    expect(models.length).toBeGreaterThan(50);
    expect(
      models.every((m) => !m.brand && !m.partNumber && !m.datasheetUrl && !m.source && m.sample),
    ).toBe(true);
    expect(c.batteries.cabinets.every((x) => !x.brand && !x.partNumber && !x.source)).toBe(true);
    expect(c.batteries.blocks.every((x) => !x.source)).toBe(true);
    expect(JSON.stringify(c)).not.toMatch(/infosec|\bAPC\b|eaton|schneider/i);
    // Tous les choix restent couverts : rack, tri/mono, tri/tri et modulaire.
    expect(models.some((m) => m.formFactor === 'rack')).toBe(true);
    expect(models.some((m) => m.phases.in === 3 && m.phases.out === 1)).toBe(true);
    expect(models.some((m) => m.phases.in === 3 && m.phases.out === 3)).toBe(true);
    expect(models.some((m) => m.technology === 'modular')).toBe(true);
    const cabs = new Set(c.batteries.cabinets.map((x) => x.id));
    expect(models.every((m) => m.battery.compatibleCabinetIds.every((id) => cabs.has(id)))).toBe(
      true,
    );
  });

  it('les options ne citent aucune marque ni référence produit', () => {
    const r = run(project('server'));
    expect(r.options.length).toBeGreaterThan(0);
    for (const o of r.options) {
      expect(o.ups.reference).toMatch(/^UPS /);
      expect(o.ups.reference).not.toMatch(/réf\./);
      expect(o.bom.every((l) => !/infosec/i.test(l.reference))).toBe(true);
    }
  });

  it('un catalogue invalide est refusé avec le chemin du champ fautif', () => {
    const bad = structuredClone(DEFAULT_CATALOGS.ups) as unknown as {
      models: { power: { kW: number } }[];
    };
    bad.models[2]!.power.kW = -1;
    const r = upsCatalogSchema.safeParse(bad);
    expect(r.success).toBe(false);
    if (!r.success) expect(formatZodError(r.error)[0]).toMatch(/^models\.2\.power\.kW/);

    const dup = structuredClone(DEFAULT_CATALOGS.ups);
    dup.models.push(dup.models[0]!);
    expect(upsCatalogSchema.safeParse(dup).success).toBe(false);

    const mod = structuredClone(DEFAULT_CATALOGS.ups);
    const m = mod.models.find((x) => x.technology === 'modular')!;
    m.modular = null;
    expect(upsCatalogSchema.safeParse(mod).success).toBe(false);

    const bps = structuredClone(DEFAULT_CATALOGS.ups);
    bps.models[0]!.battery.blocksPerString.default = 99;
    bps.models[1]!.power.kW = 99;
    expect(upsCatalogSchema.safeParse(bps).success).toBe(false);

    const bat = structuredClone(DEFAULT_CATALOGS.batteries);
    bat.cabinets[0]!.capacity[0]!.blockId = 'INCONNU';
    const br = batteryCatalogSchema.safeParse(bat);
    expect(br.success).toBe(false);
    if (!br.success) expect(formatZodError(br.error)[0]).toContain('INCONNU');
  });

  it('paramètres par défaut valides et surcharges fusionnées', () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    const m = mergeSettings(DEFAULT_SETTINGS, {
      battery: { agingFactor: 1.4 },
      electrical: { breakerSeriesA: [10, 20] },
    });
    expect(m.battery.agingFactor).toBe(1.4);
    expect(m.battery.designMargin).toBe(1.1);
    expect(m.electrical.breakerSeriesA).toEqual([10, 20]);
    expect(DEFAULT_SETTINGS.battery.agingFactor).toBe(1.25);
    expect(mergeSettings(DEFAULT_SETTINGS, undefined)).toBe(DEFAULT_SETTINGS);
  });

  it('createProject : valeurs par défaut du scénario', () => {
    const p = createProject('airport', DEFAULT_SETTINGS);
    expect(p.advanced.redundancy).toBe('2N');
    expect(p.advanced.voltage).toBe(400);
    expect(p.id.length).toBeGreaterThan(4);
    expect(createProject('office', DEFAULT_SETTINGS).advanced.voltage).toBe(230);
  });
});
