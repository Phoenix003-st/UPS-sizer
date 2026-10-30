/**
 * Génère les catalogues de marque (src/catalog/brands/*.json) à partir des fiches relevées dans
 * les catalogues constructeurs (infosec.ts, …).
 *
 * Les valeurs imprimées au catalogue sont reprises telles quelles (référence produit, puissance,
 * dimensions, masse, autonomie…). Celles qui manquent sont complétées par des valeurs types et
 * listées dans le champ `estimated` de chaque fiche, pour que l'application les signale :
 *
 * - batteries internes : quand le catalogue publie une autonomie (par exemple à 50 % de charge),
 *   on retient parmi les blocs génériques 12 V (7, 9, 12, 17, 18 Ah) et 1 à 3 chaînes la
 *   combinaison dont l'autonomie calculée par le moteur (batteries neuves, 25 °C) est la plus proche ;
 *   la tension (blocs par chaîne) est celle du catalogue, ou une valeur type selon la puissance ;
 * - masse, courbe de rendement, courant de charge, dégagements : valeurs types par technologie ;
 * - modules batteries externes : référence réelle quand elle est publiée, contenu estimé.
 *
 * Usage : npm run catalogs:brands
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import batteriesJson from '../../src/catalog/batteries.json' with { type: 'json' };
import {
  batteryCatalogSchema,
  batteryCabinetSchema,
  upsModelSchema,
  type BatteryCabinet,
  type UpsModel,
} from '../../src/catalog/schemas';
import { autonomyAt, dischargeTable } from '../../src/engine/battery';
import { INFOSEC } from './infosec';
import type { BrandData, Entry } from './types';

const BRANDS: BrandData[] = [INFOSEC];

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'catalog', 'brands');
const VERSION = '2026-10';
const batteries = batteryCatalogSchema.parse(batteriesJson);
const CALIB_BLOCKS = [
  'EX-VRLA-12V7',
  'EX-VRLA-12V9',
  'EX-VRLA-12V12',
  'EX-VRLA-12V17',
  'EX-VRLA-12V18',
];
const SHORT_EOD = 1.67;

const eff = (a: number, b: number, c: number, d: number) => [
  { load: 0.25, eta: a },
  { load: 0.5, eta: b },
  { load: 0.75, eta: c },
  { load: 1, eta: d },
];
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;

function isThreePhaseCabinet(e: Entry): boolean {
  return e.modular !== undefined || e.hasInternal === false;
}

function efficiencyFor(e: Entry) {
  const va = e.kva * 1000;
  let curve;
  let battery;
  let eco: number | null;
  if (e.tech === 'line_interactive') {
    curve = eff(0.94, 0.96, 0.97, 0.97);
    battery = 0.88;
    eco = null;
  } else if (e.tech === 'online_performance') {
    curve = eff(0.86, 0.89, 0.9, 0.9);
    battery = 0.86;
    eco = 0.95;
  } else if (isThreePhaseCabinet(e) || (e.phIn === 3 && e.kva >= 10)) {
    curve = eff(0.95, 0.965, 0.97, 0.965);
    battery = 0.96;
    eco = 0.99;
  } else if (va <= 3000) {
    curve = eff(0.86, 0.89, 0.9, 0.9);
    battery = 0.88;
    eco = 0.97;
  } else {
    curve = eff(0.9, 0.93, 0.94, 0.94);
    battery = 0.92;
    eco = 0.98;
  }
  if (e.effFull !== undefined) {
    const shift = e.effFull - curve[3]!.eta;
    curve = curve.map((p) => ({ load: p.load, eta: r2(Math.min(0.99, p.eta + shift)) }));
  }
  if (e.effBatt !== undefined) battery = e.effBatt;
  if (e.effEco !== undefined) eco = e.effEco;
  return { online: curve, eco, battery };
}

/** Blocs de 12 V par chaîne, valeur type selon la technologie et la puissance. */
function bpsEstimate(e: Entry): number {
  const va = e.kva * 1000;
  if (e.tech === 'line_interactive') return va <= 800 ? 1 : va <= 1600 ? 2 : 4;
  if (e.tech === 'online_performance') return va <= 1000 ? 2 : va <= 2200 ? 4 : va <= 3000 ? 6 : 8;
  return va <= 1000 ? 2 : va <= 2000 ? 4 : va <= 3000 ? 6 : va <= 6000 ? 16 : 20;
}

