/**
 * Agrégation des alertes : codes standardisés → vert (ok) / orange (warn) / rouge (block).
 * Le texte est traduit par l'interface (`alert.<code>`), avec les paramètres de l'alerte.
 */
import type { Alert, AlertLevel } from './types';

const RANK: Record<AlertLevel, number> = { ok: 0, warn: 1, block: 2 };

/** Pire niveau d'une liste d'alertes (ok si vide). */
export function worstLevel(alerts: Alert[]): AlertLevel {
  let worst: AlertLevel = 'ok';
  for (const a of alerts) if (RANK[a.level] > RANK[worst]) worst = a.level;
  return worst;
}

/** Trie par gravité décroissante et supprime les doublons (même code et mêmes paramètres). */
export function normalizeAlerts(alerts: Alert[]): Alert[] {
  const seen = new Set<string>();
  const out: Alert[] = [];
  for (const a of alerts) {
    const key = `${a.code}|${JSON.stringify(a.params)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out.sort((a, b) => RANK[b.level] - RANK[a.level]);
}
