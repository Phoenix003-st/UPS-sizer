/**
 * Sélection des UPS et des trois options (Économique, Recommandée, Performance).
 *
 * 1. Filtrage : technologie du scénario, phases, tension, fréquence, température ambiante, format
 *    (baie existante → rack ; bureau ou local partagé → tour/rack privilégiés).
 * 2. Configuration de chaque modèle : plus petit nombre d'unités (ou de modules) tel que
 *    P_req ÷ (P_unité × k_alt × n) ≤ taux cible, en kW et en kVA ; +1 unité en N+1 ; deux systèmes
 *    indépendants en 2N. Une seule unité est privilégiée quand c'est possible.
 * 3. Scoring pondéré (paramètres) : rendement, emprise, marge, prix (indice de prix ou puissance
 *    installée) → Recommandée. Économique = puissance installée minimale. Performance = meilleur
 *    rendement, plus grande marge et technologie la plus robuste.
 */
import {
  displayReference,
  type Technology,
  type UpsCatalog,
  type UpsModel,
} from '../catalog/schemas';
import type { Settings } from '../settings/schema';
import { ceilSafe, interpLinear } from './math';
import { framesForModules, modulesNeeded } from './modular';
import type { RoomKind, Tier } from './project';
import { fmt, trace, type Calc } from './trace';
import type { NormalizedInputs, UpsConfig } from './types';

/** Rendement en fonctionnement normal au taux de charge donné (interpolé dans la courbe). */
export function efficiencyAt(model: UpsModel, loadRate: number): number {
  return interpLinear(
    model.efficiency.online.map((p) => ({ x: p.load, y: p.eta })),
    loadRate,
  );
}

export interface SelectionContext {
  inputs: NormalizedInputs;
  roomKind: RoomKind;
  ambientC: number;
}

export type ExclusionReason =
  | 'technology'
  | 'phases'
  | 'voltage'
  | 'frequency'
  | 'temperature'
  | 'form_factor'
  | 'capacity'
  | 'parallel';

/** Raison d'exclusion d'un modèle, ou null s'il convient. */
export function modelExclusion(model: UpsModel, ctx: SelectionContext): ExclusionReason | null {
  const { inputs } = ctx;
  if (!inputs.technologies.includes(model.technology)) return 'technology';
  if (model.phases.out !== inputs.phases) return 'phases';
  if (inputs.phases === 3 && model.phases.in !== 3) return 'phases';
  if (!model.voltages.out.some((v) => Math.abs(v - inputs.voltageV) <= 0.03 * inputs.voltageV))
    return 'voltage';
  if (!model.voltages.freqHz.includes(inputs.freqHz)) return 'frequency';
  if (ctx.ambientC > model.ambientC.max || ctx.ambientC < model.ambientC.min) return 'temperature';
  if (ctx.roomKind === 'rack' && model.formFactor !== 'rack' && model.formFactor !== 'tower_rack')
    return 'form_factor';
  return null;
}

/** Configure un modèle pour la charge (unités / modules, redondance) ; null si impossible. */
export function configureModel(model: UpsModel, inputs: NormalizedInputs): UpsConfig | null {
  const k = inputs.kAltitude;
  const rate = inputs.targetLoadRate;
  const red = inputs.redundancy;
  const systems: 1 | 2 = red === '2N' ? 2 : 1;
  const base = {
    modelId: model.id,
    reference: displayReference(model),
    technology: model.technology,
    systems,
    redundancy: red,
  };

  if (model.technology === 'modular' && model.modular) {
    const spec = model.modular;
    const mW = spec.moduleKW * 1000 * k;
    const mVA = spec.moduleKVA * 1000 * k;
    const modsN = modulesNeeded({
      loadKW: inputs.designW / 1000,
      moduleKW: mW / 1000,
      loadKVA: inputs.designVA / 1000,
      moduleKVA: mVA / 1000,
      redundancy: 'N',
      targetLoadRate: rate,
    }).value;
    const modsSys = red === 'N+1' ? modsN + 1 : modsN;
    const frames = framesForModules(modsSys, spec);
    const framesN = framesForModules(modsN, spec);
    if (!frames || !framesN) return null;
    const loadRate = Math.max(inputs.designW / (modsN * mW), inputs.designVA / (modsN * mVA));
    const normalLoadRate = Math.max(
      inputs.designW / (systems * modsSys * mW),
      inputs.designVA / (systems * modsSys * mVA),
    );
    return {
      ...base,
      unitsPerSystem: frames.frames,
      unitsN: framesN.frames,
      units: frames.frames * systems,
      modulesPerSystem: modsSys,
      modulesN: modsN,
      modulesPerFrame: frames.modulesPerFrame,
      loadRate,
      normalLoadRate,
      capacityW: modsN * mW,
      capacityVA: modsN * mVA,
      installedVA: systems * modsSys * spec.moduleKVA * 1000,
      efficiency: efficiencyAt(model, normalLoadRate),
    };
  }

  const uW = model.power.kW * 1000 * k;
  const uVA = model.power.kVA * 1000 * k;
  const nN = Math.max(
    1,
    ceilSafe(inputs.designW / (uW * rate)),
    ceilSafe(inputs.designVA / (uVA * rate)),
  );
  const perSystem = red === 'N+1' ? nN + 1 : nN;
  if (perSystem > 1 && (!model.parallel.capable || perSystem > model.parallel.maxUnits))
    return null;
  const loadRate = Math.max(inputs.designW / (nN * uW), inputs.designVA / (nN * uVA));
  const normalLoadRate = Math.max(
    inputs.designW / (systems * perSystem * uW),
    inputs.designVA / (systems * perSystem * uVA),
  );
  return {
    ...base,
    unitsPerSystem: perSystem,
    unitsN: nN,
    units: perSystem * systems,
    loadRate,
    normalLoadRate,
    capacityW: nN * uW,
    capacityVA: nN * uVA,
    installedVA: systems * perSystem * model.power.kVA * 1000,
    efficiency: efficiencyAt(model, normalLoadRate),
  };
}

