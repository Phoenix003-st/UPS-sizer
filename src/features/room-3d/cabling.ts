/**
 * Câblage visible dans la vue 3D (sans dépendance à three.js, testable), dans l'ordre du schéma
 * unifilaire : arrivée réseau → tableau électrique → entrée de chaque UPS → armoires batteries
 * (courant continu) → sortie UPS → tableau ondulé → départs vers les charges du secteur
 * (armoire de manœuvre puis machine d'ascenseur, tableau IT médical, armoires d'automates, baies
 * réseau, contrôle d'accès…). Sans tableau, la liaison est directe.
 *
 * Les câbles montent du haut des équipements jusqu'au chemin de câbles sous plafond, le suivent
 * à angle droit, puis redescendent. Au bureau, ils passent en goulotte au ras du sol.
 */
import type { CircuitResult } from '../../engine/types';
import type { Decor3D, DecorKind, Rack3D, RoomFrame } from './furnish';
import type { Item3D, Vec3 } from './model';

export type CableKind = 'mains' | 'input' | 'battery' | 'output' | 'feeder';

export interface Cable3D {
  id: string;
  kind: CableKind;
  system: 'A' | 'B';
  /** Polyligne (m), de la source vers la destination. */
  points: Vec3[];
  /** Section du câble (« 4×16 mm² »…), si elle est calculée. */
  section?: string;
  /** Destination d'un départ (type d'élément), pour le libellé. */
  to?: DecorKind | 'rack';
  /** Point d'ancrage du libellé (au-dessus de la descente vers la destination). */
  labelAt: Vec3;
}

export interface CableTray3D {
  /** Segment horizontal du chemin de câbles (m), à l'altitude `y`. */
  from: Vec3;
  to: Vec3;
}

export interface Cabling {
  cables: Cable3D[];
  trays: CableTray3D[];
}

/** Charges alimentées par le tableau ondulé, et liaisons entre charges (amont → aval). */
const LOADS: DecorKind[] = [
  'lift-controller',
  'medical-panel',
  'plc-cabinet',
  'open-rack',
  'network-cabinet',
  'access-panel',
  'fids-screen',
  'desk',
];
const CHAINS: [DecorKind, DecorKind][] = [
  ['lift-controller', 'lift-machine'],
  ['medical-panel', 'medical-cart'],
  ['access-panel', 'badge-reader'],
];

const SPACING = 0.035;

function section(c: CircuitResult | undefined): string | undefined {
  if (!c?.cable) return undefined;
  const cores = c.dc ? 2 : c.poles + 1;
  const n = c.cable.parallel > 1 ? `${c.cable.parallel}×(${cores}×` : `${cores}×`;
  return `${n}${c.cable.sectionMm2} mm²${c.cable.parallel > 1 ? ')' : ''}`;
}

/** Point de raccordement en haut d'un élément d'aménagement. */
function decorTop(d: Decor3D): Vec3 {
  const h = d.kind === 'lift-machine' ? 0.9 : d.kind === 'desk' ? 0.74 : d.h;
  return { x: d.x, y: d.y + h, z: d.z };
}

