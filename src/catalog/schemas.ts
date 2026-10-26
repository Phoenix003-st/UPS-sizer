/**
 * Schémas Zod des catalogues (UPS, batteries, armoires, bibliothèque d'équipements).
 *
 * Un catalogue importé ou modifié dans l'éditeur est validé ici avant d'être utilisé par le
 * moteur : une saisie incorrecte est refusée avec un message qui indique le chemin du champ fautif
 * (par exemple `models.3.power.kW`). Unités internes : mm, kg, V, A, °C ; puissances en kVA / kW
 * dans les fiches (comme sur les fiches constructeur), converties en W par le moteur.
 */
import { z } from 'zod';

const pos = z.number().positive();
const nonNeg = z.number().nonnegative();
const ratio = z.number().gt(0).lte(1);

export const technologySchema = z.enum([
  'line_interactive',
  'online_performance',
  'online_double_conversion',
  'modular',
]);
export type Technology = z.infer<typeof technologySchema>;
export const TECHNOLOGIES = technologySchema.options;

export const formFactorSchema = z.enum(['tower', 'rack', 'tower_rack', 'cabinet']);
export type FormFactor = z.infer<typeof formFactorSchema>;

export const dimensionsSchema = z.object({ w: pos, d: pos, h: pos });
export type Dimensions = z.infer<typeof dimensionsSchema>;

export const clearancesSchema = z.object({
  front: nonNeg,
  rear: nonNeg,
  left: nonNeg,
  right: nonNeg,
  top: nonNeg,
});
export type Clearances = z.infer<typeof clearancesSchema>;

/** Fiche publique qui a inspiré une fiche d'exemple (marque, modèle, URL). */
export const sourceSchema = z.object({
  brand: z.string(),
  model: z.string(),
  url: z.string(),
  note: z.string().optional(),
});
export type Source = z.infer<typeof sourceSchema>;

const metaSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.string(),
  sample: z.boolean(),
  notice: z.string().optional(),
});

// ───────────────────────────── UPS ─────────────────────────────

export const efficiencyPointSchema = z.object({ load: ratio, eta: ratio });

export const modularSchema = z.object({
  moduleKVA: pos,
  moduleKW: pos,
  /** Nombre maximal de modules par châssis. */
  maxModules: z.number().int().positive(),
  frameMaxKVA: pos,
  moduleWeightKg: nonNeg,
  emptyFrameWeightKg: pos,
  /** Nombre maximal de châssis en parallèle. */
  frameParallelMax: z.number().int().positive(),
});
export type ModularSpec = z.infer<typeof modularSchema>;

