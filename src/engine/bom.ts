/**
 * Nomenclature (BOM) : UPS ou châssis et modules, blocs batteries, armoires, protections, bypass de
 * maintenance, inverseur de source, câbles indicatifs. Colonne prix laissée vide.
 */
import { displayReference, type UpsModel } from '../catalog/schemas';
import type { BatterySolution, BomLine, ElectricalResult, UpsConfig } from './types';

export interface BomInput {
  model: UpsModel;
  config: UpsConfig;
  battery: BatterySolution;
  electrical: ElectricalResult;
  blockSample: boolean;
  cabinetSample: (id: string) => boolean;
}

export function buildBom(i: BomInput): BomLine[] {
  const { model, config, battery, electrical } = i;
  const lines: BomLine[] = [];
  const push = (l: Omit<BomLine, 'id' | 'unitPrice'>) => {
    if (l.qty > 0) lines.push({ ...l, id: `L${lines.length + 1}`, unitPrice: null });
  };

  if (model.modular && config.modulesPerSystem) {
    push({
      category: 'frame',
      reference: displayReference(model),
      labelKey: 'bom.frame',
      params: { maxModules: model.modular.maxModules },
      qty: config.units,
      unit: 'pcs',
      sample: model.sample,
    });
    push({
      category: 'module',
      reference: `${model.reference} — module ${model.modular.moduleKW} kW`,
      labelKey: 'bom.module',
      params: { kw: model.modular.moduleKW },
      qty: config.modulesPerSystem * config.systems,
      unit: 'pcs',
      sample: model.sample,
    });
  } else {
    push({
      category: 'ups',
      reference: displayReference(model),
      labelKey: 'bom.ups',
      params: { kva: model.power.kVA, kw: model.power.kW },
      qty: config.units,
      unit: 'pcs',
      sample: model.sample,
    });
  }

  const externalBlocks =
    battery.blocksPerString * (battery.strings - battery.internalStrings) * battery.sets;
  push({
    category: 'battery',
    reference: battery.blockReference,
    labelKey: 'bom.battery',
    params: { v: battery.blockV, ah: battery.capacityAh, chemistry: battery.chemistry },
    qty: externalBlocks,
    unit: 'pcs',
    sample: i.blockSample,
  });
  for (const cab of battery.cabinets) {
    push({
      category: 'cabinet',
      reference: cab.reference,
      labelKey: 'bom.cabinet',
      params: {},
      qty: cab.qty * battery.sets,
      unit: 'pcs',
      sample: i.cabinetSample(cab.id),
    });
  }

  // Protections : regroupées par (circuit, calibre, pôles).
  const breakers = new Map<string, BomLine>();
  for (const c of electrical.circuits) {
    if (c.breakerA === null) continue;
    const isBypass = c.id === 'maintenanceBypass';
    const isAts = c.id === 'ats';
    const key = `${c.id}|${c.breakerA}|${c.poles}`;
    const existing = breakers.get(key);
    if (existing) {
      existing.qty += c.qty;
      continue;
    }
    breakers.set(key, {
      id: '',
      category: isAts ? 'ats' : isBypass ? 'bypass' : 'breaker',
      reference: `${c.poles}P ${c.breakerA} A${c.dc ? ' DC' : ''}`,
      labelKey: `bom.circuit.${c.id}`,
      params: { a: c.breakerA, poles: c.poles },
      qty: c.qty,
      unit: 'pcs',
      sample: false,
      unitPrice: null,
    });
  }
  for (const b of breakers.values()) push(b);

  // Câbles indicatifs : longueur × nombre de conducteurs en parallèle × circuits.
  const cables = new Map<string, BomLine>();
  for (const c of electrical.circuits) {
    if (!c.cable) continue;
    const cores = c.dc ? 2 : c.poles === 4 ? 5 : 3;
    const ref = `${cores}G${c.cable.sectionMm2} mm² Cu XLPE`;
    const len = Math.ceil(c.lengthM * c.cable.parallel * c.qty);
    const existing = cables.get(ref);
    if (existing) existing.qty += len;
    else
      cables.set(ref, {
        id: '',
        category: 'cable',
        reference: ref,
        labelKey: 'bom.cable',
        params: { section: c.cable.sectionMm2, cores },
        qty: len,
        unit: 'm',
        sample: false,
        unitPrice: null,
      });
  }
  for (const c of cables.values()) push(c);
  return lines;
}
