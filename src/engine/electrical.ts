/**
 * Courants, calibres de protection et sections de câbles indicatives.
 *
 *   I = S ÷ (√3 × U) en triphasé, S ÷ U en monophasé
 *   Entrée redresseur : I = (P_sortie ÷ η + P_recharge) ÷ (√3 × U × FP_entrée)
 *   Batterie : I_max = P_dc ÷ (N_éléments × V_fin)
 *   Calibre In = première valeur de la série normalisée ≥ Ib
 *   Section : plus petite section IEC 60364-5-52 (tableau B.52.12, cuivre, PR/XLPE, méthode E)
 *   avec n × Iz × k_T × k_G ≥ In, puis vérification de la chute de tension (NF C 15-100 / UTE C 15-105) :
 *     ΔU = b × Ib × L × (ρ × cos φ ÷ S + λ × sin φ) ÷ n, b = √3 (tri) ou 2 (mono, DC)
 *   avec ρ = 0,0225 Ω·mm²/m et λ = 0,08 mΩ/m (λ ignoré en DC).
 */
import type { UpsModel } from '../catalog/schemas';
import type { Settings } from '../settings/schema';
import { interpLinear, nextInSeries, SQRT3 } from './math';
import { fmt, trace, type Calc, type TraceBuilder } from './trace';
import type { Project } from './project';
import { systemVoltage } from './phases';
import { efficiencyAt } from './selection';
import type {
  BatterySolution,
  CableResult,
  CircuitResult,
  ElectricalResult,
  NormalizedInputs,
  UpsConfig,
} from './types';

/** IEC 60364-5-52 B.52.12 — cuivre, PR/XLPE 90 °C, méthode E, 30 °C (A). */
export const IZ_TABLE: { s: number; iz3: number; iz2: number }[] = [
  { s: 1.5, iz3: 23, iz2: 26 },
  { s: 2.5, iz3: 32, iz2: 36 },
  { s: 4, iz3: 42, iz2: 49 },
  { s: 6, iz3: 54, iz2: 63 },
  { s: 10, iz3: 75, iz2: 86 },
  { s: 16, iz3: 100, iz2: 115 },
  { s: 25, iz3: 127, iz2: 149 },
  { s: 35, iz3: 158, iz2: 185 },
  { s: 50, iz3: 192, iz2: 225 },
  { s: 70, iz3: 246, iz2: 289 },
  { s: 95, iz3: 298, iz2: 352 },
  { s: 120, iz3: 346, iz2: 410 },
  { s: 150, iz3: 399, iz2: 473 },
  { s: 185, iz3: 456, iz2: 542 },
  { s: 240, iz3: 538, iz2: 641 },
  { s: 300, iz3: 621, iz2: 741 },
];

/** IEC 60364-5-52 B.52.14 — facteur de correction de température ambiante, PR/XLPE, dans l'air. */
export const TEMP_FACTOR_XLPE = [
  { x: 10, y: 1.15 },
  { x: 15, y: 1.12 },
  { x: 20, y: 1.08 },
  { x: 25, y: 1.04 },
  { x: 30, y: 1.0 },
  { x: 35, y: 0.96 },
  { x: 40, y: 0.91 },
  { x: 45, y: 0.87 },
  { x: 50, y: 0.82 },
  { x: 55, y: 0.76 },
  { x: 60, y: 0.71 },
];

export const RHO_CU = 0.0225; // Ω·mm²/m
export const LAMBDA = 0.08e-3; // Ω/m

export type CircuitKind = 'ac3' | 'ac1' | 'dc';

/** Courant d'une puissance apparente (VA) sous la tension donnée. */
export function currentFromVA(va: number, voltageV: number, phases: 1 | 3): number {
  return phases === 3 ? va / (SQRT3 * voltageV) : va / voltageV;
}

/** Calibre normalisé ≥ Ib (null si au-delà de la série). */
export function breakerFor(ib: number, series: number[]): number | null {
  return nextInSeries(series, ib);
}