/** Autonomie (min) de batteries neuves à 25 °C pour une puissance de sortie donnée. */
function runtimeOf(blockId: string, bps: number, strings: number, outW: number, etaBatt: number) {
  const block = batteries.blocks.find((b) => b.id === blockId)!;
  const table = dischargeTable(block, SHORT_EOD);
  return autonomyAt(table, outW / etaBatt / (bps * block.cells * strings)).minutes;
}

/** Tensions plausibles (blocs par chaîne) quand le catalogue ne publie pas la tension batterie. */
function bpsOptions(e: Entry): number[] {
  const va = e.kva * 1000;
  if (va <= 1000) return [1, 2, 3];
  if (va <= 3000) return [2, 3, 4, 6, 8];
  // Double conversion au-delà de 3 kVA : bus continu d'au moins 192 V (16 blocs). À 96 V, un
  // 10 kVA tirerait plus de 100 A de ses batteries.
  if (e.tech === 'online_double_conversion') return [16, 20];
  return [8, 16, 20];
}

function calibrate(e: Entry, bpsList: number[], etaBatt: number) {
  const rt = e.runtime!;
  const outW = 'W' in rt ? rt.W : rt.load * e.kw * 1000;
  let best = { blockId: CALIB_BLOCKS[0]!, bps: bpsList[0]!, strings: 1, err: Infinity, min: 0 };
  for (const bps of bpsList)
    for (const blockId of CALIB_BLOCKS)
      for (let strings = 1; strings <= 3; strings++) {
        const min = runtimeOf(blockId, bps, strings, outW, etaBatt);
        // Légère préférence pour la tension type et une seule chaîne à erreur comparable.
        const err =
          Math.abs(Math.log(min / rt.min)) +
          0.02 * (strings - 1) +
          (bps === bpsEstimate(e) ? 0 : 0.03);
        if (err < best.err - 1e-9) best = { blockId, bps, strings, err, min };
      }
  return best;
}

function weightEstimate(e: Entry): number {
  if (e.modular) return Math.round(100 + 0.8 * e.kva);
  if (isThreePhaseCabinet(e)) return Math.round(40 + 2.2 * e.kva);
  if (e.tech === 'online_double_conversion' && e.kva > 3) return Math.round(15 + 6 * e.kva);
  return r1(4 + 8 * e.kva);
}

function chargeEstimate(e: Entry): number {
  if (e.chargeA !== undefined) return e.chargeA;
  if (isThreePhaseCabinet(e)) return Math.max(6, Math.round(e.kva * 0.25));
  return e.kva <= 1 ? 1.5 : e.kva <= 3 ? 2 : e.kva <= 6 ? 4 : 6;
}

