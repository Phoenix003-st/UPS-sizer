/** Types du résultat du moteur (non sauvegardé : toujours recalculé depuis le projet). */
import type { Chemistry, Technology } from '../catalog/schemas';
import type { Redundancy } from '../settings/schema';
import type { FormFactorChoice, Tier, Wall } from './project';
import type { CalcTrace } from './trace';

export type AlertLevel = 'ok' | 'warn' | 'block';

/** Alerte standardisée ; le message est traduit par l'interface : `t('alert.<code>', params)`. */
export interface Alert {
  level: AlertLevel;
  code: string;
  params: Record<string, number | string>;
}

export interface NormalizedInputs {
  /** Charge réelle (sans marge), W et VA. */
  loadW: number;
  loadVA: number;
  /** Charge de dimensionnement (avec marge d'extension), W et VA. */
  designW: number;
  designVA: number;
  growthMargin: number;
  outputPf: number;
  targetLoadRate: number;
  /** Phases de sortie (charge). */
  phases: 1 | 3;
  /** Phases d'entrée (redresseur) : 3 en tri/mono, sinon égales aux phases de sortie. */
  inputPhases: 1 | 3;
  /** Format d'UPS demandé par l'utilisateur. */
  formFactor: FormFactorChoice;
  /** Tension utilisée pour les courants : phase-neutre en mono, entre phases en tri. */
  voltageV: number;
  freqHz: 50 | 60;
  redundancy: Redundancy;
  autonomyMin: number;
  /** Coefficient de déclassement en altitude (1 = aucun). */
  kAltitude: number;
  technologies: Technology[];
  eodVpc: number;
  floorLoadKgM2: number;
}

export interface UpsConfig {
  modelId: string;
  reference: string;
  technology: Technology;
  /** Nombre de systèmes indépendants (2 en 2N). */
  systems: 1 | 2;
  /** Unités (ou châssis pour un modulaire) par système. */
  unitsPerSystem: number;
  /** Unités nécessaires sans redondance, par système. */
  unitsN: number;
  /** Total des unités (ou châssis). */
  units: number;
  /** Modulaire : modules par système, modules N par système et répartition par châssis. */
  modulesPerSystem?: number;
  modulesN?: number;
  modulesPerFrame?: number[];
  redundancy: Redundancy;
  /** Taux de charge de dimensionnement (sur les unités N, pire cas). */
  loadRate: number;
  /** Taux de charge en fonctionnement normal (charge partagée entre toutes les unités). */
  normalLoadRate: number;
  /** Puissance utile (N) d'un système, après déclassement, W et VA. */
  capacityW: number;
  capacityVA: number;
  /** Puissance installée totale (toutes unités, tous systèmes), VA. */
  installedVA: number;
  /** Rendement en fonctionnement normal au taux de charge réel. */
  efficiency: number;
}

export interface BatterySet {
  /** Système (A/B) et unités couvertes par ce jeu de batteries. */
  system: 'A' | 'B';
  unitsCovered: number;
  /** Puissance de sortie que ce jeu doit soutenir (dimensionnement), W. */
  designPowerW: number;
}

export interface BatterySolution {
  blockId: string;
  blockReference: string;
  chemistry: Chemistry;
  blockV: number;
  capacityAh: number;
  blocksPerString: number;
  /** Éléments par chaîne (blocs × éléments par bloc). */
  cellsPerString: number;
  /** Chaînes par jeu de batteries. */
  strings: number;
  internalStrings: number;
  location: 'internal' | 'cabinet';
  /** Armoires ou modules externes, par jeu de batteries. */
  cabinets: { id: string; reference: string; qty: number }[];
  /** Nombre de jeux de batteries identiques (un par unité, par châssis ou par système). */
  sets: number;
  setDetails: BatterySet[];
  eodVpc: number;
  /** Autonomie de dimensionnement (fin de vie, avec tous les facteurs), min. */
  autonomyMin: number;
  /** Autonomie estimée avec batteries neuves à la charge réelle, min. */
  autonomyNewMin: number;
  /** Vrai si l'autonomie dépasse la table de décharge (valeur = borne inférieure). */
  autonomyIsLowerBound: boolean;
  dcNominalV: number;
  /** Puissance demandée et disponible par élément au temps d'autonomie, W. */
  cellPowerRequiredW: number;
  cellPowerAvailableW: number;
  kAging: number;
  kTemp: number;
  kMargin: number;
  /** Totaux, tous jeux confondus. */
  totalBlocks: number;
  totalWh: number;
  totalWeightKg: number;
}

export interface CircuitResult {
  id: 'rectifier' | 'bypass' | 'output' | 'battery' | 'maintenanceBypass' | 'ats' | 'feeder';
  /** Système (A/B) concerné. */
  system: 'A' | 'B';
  /** Courant d'emploi Ib, A. */
  currentA: number;
  /** Calibre normalisé In, A (null si hors série). */
  breakerA: number | null;
  poles: number;
  dc: boolean;
  lengthM: number;
  cable: CableResult | null;
  qty: number;
}

