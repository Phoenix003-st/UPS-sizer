/**
 * Dissipation thermique et besoin de climatisation.
 *
 *   P_pertes  = Σ P_sortie,unité × (1 ÷ η(taux) − 1)     (ou dissipation catalogue si renseignée)
 *   P_recharge = Σ I_charge × U_dc × (1 − η_charge)
 *   BTU/h = W × 3,412
 *
 * Seule la dissipation de l'UPS et des batteries est comptée (pas celle des équipements protégés).
 */
import type { UpsModel } from '../catalog/schemas';
import type { Settings } from '../settings/schema';
import { chargeVoltage } from './electrical';
import { W_TO_BTUH } from './math';
import type { Project } from './project';
import { efficiencyAt } from './selection';
import { fmt, trace, type Calc } from './trace';
import type { Alert, BatterySolution, NormalizedInputs, ThermalResult, UpsConfig } from './types';

export interface ThermalInput {
  model: UpsModel;
  config: UpsConfig;
  battery: BatterySolution;
  inputs: NormalizedInputs;
  hvac: Project['room']['hvac'];
  settings: Settings;
}

export function computeThermal(i: ThermalInput): Calc<ThermalResult> & { alerts: Alert[] } {
  const { model, config, battery, inputs, hvac, settings } = i;
  const t = trace('calc.thermal.title');
  const eta = efficiencyAt(model, config.normalLoadRate);
  let upsLossesW: number;
  if (model.heatDissipationW !== null) {
    // Valeur catalogue à pleine charge : prudent à charge partielle.
    upsLossesW = model.heatDissipationW * config.units;
    t.step({
      label: 'calc.thermal.catalog',
      formula: 'P_pertes = dissipation catalogue × unités',
      substituted: `${fmt(model.heatDissipationW, 0)} W × ${config.units}`,
      result: Math.round(upsLossesW),
      unit: 'W',
    });
  } else {
    // Charge partagée entre systèmes et unités : la somme des sorties vaut la charge de dimensionnement.
    upsLossesW = inputs.designW * (1 / eta - 1);
    t.step({
      label: 'calc.thermal.ups',
      formula: 'P_pertes = P_sortie × (1 ÷ η − 1)',
      substituted: `${fmt(inputs.designW, 0)} W × (1 ÷ ${fmt(eta, 3)} − 1)`,
      result: Math.round(upsLossesW),
      unit: 'W',
    });
  }
  // Un chargeur par unité (par châssis pour un modulaire).
  const chargers = config.units;
  const uDc = chargeVoltage(battery, settings);
  const chargeLossesW =
    chargers * model.battery.maxChargeCurrentA * uDc * (1 - settings.battery.chargeEfficiency);
  t.step({
    label: 'calc.thermal.charge',
    formula: 'P_recharge = n × I_charge × U_dc × (1 − η_charge)',
    substituted: `${chargers} × ${fmt(model.battery.maxChargeCurrentA)} A × ${fmt(uDc, 0)} V × (1 − ${fmt(settings.battery.chargeEfficiency)})`,
    result: Math.round(chargeLossesW),
    unit: 'W',
  });
  const totalW = upsLossesW + chargeLossesW;
  const totalBtuH = totalW * W_TO_BTUH;
  t.step({
    label: 'calc.thermal.total',
    formula: 'P = P_pertes + P_recharge',
    substituted: `${fmt(upsLossesW, 0)} + ${fmt(chargeLossesW, 0)} W`,
    result: Math.round(totalW),
    unit: 'W',
  }).step({
    label: 'calc.thermal.btu',
    formula: 'Q = P × 3,412',
    substituted: `${fmt(totalW, 0)} × 3.412`,
    result: Math.round(totalBtuH),
    unit: 'BTU/h',
  });

  const alerts: Alert[] = [];
  const reqKW = totalW / 1000;
  if (hvac.present) {
    if (hvac.kW < reqKW) {
      alerts.push({
        level: 'warn',
        code: 'hvac_insufficient',
        params: {
          required: Number(reqKW.toFixed(2)),
          available: hvac.kW,
          missing: Number((reqKW - hvac.kW).toFixed(2)),
        },
      });
    }
  } else if (totalW > settings.room.noHvacMaxW) {
    alerts.push({
      level: 'warn',
      code: 'hvac_required',
      params: { required: Number(reqKW.toFixed(2)) },
    });
  }

  return {
    value: {
      upsLossesW,
      chargeLossesW,
      totalW,
      totalBtuH,
      hvacKW: hvac.present ? hvac.kW : null,
      requiredKW: reqKW,
    },
    trace: t.build(),
    alerts,
  };
}
