/**
 * Familles d'équipements proposées d'abord selon le secteur choisi ; les autres familles restent
 * accessibles dans « Autres équipements ».
 */
import type { EquipmentCategory } from '../../catalog/schemas';
import type { ScenarioId } from '../../settings/schema';

export const SECTOR_CATEGORIES: Record<ScenarioId, EquipmentCategory[] | null> = {
  cctv: ['cctv', 'network', 'building'],
  office: ['office', 'network', 'it'],
  server: ['it', 'network'],
  datacenter: ['it', 'network', 'building'],
  airport: ['access', 'cctv', 'network', 'it', 'building'],
  building: ['building', 'access', 'cctv', 'network', 'office'],
  medical: ['medical', 'it', 'network', 'building'],
  industrial: ['industrial', 'network', 'it', 'building'],
  enterprise: ['network', 'it', 'office', 'access'],
  elevator: ['elevator', 'building', 'access'],
  // Personnalisé : toutes les familles.
  custom: null,
};

/** Sépare les familles présentes dans la bibliothèque en familles du secteur et autres familles. */
export function splitCategories(
  scenario: ScenarioId,
  available: EquipmentCategory[],
): { main: EquipmentCategory[]; others: EquipmentCategory[] } {
  const wanted = SECTOR_CATEGORIES[scenario];
  if (!wanted) return { main: available, others: [] };
  const main = wanted.filter((c) => available.includes(c));
  return { main, others: available.filter((c) => !main.includes(c)) };
}
