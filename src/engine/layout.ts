/**
 * Implantation dans le local (vue de dessus, mm).
 *
 * Repère : origine au coin haut-gauche, x le long de la longueur du local, y le long de la largeur.
 * Placement automatique en ligne, dos au mur le plus long (UPS puis armoires accolées) ; si la ligne
 * ne tient pas, le système B (2N) ou le reste passe sur le mur opposé, face à la première ligne.
 * Les positions glissées à la souris (projet) remplacent le placement automatique, et tous les
 * contrôles sont refaits :
 *   - tient dans le local, dégagements compris → manque par axe (m) ;
 *   - porte : min(L, P) + marge ≤ largeur de porte et H ≤ hauteur de porte ;
 *   - sol : masse ÷ emprise (concentrée) et masse ÷ (emprise + dégagements) (répartie) vs admissible.
 */
import type { Settings } from '../settings/schema';
import type { Project, Wall } from './project';
import { fmt, trace, type Calc } from './trace';
import type { Alert, LayoutItem, LayoutResult, Rect } from './types';

export type LayoutSource = Omit<LayoutItem, 'x' | 'y' | 'rot' | 'body' | 'zones'>;
type Rot = LayoutItem['rot'];

const WORLD_SIDES = ['top', 'right', 'bottom', 'left'] as const;
type WorldSide = (typeof WORLD_SIDES)[number];
/** Index local : arrière = haut, droite, avant = bas, gauche (à 0°). */
const LOCAL_SIDES = ['rear', 'right', 'front', 'left'] as const;

/** Côté du local vers lequel est tourné un côté de l'équipement, pour une rotation horaire donnée. */
export function worldSide(local: (typeof LOCAL_SIDES)[number], rot: Rot): WorldSide {
  return WORLD_SIDES[(LOCAL_SIDES.indexOf(local) + rot / 90) % 4]!;
}

/** Emprise et zones de dégagement d'un équipement placé en (x, y) avec la rotation `rot`. */
export function itemGeometry(
  src: LayoutSource,
  x: number,
  y: number,
  rot: Rot,
): Pick<LayoutItem, 'body' | 'zones'> {
  const swap = rot === 90 || rot === 270;
  const body: Rect = { x, y, w: swap ? src.d : src.w, h: swap ? src.w : src.d };
  const zones: LayoutItem['zones'] = [];
  for (const side of LOCAL_SIDES) {
    const c = src.clearances[side];
    if (c <= 0) continue;
    const ws = worldSide(side, rot);
    const rect: Rect =
      ws === 'top'
        ? { x: body.x, y: body.y - c, w: body.w, h: c }
        : ws === 'bottom'
          ? { x: body.x, y: body.y + body.h, w: body.w, h: c }
          : ws === 'left'
            ? { x: body.x - c, y: body.y, w: c, h: body.h }
            : { x: body.x + body.w, y: body.y, w: c, h: body.h };
    zones.push({ side, rect });
  }
  return { body, zones };
}

export function intersection(a: Rect, b: Rect): { w: number; h: number } | null {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0.5 && h > 0.5 ? { w, h } : null;
}

/** Aire de l'union de rectangles (compression de coordonnées), mm². */
export function unionArea(rects: Rect[]): number {
  if (rects.length === 0) return 0;
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i]! + xs[i + 1]!) / 2;
      const cy = (ys[j]! + ys[j + 1]!) / 2;
      if (rects.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h)) {
        area += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!);
      }
    }
  }
  return area;
}