export function buildCabling(
  room: RoomFrame,
  input: {
    items: Item3D[];
    racks: Rack3D[];
    decor: Decor3D[];
    circuits: CircuitResult[];
    office: boolean;
  },
): Cabling {
  const { items, racks, decor, circuits, office } = input;
  const cables: Cable3D[] = [];
  const trays: CableTray3D[] = [];
  // Chemin de câbles le long des murs, à 0,3 m du mur, sous plafond (goulotte en plinthe au bureau).
  const trayY = office ? 0.05 : Math.max(2.1, room.height - 0.17);
  const ring = office ? 0.06 : 0.3;
  const host = racks.find((r) => r.host);
  /** Tronçons de chemin de câbles utilisés, par mur : intervalle le long du mur. */
  const used = new Map<number, [number, number]>();

  /** Haut d'un équipement ; un équipement monté en baie se raccorde par le haut de sa baie. */
  const itemTop = (it: Item3D): Vec3 =>
    it.y > 0 && host ? { x: host.x, y: host.h, z: host.z } : { x: it.x, y: it.y + it.h, z: it.z };

  const route = (
    kind: CableKind,
    system: 'A' | 'B',
    a: Vec3,
    b: Vec3,
    extra: Partial<Cable3D> = {},
  ) => {
    const k = cables.length;
    // Chaque câble a sa place sur le chemin de câbles (décalage vers l'intérieur du local).
    const inset = ring + ((k % 7) - 3) * (office ? 0.012 : SPACING);
    const L = room.length;
    const W = room.width;
    const x0 = inset;
    const x1 = L - inset;
    const z0 = inset;
    const z1 = W - inset;
    const sides = [x1 - x0, z1 - z0, x1 - x0, z1 - z0];
    const perim = 2 * (sides[0]! + sides[1]!);
    // Côté le plus proche (0 haut, 1 droite, 2 bas, 3 gauche) et abscisse curviligne sur l'anneau.
    const project = (p: Vec3) => {
      const d = [p.z, L - p.x, W - p.z, p.x];
      const side = d.indexOf(Math.min(...d));
      const cx = Math.min(x1, Math.max(x0, p.x));
      const cz = Math.min(z1, Math.max(z0, p.z));
      const q = [
        { x: cx, z: z0 },
        { x: x1, z: cz },
        { x: cx, z: z1 },
        { x: x0, z: cz },
      ][side]!;
      const t = [
        cx - x0,
        sides[0]! + (cz - z0),
        sides[0]! + sides[1]! + (x1 - cx),
        2 * sides[0]! + sides[1]! + (z1 - cz),
      ][side]!;
      return { ...q, t };
    };
    const corner = (i: number) =>
      [
        { x: x1, z: z0, t: sides[0]! },
        { x: x1, z: z1, t: sides[0]! + sides[1]! },
        { x: x0, z: z1, t: 2 * sides[0]! + sides[1]! },
        { x: x0, z: z0, t: perim },
      ][i]!;
    const pa = project(a);
    const pb = project(b);
    // Sens le plus court autour de l'anneau.
    const fwd = (((pb.t - pa.t) % perim) + perim) % perim;
    const dir = fwd <= perim / 2 ? 1 : -1;
    const ring2: { x: number; z: number }[] = [pa];
    const cornersT = [0, 1, 2, 3].map((i) => corner(i));
    const ordered =
      dir === 1
        ? cornersT
            .map((c) => ({ ...c, d: (((c.t - pa.t) % perim) + perim) % perim }))
            .filter((c) => c.d > 1e-6 && c.d < fwd - 1e-6)
        : cornersT
            .map((c) => ({ ...c, d: (((pa.t - c.t) % perim) + perim) % perim }))
            .filter((c) => c.d > 1e-6 && c.d < perim - fwd - 1e-6);
    ordered.sort((u, v) => u.d - v.d);
    ring2.push(...ordered, pb);
    const y = trayY;
    const points: Vec3[] = [
      a,
      { x: a.x, y, z: a.z },
      ...ring2.map((p) => ({ x: p.x, y, z: p.z })),
      { x: b.x, y, z: b.z },
      b,
    ].filter((p, i, all) => {
      const q = all[i - 1];
      return !q || Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) > 1e-6;
    });
    // Libellé au-dessus de la descente vers la destination (les destinations sont distinctes).
    const labelAt = { x: b.x, y: y + 0.12, z: b.z };
    // Tronçons d'anneau parcourus (sur la ligne médiane du chemin de câbles).
    for (let i = 1; i < ring2.length; i++) {
      const p = ring2[i - 1]!;
      const q = ring2[i]!;
      const alongX = Math.abs(q.x - p.x) > Math.abs(q.z - p.z);
      const side = alongX ? (p.z < W / 2 ? 0 : 2) : p.x > L / 2 ? 1 : 3;
      const lo = alongX ? Math.min(p.x, q.x) : Math.min(p.z, q.z);
      const hi = alongX ? Math.max(p.x, q.x) : Math.max(p.z, q.z);
      const cur = used.get(side);
      used.set(side, cur ? [Math.min(cur[0], lo), Math.max(cur[1], hi)] : [lo, hi]);
    }
    cables.push({ id: `${kind}-${k}`, kind, system, points, labelAt, ...extra });
  };

  const circuit = (id: CircuitResult['id'], s: 'A' | 'B') =>
    circuits.find((c) => c.id === id && c.system === s);
  const ups = items.filter(
    (i) =>
      i.kind === 'ups-cabinet' ||
      i.kind === 'ups-tower' ||
      i.kind === 'ups-rack' ||
      i.kind === 'modular-frame',
  );
  const batteries = items.filter((i) => i.kind === 'battery-cabinet' || i.kind === 'ebm');
  const panel = decor.find((d) => d.kind === 'electrical-panel');
  const board = decor.find((d) => d.kind === 'ups-board');
  if (ups.length === 0) return { cables, trays };

  // Arrivée réseau : descente depuis le plafond sur le tableau, sinon sur l'UPS (ou prise murale
  // au bureau, au ras du sol).
  const first = itemTop(ups[0]!);
  const mainsTo = panel ? decorTop(panel) : first;
  if (office) {
    const wallX = mainsTo.x < room.length / 2 ? 0.02 : room.length - 0.02;
    route('mains', 'A', { x: wallX, y: 0.3, z: mainsTo.z }, { ...mainsTo, y: 0.3 });
  } else {
    const top = { x: mainsTo.x, y: room.height, z: mainsTo.z };
    cables.push({
      id: 'mains',
      kind: 'mains',
      system: 'A',
      points: [top, mainsTo],
      // Sous le chemin de câbles, au-dessus du tableau.
      labelAt: { x: top.x, y: mainsTo.y + 0.35, z: top.z },
    });
  }

  // Tableau → entrée de chaque UPS (direct depuis l'arrivée sans tableau).
  for (const u of ups) {
    const a = panel ? decorTop(panel) : null;
    if (a)
      route('input', u.system, a, itemTop(u), { section: section(circuit('rectifier', u.system)) });
  }

  // UPS → armoires batteries du même système (la plus proche des UPS du système).
  for (const b of batteries) {
    const sys = ups.filter((u) => u.system === b.system);
    const u = (sys.length ? sys : ups).reduce((best, c) =>
      Math.hypot(c.x - b.x, c.z - b.z) < Math.hypot(best.x - b.x, best.z - b.z) ? c : best,
    );
    // Un module batterie monté en baie sous l'UPS est raccordé dans la baie : rien à tracer.
    if (b.y > 0 && u.y > 0) continue;
    route('battery', b.system, itemTop(u), itemTop(b), {
      section: section(circuit('battery', b.system)),
    });
  }

  // Sortie UPS → tableau ondulé, puis départs vers les charges ; sans tableau ondulé, départs
  // directs depuis l'UPS.
  const loads = decor.filter((d) => LOADS.includes(d.kind));
  const otherRacks = racks.filter((r) => !r.host);
  const outFrom = (s: 'A' | 'B') => ups.find((u) => u.system === s) ?? ups[0]!;
  const systems = [...new Set(ups.map((u) => u.system))];
  if (board) {
    for (const s of systems)
      route('output', s, itemTop(outFrom(s)), decorTop(board), {
        section: section(circuit('output', s)),
      });
  }
  const feederFrom = board ? decorTop(board) : itemTop(outFrom('A'));
  const feeder = section(circuit('feeder', 'A'));
  for (const l of loads)
    route(board ? 'feeder' : 'output', 'A', feederFrom, decorTop(l), {
      to: l.kind,
      section: feeder,
    });
  for (const r of otherRacks)
    route(board ? 'feeder' : 'output', 'A', feederFrom, { x: r.x, y: r.h, z: r.z }, { to: 'rack' });
  for (const [from, to] of CHAINS) {
    const a = decor.find((d) => d.kind === from);
    const b = decor.find((d) => d.kind === to);
    if (a && b) route('feeder', 'A', decorTop(a), decorTop(b), { to: b.kind });
  }
  // Libellés proches : empilés pour rester lisibles.
  for (let i = 0; i < cables.length; i++) {
    const l = cables[i]!.labelAt;
    for (let guard = 0; guard < 8; guard++) {
      const clash = cables
        .slice(0, i)
        .some(
          (c) =>
            Math.hypot(c.labelAt.x - l.x, c.labelAt.z - l.z) < 0.8 &&
            Math.abs(c.labelAt.y - l.y) < 0.12,
        );
      if (!clash) break;
      l.y += 0.14;
    }
  }
  if (!office)
    for (const [side, [lo, hi]] of used) {
      if (hi - lo < 0.05) continue;
      const y = trayY - 0.02;
      const z = side === 0 ? ring : room.width - ring;
      const x = side === 3 ? ring : room.length - ring;
      trays.push(
        side === 0 || side === 2
          ? { from: { x: lo, y, z }, to: { x: hi, y, z } }
          : { from: { x, y, z: lo }, to: { x, y, z: hi } },
      );
    }
  return { cables, trays };
}
