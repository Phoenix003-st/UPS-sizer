/**
 * Orchestration du moteur : runSizing(projet, catalogues, paramètres) → SizingResult.
 *
 * Fonction pure : même entrée, même sortie. Ordre : puissance → phases → environnement →
 * sélection UPS → batteries → implantation → électrique → thermique → ventilation → nomenclature →
 * alertes → choix des trois options.
 */
import type { BatteryBlock, Catalogs, Technology, UpsModel } from '../catalog/schemas';
import { displayReference, TECHNOLOGIES } from '../catalog/schemas';
import { mergeSettings, type Settings, type SettingsOverrides } from '../settings/schema';
import { normalizeAlerts, worstLevel } from './alerts';
import { sizeBattery, type BatteryCandidate, type ChemistryFamily } from './battery';
import { buildBom } from './bom';
import { computeElectrical } from './electrical';
import { checkEnvironment } from './environment';
import { computeLayout, type LayoutSource } from './layout';
import { computeLoad } from './load';
import { modulesNeeded } from './modular';
import { resolvePhases, systemVoltage } from './phases';
import type { Project } from './project';
import {
  marginScore,
  modelGroup,
  pickTiers,
  rightSized,
  TECH_RANK,
  upsCandidates,
  weightedScores,
  type ScoredInput,
  type UpsCandidate,
} from './selection';
import { computeThermal } from './thermal';
import type { CalcTrace } from './trace';
import type {
  Alert,
  BatterySet,
  BatterySolution,
  NormalizedInputs,
  OptionTier,
  SizingResult,
  SolutionOption,
} from './types';
import { computeVentilation } from './ventilation';

export * from './types';
export { createProject, projectSchema, type Project, type Tier } from './project';

/** Coût relatif par kVA installé, par technologie (indice de prix à défaut de prix catalogue). */
export const TECH_COST: Record<Technology, number> = {
  line_interactive: 1,
  online_performance: 1.2,
  online_double_conversion: 1.5,
  modular: 1.6,
};

/** Coût relatif par kWh de batteries installé. */
const BATTERY_COST_PER_KWH: Record<ChemistryFamily, number> = { VRLA: 0.5, LI: 1.5 };

export function resolveEod(project: Project, settings: Settings): number {
  if (project.advanced.eodVpc !== null) return project.advanced.eodVpc;
  return project.autonomyMin < settings.battery.shortAutonomyThresholdMin
    ? settings.battery.shortAutonomyEodVpc
    : settings.battery.defaultEodVpc;
}

/** Jeux de batteries d'une configuration : un par unité, par châssis ou par système. */
export function batterySets(
  model: UpsModel,
  cand: UpsCandidate['config'],
  designW: number,
): BatterySet[] {
  const systems: ('A' | 'B')[] = cand.systems === 2 ? ['A', 'B'] : ['A'];
  const sets: BatterySet[] = [];
  for (const system of systems) {
    if (model.modular && cand.modulesPerFrame && cand.modulesN) {
      const share = Math.min(1, Math.max(...cand.modulesPerFrame) / cand.modulesN);
      for (let f = 0; f < cand.unitsPerSystem; f++)
        sets.push({ system, unitsCovered: 1, designPowerW: designW * share });
    } else if (cand.unitsPerSystem === 1 || model.battery.sharedBattery) {
      sets.push({ system, unitsCovered: cand.unitsPerSystem, designPowerW: designW });
    } else {
      for (let u = 0; u < cand.unitsPerSystem; u++)
        sets.push({ system, unitsCovered: 1, designPowerW: designW / cand.unitsN });
    }
  }
  return sets;
}