export const upsModelSchema = z
  .object({
    id: z.string().min(1),
    sample: z.boolean().default(false),
    /** Marque (InfoSec, APC, Eaton…) ; vide pour les fiches d'exemple. */
    brand: z.string().default(''),
    /** Référence commerciale du fabricant (code article), telle qu'imprimée au catalogue. */
    partNumber: z.string().default(''),
    reference: z.string().min(1),
    range: z.string(),
    technology: technologySchema,
    formFactor: formFactorSchema,
    rackUnits: z.number().int().positive().nullable().default(null),
    power: z.object({ kVA: pos, kW: pos, pf: ratio }),
    phases: z.object({
      in: z.union([z.literal(1), z.literal(3)]),
      out: z.union([z.literal(1), z.literal(3)]),
    }),
    voltages: z.object({ out: z.array(pos).min(1), freqHz: z.array(pos).min(1) }),
    efficiency: z.object({
      /** Courbe de rendement en mode normal selon le taux de charge (0–1). */
      online: z.array(efficiencyPointSchema).min(1),
      eco: ratio.nullable().default(null),
      /** Rendement onduleur seul (DC → AC), utilisé pour la puissance demandée aux batteries. */
      battery: ratio,
    }),
    dimensionsMm: dimensionsSchema,
    /** Masse avec batteries internes le cas échéant ; pour un modulaire : châssis vide (voir `modular`). */
    weightKg: pos,
    clearancesMm: clearancesSchema,
    ip: z.string().default('IP20'),
    ambientC: z.object({ min: z.number(), max: z.number() }),
    noiseDb: z.number().nullable().default(null),
    battery: z.object({
      blockVoltage: pos,
      blocksPerString: z.object({
        allowed: z.array(z.number().int().positive()).min(1),
        default: z.number().int().positive(),
      }),
      internal: z
        .object({
          blockId: z.string(),
          blocks: z.number().int().positive(),
          strings: z.number().int().positive(),
        })
        .nullable()
        .default(null),
      maxChargeCurrentA: pos,
      compatibleCabinetIds: z.array(z.string()).default([]),
      /** Batterie commune possible quand plusieurs unités sont en parallèle. */
      sharedBattery: z.boolean().default(false),
      /** Nombre maximal d'armoires ou de modules batteries externes par jeu de batteries. */
      maxExternalCabinets: z.number().int().positive().default(4),
    }),
    heatDissipationW: z.number().nullable().default(null),
    parallel: z.object({ capable: z.boolean(), maxUnits: z.number().int().positive() }),
    modular: modularSchema.nullable().default(null),
    /** Indice de prix relatif (facultatif) ; à défaut le moteur utilise la puissance installée. */
    priceIndex: z.number().positive().optional(),
    datasheetUrl: z.string().default(''),
    source: sourceSchema.optional(),
    /**
     * Données absentes du catalogue constructeur et estimées : `weight`, `efficiency`,
     * `internalBattery`, `batteryVoltage`, `chargeCurrent`.
     */
    estimated: z.array(z.string()).default([]),
  })
  .superRefine((m, ctx) => {
    if (m.technology === 'modular' && !m.modular) {
      ctx.addIssue({
        code: 'custom',
        path: ['modular'],
        message: 'Bloc « modular » requis pour un UPS modulaire',
      });
    }
    if (!m.battery.blocksPerString.allowed.includes(m.battery.blocksPerString.default)) {
      ctx.addIssue({
        code: 'custom',
        path: ['battery', 'blocksPerString', 'default'],
        message: 'La valeur par défaut doit figurer dans la liste « allowed »',
      });
    }
    if (m.power.kW > m.power.kVA * 1.0001) {
      ctx.addIssue({
        code: 'custom',
        path: ['power', 'kW'],
        message: 'kW ne peut pas dépasser kVA',
      });
    }
  });
export type UpsModel = z.infer<typeof upsModelSchema>;

/** Désignation affichée : désignation commerciale suivie de la référence produit quand elle existe. */
export function displayReference(m: { reference: string; partNumber?: string }): string {
  return m.partNumber ? `${m.reference} — réf. ${m.partNumber}` : m.reference;
}

export const upsCatalogSchema = z
  .object({ meta: metaSchema, models: z.array(upsModelSchema) })
  .superRefine((c, ctx) => checkUniqueIds(c.models, ['models'], ctx));
export type UpsCatalog = z.infer<typeof upsCatalogSchema>;

// ───────────────────────────── Batteries ─────────────────────────────

export const chemistrySchema = z.enum(['VRLA_AGM', 'VRLA_GEL', 'LI_LFP']);
export type Chemistry = z.infer<typeof chemistrySchema>;

export const dischargePointSchema = z.object({ min: pos, W: pos });
export const dischargeTableSchema = z.object({
  /** Tension de fin de décharge, en V par élément. */
  eodVpc: pos,
  points: z.array(dischargePointSchema).min(2),
});