export interface UpsCandidate {
  model: UpsModel;
  config: UpsConfig;
}

export interface CandidateSet {
  candidates: UpsCandidate[];
  excluded: { modelId: string; reason: ExclusionReason }[];
}

/** Modèles configurés et filtrés pour la charge et le local. */
export function upsCandidates(catalog: UpsCatalog, ctx: SelectionContext): Calc<CandidateSet> {
  const excluded: CandidateSet['excluded'] = [];
  let candidates: UpsCandidate[] = [];
  for (const model of catalog.models) {
    const reason = modelExclusion(model, ctx);
    if (reason) {
      excluded.push({ modelId: model.id, reason });
      continue;
    }
    const config = configureModel(model, ctx.inputs);
    if (!config) {
      excluded.push({
        modelId: model.id,
        reason: model.parallel.capable ? 'capacity' : 'parallel',
      });
      continue;
    }
    candidates.push({ model, config });
  }
  // Une seule unité par système quand c'est possible (moins de câblage, moins de coût).
  if (candidates.some((c) => c.config.unitsN === 1)) {
    for (const c of candidates.filter((c) => c.config.unitsN > 1))
      excluded.push({ modelId: c.model.id, reason: 'parallel' });
    candidates = candidates.filter((c) => c.config.unitsN === 1);
  }
  // Bureau ou local partagé : formats tour / rack privilégiés.
  if (ctx.roomKind === 'office' || ctx.roomKind === 'shared') {
    const compact = candidates.filter((c) => c.model.formFactor !== 'cabinet');
    if (compact.length > 0) {
      for (const c of candidates.filter((c) => c.model.formFactor === 'cabinet'))
        excluded.push({ modelId: c.model.id, reason: 'form_factor' });
      candidates = compact;
    }
  }
  // Pas de surdimensionnement excessif.
  const t = trace('calc.selection.title').step({
    label: 'calc.selection.rule',
    formula: 'P_req ÷ (n × P_unité × k_alt) ≤ taux cible',
    substituted: `${fmt(ctx.inputs.designW / 1000)} kW, k_alt = ${fmt(ctx.inputs.kAltitude)}, taux ≤ ${fmt(ctx.inputs.targetLoadRate)}`,
    result: candidates.length,
    unit: '',
  });
  return { value: { candidates, excluded }, trace: t.build() };
}

/** Rang de robustesse de la technologie (0 = la plus simple). */
export const TECH_RANK: Record<Technology, number> = {
  line_interactive: 0,
  online_performance: 0.5,
  online_double_conversion: 1,
  modular: 1,
};

export interface ScoredInput {
  key: string;
  installedVA: number;
  priceIndex: number;
  efficiency: number;
  footprintM2: number;
  loadRate: number;
  /** Marge utile (0–1) : 1 dès que le taux de charge descend au taux idéal (voir marginScore). */
  marginScore: number;
  techRank: number;
  /** Chimie de la batterie : la Performance privilégie le lithium. */
  lithium: boolean;
  /** Pire niveau d'alerte : une option bloquante n'est retenue qu'à défaut d'autre. */
  blocked: boolean;
}

