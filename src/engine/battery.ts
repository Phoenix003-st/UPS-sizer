/**
 * Batteries — méthode à puissance constante.
 *
 *   P_dc     = P_sortie ÷ η_onduleur
 *   P_élément = P_dc × k_vieillissement × k_température × k_marge ÷ (N_blocs × éléments × N_chaînes)
 *
 * La puissance disponible par élément au temps d'autonomie demandé est lue dans la table de
 * décharge du bloc (interpolation log-log), à la tension de fin de décharge choisie. Le moteur essaie
 * toutes les combinaisons (bloc, blocs par chaîne autorisés, chaînes 1…max) et retient la plus petite
 * solution qui atteint l'autonomie : énergie installée minimale, puis moins d'armoires, puis moins de
 * chaînes. Pour un UPS à batteries internes : batteries internes seules, puis ajout de modules
 * batteries externes (EBM) contenant le même bloc.
 *
 * Correction de température : k_temp = 1 ÷ min(1, k(T)) — aucun crédit n'est pris au-dessus de la
 * température de référence (pratique IEEE 485 / IEC 62040-3).
 */
import type {
  BatteryBlock,
  BatteryCabinet,
  BatteryCatalog,
  Chemistry,
  UpsModel,
} from '../catalog/schemas';
import type { Settings } from '../settings/schema';
import { ceilSafe, interpLinear, interpLogLog, type XY } from './math';
import { fmt, trace, type Calc } from './trace';

export type ChemistryFamily = 'VRLA' | 'LI';

export function chemistryFamily(c: Chemistry): ChemistryFamily {
  return c === 'LI_LFP' ? 'LI' : 'VRLA';
}

export interface CellTable {
  eodVpc: number;
  /** x = minutes, y = W par élément, triés par temps croissant. */
  points: XY[];
}

/**
 * Table de décharge exprimée en W par élément, à la tension de fin de décharge la plus proche de
 * celle demandée (les blocs lithium n'ont en général qu'une table, à la tension du fabricant).
 */
export function dischargeTable(block: BatteryBlock, eodVpc: number): CellTable {
  const tables = block.discharge.tables;
  let best = tables[0]!;
  if (chemistryFamily(block.chemistry) === 'VRLA') {
    for (const tb of tables)
      if (Math.abs(tb.eodVpc - eodVpc) < Math.abs(best.eodVpc - eodVpc)) best = tb;
  }
  const div = block.discharge.unit === 'W_per_block' ? block.cells : 1;
  return {
    eodVpc: best.eodVpc,
    points: best.points.map((p) => ({ x: p.min, y: p.W / div })).sort((a, b) => a.x - b.x),
  };
}

/**
 * Puissance disponible par élément pendant `minutes`. Plus courte que la table : valeur du premier
 * point (prudent) ; plus longue que la table : null (autonomie non garantie).
 */
export function cellPowerAt(table: CellTable, minutes: number): number | null {
  const first = table.points[0]!;
  const last = table.points[table.points.length - 1]!;
  if (minutes <= first.x) return first.y;
  if (minutes > last.x * 1.000001) return null;
  return interpLogLog(table.points, minutes);
}

/** Autonomie (min) pour une puissance par élément ; au-delà de la table, borne inférieure. */
export function autonomyAt(
  table: CellTable,
  cellW: number,
): { minutes: number; lowerBound: boolean } {
  const last = table.points[table.points.length - 1]!;
  if (cellW <= last.y) return { minutes: last.x, lowerBound: true };
  // Inversion de la courbe log-log : on interpole le temps en fonction de la puissance
  // (au-delà du premier point, extrapolation avec le premier segment).
  const inv = table.points.map((p) => ({ x: p.y, y: p.x }));
  return { minutes: interpLogLog(inv, cellW), lowerBound: false };
}

/** Coefficient de correction de température (≥ 1). */
export function tempFactor(block: BatteryBlock, ambientC: number): number {
  const k = interpLinear(
    block.tempCorrection.map((p) => ({ x: p.tC, y: p.k })),
    ambientC,
  );
  return 1 / Math.min(1, k);
}

/** Tension nominale du bloc compatible avec celle attendue par l'UPS (à ±10 %). */
export function voltageCompatible(block: BatteryBlock, model: UpsModel): boolean {
  return Math.abs(block.nominalV - model.battery.blockVoltage) <= 0.1 * model.battery.blockVoltage;
}

export interface BatteryRequest {
  model: UpsModel;
  catalog: BatteryCatalog;
  settings: Settings;
  /** Puissance de sortie que le jeu de batteries doit soutenir (dimensionnement), W. */
  designPowerW: number;
  /** Puissance de sortie réelle (sans marge d'extension), W. */
  actualPowerW: number;
  autonomyMin: number;
  ambientC: number;
  chemistry: ChemistryFamily;
  eodVpc: number;
}

