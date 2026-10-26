/**
 * Ventilation du local batteries — IEC 62485-2.
 *
 *   Q = 0,05 × n × I_gaz × C_rt × 10⁻³   (m³/h)
 *   n : nombre d'éléments ; I_gaz : courant de gaz (mA/Ah, VRLA en floating : 1 mA/Ah) ;
 *   C_rt : capacité assignée (Ah). Ventilation naturelle : section libre A = 28 × Q (cm²).
 *
 * Batteries lithium : sans dégagement d'hydrogène en fonctionnement normal, non applicable.
 */
import type { Settings } from '../settings/schema';
import { fmt, trace, type Calc } from './trace';
import type { BatterySolution, VentilationResult } from './types';

export function computeVentilation(
  battery: BatterySolution,
  settings: Settings,
): Calc<VentilationResult> {
  const t = trace('calc.vent.title');
  if (battery.chemistry === 'LI_LFP') {
    t.step({
      label: 'calc.vent.lithium',
      formula: '—',
      substituted: '—',
      result: 0,
      unit: 'm³/h',
      ref: 'IEC 62485-2',
    });
    return {
      value: {
        applicable: false,
        flowM3h: 0,
        freeAreaCm2: 0,
        cells: 0,
        capacityAh: battery.capacityAh,
      },
      trace: t.build(),
    };
  }
  // Chaînes en parallèle : Q s'additionne, soit n = total des éléments à la capacité d'un bloc.
  const cells = battery.cellsPerString * battery.strings * battery.sets;
  const iGas = settings.battery.gasCurrentMaPerAh;
  const flow = 0.05 * cells * iGas * battery.capacityAh * 1e-3;
  const area = 28 * flow;
  t.step({
    label: 'calc.vent.flow',
    formula: 'Q = 0,05 × n × I_gaz × C_rt × 10⁻³',
    substituted: `0.05 × ${cells} × ${fmt(iGas)} × ${fmt(battery.capacityAh)} × 10⁻³`,
    result: Number(flow.toFixed(2)),
    unit: 'm³/h',
    ref: 'IEC 62485-2 §7.2',
  }).step({
    label: 'calc.vent.area',
    formula: 'A = 28 × Q',
    substituted: `28 × ${fmt(flow, 2)}`,
    result: Math.ceil(area),
    unit: 'cm²',
    ref: 'IEC 62485-2 §7.3',
  });
  return {
    value: {
      applicable: true,
      flowM3h: flow,
      freeAreaCm2: area,
      cells,
      capacityAh: battery.capacityAh,
    },
    trace: t.build(),
  };
}