function buildBrand(data: BrandData) {
  const cabinets = new Map<string, BatteryCabinet>();
  const models: UpsModel[] = [];
  const ids = new Set<string>();

  for (const e of data.entries) {
    const estimated: string[] = [];
    const notes = [...(e.notes ?? [])];
    const slug = (e.partNumber.split(' ')[0] || e.name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let id = `${data.idPrefix}-${slug}`;
    if (ids.has(id)) id = `${id}-${e.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
    ids.add(id);

    const efficiency = efficiencyFor(e);
    if (e.effFull === undefined) estimated.push('efficiency');
    const phIn = e.phIn ?? 1;
    const phOut = e.phOut ?? 1;
    const cabinetLike = isThreePhaseCabinet(e);

    let battery: UpsModel['battery'];
    if (cabinetLike) {
      const allowed = e.bpsAllowed ?? (e.bps ? [e.bps] : [30, 32, 34, 36, 38, 40]);
      if (!e.bpsAllowed && !e.bps) estimated.push('batteryVoltage');
      battery = {
        blockVoltage: 12,
        blocksPerString: { allowed, default: e.bps ?? (allowed.includes(32) ? 32 : allowed[0]!) },
        internal: null,
        maxChargeCurrentA: chargeEstimate(e),
        compatibleCabinetIds: ['EX-CAB-S', 'EX-CAB-M', 'EX-CAB-L'],
        sharedBattery: e.modular !== undefined,
        maxExternalCabinets: e.kva <= 40 ? 4 : e.kva <= 200 ? 6 : 8,
      };
      notes.push('Armoires batteries génériques (non fournies au catalogue).');
    } else {
      let bps = e.internal?.blocks ?? e.bps ?? bpsEstimate(e);
      if (!e.internal && !e.bps) estimated.push('batteryVoltage');
      let internal = e.internal ?? null;
      if (!internal) {
        if (e.runtime) {
          const c = calibrate(e, e.bps ? [e.bps] : bpsOptions(e), efficiency.battery);
          bps = c.bps;
          internal = { blockId: c.blockId, blocks: bps, strings: c.strings };
          notes.push(
            `Batteries internes estimées : ${c.strings} × ${bps} blocs ${c.blockId.replace('EX-VRLA-', '')} ` +
              `(autonomie calculée ${r1(c.min)} min pour ${e.runtime.min} min au catalogue).`,
          );
        } else {
          internal = { blockId: 'EX-VRLA-12V9', blocks: bps, strings: 1 };
        }
        estimated.push('internalBattery');
      }
      const compatible: string[] = [];
      if (e.ebm) {
        const ebmBps = e.ebm.bps || bps;
        const strings = e.ebm.strings ?? 2;
        const cabId = `${data.idPrefix}-EBM-${e.ebm.partNumber}`;
        const prev = cabinets.get(cabId);
        const cap = new Map((prev?.capacity ?? []).map((c) => [c.blockId, c.maxBlocks]));
        cap.set(internal.blockId, Math.max(cap.get(internal.blockId) ?? 0, ebmBps * strings));
        const dims = e.ebm.dims ?? e.dims;
        cabinets.set(
          cabId,
          batteryCabinetSchema.parse({
            id: cabId,
            sample: true,
            brand: data.brand,
            partNumber: e.ebm.partNumber,
            reference: `${data.brand} ${e.ebm.name}`,
            kind: 'ebm',
            dimensionsMm: { w: dims[0], d: dims[1], h: dims[2] },
            emptyWeightKg: e.ebm.emptyKg ?? (e.ebm.kg ? r1(Math.max(1, e.ebm.kg * 0.3)) : 5),
            clearancesMm: { front: 500, rear: 100, left: 0, right: 0, top: 0 },
            capacity: [...cap].map(([blockId, maxBlocks]) => ({ blockId, maxBlocks })),
            breakerA: 63,
            source: {
              brand: data.brand,
              model: e.doc ?? `${data.catalog.title}, p. ${e.page}`,
              url: data.catalog.url,
              note: e.ebm.emptyKg
                ? 'Référence, dimensions et masse à vide de la fiche produit ; contenu en batteries estimé.'
                : 'Référence du catalogue ; contenu en batteries et masse à vide estimés.',
            },
          }),
        );
        compatible.push(cabId);
      } else if (e.extendable) {
        const cabId = `${data.idPrefix}-EBM-GEN-${bps * 12}V`;
        const prev = cabinets.get(cabId);
        const cap = new Map((prev?.capacity ?? []).map((c) => [c.blockId, c.maxBlocks]));
        cap.set(internal.blockId, bps * 2);
        cabinets.set(
          cabId,
          batteryCabinetSchema.parse({
            id: cabId,
            sample: true,
            brand: data.brand,
            reference: `${data.brand} module batteries externe ${bps * 12} V (référence à préciser)`,
            kind: 'ebm',
            dimensionsMm: prev?.dimensionsMm ?? { w: e.dims[0], d: e.dims[1], h: e.dims[2] },
            emptyWeightKg: 5,
            clearancesMm: { front: 500, rear: 100, left: 0, right: 0, top: 0 },
            capacity: [...cap].map(([blockId, maxBlocks]) => ({ blockId, maxBlocks })),
            breakerA: 63,
          }),
        );
        compatible.push(cabId);
        notes.push(
          'Extension d’autonomie possible : module batteries générique (référence à préciser).',
        );
      }
      battery = {
        blockVoltage: 12,
        blocksPerString: { allowed: [bps], default: bps },
        internal,
        maxChargeCurrentA: chargeEstimate(e),
        compatibleCabinetIds: compatible,
        sharedBattery: false,
        maxExternalCabinets: 4,
      };
    }
    if (e.chargeA === undefined) estimated.push('chargeCurrent');

    if (e.kg === undefined) estimated.push('weight');
    const kg = e.kg ?? weightEstimate(e);
    const parallel = e.parallel ?? 1;
    const tri = phOut === 3;

    const model = upsModelSchema.parse({
      id,
      sample: false,
      brand: data.brand,
      partNumber: e.partNumber,
      reference: `${data.brand} ${e.name}`,
      range: `${data.brand} ${e.range}`,
      technology: e.tech,
      formFactor: e.ff,
      rackUnits: e.ru ?? null,
      power: { kVA: e.kva, kW: e.kw, pf: r2(e.kw / e.kva) },
      phases: { in: phIn, out: phOut },
      voltages: {
        out: e.voltages ?? (tri ? [380, 400, 415] : [220, 230, 240]),
        freqHz: [50, 60],
      },
      efficiency,
      dimensionsMm: { w: e.dims[0], d: e.dims[1], h: e.dims[2] },
      weightKg: kg,
      clearancesMm: cabinetLike
        ? { front: 1000, rear: 0, left: 0, right: 0, top: 500 }
        : { front: 500, rear: 150, left: 0, right: 0, top: 0 },
      ip: 'IP20',
      ambientC: { min: 0, max: e.ambientMax ?? 40 },
      noiseDb: e.noise ?? null,
      battery,
      heatDissipationW: e.heatW ?? null,
      parallel: { capable: parallel > 1, maxUnits: parallel },
      modular: e.modular
        ? {
            moduleKVA: e.modular.moduleKVA,
            moduleKW: e.modular.moduleKW,
            maxModules: e.modular.maxModules,
            frameMaxKVA: e.modular.moduleKVA * e.modular.maxModules,
            moduleWeightKg: e.modular.moduleKg ?? Math.round(8 + 0.5 * e.modular.moduleKVA),
            emptyFrameWeightKg: kg,
            frameParallelMax: parallel,
          }
        : null,
      datasheetUrl: data.catalog.url,
      source: {
        brand: data.brand,
        model: e.doc ?? `${data.catalog.title}, p. ${e.page}`,
        url: data.catalog.url,
        ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
      },
      estimated,
    });
    models.push(model);
  }

  return {
    meta: {
      schemaVersion: 1,
      catalogVersion: `${VERSION}-${data.key.toUpperCase()}`,
      sample: false,
      notice: `${data.catalog.title} — références produit du catalogue ; valeurs non publiées estimées (champ « estimated »).`,
    },
    models,
    cabinets: [...cabinets.values()],
  };
}

mkdirSync(OUT, { recursive: true });
for (const data of BRANDS) {
  const out = buildBrand(data);
  writeFileSync(join(OUT, `${data.key}.json`), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${data.key}: ${out.models.length} UPS, ${out.cabinets.length} modules batteries`);
}
