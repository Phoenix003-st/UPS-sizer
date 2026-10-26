/**
 * Environnement du local : déclassement en altitude et contrôles des plages intérieures.
 *
 * - Altitude > 1 000 m : coefficient de déclassement interpolé dans la table des paramètres
 *   (IEC 62040-3, table éditable).
 * - Température 0–40 °C (20–25 °C recommandés pour la durée de vie des batteries).
 * - Humidité ≤ 95 % sans condensation ; local propre, IP20.
 */
import type { Settings } from '../settings/schema';
import { interpLinear } from './math';
import type { Project } from './project';
import { fmt, trace, type Calc } from './trace';
import type { Alert } from './types';

/** Coefficient de déclassement en altitude (1 jusqu'à 1 000 m). */
export function altitudeFactor(
  altitudeM: number,
  table: Settings['power']['altitudeDerating'],
): Calc<number> {
  const k =
    altitudeM <= 1000
      ? 1
      : interpLinear(
          table.map((p) => ({ x: p.m, y: p.k })),
          altitudeM,
        );
  return {
    value: k,
    trace: trace('calc.env.title')
      .step({
        label: 'calc.env.altitude',
        formula: 'k_alt = table(altitude)',
        substituted: `table(${fmt(altitudeM, 0)} m)`,
        result: k,
        unit: '',
        ref: 'IEC 62040-3',
      })
      .build(),
  };
}

export interface EnvironmentResult {
  kAltitude: number;
  alerts: Alert[];
}

export function checkEnvironment(
  room: Project['room'],
  settings: Settings,
): Calc<EnvironmentResult> {
  const alt = altitudeFactor(room.altitudeM, settings.power.altitudeDerating);
  const alerts: Alert[] = [];
  const [tMin, tMax] = settings.room.allowedTempC;
  const [rMin, rMax] = settings.room.recommendedTempC;

  if (room.ambientC < tMin || room.ambientC > tMax) {
    alerts.push({
      level: 'block',
      code: 'temp_out_of_range',
      params: { t: room.ambientC, min: tMin, max: tMax },
    });
  } else if (room.ambientC < rMin || room.ambientC > rMax) {
    alerts.push({
      level: 'warn',
      code: 'temp_not_recommended',
      params: { t: room.ambientC, min: rMin, max: rMax },
    });
  }
  if (room.humidityPct > settings.room.maxHumidityPct) {
    alerts.push({
      level: 'block',
      code: 'humidity_too_high',
      params: { h: room.humidityPct, max: settings.room.maxHumidityPct },
    });
  }
  if (alt.value < 1) {
    alerts.push({
      level: 'warn',
      code: 'altitude_derating',
      params: { altitude: room.altitudeM, pct: Math.round((1 - alt.value) * 100) },
    });
  }
  return { value: { kAltitude: alt.value, alerts }, trace: alt.trace };
}