function clip(r: Rect, L: number, W: number): Rect | null {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  const w = Math.min(L, r.x + r.w) - x;
  const h = Math.min(W, r.y + r.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

const WALL_ROT: Record<Wall, Rot> = { top: 0, bottom: 180, left: 270, right: 90 };
const OPPOSITE: Record<Wall, Wall> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

interface Placement {
  x: number;
  y: number;
  rot: Rot;
}

const sideMax = (s: LayoutSource) => Math.max(s.clearances.left, s.clearances.right);

/**
 * Place une suite d'équipements le long d'un mur. Renvoie les positions et le nombre
 * d'équipements qui tiennent sur la longueur du mur.
 */
function placeOnWall(
  items: LayoutSource[],
  wall: Wall,
  room: Project['room'],
  forceAll: boolean,
): { placements: Placement[]; fitted: number } {
  const L = room.lengthMm;
  const W = room.widthMm;
  const wallLen = wall === 'top' || wall === 'bottom' ? L : W;
  const rot = WALL_ROT[wall];
  const door = room.door;
  const doorStart = door.offsetMm;
  const doorEnd = door.offsetMm + door.widthMm + 100;
  const placements: Placement[] = [];
  let cursor = 0;
  let fitted = 0;
  items.forEach((it, i) => {
    const prev = items[i - 1];
    let start = cursor + (prev ? Math.max(sideMax(prev), sideMax(it)) : sideMax(it));
    if (door.wall === wall && start < doorEnd && start + it.w > doorStart)
      start = doorEnd + sideMax(it);
    const end = start + it.w;
    if (end + sideMax(it) > wallLen + 0.5 && !forceAll) return;
    if (end + sideMax(it) <= wallLen + 0.5) fitted++;
    cursor = end;
    const depth = it.clearances.rear;
    const p: Placement =
      wall === 'top'
        ? { x: start, y: depth, rot }
        : wall === 'bottom'
          ? { x: start, y: W - depth - it.d, rot }
          : wall === 'left'
            ? { x: depth, y: start, rot }
            : { x: L - depth - it.d, y: start, rot };
    placements.push(p);
  });
  return { placements, fitted };
}

/** Placement automatique (ligne principale puis mur opposé). */
export function autoPlace(items: LayoutSource[], room: Project['room']): Placement[] {
  const primary: Wall = room.lengthMm >= room.widthMm ? 'top' : 'left';
  const opposite = OPPOSITE[primary];
  const all = placeOnWall(items, primary, room, false);
  if (all.fitted === items.length) return all.placements;
  const a = items.filter((i) => i.system === 'A');
  const b = items.filter((i) => i.system === 'B');
  if (b.length > 0) {
    const pa = placeOnWall(a, primary, room, false);
    if (pa.fitted === a.length) {
      const pb = placeOnWall(b, opposite, room, true);
      return [...pa.placements, ...pb.placements];
    }
  }
  const first = items.slice(0, all.fitted);
  const rest = items.slice(all.fitted);
  const p1 = placeOnWall(first, primary, room, true).placements;
  const p2 = placeOnWall(rest, opposite, room, true).placements;
  return [...p1, ...p2];
}

/** Zone de débattement de la porte (carré de la largeur de la porte, côté intérieur). */
export function doorSwing(room: Project['room']): Rect {
  const { wall, offsetMm: o, widthMm: dw } = room.door;
  const L = room.lengthMm;
  const W = room.widthMm;
  if (wall === 'top') return { x: o, y: 0, w: dw, h: dw };
  if (wall === 'bottom') return { x: o, y: W - dw, w: dw, h: dw };
  if (wall === 'left') return { x: 0, y: o, w: dw, h: dw };
  return { x: L - dw, y: o, w: dw, h: dw };
}

export function computeLayout(
  sources: LayoutSource[],
  project: Pick<Project, 'room' | 'layout'>,
  settings: Settings,
): Calc<LayoutResult> & { alerts: Alert[] } {
  const room = project.room;
  const L = room.lengthMm;
  const W = room.widthMm;
  const auto = autoPlace(sources, room);
  const items: LayoutItem[] = sources.map((src, i) => {
    const p = project.layout.positions[src.id] ?? auto[i] ?? { x: 0, y: 0, rot: 0 as Rot };
    return { ...src, x: p.x, y: p.y, rot: p.rot, ...itemGeometry(src, p.x, p.y, p.rot) };
  });

  // Débordements hors du local et zones de dégagement occupées par un autre équipement.
  let minX = 0;
  let maxX = L;
  let minY = 0;
  let maxY = W;
  let zoneX = 0;
  let zoneY = 0;
  const collisions: [string, string][] = [];
  for (const it of items) {
    for (const r of [it.body, ...it.zones.map((z) => z.rect)]) {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.w);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y + r.h);
    }
    for (const other of items) {
      if (other === it) continue;
      for (const z of it.zones) {
        const ov = intersection(z.rect, other.body);
        if (!ov) continue;
        const ws = worldSide(z.side, it.rot);
        if (ws === 'top' || ws === 'bottom') zoneY = Math.max(zoneY, ov.h);
        else zoneX = Math.max(zoneX, ov.w);
      }
    }
  }
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (intersection(items[i]!.body, items[j]!.body))
        collisions.push([items[i]!.id, items[j]!.id]);

  const maxH = Math.max(0, ...items.map((i) => i.h + i.clearances.top));
  const missingMm = {
    length: Math.max(maxX - L - minX, zoneX),
    width: Math.max(maxY - W - minY, zoneY),
    height: Math.max(0, maxH - room.heightMm),
  };
  const isRack = room.kind === 'rack';
  const fits =
    isRack ||
    (missingMm.length < 0.5 &&
      missingMm.width < 0.5 &&
      missingMm.height < 0.5 &&
      collisions.length === 0);

  const allRects = items.flatMap((i) => [i.body, ...i.zones.map((z) => z.rect)]);
  const clipped = allRects.map((r) => clip(r, L, W)).filter((r): r is Rect => r !== null);
  const footprint = unionArea(clipped);
  const equipment = unionArea(
    items.map((i) => clip(i.body, L, W)).filter((r): r is Rect => r !== null),
  );
  const roomArea = L * W;

  // Porte.
  const margin = settings.room.doorMarginMm;
  let missW = 0;
  let missH = 0;
  let worstDoor: string | null = null;
  for (const it of items) {
    const mw = Math.min(it.w, it.d) + margin - room.door.widthMm;
    const mh = it.h - room.door.heightMm;
    if (mw > missW || mh > missH) worstDoor = it.id;
    missW = Math.max(missW, mw);
    missH = Math.max(missH, mh);
  }

  // Sol.
  const admissible = room.floorLoadKgM2 ?? settings.room.defaultFloorLoadKgM2;
  const floorKnown = room.floorLoadKgM2 !== null;
  let maxConc = 0;
  let maxDist = 0;
  let worstFloor: string | null = null;
  // Les petits équipements (tour, rack) ne sont pas une charge ponctuelle significative.
  for (const it of items.filter((i) => i.weightKg >= settings.room.floorCheckMinWeightKg)) {
    const a = (it.w * it.d) / 1e6;
    const conc = it.weightKg / a;
    const zonesArea = it.zones.reduce((s, z) => s + z.rect.w * z.rect.h, 0) / 1e6;
    const dist = it.weightKg / (a + zonesArea);
    if (dist > maxDist) worstFloor = it.id;
    maxConc = Math.max(maxConc, conc);
    maxDist = Math.max(maxDist, dist);
  }
  const totalWeightKg = items.reduce((s, i) => s + i.weightKg, 0);
  const rackUnitsTotal = items.reduce((s, i) => s + (i.rackUnits ?? 0), 0);

  const alerts: Alert[] = [];
  const ref = (id: string | null) => items.find((i) => i.id === id)?.reference ?? '';
  if (!isRack) {
    for (const axis of ['length', 'width', 'height'] as const) {
      if (missingMm[axis] >= 0.5) {
        alerts.push({
          level: 'block',
          code: 'room_too_small',
          params: { axis, missing: Number((missingMm[axis] / 1000).toFixed(2)) },
        });
      }
    }
    if (collisions.length > 0)
      alerts.push({ level: 'block', code: 'items_overlap', params: { count: collisions.length } });
    if (maxDist > admissible) {
      // Charge admissible inconnue (valeur par défaut) : à vérifier plutôt que bloquant.
      alerts.push({
        level: floorKnown ? 'block' : 'warn',
        code: floorKnown ? 'floor_overload' : 'floor_overload_unknown',
        params: { load: Math.round(maxDist), admissible, item: ref(worstFloor) },
      });
    } else if (maxConc > 2 * admissible) {
      // En dessous du double de la charge admissible, une simple répartition (plaques) suffit.
      alerts.push({
        level: 'warn',
        code: 'floor_concentrated',
        params: { load: Math.round(maxConc), admissible },
      });
    }
    if (room.raisedFloor && totalWeightKg > 300) {
      alerts.push({
        level: 'warn',
        code: 'raised_floor_support',
        params: { weight: Math.round(totalWeightKg) },
      });
    }
    const swing = doorSwing(room);
    if (items.some((i) => intersection(i.body, swing)))
      alerts.push({ level: 'warn', code: 'door_blocked', params: {} });
  } else {
    alerts.push({ level: 'ok', code: 'rack_units', params: { u: rackUnitsTotal } });
  }
  if (missW > 0.5) {
    alerts.push({
      level: 'block',
      code: 'door_too_narrow',
      params: { missing: Number((missW / 1000).toFixed(2)), item: ref(worstDoor) },
    });
  }
  if (missH > 0.5) {
    alerts.push({
      level: 'block',
      code: 'door_too_low',
      params: { missing: Number((missH / 1000).toFixed(2)), item: ref(worstDoor) },
    });
  }

  const t = trace('calc.layout.title')
    .step({
      label: 'calc.layout.footprint',
      formula: 'Emprise = ∪ (empreintes + dégagements)',
      substituted: `${items.length} équipements`,
      result: Number((footprint / 1e6).toFixed(2)),
      unit: 'm²',
    })
    .step({
      label: 'calc.layout.remaining',
      formula: 'S_restante = L × l − emprise',
      substituted: `${fmt(L / 1000)} × ${fmt(W / 1000)} − ${fmt(footprint / 1e6)}`,
      result: Number(((roomArea - footprint) / 1e6).toFixed(2)),
      unit: 'm²',
    })
    .step({
      label: 'calc.layout.door',
      formula: 'min(L, P) + marge ≤ l_porte ; H ≤ h_porte',
      substituted: `l_porte = ${room.door.widthMm} mm, h_porte = ${room.door.heightMm} mm`,
      result: missW <= 0.5 && missH <= 0.5 ? 'OK' : '✗',
      unit: '',
    })
    .step({
      label: 'calc.layout.floor',
      formula: 'q = m ÷ (emprise + dégagements)',
      substituted: `max = ${fmt(maxDist, 0)} kg/m² (concentrée : ${fmt(maxConc, 0)})`,
      result: Math.round(maxDist),
      unit: 'kg/m²',
    })
    .build();

  return {
    value: {
      room: { lengthMm: L, widthMm: W, heightMm: room.heightMm },
      door: {
        wall: room.door.wall,
        offsetMm: room.door.offsetMm,
        widthMm: room.door.widthMm,
        heightMm: room.door.heightMm,
      },
      items,
      equipmentAreaM2: equipment / 1e6,
      footprintWithClearancesM2: footprint / 1e6,
      roomAreaM2: roomArea / 1e6,
      remainingAreaM2: (roomArea - footprint) / 1e6,
      missingMm,
      fits,
      collisions,
      door_check: {
        ok: missW <= 0.5 && missH <= 0.5,
        missingWidthMm: Math.max(0, missW),
        missingHeightMm: Math.max(0, missH),
        worstItemId: worstDoor,
      },
      floor: {
        admissibleKgM2: admissible,
        maxConcentratedKgM2: maxConc,
        maxDistributedKgM2: maxDist,
        worstItemId: worstFloor,
        totalWeightKg,
      },
      rackUnitsTotal,
    },
    trace: t,
    alerts,
  };
}
