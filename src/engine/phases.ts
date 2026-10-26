/**
 * Monophasé ou triphasé.
 *
 * Au-delà du seuil (10 kVA par défaut), l'application bascule automatiquement en triphasé, même si
 * l'utilisateur a demandé du monophasé (alerte orange). Le seuil s'applique à la puissance d'UPS
 * nécessaire, c'est-à-dire S_req ÷ taux de charge cible. La tension utilisée pour les courants est
 * la tension phase-neutre en monophasé et la tension entre phases en triphasé.
 */
import type { Settings } from '../settings/schema';
import { SQRT3 } from './math';
import type { Project } from './project';
import { fmt, trace, type Calc } from './trace';
import type { Alert } from './types';

export interface PhaseResult {
  phases: 1 | 3;
  /** Tension phase-neutre (mono) ou entre phases (tri), V. */
  voltageV: number;
  forced: boolean;
  alerts: Alert[];
}

/** Tension de calcul : 230 V en mono, 400 V en tri, à partir de la tension saisie. */
export function systemVoltage(phases: 1 | 3, voltage: number): number {
  if (phases === 1) return voltage <= 260 ? voltage : Math.round(voltage / SQRT3);
  return voltage >= 360 ? voltage : Math.round(voltage * SQRT3);
}

export function resolvePhases(
  designVA: number,
  advanced: Pick<Project['advanced'], 'phases' | 'voltage' | 'targetLoadRate'>,
  settings: Settings,
): Calc<PhaseResult> {
  const threshold = settings.power.monoToTriThresholdKVA * 1000;
  const ratingVA = designVA / advanced.targetLoadRate;
  const alerts: Alert[] = [];
  let phases: 1 | 3;
  let forced = false;
  if (advanced.phases === 'auto') {
    phases = ratingVA > threshold ? 3 : 1;
  } else if (advanced.phases === 1 && ratingVA > threshold) {
    phases = 3;
    forced = true;
    alerts.push({
      level: 'warn',
      code: 'phase_switched_to_three',
      params: {
        kva: Number((ratingVA / 1000).toFixed(1)),
        threshold: settings.power.monoToTriThresholdKVA,
      },
    });
  } else {
    phases = advanced.phases;
  }
  const voltageV = systemVoltage(phases, advanced.voltage);
  const t = trace('calc.phases.title')
    .step({
      label: 'calc.phases.rule',
      formula: 'S_req ÷ taux cible > seuil ⇒ triphasé',
      substituted: `${fmt(designVA / 1000)} ÷ ${fmt(advanced.targetLoadRate)} = ${fmt(ratingVA / 1000)} kVA ${ratingVA > threshold ? '>' : '≤'} ${settings.power.monoToTriThresholdKVA} kVA`,
      result: phases === 3 ? '3~' : '1~',
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
  return { value: { phases, voltageV, forced, alerts }, trace: t };
}