function toSolution(c: BatteryCandidate, sets: BatterySet[]): BatterySolution {
  const n = sets.length;
  return {
    blockId: c.block.id,
    blockReference: c.block.reference,
    chemistry: c.block.chemistry,
    blockV: c.block.nominalV,
    capacityAh: c.block.capacityAh,
    blocksPerString: c.blocksPerString,
    cellsPerString: c.blocksPerString * c.block.cells,
    strings: c.strings,
    internalStrings: c.internalStrings,
    location: c.cabinet ? 'cabinet' : 'internal',
    cabinets: c.cabinet
      ? [{ id: c.cabinet.cab.id, reference: displayReference(c.cabinet.cab), qty: c.cabinet.qty }]
      : [],
    sets: n,
    setDetails: sets,
    eodVpc: c.eodVpc,
    autonomyMin: c.autonomyMin,
    autonomyNewMin: c.autonomyNewMin,
    autonomyIsLowerBound: c.autonomyIsLowerBound,
    dcNominalV: c.blocksPerString * c.block.nominalV,
    cellPowerRequiredW: c.cellPowerRequiredW,
    cellPowerAvailableW: c.cellPowerAvailableW,
    kAging: c.kAging,
    kTemp: c.kTemp,
    kMargin: c.kMargin,
    totalBlocks: c.blocks * n,
    totalWh: c.wh * n,
    totalWeightKg: c.weightKg * n,
  };
}

/** Équipements à implanter : UPS (ou châssis) puis armoires batteries, système par système. */
export function layoutSources(
  model: UpsModel,
  config: UpsCandidate['config'],
  battery: BatterySolution,
  block: BatteryBlock,
  catalogs: Catalogs,
): LayoutSource[] {
  const out: LayoutSource[] = [];
  const systems: ('A' | 'B')[] = config.systems === 2 ? ['A', 'B'] : ['A'];
  const setsPerSystem = battery.sets / config.systems;
  for (const s of systems) {
    for (let u = 0; u < config.unitsPerSystem; u++) {
      const mods = config.modulesPerFrame?.[u] ?? 0;
      out.push({
        id: `ups-${s}${u + 1}`,
        kind: model.modular ? 'frame' : 'ups',
        system: s,
        refId: model.id,
        reference: model.reference,
        w: model.dimensionsMm.w,
        d: model.dimensionsMm.d,
        h: model.dimensionsMm.h,
        weightKg: model.modular
          ? model.modular.emptyFrameWeightKg + mods * model.modular.moduleWeightKg
          : model.weightKg,
        clearances: model.clearancesMm,
        rackUnits:
          model.formFactor === 'rack' || model.formFactor === 'tower_rack' ? model.rackUnits : null,
      });
    }
    const cabRef = battery.cabinets[0];
    const cab = cabRef ? catalogs.batteries.cabinets.find((c) => c.id === cabRef.id) : undefined;
    if (cab && cabRef) {
      const extBlocksPerSet = battery.blocksPerString * (battery.strings - battery.internalStrings);
      let k = 0;
      for (let set = 0; set < setsPerSystem; set++) {
        for (let q = 0; q < cabRef.qty; q++) {
          const blocks = Math.ceil(extBlocksPerSet / cabRef.qty);
          k++;
          out.push({
            id: `bat-${s}${k}`,
            kind: cab.kind === 'ebm' ? 'ebm' : 'cabinet',
            system: s,
            refId: cab.id,
            reference: cab.reference,
            w: cab.dimensionsMm.w,
            d: cab.dimensionsMm.d,
            h: cab.dimensionsMm.h,
            weightKg: cab.emptyWeightKg + blocks * block.weightKg,
            clearances: cab.clearancesMm,
            rackUnits: null,
          });
        }
      }
    }
  }
  return out;
}

interface Evaluated {
  option: Omit<SolutionOption, 'tier' | 'key' | 'score'>;
  scored: ScoredInput;
}

