import type { BomLine } from '../../engine/types';

/** Désignation traduite d'une ligne de nomenclature. */
export function bomDesignation(
  t: (k: string, o?: Record<string, unknown>) => string,
  l: BomLine,
): string {
  const params: Record<string, unknown> = { ...l.params };
  if (typeof params.chemistry === 'string') params.chemistry = t(`chemistry.${params.chemistry}`);
  return t(l.labelKey, params);
}