export interface BatteryCandidate {
  block: BatteryBlock;
  blocksPerString: number;
  strings: number;
  internalStrings: number;
  cabinet: { cab: BatteryCabinet; qty: number } | null;
  eodVpc: number;
  cellPowerRequiredW: number;
  cellPowerAvailableW: number;
  autonomyMin: number;
  autonomyNewMin: number;
  autonomyIsLowerBound: boolean;
  kAging: number;
  kTemp: number;
  kMargin: number;
  wh: number;
  blocks: number;
  weightKg: number;
}

/** Nombre d'armoires pour loger `strings` chaînes de `bps` blocs. */
export function cabinetsFor(strings: number, bps: number, maxBlocks: number): number {
  if (maxBlocks >= bps) return ceilSafe(strings / Math.floor(maxBlocks / bps));
  return strings * ceilSafe(bps / maxBlocks);
}

function evaluate(
  req: BatteryRequest,
  block: BatteryBlock,
  bps: number,
  strings: number,
  internalStrings: number,
  cabinet: { cab: BatteryCabinet; qty: number } | null,
): BatteryCandidate {
  const s = req.settings.battery;
  const table = dischargeTable(block, req.eodVpc);
  const kAging = chemistryFamily(block.chemistry) === 'LI' ? s.agingFactorLithium : s.agingFactor;
  const kTemp = tempFactor(block, req.ambientC);
  const kMargin = s.designMargin;
  const eta = req.model.efficiency.battery;
  const cells = bps * block.cells * strings;
  const pCell = ((req.designPowerW / eta) * kAging * kTemp * kMargin) / cells;
  const avail = cellPowerAt(table, req.autonomyMin);
  const aut = autonomyAt(table, pCell);
  const autNew = autonomyAt(table, ((req.actualPowerW / eta) * kTemp) / cells);
  const blocks = bps * strings;
  const extBlocks = bps * (strings - internalStrings);
  return {
    block,
    blocksPerString: bps,
    strings,
    internalStrings,
    cabinet,
    eodVpc: table.eodVpc,
    cellPowerRequiredW: pCell,
    cellPowerAvailableW: avail ?? 0,
    autonomyMin: aut.minutes,
    autonomyNewMin: autNew.minutes,
    autonomyIsLowerBound: aut.lowerBound,
    kAging,
    kTemp,
    kMargin,
    wh: blocks * block.nominalV * block.capacityAh,
    blocks,
    weightKg: extBlocks * block.weightKg + (cabinet ? cabinet.qty * cabinet.cab.emptyWeightKg : 0),
  };
}

function ok(c: BatteryCandidate, req: BatteryRequest): boolean {
  return (
    c.cellPowerAvailableW > 0 &&
    c.cellPowerRequiredW <= c.cellPowerAvailableW * (1 + 1e-9) &&
    c.autonomyMin >= req.autonomyMin - 1e-6
  );
}

function better(a: BatteryCandidate, b: BatteryCandidate): boolean {
  if (Math.abs(a.wh - b.wh) > 1e-6) return a.wh < b.wh;
  const ca = a.cabinet?.qty ?? 0;
  const cb = b.cabinet?.qty ?? 0;
  if (ca !== cb) return ca < cb;
  return a.strings < b.strings;
}