function evaluateOption(
  cand: UpsCandidate,
  chemistry: ChemistryFamily,
  project: Project,
  inputs: NormalizedInputs,
  catalogs: Catalogs,
  settings: Settings,
  baseTraces: Record<string, CalcTrace>,
  extraAlerts: Alert[],
): Evaluated | null {
  const { model, config } = cand;
  const sets = batterySets(model, config, inputs.designW);
  const ratio = inputs.loadW / inputs.designW || 0;
  const firstSet = sets[0]!;
  const bat = sizeBattery({
    model,
    catalog: catalogs.batteries,
    settings,
    designPowerW: firstSet.designPowerW,
    actualPowerW: firstSet.designPowerW * ratio,
    autonomyMin: inputs.autonomyMin,
    ambientC: project.room.ambientC,
    chemistry,
    eodVpc: inputs.eodVpc,
  });
  if (!bat.value) return null;
  // Batteries internes VRLA : une demande « lithium » ne change rien, on évite le doublon.
  if (chemistry === 'LI' && bat.value.block.chemistry !== 'LI_LFP') return null;
  const battery = toSolution(bat.value, sets);
  const block = bat.value.block;

  const sources = layoutSources(model, config, battery, block, catalogs);
  const layout = computeLayout(sources, project, settings);
  const electrical = computeElectrical({
    model,
    config,
    battery,
    inputs,
    installation: project.installation,
    settings,
  });
  const thermal = computeThermal({
    model,
    config,
    battery,
    inputs,
    hvac: project.room.hvac,
    settings,
  });
  const ventilation = computeVentilation(battery, settings);
  const bom = buildBom({
    model,
    config,
    battery,
    electrical: electrical.value,
    blockSample: block.sample,
    cabinetSample: (id) => catalogs.batteries.cabinets.find((c) => c.id === id)?.sample ?? false,
  });

  const alerts: Alert[] = [...extraAlerts, ...layout.alerts, ...thermal.alerts];
  if (config.loadRate > inputs.targetLoadRate + 1e-9) {
    alerts.push({
      level: 'warn',
      code: 'load_rate_above_target',
      params: {
        rate: Math.round(config.loadRate * 100),
        target: Math.round(inputs.targetLoadRate * 100),
      },
    });
  }
  const kind = project.room.kind;
  if ((kind === 'office' || kind === 'shared') && model.noiseDb !== null) {
    alerts.push(
      model.noiseDb > settings.room.officeNoiseWarnDb
        ? {
            level: 'warn',
            code: 'noise_high',
            params: { db: model.noiseDb, max: settings.room.officeNoiseWarnDb },
          }
        : { level: 'ok', code: 'noise_level', params: { db: model.noiseDb } },
    );
  }
  if (electrical.value.circuits.some((c) => c.breakerA === null)) {
    alerts.push({ level: 'block', code: 'breaker_out_of_range', params: {} });
  } else if (electrical.value.circuits.some((c) => c.cable === null)) {
    alerts.push({ level: 'warn', code: 'cable_out_of_range', params: {} });
  }
  if (ventilation.value.applicable && ventilation.value.flowM3h > 0) {
    alerts.push({
      level: 'ok',
      code: 'ventilation_required',
      params: { flow: Number(ventilation.value.flowM3h.toFixed(2)) },
    });
  }
  if (
    battery.location === 'cabinet' &&
    model.formFactor !== 'cabinet' &&
    (kind === 'office' || kind === 'shared')
  ) {
    alerts.push({
      level: 'ok',
      code: 'external_battery_packs',
      params: { qty: battery.cabinets[0]?.qty ?? 0 },
    });
  }
  const finalAlerts = normalizeAlerts(alerts);
  const status = worstLevel(finalAlerts);

  const upsCost = model.modular
    ? (model.priceIndex ?? model.modular.frameMaxKVA * 0.3) * config.units +
      (config.modulesPerSystem ?? 0) * config.systems * model.modular.moduleKVA * TECH_COST.modular
    : (model.priceIndex ?? model.power.kVA * TECH_COST[model.technology]) * config.units;
  const priceIndex = upsCost + (battery.totalWh / 1000) * BATTERY_COST_PER_KWH[chemistry];

  const traces: Record<string, CalcTrace> = {
    ...baseTraces,
    battery: bat.trace,
    layout: layout.trace,
    electrical: electrical.trace,
    thermal: thermal.trace,
    ventilation: ventilation.trace,
  };
  if (model.modular) {
    traces.modular = modulesNeeded({
      loadKW: inputs.designW / 1000,
      moduleKW: model.modular.moduleKW * inputs.kAltitude,
      loadKVA: inputs.designVA / 1000,
      moduleKVA: model.modular.moduleKVA * inputs.kAltitude,
      redundancy: inputs.redundancy === 'N+1' ? 'N+1' : 'N',
      targetLoadRate: inputs.targetLoadRate,
    }).trace;
  }

  return {
    option: {
      ups: config,
      battery,
      electrical: electrical.value,
      thermal: thermal.value,
      ventilation: ventilation.value,
      layout: layout.value,
      bom,
      alerts: finalAlerts,
      status,
      display: {
        formFactor: model.formFactor,
        noiseDb: model.noiseDb,
        sample: model.sample || block.sample,
        totalWeightKg: layout.value.floor.totalWeightKg,
        dimensionsSummary: model.dimensionsMm,
      },
      traces,
    },
    scored: {
      key: `${model.id}|${chemistry}`,
      group: modelGroup(model),
      installedVA: config.installedVA,
      priceIndex,
      efficiency: config.efficiency,
      footprintM2: layout.value.footprintWithClearancesM2,
      loadRate: config.loadRate,
      marginScore: marginScore(
        config.loadRate,
        inputs.targetLoadRate,
        settings.selection.idealLoadRate,
      ),
      techRank: TECH_RANK[model.technology],
      lithium: chemistry === 'LI',
      blocked: status === 'block',
    },
  };
}