export const batteryBlockSchema = z.object({
  id: z.string().min(1),
  sample: z.boolean().default(false),
  reference: z.string().min(1),
  chemistry: chemistrySchema,
  nominalV: pos,
  cells: z.number().int().positive(),
  capacityAh: pos,
  capacityRate: z.string().default('C10'),
  dimensionsMm: dimensionsSchema,
  weightKg: pos,
  designLifeYears: pos,
  /** Tension de floating par élément (V), pour les pertes de recharge. */
  floatVpc: pos.optional(),
  discharge: z.object({
    /** Tables à puissance constante, exprimées par élément ou par bloc. */
    unit: z.enum(['W_per_cell', 'W_per_block']),
    refTempC: z.number().default(25),
    tables: z.array(dischargeTableSchema).min(1),
  }),
  /** Coefficient de capacité selon la température (1 à la température de référence). */
  tempCorrection: z.array(z.object({ tC: z.number(), k: pos })).min(1),
  source: sourceSchema.optional(),
});
export type BatteryBlock = z.infer<typeof batteryBlockSchema>;

export const batteryCabinetSchema = z.object({
  id: z.string().min(1),
  sample: z.boolean().default(false),
  brand: z.string().default(''),
  partNumber: z.string().default(''),
  reference: z.string().min(1),
  /** `ebm` = module batteries externe (format tour / rack) des petits UPS. */
  kind: z.enum(['cabinet', 'ebm']).default('cabinet'),
  dimensionsMm: dimensionsSchema,
  emptyWeightKg: nonNeg,
  clearancesMm: clearancesSchema,
  capacity: z
    .array(z.object({ blockId: z.string(), maxBlocks: z.number().int().positive() }))
    .min(1),
  breakerA: pos.nullable().default(null),
  source: sourceSchema.optional(),
});
export type BatteryCabinet = z.infer<typeof batteryCabinetSchema>;

export const batteryCatalogSchema = z
  .object({
    meta: metaSchema,
    blocks: z.array(batteryBlockSchema),
    cabinets: z.array(batteryCabinetSchema),
  })
  .superRefine((c, ctx) => {
    checkUniqueIds(c.blocks, ['blocks'], ctx);
    checkUniqueIds(c.cabinets, ['cabinets'], ctx);
    const blockIds = new Set(c.blocks.map((b) => b.id));
    c.cabinets.forEach((cab, i) =>
      cab.capacity.forEach((cap, j) => {
        if (!blockIds.has(cap.blockId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['cabinets', i, 'capacity', j, 'blockId'],
            message: `Bloc inconnu : ${cap.blockId}`,
          });
        }
      }),
    );
  });
export type BatteryCatalog = z.infer<typeof batteryCatalogSchema>;

// ───────────────────────────── Équipements ─────────────────────────────

export const equipmentCategorySchema = z.enum([
  'cctv',
  'network',
  'it',
  'office',
  'building',
  'other',
]);
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;

export const equipmentItemSchema = z.object({
  id: z.string().min(1),
  category: equipmentCategorySchema,
  label: z.object({ fr: z.string(), en: z.string().optional(), ar: z.string().optional() }),
  defaultW: pos,
  rangeW: z.tuple([pos, pos]).optional(),
  pf: ratio.default(0.9),
  /** Unité d'affichage préférée. */
  unit: z.enum(['W', 'kW']).default('W'),
});
export type EquipmentItem = z.infer<typeof equipmentItemSchema>;

export const equipmentLibrarySchema = z
  .array(equipmentItemSchema)
  .superRefine((items, ctx) => checkUniqueIds(items, [], ctx));
export type EquipmentLibrary = z.infer<typeof equipmentLibrarySchema>;

export interface Catalogs {
  ups: UpsCatalog;
  batteries: BatteryCatalog;
  equipment: EquipmentLibrary;
}

// ───────────────────────────── Utilitaires ─────────────────────────────

function checkUniqueIds(items: { id: string }[], path: (string | number)[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  items.forEach((it, i) => {
    if (seen.has(it.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, i, 'id'],
        message: `Identifiant en double : ${it.id}`,
      });
    }
    seen.add(it.id);
  });
}

/** Met en forme les erreurs Zod, une ligne par champ fautif. */
export function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`);
}