/** Toutes les solutions de batteries possibles pour un jeu (utilisé par sizeBattery et les tests). */
export function batteryCandidates(req: BatteryRequest): BatteryCandidate[] {
  const { model, catalog, settings } = req;
  const out: BatteryCandidate[] = [];
  const compatCabs = catalog.cabinets.filter((c) =>
    model.battery.compatibleCabinetIds.includes(c.id),
  );
  const maxCabs = model.battery.maxExternalCabinets;

  const internal = model.battery.internal;
  if (internal) {
    const block = catalog.blocks.find((b) => b.id === internal.blockId);
    if (!block) return out;
    out.push(evaluate(req, block, internal.blocks, internal.strings, internal.strings, null));
    for (const cab of compatCabs) {
      const cap = cab.capacity.find((c) => c.blockId === block.id);
      if (!cap) continue;
      const perCab = Math.floor(cap.maxBlocks / internal.blocks);
      if (perCab < 1) continue;
      for (let k = 1; k <= maxCabs; k++) {
        const c = evaluate(
          req,
          block,
          internal.blocks,
          internal.strings + k * perCab,
          internal.strings,
          { cab, qty: k },
        );
        out.push(c);
        if (ok(c, req)) break;
      }
    }
    return out;
  }

  for (const block of catalog.blocks) {
    if (chemistryFamily(block.chemistry) !== req.chemistry) continue;
    if (!voltageCompatible(block, model)) continue;
    const holders = compatCabs
      .map((cab) => ({ cab, cap: cab.capacity.find((c) => c.blockId === block.id) }))
      .filter(
        (h): h is { cab: BatteryCabinet; cap: { blockId: string; maxBlocks: number } } => !!h.cap,
      );
    if (holders.length === 0) continue;
    for (const bps of model.battery.blocksPerString.allowed) {
      for (let strings = 1; strings <= settings.battery.maxStrings; strings++) {
        // Armoire qui loge la configuration dans le moins d'armoires, puis la plus petite emprise.
        let bestCab: { cab: BatteryCabinet; qty: number } | null = null;
        for (const h of holders) {
          const qty = cabinetsFor(strings, bps, h.cap.maxBlocks);
          if (qty > maxCabs) continue;
          const area = qty * h.cab.dimensionsMm.w * h.cab.dimensionsMm.d;
          const bestArea = bestCab
            ? bestCab.qty * bestCab.cab.dimensionsMm.w * bestCab.cab.dimensionsMm.d
            : Infinity;
          if (!bestCab || qty < bestCab.qty || (qty === bestCab.qty && area < bestArea))
            bestCab = { cab: h.cab, qty };
        }
        if (!bestCab) continue;
        const c = evaluate(req, block, bps, strings, 0, bestCab);
        out.push(c);
        if (ok(c, req)) break; // plus de chaînes = plus d'énergie installée
      }
    }
  }
  return out;
}

/** Plus petite solution de batteries qui atteint l'autonomie, ou null. */
export function sizeBattery(req: BatteryRequest): Calc<BatteryCandidate | null> {
  const all = batteryCandidates(req).filter((c) => ok(c, req));
  let best: BatteryCandidate | null = null;
  for (const c of all) if (!best || better(c, best)) best = c;
  return { value: best, trace: batteryTrace(req, best) };
}

export function batteryTrace(req: BatteryRequest, c: BatteryCandidate | null) {
  const t = trace('calc.battery.title');
  const eta = req.model.efficiency.battery;
  const pdc = req.designPowerW / eta;
  t.step({
    label: 'calc.battery.pdc',
    formula: 'P_dc = P_sortie ÷ η_onduleur',
    substituted: `${fmt(req.designPowerW / 1000, 3)} kW ÷ ${fmt(eta, 3)}`,
    result: pdc / 1000,
    unit: 'kW',
  });
  if (!c) {
    t.step({ label: 'calc.battery.none', formula: '—', substituted: '—', result: '—', unit: '' });
    return t.build();
  }
  const cells = c.blocksPerString * c.block.cells * c.strings;
  t.step({
    label: 'calc.battery.cells',
    formula: 'N = N_blocs × éléments × N_chaînes',
    substituted: `${c.blocksPerString} × ${c.block.cells} × ${c.strings}`,
    result: cells,
    unit: '',
  })
    .step({
      label: 'calc.battery.factors',
      formula: 'k = k_vieill. × k_temp × k_marge',
      substituted: `${fmt(c.kAging)} × ${fmt(c.kTemp, 3)} × ${fmt(c.kMargin)}`,
      result: Number((c.kAging * c.kTemp * c.kMargin).toFixed(3)),
      unit: '',
    })
    .step({
      label: 'calc.battery.pcell',
      formula: 'P_élément = P_dc × k ÷ N',
      substituted: `${fmt(pdc, 0)} W × ${fmt(c.kAging * c.kTemp * c.kMargin, 3)} ÷ ${cells}`,
      result: Number(c.cellPowerRequiredW.toFixed(1)),
      unit: 'W',
    })
    .step({
      label: 'calc.battery.available',
      formula: `table(${fmt(req.autonomyMin)} min, ${fmt(c.eodVpc)} V/él.)`,
      substituted: `${c.block.reference}`,
      result: Number(c.cellPowerAvailableW.toFixed(1)),
      unit: 'W',
      ref: 'Table de décharge à puissance constante',
    })
    .step({
      label: 'calc.battery.autonomy',
      formula: 't = table⁻¹(P_élément)',
      substituted: `table⁻¹(${fmt(c.cellPowerRequiredW, 1)} W)`,
      result: Number(c.autonomyMin.toFixed(1)),
      unit: c.autonomyIsLowerBound ? 'min (≥)' : 'min',
    });
  return t.build();
}