/** Chute de tension en %. */
export function voltageDropPct(
  kind: CircuitKind,
  ib: number,
  lengthM: number,
  sectionMm2: number,
  parallel: number,
  voltageV: number,
  cosPhi: number,
): number {
  const b = kind === 'ac3' ? SQRT3 : 2;
  const sin = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  const perM = kind === 'dc' ? RHO_CU / sectionMm2 : (RHO_CU * cosPhi) / sectionMm2 + LAMBDA * sin;
  return (100 * b * ib * lengthM * perM) / parallel / voltageV;
}

export interface CableInput {
  kind: CircuitKind;
  ib: number;
  inA: number;
  lengthM: number;
  voltageV: number;
  cosPhi: number;
  settings: Settings;
  ambientC?: number;
}

/** Plus petite section (et nombre de câbles en parallèle) qui respecte Iz et la chute de tension. */
export function selectCable(input: CableInput): CableResult | null {
  const { settings } = input;
  const kT = interpLinear(TEMP_FACTOR_XLPE, input.ambientC ?? settings.electrical.cable.ambientC);
  const kG = settings.electrical.cable.groupingFactor;
  const maxDrop =
    input.kind === 'dc'
      ? settings.electrical.maxVoltageDropPct.dc
      : settings.electrical.maxVoltageDropPct.ac;
  for (let n = 1; n <= settings.electrical.cable.maxParallel; n++) {
    for (const row of IZ_TABLE) {
      if (n > 1 && row.s < 50) continue; // pas de mise en parallèle de petites sections
      const iz = (input.kind === 'ac3' ? row.iz3 : row.iz2) * kT * kG * n;
      if (iz < input.inA) continue;
      const drop = voltageDropPct(
        input.kind,
        input.ib,
        input.lengthM,
        row.s,
        n,
        input.voltageV,
        input.cosPhi,
      );
      if (drop > maxDrop) continue;
      return {
        sectionMm2: row.s,
        parallel: n,
        izA: iz,
        voltageDropPct: drop,
        maxVoltageDropPct: maxDrop,
        ok: true,
      };
    }
  }
  return null;
}

export interface CircuitSpec {
  kind: CircuitKind;
  ib: number;
  lengthM: number;
  voltageV: number;
  cosPhi: number;
}

/** Calibre + câble d'un circuit, avec sa trace. */
export function sizeCircuit(
  spec: CircuitSpec,
  settings: Settings,
  t?: TraceBuilder,
  labelKey = 'calc.circuit.generic',
): Calc<{ breakerA: number | null; cable: CableResult | null }> {
  const breakerA = breakerFor(spec.ib, settings.electrical.breakerSeriesA);
  const cable =
    breakerA !== null
      ? selectCable({
          kind: spec.kind,
          ib: spec.ib,
          inA: breakerA,
          lengthM: spec.lengthM,
          voltageV: spec.voltageV,
          cosPhi: spec.cosPhi,
          settings,
        })
      : null;
  const tb = t ?? trace('calc.elec.title');
  tb.step({
    label: `${labelKey}.breaker`,
    formula: 'In ≥ Ib',
    substituted: `Ib = ${fmt(spec.ib, 1)} A`,
    result: breakerA ?? '—',
    unit: 'A',
    ref: 'IEC 60898 / IEC 60947-2',
  });
  if (cable) {
    tb.step({
      label: `${labelKey}.cable`,
      formula: 'n × Iz × k_T × k_G ≥ In ; ΔU ≤ max',
      substituted: `${cable.parallel} × ${fmt(cable.sectionMm2)} mm², Iz = ${fmt(cable.izA, 0)} A, ΔU = ${fmt(cable.voltageDropPct, 2)} % (L = ${fmt(spec.lengthM)} m)`,
      result: cable.parallel > 1 ? `${cable.parallel}×${cable.sectionMm2}` : cable.sectionMm2,
      unit: 'mm²',
      ref: 'IEC 60364-5-52 B.52.12 ; NF C 15-100',
    });
  }
  return { value: { breakerA, cable }, trace: tb.build() };
}

