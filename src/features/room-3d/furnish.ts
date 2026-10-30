/**
 * Aménagement du local selon son type (sans dépendance à three.js, testable) : baies 19"
 * existantes et leur contenu, mobilier et équipements techniques du bâtiment, revêtement de sol.
 *
 * - Salle technique dédiée : tableau électrique, climatisation (split mural ou armoire de
 *   précision selon la puissance froid), extincteur CO₂ (le chemin de câbles
 *   suit le câblage, voir cabling.ts).
 * - Local partagé : rayonnages de stockage, coffret réseau mural, tableau électrique.
 * - Bureau : postes de travail (bureau, écran, fauteuil), fenêtre, plante, split mural.
 * - Baie existante : rangée de baies 42U déjà équipées (brassage, commutateurs, serveurs,
 *   stockage) ; les équipements rackables du projet sont montés en bas de la baie d'accueil.
 *
 * Selon le secteur (aéroport, médical, industriel, réseau d'entreprise, ascenseur), des éléments
 * propres au milieu s'ajoutent : contrôle d'accès et affichage des vols, tableau IT médical et
 * chariot de soins, armoires d'automates et marquage au sol, baie de brassage ouverte et borne
 * Wi-Fi, machine de traction et armoire de manœuvre d'ascenseur.
 *
 * Tout est placé le long des murs, hors de l'emprise des équipements, de leurs dégagements et du
 * débattement de la porte. Un élément qui ne trouve pas de place n'est pas dessiné.
 */
import type { RoomKind } from '../../engine/project';
import type { ScenarioId } from '../../settings/schema';

export type WallSide = 'top' | 'bottom' | 'left' | 'right';

/** Rectangle au sol (m) : coin minimal (x, z) et tailles. */
export interface FloorRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export type DecorKind =
  | 'desk'
  | 'electrical-panel'
  | 'split-ac'
  | 'crac'
  | 'extinguisher'
  | 'cable-tray'
  | 'shelving'
  | 'network-cabinet'
  | 'window'
  | 'plant'
  // Éléments propres au secteur.
  | 'access-panel'
  | 'badge-reader'
  | 'security-camera'
  | 'fids-screen'
  | 'medical-panel'
  | 'medical-cart'
  | 'plc-cabinet'
  | 'floor-marking'
  | 'open-rack'
  | 'wifi-ap'
  | 'lift-machine'
  | 'lift-controller'
  | 'hoist-beam'
  | 'sign'
  // Tableau ondulé (départs en sortie d'UPS).
  | 'ups-board';

/** Pictogramme d'une plaque murale. */
export type SignKind = 'medical' | 'danger' | 'lift';

export interface Decor3D {
  kind: DecorKind;
  /** Centre de l'emprise (m) et altitude de la base. */
  x: number;
  z: number;
  y: number;
  /** Rotation autour de Y : face avant tournée vers l'intérieur du local. */
  rotY: number;
  /** Largeur (le long du mur), profondeur, hauteur (m). */
  w: number;
  d: number;
  h: number;
  /** Mur porteur : l'élément suit la coupe de ce mur. */
  wall: WallSide;
  /** Pictogramme (plaque murale). */
  sign?: SignKind;
}

export type RackGearType =
  'patch' | 'cable' | 'switch' | 'router' | 'firewall' | 'server' | 'storage' | 'kvm' | 'blank';

/** Équipement déjà installé dans une baie : unité basse (1…42) et hauteur en U. */
export interface RackGear {
  u: number;
  n: number;
  type: RackGearType;
}

export interface Rack3D {
  x: number;
  z: number;
  rotY: number;
  w: number;
  d: number;
  h: number;
  units: number;
  gear: RackGear[];
  /** Baie qui reçoit les équipements rackables du projet. */
  host: boolean;
  /** Panneaux latéraux pleins aux extrémités de la rangée. */
  sides: { left: boolean; right: boolean };
}

export type FloorFinish = 'epoxy' | 'raised' | 'concrete' | 'carpet' | 'vinyl' | 'industrial';

export interface Furnishing {
  floor: FloorFinish;
  wallColor: number;
  decor: Decor3D[];
}