/** Point d'entrée du moteur. */
export function runSizing(
  project: Project,
  catalogs: Catalogs,
  baseSettings: Settings,
): SizingResult {
  const settings = mergeSettings(baseSettings, project.settingsOverrides as SettingsOverrides);
  const load = computeLoad(project.load, project.advanced, catalogs.equipment);
  const phases = resolvePhases(load.value.designVA, project.advanced, settings);
  const env = checkEnvironment(project.room, settings);
  const scenario = settings.scenarios[project.scenario];
  const technologies = scenario.technologies.includes('*')
    ? [...TECHNOLOGIES]
    : (scenario.technologies.filter((t) => t !== '*') as Technology[]);

  const inputs: NormalizedInputs = {
    loadW: load.value.loadW,
    loadVA: load.value.loadVA,
    designW: load.value.designW,
    designVA: load.value.designVA,
    growthMargin: load.value.margin,
    outputPf: load.value.pf,
    targetLoadRate: project.advanced.targetLoadRate,
    phases: phases.value.phases,
    inputPhases: phases.value.inputPhases,
    formFactor: project.advanced.formFactor,
    voltageV: phases.value.voltageV,
    freqHz: project.advanced.freqHz,
    redundancy: project.advanced.redundancy,
    autonomyMin: project.autonomyMin,
    kAltitude: env.value.kAltitude,
    technologies,
    eodVpc: resolveEod(project, settings),
    floorLoadKgM2: project.room.floorLoadKgM2 ?? settings.room.defaultFloorLoadKgM2,
  };
  const globalAlerts: Alert[] = [...phases.value.alerts, ...env.value.alerts];
  const traces: Record<string, CalcTrace> = {
    load: load.trace,
    phases: phases.trace,
    environment: env.trace,
  };

  if (inputs.loadW <= 0) {
    globalAlerts.push({ level: 'block', code: 'no_load', params: {} });
    return {
      inputs,
      options: [],
      alternatives: [],
      globalAlerts: normalizeAlerts(globalAlerts),
      traces,
    };
  }

  const selectionCtx = { inputs, roomKind: project.room.kind, ambientC: project.room.ambientC };
  let cands = upsCandidates(catalogs.ups, selectionCtx);
  // Alimentation automatique : sans UPS monophasé qui convienne (format demandé, puissance),
  // on essaie le tri/mono puis le triphasé.
  if (project.advanced.phases === 'auto' && inputs.phases === 1) {
    for (const [out, inp] of [
      [1, 3],
      [3, 3],
    ] as const) {
      if (cands.value.candidates.length > 0) break;
      inputs.phases = out;
      inputs.inputPhases = inp;
      inputs.voltageV = systemVoltage(out, project.advanced.voltage);
      cands = upsCandidates(catalogs.ups, selectionCtx);
      if (cands.value.candidates.length > 0)
        globalAlerts.push({
          level: 'ok',
          code: out === inp ? 'phase_auto_three' : 'phase_auto_three_mono',
          params: {},
        });
    }
  }
  traces.selection = cands.trace;
  const pref = project.advanced.batteryChemistry;
  const evaluated: Evaluated[] = [];
  for (const cand of cands.value.candidates) {
    const families: ChemistryFamily[] =
      pref === 'VRLA' ? ['VRLA'] : pref === 'LI' ? ['LI'] : ['VRLA', 'LI'];
    let found = false;
    for (const fam of families) {
      const ev = evaluateOption(cand, fam, project, inputs, catalogs, settings, traces, []);
      if (ev) {
        evaluated.push(ev);
        found = true;
      }
    }
    if (!found && pref === 'LI') {
      const ev = evaluateOption(cand, 'VRLA', project, inputs, catalogs, settings, traces, [
        { level: 'warn', code: 'lithium_unavailable', params: {} },
      ]);
      if (ev) evaluated.push(ev);
    }
  }

  if (evaluated.length === 0) {
    globalAlerts.push({
      level: 'block',
      code: cands.value.candidates.length === 0 ? 'no_ups' : 'no_battery',
      params: { kw: Number((inputs.designW / 1000).toFixed(1)), autonomy: inputs.autonomyMin },
    });
    return {
      inputs,
      options: [],
      alternatives: [],
      globalAlerts: normalizeAlerts(globalAlerts),
      traces,
    };
  }

  // Une unité seule au-dessus du taux cible n'est retenue que si aucune unité seule ne convient
  // dans le taux cible (sinon il faudrait mettre plusieurs unités en parallèle).
  const overTarget = (e: Evaluated) => e.option.ups.loadRate > inputs.targetLoadRate + 1e-9;
  const compliantSingle = evaluated.some(
    (e) => e.option.ups.unitsN === 1 && !overTarget(e) && !e.scored.blocked,
  );
  const usable = compliantSingle ? evaluated.filter((e) => !overTarget(e)) : evaluated;
  // Une configuration par gamme et format, à la bonne taille.
  const sized = rightSized(
    usable.map((e) => ({
      group: e.scored.group,
      modelId: e.option.ups.modelId,
      unitsN: e.option.ups.unitsN,
      installedVA: e.option.ups.installedVA,
      blocked: e.scored.blocked,
      overTarget: overTarget(e),
    })),
  ).map((i) => usable[i]!);
  const scored = sized.map((e) => e.scored);
  const picks = pickTiers(scored, settings);
  const toOption = (i: number, tier: OptionTier, score: number): SolutionOption => ({
    ...sized[i]!.option,
    tier,
    key: scored[i]!.key,
    score,
  });
  const options = picks.map((p) => toOption(p.index, p.tier, p.score));

  // Autres configurations : une par gamme et format non retenus, la mieux notée d'abord.
  const scores = weightedScores(scored, settings.selection.weights);
  const usedGroups = new Set(picks.map((p) => scored[p.index]!.group));
  const alternatives: SolutionOption[] = [];
  const order = scored
    .map((_, i) => i)
    .sort(
      (a, b) =>
        Number(scored[a]!.blocked) - Number(scored[b]!.blocked) ||
        scores[b]! - scores[a]! ||
        scored[a]!.priceIndex - scored[b]!.priceIndex,
    );
  // Au-delà de deux fois l'écart admis pour les trois options, le surdimensionnement n'a plus de sens.
  const maxAltVA =
    Math.min(...scored.map((x) => x.installedVA)) * settings.selection.maxOversizeFactor * 2;
  for (const i of order) {
    if (usedGroups.has(scored[i]!.group) || scored[i]!.installedVA > maxAltVA + 1e-6) continue;
    usedGroups.add(scored[i]!.group);
    alternatives.push(toOption(i, 'alternative', scores[i]!));
  }
  return { inputs, options, alternatives, globalAlerts: normalizeAlerts(globalAlerts), traces };
}
