/**
 * Paramètres et hypothèses de calcul, tous modifiables dans l'écran « Paramètres ».
 * Les valeurs par défaut sont dans `defaults.json` et documentées dans `docs/HYPOTHESES.md`.
 */
import { z } from 'zod';
import { technologySchema } from '../catalog/schemas';
import defaultsJson from './defaults.json';

const pos = z.number().positive();
const ratio = z.number().gt(0).lte(1);

export const redundancySchema = z.enum(['N', 'N+1', '2N']);
export type Redundancy = z.infer<typeof redundancySchema>;

export const scenarioIdSchema = z.enum([
  'cctv',
  'office',
  'server',
  'datacenter',
  'airport',
  'building',
  'custom',
]);
export type ScenarioId = z.infer<typeof scenarioIdSchema>;
export const SCENARIOS = scenarioIdSchema.options;

const scenarioSchema = z.object({
  autonomyMin: pos,
  /** Technologies autorisées ; « * » = toutes. */
  technologies: z.array(z.union([technologySchema, z.literal('*')])).min(1),
  redundancy: redundancySchema,
});

export const settingsSchema = z.object({
  schemaVersion: z.literal(1),
  power: z.object({
    growthMargin: z.number().min(0).max(2),
    targetLoadRate: ratio,
    defaultPf: ratio,
    monoToTriThresholdKVA: pos,
    altitudeDerating: z.array(z.object({ m: z.number(), k: ratio })).min(1),
  }),
  battery: z.object({
    agingFactor: z.number().min(1),
    agingFactorLithium: z.number().min(1),
    designMargin: z.number().min(1),
    defaultEodVpc: pos,
    shortAutonomyEodVpc: pos,
    shortAutonomyThresholdMin: pos,
    allowedEodVpc: z.array(pos).min(1),
    maxStrings: z.number().int().positive(),
    chargeEfficiency: ratio,
    floatVpc: pos,
    /** Courant de gaz en floating, mA par Ah (IEC 62485-2, VRLA : 1 mA/Ah). */
    gasCurrentMaPerAh: pos,
  }),
  room: z.object({
    defaultFloorLoadKgM2: pos,
    doorMarginMm: z.number().nonnegative(),
    recommendedTempC: z.tuple([z.number(), z.number()]),
    allowedTempC: z.tuple([z.number(), z.number()]),
    maxHumidityPct: pos,
    defaultHeightMm: pos,
    /** Au-delà de cette dissipation sans climatisation, une alerte est émise. */
    noHvacMaxW: pos,
    /** Masse en dessous de laquelle la charge au sol d'un équipement n'est pas contrôlée. */
    floorCheckMinWeightKg: z.number().nonnegative(),
    /** Seuil de bruit au-delà duquel un bureau ou local partagé déclenche une alerte. */
    officeNoiseWarnDb: pos,
  }),
  electrical: z.object({
    breakerSeriesA: z.array(pos).min(1),
    cable: z.object({
      material: z.literal('Cu'),
      insulation: z.literal('XLPE'),
      installMethod: z.literal('E'),
      ambientC: z.number(),
      groupingFactor: ratio,
      maxParallel: z.number().int().positive(),
    }),
    maxVoltageDropPct: z.object({ ac: pos, dc: pos }),
    defaultCableLengthsM: z.object({ input: pos, bypass: pos, output: pos, battery: pos }),
    inputPf: ratio,
    outputFeeders: z.number().int().positive(),
    generatorSizingFactor: z.number().min(1),
  }),
  selection: z.object({
    weights: z.object({
      efficiency: z.number().min(0),
      footprint: z.number().min(0),
      margin: z.number().min(0),
      price: z.number().min(0),
    }),
    maxOversizeFactor: z.number().min(1),
    /** Taux de charge considéré comme idéal (meilleur compromis rendement / réserve). */
    idealLoadRate: z.number().gt(0).lte(1),
  }),
  scenarios: z.object({
    cctv: scenarioSchema,
    office: scenarioSchema,
    server: scenarioSchema,
    datacenter: scenarioSchema,
    airport: scenarioSchema,
    building: scenarioSchema,
    custom: scenarioSchema,
  }),
});
export type Settings = z.infer<typeof settingsSchema>;

/** Paramètres par défaut validés au chargement (une erreur ici est un bug du dépôt). */
export const DEFAULT_SETTINGS: Settings = settingsSchema.parse(defaultsJson);

/** Copie profonde des paramètres par défaut (pour les modifier sans effet de bord). */
export function defaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}

type DeepPartial<T> = T extends unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
export type SettingsOverrides = DeepPartial<Settings>;

/** Fusionne des surcharges partielles sur des paramètres (les tableaux sont remplacés). */
export function mergeSettings(base: Settings, overrides: SettingsOverrides | undefined): Settings {
  if (!overrides) return base;
  return deepMerge(structuredClone(base), overrides) as Settings;
}

function deepMerge(target: unknown, src: unknown): unknown {
  if (src === undefined) return target;
  if (Array.isArray(src) || typeof src !== 'object' || src === null) return src;
  const t = (typeof target === 'object' && target !== null ? target : {}) as Record<
    string,
    unknown
  >;
  for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
    t[k] = deepMerge(t[k], v);
  }
  return t;
}
