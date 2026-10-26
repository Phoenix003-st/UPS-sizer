/** Données du livrable « Autonomie selon la charge » (écran et rapport PDF). */
import type { Catalogs } from '../../catalog/schemas';
import { autonomyVsLoad, type AutonomyPoint } from '../../engine/battery';
import type { NormalizedInputs, SolutionOption } from '../../engine/types';

export interface AutonomyData {
  /** Points du tableau : 10 … 100 % de la puissance utile, plus la charge réelle et de dimensionnement. */
  rows: (AutonomyPoint & { mark?: 'load' | 'design' })[];
  /** Points de la courbe, pas de 5 %. */
  curve: AutonomyPoint[];
  capacityW: number;
}

const STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function autonomyData(
  option: SolutionOption,
  inputs: NormalizedInputs,
  catalogs: Catalogs,
): AutonomyData | null {
  const block = catalogs.batteries.blocks.find((b) => b.id === option.battery.blockId);
  const model = catalogs.ups.models.find((m) => m.id === option.ups.modelId);
  const capacityW = option.ups.capacityW;
  if (!block || !model || !(capacityW > 0)) return null;
  const at = (loadsPct: number[]) =>
    autonomyVsLoad({
      block,
      battery: option.battery,
      batteryEfficiency: model.efficiency.battery,
      capacityW,
      designW: inputs.designW,
      loadsPct,
    });
  const loadPct = (inputs.loadW / capacityW) * 100;
  const designPct = (inputs.designW / capacityW) * 100;
  const marks: { pct: number; mark: 'load' | 'design' }[] = [{ pct: loadPct, mark: 'load' }];
  if (Math.abs(designPct - loadPct) > 0.05) marks.push({ pct: designPct, mark: 'design' });
  const rows = [
    ...at(STEPS).map((p) => ({ ...p })),
    ...marks.map(({ pct, mark }) => ({ ...at([pct])[0]!, mark })),
  ].sort((a, b) => a.loadPct - b.loadPct);
  const maxPct = Math.max(100, Math.ceil(designPct / 5) * 5);
  const curve = at(Array.from({ length: maxPct / 5 - 1 }, (_, i) => (i + 2) * 5));
  return { rows, curve, capacityW };
}
