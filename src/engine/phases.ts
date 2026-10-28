/**
 * Alimentation : monophasé, triphasé ou tri/mono (entrée triphasée, sortie monophasée).
 *
 * Le choix de l'utilisateur est respecté tel quel : « Monophasé » ne retient que des UPS 1/1,
 * « Triphasé » que des 3/3, « Tri/Mono » que des 3/1. En automatique, le seuil (10 kVA par défaut)
 * départage : au-delà, triphasé. Le seuil s'applique à la puissance d'UPS nécessaire, c'est-à-dire
 * S_req ÷ taux de charge cible ; un monophasé demandé au-delà reçoit un simple avertissement. La
 * tension utilisée pour les courants est la tension phase-neutre en monophasé et la tension entre
 * phases en triphasé.
 */
import type { Settings } from '../settings/schema';
import { SQRT3 } from './math';
import type { Project } from './project';
import { fmt, trace, type Calc } from './trace';
import type { Alert } from './types';

export interface PhaseResult {
  /** Phases de sortie (celles de la charge). */
  phases: 1 | 3;
  /** Phases d'entrée (redresseur) : 3 en tri/mono. */
  inputPhases: 1 | 3;
  /** Tension phase-neutre (mono) ou entre phases (tri), V. */
  voltageV: number;
  alerts: Alert[];
}

const MONO_V = [220, 230, 240];
const TRI_V = [380, 400, 415];
const nearest = (list: number[], v: number) =>
  list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]!);

/**
 * Tension de calcul : phase-neutre en mono, entre phases en tri, à partir de la tension saisie
 * (230 V ↔ 400 V, 220 V ↔ 380 V, 240 V ↔ 415 V).
 */
export function systemVoltage(phases: 1 | 3, voltage: number): number {
  if (phases === 1) return voltage <= 260 ? voltage : nearest(MONO_V, voltage / SQRT3);
  return voltage >= 360 ? voltage : nearest(TRI_V, voltage * SQRT3);
}

export function resolvePhases(
  designVA: number,
  advanced: Pick<Project['advanced'], 'phases' | 'voltage' | 'targetLoadRate'>,
  settings: Settings,
): Calc<PhaseResult> {
  const threshold = settings.power.monoToTriThresholdKVA * 1000;
  const ratingVA = designVA / advanced.targetLoadRate;
  const alerts: Alert[] = [];
  const choice = advanced.phases;
  const phases: 1 | 3 =
    choice === 'auto' ? (ratingVA > threshold ? 3 : 1) : choice === '3/1' ? 1 : choice;
  const inputPhases: 1 | 3 = choice === '3/1' ? 3 : phases;
  if (choice === 1 && ratingVA > threshold) {
    alerts.push({
      level: 'warn',
      code: 'mono_above_threshold',
      params: {
        kva: Number((ratingVA / 1000).toFixed(1)),
        threshold: settings.power.monoToTriThresholdKVA,
      },
    });
  }
  const voltageV = systemVoltage(phases, advanced.voltage);
  const t = trace('calc.phases.title')
    .step({
      label: 'calc.phases.rule',
      formula: 'S_req ÷ taux cible > seuil ⇒ triphasé',
      substituted: `${fmt(designVA / 1000)} ÷ ${fmt(advanced.targetLoadRate)} = ${fmt(ratingVA / 1000)} kVA ${ratingVA > threshold ? '>' : '≤'} ${settings.power.monoToTriThresholdKVA} kVA`,
      result: inputPhases === phases ? `${phases}~` : '3~ / 1~',
      unit: '',
    })
    .step({
      label: 'calc.phases.voltage',
      formula: 'U',
      substituted: `${voltageV} V`,
      result: voltageV,
      unit: 'V',
    })
    .build();
  return { value: { phases, inputPhases, voltageV, alerts }, trace: t };
}