export interface CableResult {
  sectionMm2: number;
  parallel: number;
  /** Courant admissible corrigé Iz (toutes âmes en parallèle), A. */
  izA: number;
  voltageDropPct: number;
  maxVoltageDropPct: number;
  ok: boolean;
}

export interface ElectricalResult {
  voltageV: number;
  phases: 1 | 3;
  dcNominalV: number;
  unitOutputA: number;
  unitRectifierA: number;
  unitBatteryA: number;
  systemOutputA: number;
  circuits: CircuitResult[];
  generatorKVA: number | null;
}

export interface ThermalResult {
  upsLossesW: number;
  chargeLossesW: number;
  totalW: number;
  totalBtuH: number;
  hvacKW: number | null;
  /** Besoin de climatisation (dissipation de l'UPS et des batteries), kW. */
  requiredKW: number;
}

export interface VentilationResult {
  applicable: boolean;
  /** Débit d'air requis, m³/h. */
  flowM3h: number;
  /** Section libre d'entrée et de sortie d'air en ventilation naturelle, cm². */
  freeAreaCm2: number;
  cells: number;
  capacityAh: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutItem {
  id: string;
  kind: 'ups' | 'frame' | 'cabinet' | 'ebm';
  system: 'A' | 'B';
  refId: string;
  reference: string;
  /** Dimensions propres (L × P × H), mm. */
  w: number;
  d: number;
  h: number;
  weightKg: number;
  clearances: { front: number; rear: number; left: number; right: number; top: number };
  /** Position du coin haut-gauche de l'emprise dans le local, mm, et rotation (front vers le bas à 0°). */
  x: number;
  y: number;
  rot: 0 | 90 | 180 | 270;
  /** Emprise au sol après rotation. */
  body: Rect;
  /** Zones de dégagement après rotation (avant, arrière, côtés). */
  zones: { side: 'front' | 'rear' | 'left' | 'right'; rect: Rect }[];
  rackUnits?: number | null;
}

export interface LayoutResult {
  room: { lengthMm: number; widthMm: number; heightMm: number };
  door: { wall: Wall; offsetMm: number; widthMm: number; heightMm: number };
  items: LayoutItem[];
  /** Emprise des équipements seuls et avec dégagements, m². */
  equipmentAreaM2: number;
  footprintWithClearancesM2: number;
  roomAreaM2: number;
  remainingAreaM2: number;
  /** Manque de place par axe, mm (0 si ça tient). */
  missingMm: { length: number; width: number; height: number };
  fits: boolean;
  /** Équipements en chevauchement (identifiants), après glisser-déposer. */
  collisions: [string, string][];
  door_check: {
    ok: boolean;
    missingWidthMm: number;
    missingHeightMm: number;
    worstItemId: string | null;
  };
  floor: {
    admissibleKgM2: number;
    maxConcentratedKgM2: number;
    maxDistributedKgM2: number;
    worstItemId: string | null;
    totalWeightKg: number;
  };
  rackUnitsTotal: number;
}

export interface BomLine {
  id: string;
  category:
    | 'ups'
    | 'module'
    | 'frame'
    | 'battery'
    | 'cabinet'
    | 'breaker'
    | 'bypass'
    | 'ats'
    | 'cable'
    | 'option';
  reference: string;
  /** Clé de traduction de la désignation et ses paramètres. */
  labelKey: string;
  params: Record<string, number | string>;
  qty: number;
  unit: 'pcs' | 'm';
  sample: boolean;
  /** Prix unitaire, laissé vide (à compléter). */
  unitPrice: null;
}

/** Niveau d'une option : l'une des trois mises en avant, ou une autre configuration possible. */
export type OptionTier = Tier | 'alternative';

export interface SolutionOption {
  tier: OptionTier;
  /** Identifiant stable de la configuration : « modèle|chimie ». */
  key: string;
  ups: UpsConfig;
  battery: BatterySolution;
  electrical: ElectricalResult;
  thermal: ThermalResult;
  ventilation: VentilationResult;
  layout: LayoutResult;
  bom: BomLine[];
  alerts: Alert[];
  /** Pire niveau d'alerte de l'option. */
  status: AlertLevel;
  score: number;
  /** Données d'affichage : bruit, format, références des fiches d'exemple. */
  display: {
    formFactor: string;
    noiseDb: number | null;
    sample: boolean;
    totalWeightKg: number;
    dimensionsSummary: { w: number; d: number; h: number };
  };
  traces: Record<string, CalcTrace>;
}

export interface SizingResult {
  inputs: NormalizedInputs;
  options: SolutionOption[];
  /** Autres configurations possibles (une par gamme et format), de la plus adaptée à la moins. */
  alternatives: SolutionOption[];
  globalAlerts: Alert[];
  traces: Record<string, CalcTrace>;
}
