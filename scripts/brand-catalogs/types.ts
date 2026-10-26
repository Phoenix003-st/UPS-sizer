/**
 * Format compact des fiches relevées dans les catalogues constructeurs (voir build.ts).
 *
 * Seules les valeurs imprimées au catalogue sont saisies ici ; tout ce qui manque est complété par
 * build.ts avec des valeurs types, et listé dans `estimated` de la fiche générée.
 */
import type { FormFactor, Technology } from '../../src/catalog/schemas';

/** Autonomie lue au catalogue : à un taux de charge (0–1) ou à une puissance de sortie (W). */
export type Runtime = { load: number; min: number } | { W: number; min: number };

/** Module batteries externe vendu par la marque (référence réelle, contenu estimé). */
export interface EbmSpec {
  partNumber: string;
  name: string;
  /** Tension batterie, en blocs de 12 V par chaîne. */
  bps: number;
  /** Chaînes par module (estimé à 2 si le catalogue ne le dit pas). */
  strings?: number;
  /** Largeur × profondeur × hauteur (mm) ; à défaut, celles de l'UPS. */
  dims?: [number, number, number];
  kg?: number;
}

export interface Entry {
  /** Référence produit (code article) imprimée au catalogue ; vide si absente. */
  partNumber: string;
  /** Désignation commerciale, sans la marque. */
  name: string;
  range: string;
  tech: Technology;
  ff: FormFactor;
  ru?: number;
  kva: number;
  kw: number;
  phIn?: 1 | 3;
  phOut?: 1 | 3;
  /** Largeur × profondeur × hauteur (mm). */
  dims: [number, number, number];
  kg?: number;
  noise?: number;
  /** Rendement à pleine charge en double conversion, s'il est publié. */
  effFull?: number;
  heatW?: number;
  ambientMax?: number;
  voltages?: number[];
  /** Autonomie publiée avec les batteries d'origine (sert à estimer les batteries internes). */
  runtime?: Runtime;
  /** Blocs de 12 V par chaîne si la tension batterie est publiée. */
  bps?: number;
  /** Batterie interne publiée (bloc générique le plus proche, nombre de blocs, chaînes). */
  internal?: { blockId: string; blocks: number; strings: number };
  /** false : pas de batterie interne (armoires externes). */
  hasInternal?: boolean;
  /** Tensions batteries possibles pour les armoires externes (blocs par chaîne). */
  bpsAllowed?: number[];
  extendable?: boolean;
  ebm?: EbmSpec;
  parallel?: number;
  modular?: { moduleKVA: number; moduleKW: number; maxModules: number; moduleKg?: number };
  /** Page du catalogue. */
  page: number;
  /** Remarques sur la fiche (incohérences du catalogue, hypothèses). */
  notes?: string[];
}

export interface BrandData {
  /** Clé courte (infosec, apc, eaton). */
  key: string;
  brand: string;
  idPrefix: string;
  catalog: { title: string; url: string };
  entries: Entry[];
}