// ───────────────────────────── Installation complète ─────────────────────────────

export interface ElectricalInput {
  model: UpsModel;
  config: UpsConfig;
  battery: BatterySolution;
  inputs: NormalizedInputs;
  installation: Project['installation'];
  settings: Settings;
}

/** Puissance assignée d'une unité (ou d'un châssis modulaire équipé), VA et W. */
export function unitRating(model: UpsModel, config: UpsConfig): { va: number; w: number } {
  if (model.modular && config.modulesPerFrame) {
    const mods = Math.max(...config.modulesPerFrame);
    return { va: mods * model.modular.moduleKVA * 1000, w: mods * model.modular.moduleKW * 1000 };
  }
  return { va: model.power.kVA * 1000, w: model.power.kW * 1000 };
}

/** Tension de recharge de la batterie (floating), V. */
export function chargeVoltage(battery: BatterySolution, settings: Settings): number {
  return battery.chemistry === 'LI_LFP'
    ? battery.dcNominalV * 1.08
    : battery.cellsPerString * settings.battery.floatVpc;
}

export function computeElectrical(i: ElectricalInput): Calc<ElectricalResult> {
  const { model, config, battery, inputs, installation, settings } = i;
  const U = inputs.voltageV;
  const ph = inputs.phases;
  const lengths = installation.cableLengthsM ?? settings.electrical.defaultCableLengthsM;
  const acKind: CircuitKind = ph === 3 ? 'ac3' : 'ac1';
  // Côté réseau (redresseur), les phases d'entrée de l'UPS : triphasé pour un tri/mono.
  const phIn = model.phases.in;
  const Uin = phIn === ph ? U : systemVoltage(phIn, U);
  const inKind: CircuitKind = phIn === 3 ? 'ac3' : 'ac1';
  const t = trace('calc.elec.title');

  const rating = unitRating(model, config);
  const etaFull = efficiencyAt(model, 1);
  const unitOutputA = currentFromVA(rating.va, U, ph);
  const pCharge = model.battery.maxChargeCurrentA * chargeVoltage(battery, settings);
  const pfIn = settings.electrical.inputPf;
  const unitRectifierA = (rating.w / etaFull + pCharge) / ((phIn === 3 ? SQRT3 : 1) * Uin * pfIn);
  const unitsPerSet = battery.setDetails[0]?.unitsCovered ?? 1;
  const unitBatteryA =
    (unitsPerSet * rating.w) / model.efficiency.battery / (battery.cellsPerString * battery.eodVpc);
  const nominalSysVA =
    model.modular && config.modulesN
      ? config.modulesN * model.modular.moduleKVA * 1000
      : config.unitsN * model.power.kVA * 1000;
  const systemOutputA = currentFromVA(nominalSysVA, U, ph);

  t.step({
    label: 'calc.elec.output',
    formula: ph === 3 ? 'I = S ÷ (√3 × U)' : 'I = S ÷ U',
    substituted: ph === 3 ? `${fmt(rating.va, 0)} ÷ (√3 × ${U})` : `${fmt(rating.va, 0)} ÷ ${U}`,
    result: Number(unitOutputA.toFixed(1)),
    unit: 'A',
  })
    .step({
      label: 'calc.elec.rectifier',
      formula:
        phIn === 3
          ? 'I = (P ÷ η + P_recharge) ÷ (√3 × U × FP_e)'
          : 'I = (P ÷ η + P_recharge) ÷ (U × FP_e)',
      substituted: `(${fmt(rating.w, 0)} ÷ ${fmt(etaFull, 3)} + ${fmt(pCharge, 0)}) ÷ (${phIn === 3 ? '√3 × ' : ''}${Uin} × ${fmt(pfIn)})`,
      result: Number(unitRectifierA.toFixed(1)),
      unit: 'A',
    })
    .step({
      label: 'calc.elec.battery',
      formula: 'I_batt = P_dc ÷ (N_éléments × V_fin)',
      substituted: `${fmt((unitsPerSet * rating.w) / model.efficiency.battery, 0)} ÷ (${battery.cellsPerString} × ${fmt(battery.eodVpc)})`,
      result: Number(unitBatteryA.toFixed(1)),
      unit: 'A',
    })
    .step({
      label: 'calc.elec.systemOutput',
      formula: ph === 3 ? 'I = S_système ÷ (√3 × U)' : 'I = S_système ÷ U',
      substituted: `${fmt(nominalSysVA / 1000, 1)} kVA`,
      result: Number(systemOutputA.toFixed(1)),
      unit: 'A',
    });

  const circuits: CircuitResult[] = [];
  const systems: ('A' | 'B')[] = config.systems === 2 ? ['A', 'B'] : ['A'];
  const setsPerSystem = battery.sets / config.systems;
  const add = (
    id: CircuitResult['id'],
    system: 'A' | 'B',
    ib: number,
    kind: CircuitKind,
    lengthM: number,
    voltageV: number,
    cosPhi: number,
    qty: number,
  ) => {
    const traced = system === 'A';
    const r = sizeCircuit(
      { kind, ib, lengthM, voltageV, cosPhi },
      settings,
      traced ? t : undefined,
      `calc.circuit.${id}`,
    );
    circuits.push({
      id,
      system,
      currentA: ib,
      breakerA: r.value.breakerA,
      poles: kind === 'ac3' ? 4 : 2,
      dc: kind === 'dc',
      lengthM,
      cable: r.value.cable,
      qty,
    });
  };
  for (const s of systems) {
    add('rectifier', s, unitRectifierA, inKind, lengths.input, Uin, pfIn, config.unitsPerSystem);
    add(
      'bypass',
      s,
      unitOutputA,
      acKind,
      lengths.bypass,
      U,
      inputs.outputPf,
      config.unitsPerSystem,
    );
    add(
      'output',
      s,
      unitOutputA,
      acKind,
      lengths.output,
      U,
      inputs.outputPf,
      config.unitsPerSystem,
    );
    add('battery', s, unitBatteryA, 'dc', lengths.battery, battery.dcNominalV, 1, setsPerSystem);
    if (installation.externalMaintenanceBypass) {
      add('maintenanceBypass', s, systemOutputA, acKind, lengths.bypass, U, inputs.outputPf, 1);
    }
    const feeders = settings.electrical.outputFeeders;
    add('feeder', s, systemOutputA / feeders, acKind, lengths.output, U, inputs.outputPf, feeders);
    if (installation.generator) {
      add(
        'ats',
        s,
        Math.max(config.unitsPerSystem * unitRectifierA, systemOutputA),
        inKind,
        lengths.input,
        Uin,
        pfIn,
        1,
      );
    }
  }
  const generatorKVA = installation.generator
    ? (settings.electrical.generatorSizingFactor * nominalSysVA * config.systems) / 1000
    : null;
  if (generatorKVA !== null) {
    t.step({
      label: 'calc.elec.generator',
      formula: 'S_GE = k × S_UPS',
      substituted: `${fmt(settings.electrical.generatorSizingFactor)} × ${fmt((nominalSysVA * config.systems) / 1000, 1)} kVA`,
      result: Number(generatorKVA.toFixed(0)),
      unit: 'kVA',
    });
  }

  return {
    value: {
      voltageV: U,
      phases: ph,
      dcNominalV: battery.dcNominalV,
      unitOutputA,
      unitRectifierA,
      unitBatteryA,
      systemOutputA,
      circuits,
      generatorKVA,
    },
    trace: t.build(),
  };
}
