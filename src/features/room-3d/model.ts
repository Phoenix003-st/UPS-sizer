/**
 * Modèle de la scène 3D (sans dépendance à three.js, testable) : à partir d'une solution et des
 * catalogues, décrit chaque équipement à placer — position, orientation, contenu (modules de
 * puissance, blocs batteries rangés sur des étagères, unités de baie) — et le local (murs, porte,
 * dégagements, cotes).
 *
 * Repère 3D : X le long de la longueur du local, Z le long de la largeur, Y vers le haut ;
 * unités en mètres. Le plan 2D (x, y en mm) devient (X, Z) ; la face avant d'un équipement est
 * tournée vers +Z à 0° et suit la rotation du plan.
 */
import type { BatteryBlock, Catalogs, UpsModel } from '../../catalog/schemas';
import type { Project, RoomKind } from '../../engine/project';
import type { ScenarioId } from '../../settings/schema';
import {
  buildRackRow,
  furnishRoom,
  RACK_BASE,
  RACK_U,
  wallOfRotation,
  type FloorRect,
  type Furnishing,
  type Rack3D,
} from './furnish';

export type { Decor3D, Rack3D, RackGear } from './furnish';
import type { LayoutItem, LayoutResult, SolutionOption } from '../../engine/types';

export type Item3DKind =
  'ups-cabinet' | 'modular-frame' | 'ups-tower' | 'ups-rack' | 'battery-cabinet' | 'ebm';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Box3 {
  /** Centre de la face inférieure, repère local de l'équipement (m). */
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface Item3D {
  id: string;
  kind: Item3DKind;
  system: 'A' | 'B';
  reference: string;
  /** Centre de l'emprise au sol dans le local (m). */
  x: number;
  z: number;
  /** Altitude de la base (m) : 0 au sol, > 0 dans une baie. */
  y: number;
  /** Rotation autour de Y (radians). */
  rotY: number;
  w: number;
  d: number;
  h: number;
  weightKg: number;
  dimsMm: { w: number; d: number; h: number };
  /** Châssis modulaire : modules installés et emplacements. */
  modules?: { installed: number; slots: number; kw: number };
  /** Blocs batteries visibles à l'intérieur (armoire, module externe ou batteries internes). */
  blocks?: {
    count: number;
    size: { w: number; d: number; h: number };
    positions: Vec3[];
    shelves: number[];
    /** Blocs tournés d'un quart de tour (longueur dans la profondeur). */
    rotated: boolean;
    reference: string;
    lithium: boolean;
  };
  /** Hauteur en unités de baie (équipement rackable). */
  rackUnits?: number | null;
}

export interface Zone3D {
  x: number;
  z: number;
  w: number;
  d: number;
  itemId: string;
}

export interface Room3D {
  length: number;
  width: number;
  height: number;
  door: { wall: LayoutResult['door']['wall']; offset: number; width: number; height: number };
  items: Item3D[];
  zones: Zone3D[];
  kind: RoomKind;
  /** Baie d'accueil des équipements rackables (baie existante), sinon null. */
  rack: Rack3D | null;
  /** Rangée de baies existantes (type « Baie existante »). */
  racks: Rack3D[];
  furnishing: Furnishing;
}

/**
 * Local tel que décrit dans le projet (seuls le type, le faux plancher et la clim servent), et
 * secteur du projet pour l'aménagement propre au milieu.
 */
export type RoomContext =
  RoomKind | (Pick<Project['room'], 'kind' | 'raisedFloor' | 'hvac'> & { sector?: ScenarioId });

const MM = 0.001;

/** Rotation 3D (radians) correspondant à la rotation horaire du plan (front +Z à 0°). */
export function planRotToY(rot: LayoutItem['rot']): number {
  return (-rot * Math.PI) / 180;
}

/**
 * Range `count` blocs dans un volume intérieur (armoire) : rangées sur la largeur et la
 * profondeur, puis étages. Renvoie les centres (repère local, base de l'armoire au sol, face avant
 * vers +Z) et la hauteur de chaque étagère. Les blocs qui ne tiennent pas ne sont pas dessinés.
 */
export function arrangeBlocks(
  count: number,
  cabinet: { w: number; d: number; h: number },
  block: { w: number; d: number; h: number },
  opts: { side: number; bottom: number; top: number; gap: number; pitch: number } = {
    side: 0.04,
    bottom: 0.08,
    top: 0.08,
    gap: 0.01,
    pitch: 0.05,
  },
): { positions: Vec3[]; shelves: number[]; drawn: number; rotated: boolean } {
  // Orientation du bloc qui en loge le plus par étagère.
  const fit = (bw: number, bd: number) => {
    const nx = Math.floor((cabinet.w - 2 * opts.side + opts.gap) / (bw + opts.gap));
    const nz = Math.floor((cabinet.d - 2 * opts.side + opts.gap) / (bd + opts.gap));
    return { nx: Math.max(0, nx), nz: Math.max(0, nz), bw, bd };
  };
  const a = fit(block.w, block.d);
  const b = fit(block.d, block.w);
  const o = b.nx * b.nz > a.nx * a.nz ? b : a; // b : bloc tourné d'un quart de tour
  const perShelf = o.nx * o.nz;
  if (perShelf === 0 || count <= 0) return { positions: [], shelves: [], drawn: 0, rotated: false };
  const shelfStep = block.h + opts.pitch;
  const maxShelves = Math.max(
    0,
    Math.floor((cabinet.h - opts.bottom - opts.top + opts.pitch) / shelfStep),
  );
  const nShelves = Math.min(maxShelves, Math.ceil(count / perShelf));
  const positions: Vec3[] = [];
  const shelves: number[] = [];
  const x0 = -((o.nx - 1) * (o.bw + opts.gap)) / 2;
  const z0 = -((o.nz - 1) * (o.bd + opts.gap)) / 2;
  for (let s = 0; s < nShelves; s++) {
    const y = opts.bottom + s * shelfStep;
    shelves.push(y);
    for (let iz = 0; iz < o.nz; iz++) {
      for (let ix = 0; ix < o.nx; ix++) {
        if (positions.length >= count) break;
        positions.push({
          x: x0 + ix * (o.bw + opts.gap),
          y: y + block.h / 2,
          z: z0 + iz * (o.bd + opts.gap),
        });
      }
    }
  }
  return { positions, shelves, drawn: positions.length, rotated: o === b && b !== a };
}

/** Blocs logés dans l'armoire numéro `k` (1…) d'un système : jeu par jeu, armoire par armoire. */
export function blocksInCabinet(k: number, perSet: number, cabinetsPerSet: number): number {
  const q = (k - 1) % cabinetsPerSet;
  const base = Math.floor(perSet / cabinetsPerSet);
  const extra = perSet % cabinetsPerSet;
  return base + (q < extra ? 1 : 0);
}

function itemKind(it: LayoutItem, model: UpsModel | undefined): Item3DKind {
  if (it.kind === 'frame') return 'modular-frame';
  if (it.kind === 'cabinet') return 'battery-cabinet';
  if (it.kind === 'ebm') return 'ebm';
  if (model?.formFactor === 'cabinet') return 'ups-cabinet';
  if (model?.formFactor === 'rack' || model?.formFactor === 'tower_rack') return 'ups-rack';
  return 'ups-tower';
}

function blockSize(b: BatteryBlock) {
  return { w: b.dimensionsMm.w * MM, d: b.dimensionsMm.d * MM, h: b.dimensionsMm.h * MM };
}

/** Description complète de la scène pour une solution. */
export function buildRoom3D(
  option: SolutionOption,
  catalogs: Catalogs,
  context: RoomContext,
): Room3D {
  const env =
    typeof context === 'string'
      ? { kind: context, raisedFloor: false, hvac: { present: context !== 'shared', kW: 0 } }
      : context;
  const roomKind = env.kind;
  const { layout, battery } = option;
  const model = catalogs.ups.models.find((m) => m.id === option.ups.modelId);
  const block = catalogs.batteries.blocks.find((b) => b.id === battery.blockId);
  const extPerSet = battery.blocksPerString * (battery.strings - battery.internalStrings);
  const cabPerSet = battery.cabinets[0]?.qty ?? 1;
  const counters: Record<string, number> = {};

  const items: Item3D[] = layout.items.map((it) => {
    let kind = itemKind(it, model);
    // Hors baie, un équipement rackable (UPS ou module batteries 19") est posé debout, en tour,
    // dans l'emprise prévue au plan : sa hauteur rack devient son épaisseur.
    const rackFormat = kind === 'ups-rack' || (kind === 'ebm' && it.h <= 150);
    const standing = rackFormat && roomKind !== 'rack';
    if (standing && kind === 'ups-rack') kind = 'ups-tower';
    const cx = (it.body.x + it.body.w / 2) * MM;
    const cz = (it.body.y + it.body.h / 2) * MM;
    const item: Item3D = {
      id: it.id,
      kind,
      system: it.system,
      reference: it.reference,
      x: cx,
      z: cz,
      y: 0,
      rotY: planRotToY(it.rot),
      w: (standing ? it.h : it.w) * MM,
      d: it.d * MM,
      h: (standing ? it.w : it.h) * MM,
      weightKg: it.weightKg,
      dimsMm: { w: it.w, d: it.d, h: it.h },
      rackUnits: it.rackUnits ?? null,
    };
    if (kind === 'modular-frame' && model?.modular) {
      const idx = Number(it.id.replace(/^\D+-[AB]/, '')) - 1;
      item.modules = {
        installed: option.ups.modulesPerFrame?.[idx] ?? 0,
        slots: model.modular.maxModules,
        kw: model.modular.moduleKW,
      };
    }
    if (block) {
      let count = 0;
      if (kind === 'battery-cabinet' || kind === 'ebm') {
        counters[it.system] = (counters[it.system] ?? 0) + 1;
        count = blocksInCabinet(counters[it.system]!, extPerSet, cabPerSet);
      } else if (model?.battery.internal) {
        count = model.battery.internal.blocks * model.battery.internal.strings;
      }
      if (count > 0) {
        const size = blockSize(block);
        // Batteries internes d'un UPS : partie basse ou arrière du boîtier.
        const inner =
          kind === 'battery-cabinet' || kind === 'ebm'
            ? { w: item.w, d: item.d, h: item.h }
            : { w: item.w, d: item.d * 0.55, h: item.h * 0.6 };
        const opts =
          kind === 'battery-cabinet'
            ? undefined
            : { side: 0.01, bottom: 0.01, top: 0.01, gap: 0.004, pitch: 0.01 };
        const arr = arrangeBlocks(count, inner, size, opts);
        item.blocks = {
          count,
          size,
          positions: arr.positions,
          shelves: arr.shelves,
          rotated: arr.rotated,
          reference: block.reference,
          lithium: block.chemistry === 'LI_LFP',
        };
      }
    }
    return item;
  });

  const frame = {
    length: layout.room.lengthMm * MM,
    width: layout.room.widthMm * MM,
    height: layout.room.heightMm * MM,
    door: {
      wall: layout.door.wall,
      offset: layout.door.offsetMm * MM,
      width: layout.door.widthMm * MM,
      height: layout.door.heightMm * MM,
    },
  };
  const rectOf = (r: { x: number; y: number; w: number; h: number }): FloorRect => ({
    x: r.x * MM,
    z: r.y * MM,
    w: r.w * MM,
    d: r.h * MM,
  });

  // Baie existante : les équipements rackables sont montés en bas d'une baie 42U de la rangée.
  let racks: Rack3D[] = [];
  const racked = new Set<string>();
  if (roomKind === 'rack') {
    const rackable = items.filter(
      (i) => i.kind === 'ups-rack' || (i.kind === 'ebm' && i.h <= 0.15),
    );
    rackable.forEach((r) => racked.add(r.id));
    const floorOccupied = layout.items
      .filter((it) => !racked.has(it.id))
      .flatMap((it) => [it.body, ...it.zones.map((z) => z.rect)].map(rectOf));
    const first = rackable[0];
    const row = buildRackRow(
      frame,
      rackable.map((r) => ({
        id: r.id,
        units: r.rackUnits ?? Math.max(1, Math.ceil(r.h / RACK_U - 0.05)),
      })),
      floorOccupied,
      first ? { wall: wallOfRotation(first.rotY), x: first.x, z: first.z } : undefined,
    );
    racks = row.racks;
    for (const r of rackable) {
      const pos = row.positions.get(r.id);
      const rk = pos ? racks[pos.rack] : undefined;
      if (!pos || !rk) continue;
      r.x = rk.x;
      r.z = rk.z;
      r.rotY = rk.rotY;
      r.y = RACK_BASE + (pos.u - 1) * RACK_U;
    }
  }

  const zones: Zone3D[] = layout.items
    .filter((it) => !racked.has(it.id))
    .flatMap((it) =>
      it.zones.map((z) => ({
        x: (z.rect.x + z.rect.w / 2) * MM,
        z: (z.rect.y + z.rect.h / 2) * MM,
        w: z.rect.w * MM,
        d: z.rect.h * MM,
        itemId: it.id,
      })),
    );

  // Aménagement : tout ce qui est au sol (équipements, dégagements, baies) est évité.
  const occupied: FloorRect[] = [
    ...layout.items
      .filter((it) => !racked.has(it.id))
      .flatMap((it) => [it.body, ...it.zones.map((z) => z.rect)].map(rectOf)),
    ...racks.flatMap((r) => rackFootprint(r)),
  ];
  const mainItem = items.find((i) => i.y === 0) ?? items[0];
  const preferWall = racks[0]
    ? wallOfRotation(racks[0].rotY)
    : mainItem
      ? wallOfRotation(mainItem.rotY)
      : undefined;
  const furnishing = furnishRoom(
    frame,
    roomKind,
    {
      raisedFloor: env.raisedFloor,
      hvacKW: env.hvac.present ? env.hvac.kW : 0,
      sector: 'sector' in env ? env.sector : undefined,
    },
    occupied,
    preferWall,
  );

  return {
    ...frame,
    items,
    zones,
    kind: roomKind,
    rack: racks.find((r) => r.host) ?? null,
    racks,
    furnishing,
  };
}

/** Emprise d'une baie et de son dégagement avant (1 m) et arrière (0,1 m d'écart au mur). */
function rackFootprint(r: Rack3D): FloorRect[] {
  const quarter = Math.abs(Math.sin(r.rotY)) > 0.5;
  const w = quarter ? r.d : r.w;
  const d = quarter ? r.w : r.d;
  const body = { x: r.x - w / 2, z: r.z - d / 2, w, d };
  // Le dégagement avant est du côté de la face avant (+Z local tourné de rotY).
  const fx = Math.round(Math.sin(r.rotY));
  const fz = Math.round(Math.cos(r.rotY));
  const front = {
    x: fx > 0 ? body.x + w : fx < 0 ? body.x - 1 : body.x,
    z: fz > 0 ? body.z + d : fz < 0 ? body.z - 1 : body.z,
    w: fx !== 0 ? 1 : w,
    d: fz !== 0 ? 1 : d,
  };
  return [body, front];
}
