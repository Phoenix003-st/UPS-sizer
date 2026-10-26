/**
 * Puissance requise.
 *
 *   kW_req  = charge × (1 + marge)
 *   kVA_req = kW_req ÷ FP
 *
 * En mode assisté, la charge est la somme de la bibliothèque : P = Σ qté × W et S = Σ qté × W / FP_i.
 * La puissance apparente retenue est la plus forte des deux estimations (FP de sortie choisi ou
 * FP composite des équipements), ce qui reste du côté de la sécurité.
 */
import type { EquipmentLibrary } from '../catalog/schemas';
import type { Project } from './project';
import { fmt, trace, type Calc } from './trace';

export interface LoadResult {
  /** Charge réelle, W et VA. */
  loadW: number;
  loadVA: number;
  /** Charge de dimensionnement, W et VA. */
  designW: number;
  designVA: number;
  pf: number;
  margin: number;
}

/** Somme de la bibliothèque d'équipements : Σ qté × W et Σ qté × W / FP. */
export function sumEquipment(
  items: Project['load']['items'],
  library: EquipmentLibrary,
): { W: number; VA: number } {
  let W = 0;
  let VA = 0;
  for (const it of items) {
    const lib = library.find((l) => l.id === it.libId);
    const pf = it.pf ?? lib?.pf ?? 0.9;
    W += it.qty * it.unitW;
    VA += (it.qty * it.unitW) / pf;
  }
  return { W, VA };
}

export function computeLoad(
  load: Project['load'],
  advanced: Pick<Project['advanced'], 'outputPf' | 'growthMargin'>,
  library: EquipmentLibrary,
): Calc<LoadResult> {
  const pf = advanced.outputPf;
  const m = advanced.growthMargin;
  const t = trace('calc.load.title');
  let loadW: number;
  let loadVA: number;

  if (load.mode === 'assisted') {
    const s = sumEquipment(load.items, library);
    loadW = s.W;
    loadVA = Math.max(s.VA, s.W / pf);
    t.step({
      label: 'calc.load.sumItems',
      formula: 'P = Σ qté × W',
      substituted: load.items.map((i) => `${i.qty} × ${fmt(i.unitW, 0)}`).join(' + ') || '0',
      result: loadW,
      unit: 'W',
    });
  } else if (load.unit === 'kVA') {
    loadVA = load.value * 1000;
    loadW = loadVA * pf;
    t.step({
      label: 'calc.load.fromKVA',
      formula: 'P = S × FP',
      substituted: `${fmt(load.value)} kVA × ${fmt(pf)}`,
      result: loadW,
      unit: 'W',
    });
  } else {
    loadW = load.value * 1000;
    loadVA = loadW / pf;
    t.step({
      label: 'calc.load.direct',
      formula: 'P',
      substituted: `${fmt(load.value)} kW`,
      result: loadW,
      unit: 'W',
    });
  }

  const designW = loadW * (1 + m);
  const designVA = Math.max(designW / pf, loadVA * (1 + m));
  t.step({
    label: 'calc.load.kwReq',
    formula: 'P_req = P × (1 + marge)',
    substituted: `${fmt(loadW / 1000, 3)} kW × (1 + ${fmt(m)})`,
    result: designW / 1000,
    unit: 'kW',
  }).step({
    label: 'calc.load.kvaReq',
    formula: 'S_req = P_req ÷ FP',
    substituted: `${fmt(designW / 1000, 3)} kW ÷ ${fmt(pf)}`,
    result: designVA / 1000,
    unit: 'kVA',
  });

  return { value: { loadW, loadVA, designW, designVA, pf, margin: m }, trace: t.build() };
}
