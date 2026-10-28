/**
 * Modèle de projet (fichier exporté `*.ups.json`) : schéma Zod et projet par défaut.
 * Unités : mm, kg, W, min, °C ; la puissance saisie en mode rapide est en kW ou kVA.
 */
import { z } from 'zod';
import {
  redundancySchema,
  scenarioIdSchema,
  type ScenarioId,
  type Settings,
} from '../settings/schema';

export const tierSchema = z.enum(['economy', 'recommended', 'performance']);
export type Tier = z.infer<typeof tierSchema>;
export const TIERS = tierSchema.options;

/** Alimentation : monophasé (1/1), triphasé (3/3) ou entrée triphasée et sortie monophasée (3/1). */
export const phaseChoiceSchema = z.union([
  z.literal('auto'),
  z.literal(1),
  z.literal(3),
  z.literal('3/1'),
]);
export type PhaseChoice = z.infer<typeof phaseChoiceSchema>;

/** Format d'UPS demandé : tour (posé au sol), rack 19", modulaire, ou laissé au choix du moteur. */
export const formFactorChoiceSchema = z.enum(['auto', 'tower', 'rack', 'modular']);
export type FormFactorChoice = z.infer<typeof formFactorChoiceSchema>;

export const roomKindSchema = z.enum(['dedicated', 'shared', 'office', 'rack']);
export type RoomKind = z.infer<typeof roomKindSchema>;

export const wallSchema = z.enum(['top', 'bottom', 'left', 'right']);
export type Wall = z.infer<typeof wallSchema>;

const loadItemSchema = z.object({
  libId: z.string(),
  qty: z.number().int().nonnegative(),
  unitW: z.number().nonnegative(),
  pf: z.number().gt(0).lte(1).optional(),
});
export type LoadItem = z.infer<typeof loadItemSchema>;

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string(),
  client: z.string().default(''),
  author: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
  catalogVersion: z.string().default(''),
  scenario: scenarioIdSchema,
  load: z.object({
    mode: z.enum(['quick', 'assisted']),
    value: z.number().nonnegative(),
    unit: z.enum(['kW', 'kVA']),
    items: z.array(loadItemSchema).default([]),
  }),
  autonomyMin: z.number().positive(),
  advanced: z.object({
    outputPf: z.number().gt(0).lte(1),
    growthMargin: z.number().min(0).max(2),
    targetLoadRate: z.number().gt(0).lte(1),
    phases: phaseChoiceSchema,
    formFactor: formFactorChoiceSchema.default('auto'),
    voltage: z.number().positive(),
    freqHz: z.union([z.literal(50), z.literal(60)]),
    redundancy: redundancySchema,
    batteryChemistry: z.enum(['auto', 'VRLA', 'LI']),
    eodVpc: z.number().positive().nullable(),
  }),
  room: z.object({
    lengthMm: z.number().positive(),
    widthMm: z.number().positive(),
    heightMm: z.number().positive(),
    door: z.object({
      widthMm: z.number().positive(),
      heightMm: z.number().positive(),
      wall: wallSchema.default('bottom'),
      offsetMm: z.number().nonnegative().default(300),
    }),
    /** null = inconnue : la valeur par défaut des paramètres est utilisée. */
    floorLoadKgM2: z.number().positive().nullable(),
    ambientC: z.number(),
    humidityPct: z.number().min(0).max(100),
    altitudeM: z.number().min(0),
    hvac: z.object({ present: z.boolean(), kW: z.number().nonnegative() }),
    raisedFloor: z.boolean(),
    kind: roomKindSchema,
  }),
  installation: z.object({
    generator: z.boolean(),
    externalMaintenanceBypass: z.boolean(),
    cableLengthsM: z
      .object({
        input: z.number().positive(),
        bypass: z.number().positive(),
        output: z.number().positive(),
        battery: z.number().positive(),
      })
      .nullable(),
  }),
  choice: z.object({
    tier: tierSchema,
    /** Configuration choisie hors des trois options (identifiant « modèle|chimie »). */
    key: z.string().optional(),
    overrides: z.record(z.string(), z.unknown()).default({}),
    /** Marques retenues pour la sélection ; vide = toutes les marques du catalogue. */
    brands: z.array(z.string()).default([]),
  }),
  layout: z.object({
    positions: z
      .record(
        z.string(),
        z.object({
          x: z.number(),
          y: z.number(),
          rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
        }),
      )
      .default({}),
  }),
  settingsOverrides: z.record(z.string(), z.unknown()).default({}),
});
export type Project = z.infer<typeof projectSchema>;