function norm(values: number[], v: number, higherIsBetter: boolean): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-12) return 1;
  const s = (v - min) / (max - min);
  return higherIsBetter ? s : 1 - s;
}

/**
 * Marge utile : 0 au taux de charge cible, 1 au taux idéal et en dessous. Surdimensionner davantage
 * n'apporte plus rien (le rendement et le prix départagent alors les options).
 */
export function marginScore(
  loadRate: number,
  targetLoadRate: number,
  idealLoadRate: number,
): number {
  if (targetLoadRate <= idealLoadRate) return loadRate <= targetLoadRate ? 1 : 0;
  return Math.min(1, Math.max(0, (targetLoadRate - loadRate) / (targetLoadRate - idealLoadRate)));
}

/** Score pondéré (0–1) selon les poids des paramètres. */
export function weightedScores(
  items: ScoredInput[],
  weights: Settings['selection']['weights'],
): number[] {
  const eff = items.map((i) => i.efficiency);
  const fp = items.map((i) => i.footprintM2);
  const price = items.map((i) => i.priceIndex);
  const wSum = weights.efficiency + weights.footprint + weights.margin + weights.price || 1;
  return items.map(
    (i) =>
      (weights.efficiency * norm(eff, i.efficiency, true) +
        weights.footprint * norm(fp, i.footprintM2, false) +
        weights.margin * i.marginScore +
        weights.price * norm(price, i.priceIndex, false)) /
      wSum,
  );
}

/**
 * Choisit jusqu'à trois options distinctes. Retourne pour chaque niveau l'index retenu dans `items`.
 *
 * - Recommandée : meilleur score pondéré (paramètres) ;
 * - Économique : l'option la moins chère, affichée seulement si elle coûte moins que la Recommandée ;
 * - Performance : meilleur rendement, plus grande marge et technologie la plus robuste, affichée
 *   seulement si elle fait mieux que la Recommandée sur ces critères.
 *
 * Les options bloquantes ne sont retenues que s'il n'existe rien d'autre, et les options plus de
 * `maxOversizeFactor` fois plus puissantes que la plus petite sont écartées.
 */
export function pickTiers(
  items: ScoredInput[],
  settings: Settings,
): { tier: Tier; index: number; score: number }[] {
  if (items.length === 0) return [];
  const anyUsable = items.some((i) => !i.blocked);
  const idx = items.map((_, i) => i).filter((i) => !anyUsable || !items[i]!.blocked);
  const minVA = Math.min(...idx.map((i) => items[i]!.installedVA));
  const pool = idx.filter(
    (i) => items[i]!.installedVA <= minVA * settings.selection.maxOversizeFactor + 1e-6,
  );
  const poolItems = pool.map((i) => items[i]!);
  const scores = weightedScores(poolItems, settings.selection.weights);
  const scoreOf = (i: number) => scores[pool.indexOf(i)]!;

  const effs = poolItems.map((p) => p.efficiency);
  const margins = poolItems.map((p) => 1 - p.loadRate);
  const perfScore = (i: number) => {
    const it = items[i]!;
    return (
      0.35 * norm(effs, it.efficiency, true) +
      0.35 * norm(margins, 1 - it.loadRate, true) +
      0.2 * it.techRank +
      0.1 * Number(it.lithium)
    );
  };
  const cheaper = (a: number, b: number) => {
    const A = items[a]!;
    const B = items[b]!;
    return (
      A.priceIndex - B.priceIndex || A.installedVA - B.installedVA || A.footprintM2 - B.footprintM2
    );
  };

  const recommended = [...pool].sort((a, b) => scoreOf(b) - scoreOf(a) || cheaper(a, b))[0]!;
  const economy = [...pool].sort(cheaper)[0]!;
  const performance = [...pool]
    .filter((i) => i !== recommended && i !== economy)
    .sort((a, b) => perfScore(b) - perfScore(a) || cheaper(a, b))[0];

  const out: { tier: Tier; index: number; score: number }[] = [];
  if (economy !== recommended && cheaper(economy, recommended) < 0) {
    out.push({ tier: 'economy', index: economy, score: scoreOf(economy) });
  }
  out.push({ tier: 'recommended', index: recommended, score: scoreOf(recommended) });
  if (performance !== undefined && perfScore(performance) > perfScore(recommended) + 1e-9) {
    out.push({ tier: 'performance', index: performance, score: scoreOf(performance) });
  }
  return out;
}
