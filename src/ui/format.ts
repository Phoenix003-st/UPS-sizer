/** Mise en forme localisée des nombres et des alertes du moteur. */
import type { TFunction } from 'i18next';
import type { Alert } from '../engine/types';

/** Locale de formatage : chiffres latins en arabe (usage technique, cohérent avec les formules). */
export function numberLocale(lang: string): string {
  return lang.startsWith('ar') ? 'ar-u-nu-latn' : lang;
}

/** Date courte au format de la langue. */
export function formatDate(iso: string, lang: string, withTime = false): string {
  const d = new Date(iso);
  return withTime ? d.toLocaleString(numberLocale(lang)) : d.toLocaleDateString(numberLocale(lang));
}

export function formatNumber(n: number, lang: string, maxDigits = 2, minDigits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(numberLocale(lang), {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: minDigits,
  }).format(n);
}

/** Pourcentage à partir d'un ratio (0,8 → « 80 % »). */
export function formatPct(ratio: number, lang: string, digits = 0): string {
  return new Intl.NumberFormat(numberLocale(lang), {
    style: 'percent',
    maximumFractionDigits: digits,
  }).format(ratio);
}

/** Message traduit d'une alerte, nombres au format local et axe traduit. */
export function alertMessage(t: TFunction, alert: Alert, lang: string): string {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(alert.params)) {
    params[k] = typeof v === 'number' ? formatNumber(v, lang) : k === 'axis' ? t(`axis.${v}`) : v;
  }
  return t(`alert.${alert.code}`, params);
}

/** Libellé traduit d'une étape de calcul (la clé elle-même à défaut). */
export function traceLabel(t: TFunction, key: string): string {
  return t(key, { defaultValue: key });
}

/** Ordre d'affichage des traces de calcul. */
export const TRACE_ORDER = [
  'load',
  'phases',
  'environment',
  'selection',
  'modular',
  'battery',
  'electrical',
  'thermal',
  'ventilation',
  'layout',
];