/** Hauteur d'une unité de baie (m) et altitude de l'unité 1 (socle). */
export const RACK_U = 0.04445;
export const RACK_BASE = 0.1;
export const RACK = { w: 0.6, d: 1.0, h: 2.0, units: 42 } as const;

const WALL_ROT: Record<WallSide, number> = {
  top: 0,
  bottom: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

export interface RoomFrame {
  length: number;
  width: number;
  height: number;
  door: { wall: WallSide; offset: number; width: number; height: number };
}

export function overlaps(a: FloorRect, b: FloorRect, eps = 1e-3): boolean {
  return (
    a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.z < b.z + b.d - eps && b.z < a.z + a.d - eps
  );
}

/** Débattement de la porte (battant ouvrant vers l'intérieur). */
export function doorSwingRect(room: RoomFrame): FloorRect {
  const { wall, offset: o, width: dw } = room.door;
  if (wall === 'top') return { x: o, z: 0, w: dw, d: dw };
  if (wall === 'bottom') return { x: o, z: room.width - dw, w: dw, d: dw };
  if (wall === 'left') return { x: 0, z: o, w: dw, d: dw };
  return { x: room.length - dw, z: o, w: dw, d: dw };
}

const wallLength = (room: RoomFrame, wall: WallSide) =>
  wall === 'top' || wall === 'bottom' ? room.length : room.width;

/** Emprise d'un élément adossé au mur : position `a` le long du mur, profondeur `depth`. */
function wallRect(
  room: RoomFrame,
  wall: WallSide,
  a: number,
  len: number,
  from: number,
  depth: number,
): FloorRect {
  if (wall === 'top') return { x: a, z: from, w: len, d: depth };
  if (wall === 'bottom') return { x: a, z: room.width - from - depth, w: len, d: depth };
  if (wall === 'left') return { x: from, z: a, w: depth, d: len };
  return { x: room.length - from - depth, z: a, w: depth, d: len };
}

export interface Spot {
  wall: WallSide;
  /** Position le long du mur (début), m. */
  a: number;
  x: number;
  z: number;
  rotY: number;
  body: FloorRect;
  front: FloorRect;
}

/**
 * Cherche une place le long des murs pour un élément de largeur `len` (le long du mur) et de
 * profondeur `depth`, avec un dégagement `clear` devant. Les murs sont essayés dans l'ordre donné ;
 * avec `near`, la place la plus proche de ce point est retenue sur le premier mur qui en a une.
 */
export function findWallSpot(
  room: RoomFrame,
  spec: {
    len: number;
    depth: number;
    clear: number;
    walls: WallSide[];
    near?: { x: number; z: number };
    /** Distance minimale aux angles du local (m). */
    margin?: number;
    /** Écart au mur (m), pour les éléments posés devant une plinthe ou un tableau. */
    from?: number;
  },
  occupied: FloorRect[],
): Spot | null {
  const margin = spec.margin ?? 0.05;
  const from = spec.from ?? 0;
  const step = 0.05;
  for (const wall of spec.walls) {
    const wl = wallLength(room, wall);
    const span = wall === 'top' || wall === 'bottom' ? room.width : room.length;
    if (from + spec.depth + spec.clear > span) continue;
    let best: Spot | null = null;
    let bestScore = Infinity;
    for (let a = margin; a + spec.len <= wl - margin + 1e-9; a += step) {
      const body = wallRect(room, wall, a, spec.len, from, spec.depth);
      const front = wallRect(room, wall, a, spec.len, from + spec.depth, spec.clear);
      if (occupied.some((o) => overlaps(o, body) || (spec.clear > 0 && overlaps(o, front))))
        continue;
      const x = body.x + body.w / 2;
      const z = body.z + body.d / 2;
      const score = spec.near ? Math.hypot(x - spec.near.x, z - spec.near.z) : a;
      if (score < bestScore) {
        bestScore = score;
        best = { wall, a, x, z, rotY: WALL_ROT[wall], body, front };
      }
      if (!spec.near) break;
    }
    if (best) return best;
  }
  return null;
}

/** Murs dans l'ordre de préférence : `first` d'abord, puis le mur opposé à la porte… */
function wallOrder(room: RoomFrame, first?: WallSide): WallSide[] {
  const opposite: Record<WallSide, WallSide> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  const order: WallSide[] = [];
  const push = (w: WallSide) => !order.includes(w) && order.push(w);
  if (first) push(first);
  push(opposite[room.door.wall]);
  for (const w of ['top', 'left', 'right', 'bottom'] as const) push(w);
  return order;
}

/** Mur contre lequel est adossé un équipement, d'après sa rotation (face avant vers +Z à 0). */
export function wallOfRotation(rotY: number): WallSide {
  const deg = ((Math.round((rotY * 180) / Math.PI) % 360) + 360) % 360;
  if (deg === 0) return 'top';
  if (deg === 180) return 'bottom';
  if (deg === 90) return 'left';
  return 'right';
}

/**
 * Contenu type d'une baie existante, de l'unité `top` vers le bas jusqu'à l'unité `bottom` :
 * brassage et commutateurs en haut, serveurs au milieu, stockage en bas (les charges lourdes en
 * bas de baie). Le motif varie d'une baie à l'autre.
 */
export function existingRackGear(index: number, bottom: number, top = RACK.units): RackGear[] {
  const network: [RackGearType, number][] = [
    ['patch', 1],
    ['cable', 1],
    ['switch', 1],
    ['patch', 1],
    ['cable', 1],
    ['switch', 1],
    ['blank', 1],
  ];
  const patterns: [RackGearType, number][][] = [
    [
      ...network,
      ['router', 1],
      ['firewall', 1],
      ['blank', 1],
      ['kvm', 1],
      ['server', 1],
      ['server', 1],
      ['server', 1],
      ['server', 2],
      ['server', 2],
      ['blank', 2],
      ['storage', 2],
    ],
    [
      ...network,
      ['server', 1],
      ['server', 1],
      ['server', 1],
      ['server', 1],
      ['blank', 1],
      ['server', 2],
      ['server', 2],
      ['server', 2],
      ['blank', 1],
      ['storage', 3],
      ['storage', 2],
    ],
    [
      ['patch', 1],
      ['cable', 1],
      ['switch', 1],
      ['blank', 2],
      ['server', 2],
      ['server', 2],
      ['server', 2],
      ['server', 2],
      ['blank', 1],
      ['server', 1],
      ['server', 1],
      ['kvm', 1],
      ['blank', 2],
      ['storage', 4],
    ],
  ];
  const pattern = patterns[index % patterns.length]!;
  const gear: RackGear[] = [];
  let u = top; // unité haute du prochain équipement
  for (const [type, n] of pattern) {
    const low = u - n + 1;
    if (low < bottom) break;
    gear.push({ u: low, n, type });
    u = low - 1;
  }
  return gear;
}

export interface RackMount {
  id: string;
  units: number;
}

/**
 * Rangée de baies existantes et montage des équipements rackables : ils sont empilés à partir de
 * l'unité 1 de la baie d'accueil (UPS et modules batteries en bas, pour la stabilité), puis dans
 * la baie suivante si la première est pleine ; le reste de chaque baie garde son contenu existant.
 */
export function buildRackRow(
  room: RoomFrame,
  mounts: RackMount[],
  occupied: FloorRect[],
  prefer?: { wall: WallSide; x: number; z: number },
): { racks: Rack3D[]; positions: Map<string, { rack: number; u: number }>; spot: Spot | null } {
  // Unités nécessaires et nombre minimal de baies d'accueil (1 U libre sous le contenu existant).
  const usable = RACK.units - 8; // le haut de baie garde le brassage et les commutateurs
  const hosts: RackMount[][] = [[]];
  let used = 0;
  for (const m of mounts) {
    if (used + m.units > usable && hosts[hosts.length - 1]!.length > 0) {
      hosts.push([]);
      used = 0;
    }
    hosts[hosts.length - 1]!.push(m);
    used += m.units;
  }
  const minRacks = Math.max(1, mounts.length > 0 ? hosts.length : 1);
  const walls = wallOrder(room, prefer?.wall);
  let spot: Spot | null = null;
  let count = 0;
  for (let n = Math.max(minRacks, 3); n >= minRacks && !spot; n--) {
    spot = findWallSpot(
      room,
      { len: n * RACK.w, depth: RACK.d, clear: 1.0, walls, near: prefer, margin: 0.1 },
      occupied,
    );
    count = n;
  }
  // Sans place libre (local trop petit), la rangée est posée sur le mur préféré.
  if (!spot) {
    count = minRacks;
    const wall = walls[0]!;
    const len = count * RACK.w;
    const a = Math.max(0, Math.min(wallLength(room, wall) - len, 0.1));
    const body = wallRect(room, wall, a, len, 0, RACK.d);
    spot = {
      wall,
      a,
      x: body.x + body.w / 2,
      z: body.z + body.d / 2,
      rotY: WALL_ROT[wall],
      body,
      front: wallRect(room, wall, a, len, RACK.d, 1.0),
    };
  }
  // Baies d'accueil au centre de la rangée (plus près de l'emplacement prévu au plan).
  const firstHost = Math.max(0, Math.min(count - hosts.length, Math.floor((count - 1) / 2)));
  const positions = new Map<string, { rack: number; u: number }>();
  const racks: Rack3D[] = [];
  // Sur les murs bas et gauche, la gauche de la baie (vue de face) est en fin de rangée.
  const flip = spot.wall === 'bottom' || spot.wall === 'left';
  for (let i = 0; i < count; i++) {
    // Centre de la baie i le long du mur (repère local de la rangée : +X le long du mur).
    const along = spot.a + RACK.w * (i + 0.5);
    const r = wallRect(room, spot.wall, along - RACK.w / 2, RACK.w, 0, RACK.d);
    const hostIdx = i - firstHost;
    const mine = hostIdx >= 0 && hostIdx < hosts.length ? hosts[hostIdx]! : [];
    let u = 1;
    for (const m of mine) {
      positions.set(m.id, { rack: i, u });
      u += m.units;
    }
    // Un U libre au-dessus des équipements montés, puis le contenu existant.
    const bottom = mine.length > 0 ? u + 1 : 3;
    racks.push({
      x: r.x + r.w / 2,
      z: r.z + r.d / 2,
      rotY: spot.rotY,
      w: RACK.w,
      d: RACK.d,
      h: RACK.h,
      units: RACK.units,
      gear: existingRackGear(i, bottom),
      host: mine.length > 0,
      // Côtés gauche / droite dans le repère de la baie (vue de face).
      sides: flip
        ? { left: i === count - 1, right: i === 0 }
        : { left: i === 0, right: i === count - 1 },
    });
  }
  return { racks, positions, spot };
}

/** Aménagement propre au type de local. */
export function furnishRoom(
  room: RoomFrame,
  kind: RoomKind,
  env: { raisedFloor: boolean; hvacKW: number | null; sector?: ScenarioId },
  occupied: FloorRect[],
  preferWall?: WallSide,
): Furnishing {
  const taken = [...occupied, doorSwingRect(room)];
  const decor: Decor3D[] = [];
  const H = room.height;
  // Le mobilier et le bâtiment occupent d'abord les murs libres, le mur des équipements en dernier.
  const order = wallOrder(room).filter((w) => w !== preferWall);
  if (preferWall) order.push(preferWall);
  const trayWall = preferWall ?? order[0]!;
  // Éléments muraux en hauteur (split, coffret, fenêtre) : ne se chevauchent pas entre eux.
  const high: FloorRect[] = [];
  const doorStrip = doorSwingRect(room);
  // Porte et son chambranle (0,15 m de part et d'autre) : rien n'est fixé au mur dessus.
  const doorFrame = {
    x: doorStrip.x - 0.15,
    z: doorStrip.z - 0.15,
    w: doorStrip.w + 0.3,
    d: doorStrip.d + 0.3,
  };

  const place = (
    k: DecorKind,
    size: { w: number; d: number; h: number },
    opts: { clear: number; y?: number; walls?: WallSide[]; near?: { x: number; z: number } },
  ): Decor3D | null => {
    const s = findWallSpot(
      room,
      {
        len: size.w,
        depth: size.d,
        clear: opts.clear,
        walls: opts.walls ?? order,
        near: opts.near,
        margin: 0.15,
      },
      taken,
    );
    if (!s) return null;
    taken.push(s.body);
    if (opts.clear > 0) taken.push(s.front);
    const d: Decor3D = {
      kind: k,
      x: s.x,
      z: s.z,
      y: opts.y ?? 0,
      rotY: s.rotY,
      ...size,
      wall: s.wall,
    };
    decor.push(d);
    return d;
  };

  /** Élément mural en hauteur : seul le recouvrement avec les autres éléments hauts compte. */
  const placeHigh = (
    k: DecorKind,
    size: { w: number; d: number; h: number },
    y: number,
    walls: WallSide[],
    blockers: FloorRect[] = [],
    near?: { x: number; z: number },
  ): Decor3D | null => {
    const s = findWallSpot(
      room,
      { len: size.w, depth: Math.max(size.d, 0.3), clear: 0, walls, margin: 0.3, near },
      [...high, ...blockers, doorFrame],
    );
    if (!s) return null;
    high.push(s.body);
    const body = wallRect(room, s.wall, s.a, size.w, 0, size.d);
    const d: Decor3D = {
      kind: k,
      x: body.x + body.w / 2,
      z: body.z + body.d / 2,
      y,
      rotY: s.rotY,
      ...size,
      wall: s.wall,
    };
    decor.push(d);
    return d;
  };

  const hvac = env.hvacKW ?? 0;
  const technical = kind === 'dedicated' || kind === 'rack';

  const nearDoor = { x: doorStrip.x + doorStrip.w / 2, z: doorStrip.z + doorStrip.d / 2 };
  // Éléments propres au secteur, placés avant le mobilier générique (prioritaires sur la place).
  const sector = env.sector;
  const sign = (s: SignKind, blockers: FloorRect[]) => {
    const d = placeHigh('sign', { w: 0.3, d: 0.02, h: 0.3 }, 1.75, order, blockers);
    if (d) d.sign = s;
  };
  if (sector === 'airport') {
    // Contrôle d'accès : lecteur de badge à côté de la porte, centrale murale, caméra en hauteur,
    // écran d'affichage des vols (supervision des écrans du terminal).
    placeHigh('badge-reader', { w: 0.09, d: 0.04, h: 0.14 }, 1.05, [room.door.wall], [], nearDoor);
    placeHigh('access-panel', { w: 0.45, d: 0.15, h: 0.55 }, 1.3, order, taken);
    placeHigh('fids-screen', { w: 1.1, d: 0.08, h: 0.65 }, 1.55, order, taken);
    placeHigh('security-camera', { w: 0.25, d: 0.3, h: 0.25 }, H - 0.45, order);
  } else if (sector === 'medical') {
    // Tableau IT médical (transformateur d'isolement, contrôleur d'isolement) et chariot de soins.
    place('medical-panel', { w: 0.8, d: 0.45, h: 1.9 }, { clear: 0.8 });
    place('medical-cart', { w: 0.6, d: 0.5, h: 1.35 }, { clear: 0 });
    sign('medical', taken);
  } else if (sector === 'industrial') {
    // Armoires d'automates (RAL 7035) avec pupitre IHM en façade, marquage de sécurité au sol.
    for (let i = 0; i < 2; i++) place('plc-cabinet', { w: 0.8, d: 0.4, h: 1.8 }, { clear: 0.8 });
    decor.push({
      kind: 'floor-marking',
      x: room.length / 2,
      z: room.width / 2,
      y: 0.001,
      rotY: 0,
      w: room.length,
      d: room.width,
      h: 0.002,
      wall: 'top',
    });
    sign('danger', taken);
  } else if (sector === 'enterprise') {
    // Local de brassage : baie ouverte 2 montants (brassage, commutateurs), coffret mural, Wi-Fi.
    place('open-rack', { w: 0.55, d: 0.6, h: 2.0 }, { clear: 0.8 });
    if (kind !== 'shared')
      placeHigh('network-cabinet', { w: 0.6, d: 0.45, h: 0.64 }, 1.25, order, taken);
    placeHigh('wifi-ap', { w: 0.22, d: 0.05, h: 0.22 }, H - 0.4, order);
  } else if (sector === 'elevator') {
    // Local de machinerie : machine de traction (moteur, poulie, câbles vers la gaine), armoire de
    // manœuvre et poutre de levage au-dessus de la machine.
    // Au fond du local, à l'opposé de la porte (au-dessus de la gaine), même à côté des UPS.
    const far = doorStrip.z > room.width / 2 ? 0 : room.width;
    const machine = place(
      'lift-machine',
      { w: 1.2, d: 0.8, h: H },
      { clear: 0.6, near: { x: room.length - 1, z: far }, walls: wallOrder(room) },
    );
    place('lift-controller', { w: 0.8, d: 0.4, h: 1.9 }, { clear: 0.8 });
    if (machine)
      decor.push({
        ...machine,
        kind: 'hoist-beam',
        y: H - 0.25,
        w: Math.min(2.4, wallLength(room, machine.wall) - 0.2),
        d: 0.12,
        h: 0.2,
      });
    sign('lift', taken);
  }

  /** Tableau ondulé mural à côté du tableau électrique (départs en sortie d'UPS). */
  const upsBoard = (panel: Decor3D | null) =>
    placeHigh(
      'ups-board',
      { w: 0.5, d: 0.15, h: 0.6 },
      1.2,
      order,
      taken,
      panel ? { x: panel.x, z: panel.z } : undefined,
    );

  if (technical) {
    // Climatisation : armoire de précision au-delà de ~15 kW froid, sinon split mural.
    // Le split est sur un autre mur que le chemin de câbles.
    if (hvac >= 15) place('crac', { w: 0.9, d: 0.85, h: 1.95 }, { clear: 0.8 });
    else if (hvac > 0)
      placeHigh('split-ac', { w: 1.0, d: 0.24, h: 0.32 }, H - 0.55, [
        ...order.filter((w) => w !== trayWall),
        trayWall,
      ]);
    // Tableau électrique de distribution (accès frontal 0,8 m).
    const panel = place('electrical-panel', { w: 0.8, d: 0.25, h: 1.4 }, { clear: 0.8, y: 0 });
    upsBoard(panel);
    place('extinguisher', { w: 0.2, d: 0.2, h: 0.7 }, { clear: 0, near: nearDoor });
  } else if (kind === 'shared') {
    for (let i = 0; i < 2; i++) place('shelving', { w: 1.0, d: 0.45, h: 1.9 }, { clear: 0.7 });
    const panel = place('electrical-panel', { w: 0.6, d: 0.2, h: 1.0 }, { clear: 0.8 });
    upsBoard(panel);
    // Coffret réseau mural 19" (12U) au-dessus d'un espace libre.
    placeHigh('network-cabinet', { w: 0.6, d: 0.45, h: 0.64 }, 1.25, order, taken);
    if (hvac > 0) placeHigh('split-ac', { w: 0.9, d: 0.22, h: 0.3 }, H - 0.45, order);
    place('extinguisher', { w: 0.2, d: 0.2, h: 0.6 }, { clear: 0, near: nearDoor });
  } else if (kind === 'office') {
    // Fenêtre sur un mur sans porte, puis postes de travail (dégagement pour le fauteuil).
    const windowWalls = order.filter((w) => w !== room.door.wall);
    placeHigh('window', { w: 1.4, d: 0.12, h: 1.25 }, 0.95, windowWalls, occupied);
    for (let i = 0; i < 2; i++) place('desk', { w: 1.4, d: 0.75, h: 0.74 }, { clear: 0.9 });
    place('plant', { w: 0.45, d: 0.45, h: 1.1 }, { clear: 0 });
    if (hvac > 0) placeHigh('split-ac', { w: 0.85, d: 0.22, h: 0.3 }, H - 0.45, order);
  }

  let floor: FloorFinish =
    kind === 'office'
      ? 'carpet'
      : kind === 'shared'
        ? 'concrete'
        : env.raisedFloor
          ? 'raised'
          : 'epoxy';
  let wallColor = kind === 'office' ? 0xf4f1ea : kind === 'shared' ? 0xe4e4e0 : 0xf2f4f7;
  // Revêtements du secteur (sauf bureau et faux plancher, qui gardent le leur).
  if (kind !== 'office' && floor !== 'raised') {
    if (sector === 'medical') [floor, wallColor] = ['vinyl', 0xeef6f3];
    else if (sector === 'industrial') [floor, wallColor] = ['industrial', 0xe3e5e7];
    else if (sector === 'elevator') [floor, wallColor] = ['concrete', 0xe7e6e2];
  }
  return { floor, wallColor, decor };
}