/** Valeurs par défaut du local selon le type d'installation. */
const ROOM_PRESETS: Record<ScenarioId, Partial<Project['room']>> = {
  cctv: { lengthMm: 3000, widthMm: 2500, kind: 'shared', hvac: { present: false, kW: 0 } },
  office: { lengthMm: 4000, widthMm: 3000, kind: 'office', hvac: { present: true, kW: 3.5 } },
  server: {
    lengthMm: 5000,
    widthMm: 4000,
    kind: 'dedicated',
    hvac: { present: true, kW: 10 },
    door: { widthMm: 1000, heightMm: 2100, wall: 'bottom', offsetMm: 300 },
  },
  datacenter: {
    lengthMm: 10000,
    widthMm: 6000,
    kind: 'dedicated',
    hvac: { present: true, kW: 40 },
    raisedFloor: true,
    door: { widthMm: 1400, heightMm: 2200, wall: 'bottom', offsetMm: 500 },
  },
  airport: {
    lengthMm: 8000,
    widthMm: 5000,
    kind: 'dedicated',
    hvac: { present: true, kW: 25 },
    door: { widthMm: 1400, heightMm: 2200, wall: 'bottom', offsetMm: 500 },
  },
  building: { lengthMm: 4000, widthMm: 3000, kind: 'dedicated', hvac: { present: false, kW: 0 } },
  custom: { lengthMm: 5000, widthMm: 4000, kind: 'dedicated', hvac: { present: true, kW: 10 } },
};

/** Puissance par défaut (kW) selon le type d'installation. */
const LOAD_PRESETS: Record<ScenarioId, number> = {
  cctv: 0.8,
  office: 1.5,
  server: 8,
  datacenter: 200,
  airport: 120,
  building: 15,
  custom: 10,
};

/** Crée un projet complet avec des valeurs par défaut intelligentes pour le scénario choisi. */
export function createProject(
  scenario: ScenarioId,
  settings: Settings,
  opts: { id?: string; now?: string; name?: string } = {},
): Project {
  const now = opts.now ?? new Date().toISOString();
  const sc = settings.scenarios[scenario];
  const preset = ROOM_PRESETS[scenario];
  const large = LOAD_PRESETS[scenario] > settings.power.monoToTriThresholdKVA;
  return {
    schemaVersion: 1,
    id: opts.id ?? randomId(),
    name: opts.name ?? '',
    client: '',
    author: '',
    createdAt: now,
    updatedAt: now,
    catalogVersion: '',
    scenario,
    load: { mode: 'quick', value: LOAD_PRESETS[scenario], unit: 'kW', items: [] },
    autonomyMin: sc.autonomyMin,
    advanced: {
      outputPf: settings.power.defaultPf,
      growthMargin: settings.power.growthMargin,
      targetLoadRate: settings.power.targetLoadRate,
      phases: 'auto',
      formFactor: 'auto',
      voltage: large ? 400 : 230,
      freqHz: 50,
      redundancy: sc.redundancy,
      batteryChemistry: 'auto',
      eodVpc: null,
    },
    room: {
      lengthMm: 5000,
      widthMm: 4000,
      heightMm: settings.room.defaultHeightMm,
      door: { widthMm: 900, heightMm: 2100, wall: 'bottom', offsetMm: 300 },
      floorLoadKgM2: null,
      ambientC: 25,
      humidityPct: 50,
      altitudeM: 0,
      hvac: { present: true, kW: 10 },
      raisedFloor: false,
      kind: 'dedicated',
      ...preset,
    },
    installation: { generator: false, externalMaintenanceBypass: large, cableLengthsM: null },
    choice: { tier: 'recommended', overrides: {}, brands: [] },
    layout: { positions: {} },
    settingsOverrides: {},
  };
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
