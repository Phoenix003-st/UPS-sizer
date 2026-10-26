/**
 * UPS modulaires.
 *
 *   n = ⌈ charge ÷ (P_module × taux cible) ⌉ ; +1 module en N+1 ; en 2N, n modules par système.
 *   Châssis = max(⌈ n ÷ modules max ⌉, ⌈ n × S_module ÷ S_châssis max ⌉), limité au nombre de
 *   châssis en parallèle autorisé.
 */
import type { ModularSpec } from '../catalog/schemas';
import type { Redundancy } from '../settings/schema';
import { ceilSafe } from './math';
import { fmt, trace, type Calc } from './trace';

export interface ModulesInput {
  loadKW: number;
  moduleKW: number;
  redundancy: Redundancy;
  /** Taux de charge cible (1 = aucun). */
  targetLoadRate?: number;
  loadKVA?: number;
  moduleKVA?: number;
}

/** Nombre de modules par système (avec le module redondant en N+1). */
export function modulesNeeded(input: ModulesInput): Calc<number> {
  const rate = input.targetLoadRate ?? 1;
  const byKW = ceilSafe(input.loadKW / (input.moduleKW * rate));
  const byKVA =
    input.loadKVA !== undefined && input.moduleKVA !== undefined
      ? ceilSafe(input.loadKVA / (input.moduleKVA * rate))
      : 0;
  const n = Math.max(1, byKW, byKVA);
  const total = input.redundancy === 'N+1' ? n + 1 : n;
  const t = trace('calc.modular.title')
    .step({
      label: 'calc.modular.n',
      formula: 'n = ⌈ P_req ÷ (P_module × taux) ⌉',
      substituted: `⌈ ${fmt(input.loadKW)} ÷ (${fmt(input.moduleKW)} × ${fmt(rate)}) ⌉`,
      result: n,
      unit: '',
    })
    .step({
      label: 'calc.modular.redundancy',
      formula: input.redundancy === 'N+1' ? 'n + 1' : 'n',
      substituted: input.redundancy === 'N+1' ? `${n} + 1` : `${n}`,
      result: total,
      unit: '',
    })
    .build();
  return { value: total, trace: t };
}

export interface FrameLayout {
  frames: number;
  modulesPerFrame: number[];
}

/** Répartit les modules dans le minimum de châssis ; null si la configuration est impossible. */
export function framesForModules(modules: number, spec: ModularSpec): FrameLayout | null {
  const perFrameMax = Math.min(
    spec.maxModules,
    Math.floor(spec.frameMaxKVA / spec.moduleKVA + 1e-9),
  );
  if (perFrameMax < 1) return null;
  const frames = ceilSafe(modules / perFrameMax);
  if (frames > spec.frameParallelMax) return null;
  const base = Math.floor(modules / frames);
  const extra = modules % frames;
  const modulesPerFrame = Array.from({ length: frames }, (_, i) => base + (i < extra ? 1 : 0));
  return { frames, modulesPerFrame };
}
