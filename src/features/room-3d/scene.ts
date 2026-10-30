/**
 * Construction de la scène three.js à partir du modèle `Room3D` : local (sol quadrillé, murs,
 * porte ouverte), équipements détaillés (armoires UPS, châssis modulaires avec leurs modules,
 * armoires batteries avec étagères et blocs), dégagements et cotes du local.
 *
 * Le mode « intérieur » rend les carrosseries translucides et affiche le contenu (blocs, modules
 * internes, organes de puissance) ; il se bascule sans reconstruire la scène (`setXray`).
 */
import * as THREE from 'three';
import { buildDecor, buildRack, FLOOR_STYLE, furnishMaterials } from './furnishScene';
import type { Cable3D } from './cabling';
import type { Item3D, Room3D, Vec3 } from './model';

export type WallSide = 'top' | 'bottom' | 'left' | 'right';

export interface DimensionLine {
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** Longueur en mètres (le libellé est formaté par l'interface). */
  length: number;
  kind: 'room' | 'item';
}

export interface BuiltScene {
  root: THREE.Group;
  walls: { mesh: THREE.Mesh; side: WallSide }[];
  /** Carrosseries cliquables (userData.itemId). */
  pickables: THREE.Object3D[];
  items: Map<string, THREE.Group>;
  zones: THREE.Group;
  dimensions: DimensionLine[];
  dimensionGroup: THREE.Group;
  /** Câbles et chemins de câbles (affichage commutable). */
  cables: THREE.Group;
  center: THREE.Vector3;
  setXray: (on: boolean) => void;
  setHighlight: (id: string | null) => void;
  dispose: () => void;
}

const COLORS = {
  body: 0x2d333a,
  bodyBattery: 0x3a434d,
  door: 0x39414a,
  accent: 0x1f4e79,
  vent: 0x14181c,
  display: 0x4fc3f7,
  led: 0x39d353,
  module: 0x5d6d80,
  moduleFace: 0xc5cdd6,
  blank: 0x1a1e23,
  vrla: 0x1d1f22,
  lfp: 0x2b5f8c,
  terminalPos: 0xc62828,
  shelf: 0x9aa3ad,
  zone: 0x0f766e,
  doorLeaf: 0xb07a3c,
  dim: 0x1f4e79,
  highlight: 0xffb300,
};

type Mat = THREE.MeshStandardMaterial;

function material(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): Mat {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.25, ...opts });
}

/** Boîte dont l'origine est le centre de la face inférieure. */
function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildScene(room: Room3D): BuiltScene {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);
  const floorStyle = FLOOR_STYLE[room.furnishing.floor];
  const M = {
    floor: track(material(floorStyle.color, { roughness: 0.9, metalness: 0 })),
    wall: track(
      material(room.furnishing.wallColor, {
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 1,
      }),
    ),
    body: track(material(COLORS.body, { transparent: true })),
    bodyBattery: track(material(COLORS.bodyBattery, { transparent: true })),
    door: track(material(COLORS.door, { transparent: true })),
    accent: track(material(COLORS.accent, { metalness: 0.4 })),
    vent: track(material(COLORS.vent, { roughness: 0.9 })),
    display: track(material(COLORS.display, { emissive: COLORS.display, emissiveIntensity: 0.8 })),
    led: track(material(COLORS.led, { emissive: COLORS.led, emissiveIntensity: 1.2 })),
    module: track(material(COLORS.module, { metalness: 0.5 })),
    moduleFace: track(material(COLORS.moduleFace, { metalness: 0.6, roughness: 0.4 })),
    blank: track(material(COLORS.blank)),
    vrla: track(material(COLORS.vrla, { roughness: 0.5 })),
    lfp: track(material(COLORS.lfp, { roughness: 0.45 })),
    terminal: track(material(COLORS.terminalPos)),
    shelf: track(material(COLORS.shelf, { metalness: 0.6 })),
    zone: track(
      material(COLORS.zone, { transparent: true, opacity: 0.18, metalness: 0, depthWrite: false }),
    ),
    doorLeaf: track(
      material(COLORS.doorLeaf, { roughness: 0.7, metalness: 0, transparent: true, opacity: 0.55 }),
    ),
    glass: track(
      material(0x9fb4c8, {
        transparent: true,
        opacity: 0.18,
        metalness: 0.1,
        roughness: 0.1,
        depthWrite: false,
      }),
    ),
    power: track(material(0x6b7f95, { metalness: 0.5 })),
    copper: track(material(0xb87333, { metalness: 0.8, roughness: 0.35 })),
  };
  const shells: Mat[] = [M.body, M.bodyBattery, M.door];
  const root = new THREE.Group();
  root.name = 'room';
  const L = room.length;
  const W = room.width;
  const H = room.height;
  const center = new THREE.Vector3(L / 2, 0, W / 2);

  // ── Sol et quadrillage ──
  const floor = box(L + 0.2, 0.02, W + 0.2, M.floor, L / 2, -0.02, W / 2);
  floor.castShadow = false;
  root.add(floor);
  const step = Math.max(L, W) > 12 ? Math.max(1, floorStyle.step) : floorStyle.step;
  const pts: number[] = [];
  for (let x = 0; x <= L + 1e-6; x += step) pts.push(x, 0.002, 0, x, 0.002, W);
  for (let z = 0; z <= W + 1e-6; z += step) pts.push(0, 0.002, z, L, 0.002, z);
  const gridGeo = track(new THREE.BufferGeometry());
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const gridMat = track(
    new THREE.LineBasicMaterial({ color: floorStyle.grid, transparent: true, opacity: 0.6 }),
  );
  root.add(new THREE.LineSegments(gridGeo, gridMat));

  // ── Murs (porte découpée dans son mur) ──
  const T = 0.1;
  const walls: BuiltScene['walls'] = [];
  const wallSpecs: {
    side: WallSide;
    len: number;
    place: (a: number, len: number, y: number, h: number) => THREE.Mesh;
  }[] = [
    {
      side: 'top',
      len: L,
      place: (a, len, y, h) => box(len, h, T, M.wall, a + len / 2, y, -T / 2),
    },
    {
      side: 'bottom',
      len: L,
      place: (a, len, y, h) => box(len, h, T, M.wall, a + len / 2, y, W + T / 2),
    },
    {
      side: 'left',
      len: W,
      place: (a, len, y, h) => box(T, h, len, M.wall, -T / 2, y, a + len / 2),
    },
    {
      side: 'right',
      len: W,
      place: (a, len, y, h) => box(T, h, len, M.wall, L + T / 2, y, a + len / 2),
    },
  ];
  for (const ws of wallSpecs) {
    // Tronçons [début, longueur, altitude, hauteur] ; le mur de la porte est découpé.
    const pieces: [number, number, number, number][] = [];
    if (ws.side === room.door.wall) {
      const o = Math.min(Math.max(0, room.door.offset), ws.len);
      const e = Math.min(ws.len, o + room.door.width);
      if (o > 0) pieces.push([0, o, 0, H]);
      if (e < ws.len) pieces.push([e, ws.len - e, 0, H]);
      if (room.door.height < H) pieces.push([o, e - o, room.door.height, H - room.door.height]);
    } else pieces.push([0, ws.len, 0, H]);
    const closesCorners = ws.side === 'top' || ws.side === 'bottom';
    for (const [a, len, y, h] of pieces) {
      // Les murs haut et bas couvrent les angles.
      const start = closesCorners && a <= 0 ? -T : a;
      const end = closesCorners && a + len >= ws.len ? ws.len + T : a + len;
      const mesh = ws.place(start, end - start, y, h);
      mesh.castShadow = false;
      walls.push({ mesh, side: ws.side });
      root.add(mesh);
    }
  }

  // Battant de porte ouvert à 90° vers l'intérieur et arc d'ouverture au sol.
  {
    const { wall, offset, width, height } = room.door;
    const leaf = box(0.04, height, width, M.doorLeaf);
    const arcPts: THREE.Vector3[] = [];
    // Battant perpendiculaire au mur, côté intérieur.
    if (wall === 'top') leaf.position.set(offset, 0, width / 2);
    else if (wall === 'bottom') leaf.position.set(offset, 0, W - width / 2);
    else if (wall === 'left') {
      leaf.rotation.y = Math.PI / 2;
      leaf.position.set(width / 2, 0, offset);
    } else {
      leaf.rotation.y = Math.PI / 2;
      leaf.position.set(L - width / 2, 0, offset);
    }
    leaf.castShadow = false;
    // Le battant suit la coupe de son mur (masqué quand le mur l'est).
    walls.push({ mesh: leaf, side: wall });
    root.add(leaf);
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * (Math.PI / 2);
      if (wall === 'top')
        arcPts.push(new THREE.Vector3(offset + Math.sin(t) * width, 0.004, Math.cos(t) * width));
      else if (wall === 'bottom')
        arcPts.push(
          new THREE.Vector3(offset + Math.sin(t) * width, 0.004, W - Math.cos(t) * width),
        );
      else if (wall === 'left')
        arcPts.push(new THREE.Vector3(Math.cos(t) * width, 0.004, offset + Math.sin(t) * width));
      else
        arcPts.push(
          new THREE.Vector3(L - Math.cos(t) * width, 0.004, offset + Math.sin(t) * width),
        );
    }
    const arcGeo = track(new THREE.BufferGeometry().setFromPoints(arcPts));
    const arcMat = track(
      new THREE.LineDashedMaterial({ color: COLORS.doorLeaf, dashSize: 0.08, gapSize: 0.05 }),
    );
    const arc = new THREE.Line(arcGeo, arcMat);
    arc.computeLineDistances();
    root.add(arc);
  }

  // ── Dégagements ──
  const zones = new THREE.Group();
  zones.name = 'zones';
  for (const z of room.zones) {
    const m = box(z.w, 0.006, z.d, M.zone, z.x, 0.001, z.z);
    m.castShadow = false;
    m.receiveShadow = false;
    zones.add(m);
    const edges = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.d))),
      track(new THREE.LineDashedMaterial({ color: COLORS.zone, dashSize: 0.06, gapSize: 0.04 })),
    );
    edges.rotation.x = -Math.PI / 2;
    edges.position.set(z.x, 0.008, z.z);
    edges.computeLineDistances();
    zones.add(edges);
  }
  root.add(zones);

  // ── Câblage : chemins de câbles et câbles (axes alignés), couleur selon la liaison ──
  const cables = new THREE.Group();
  cables.name = 'cabling';
  const CABLE: Record<Cable3D['kind'], { color: number; r: number }> = {
    mains: { color: 0x2b2f33, r: 0.04 },
    input: { color: 0x7b4a2e, r: 0.035 },
    battery: { color: 0xc62828, r: 0.03 },
    output: { color: 0x1f6fb2, r: 0.035 },
    feeder: { color: 0xef8c00, r: 0.024 },
  };
  const cableMats = Object.fromEntries(
    Object.entries(CABLE).map(([k, v]) => [
      k,
      track(material(v.color, { roughness: 0.55, metalness: 0.05 })),
    ]),
  ) as Record<Cable3D['kind'], Mat>;
  const trayMat = track(material(0xa7adb3, { metalness: 0.7, roughness: 0.4 }));
  const segment = (p: Vec3, q: Vec3, r: number, m: THREE.Material) => {
    const dx = Math.abs(q.x - p.x);
    const dy = Math.abs(q.y - p.y);
    const dz = Math.abs(q.z - p.z);
    const g = new THREE.BoxGeometry(dx + r, dy + r, dz + r);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
    mesh.castShadow = false;
    return mesh;
  };
  for (const t of room.cabling.trays) {
    // Échelle à câbles sous le tronçon : deux longerons et un fond.
    const along = Math.abs(t.to.x - t.from.x) > Math.abs(t.to.z - t.from.z) ? 'x' : 'z';
    for (const s of [-1, 1]) {
      const off = along === 'x' ? { x: 0, z: s * 0.16 } : { x: s * 0.16, z: 0 };
      cables.add(
        segment(
          { x: t.from.x + off.x, y: t.from.y + 0.01, z: t.from.z + off.z },
          { x: t.to.x + off.x, y: t.to.y + 0.01, z: t.to.z + off.z },
          0.04,
          trayMat,
        ),
      );
    }
    const base = segment(
      { ...t.from, y: t.from.y - 0.005 },
      { ...t.to, y: t.to.y - 0.005 },
      0.01,
      trayMat,
    );
    base.scale.set(along === 'x' ? 1 : 32, 1, along === 'x' ? 32 : 1);
    cables.add(base);
  }
  for (const c of room.cabling.cables) {
    const { r } = CABLE[c.kind];
    for (let i = 1; i < c.points.length; i++)
      cables.add(segment(c.points[i - 1]!, c.points[i]!, r, cableMats[c.kind]));
  }
  root.add(cables);

  // ── Aménagement selon le type de local : baies existantes, mobilier, bâtiment ──
  const FM = furnishMaterials(track);
  for (const r of room.racks) root.add(buildRack(r, FM).group);
  for (const dc of room.furnishing.decor) {
    const built = buildDecor(dc, FM);
    root.add(built.group);
    for (const mesh of built.wallMeshes) walls.push({ mesh, side: dc.wall });
  }

  // ── Équipements ──
  const pickables: THREE.Object3D[] = [];
  const items = new Map<string, THREE.Group>();
  const internals: THREE.Object3D[] = [];
  const blockGeo = track(new THREE.BoxGeometry(1, 1, 1));
  for (const it of room.items) {
    const g = new THREE.Group();
    g.name = it.id;
    g.position.set(it.x, it.y, it.z);
    g.rotation.y = it.rotY;
    const parts = buildItem(it, M, blockGeo, internals);
    g.add(parts.group);
    parts.shell.userData.itemId = it.id;
    pickables.push(parts.shell);
    g.userData.itemId = it.id;
    items.set(it.id, g);
    root.add(g);
  }

  // ── Cotes du local ──
  const dimensions: DimensionLine[] = [
    {
      from: new THREE.Vector3(0, 0.01, W + 0.45),
      to: new THREE.Vector3(L, 0.01, W + 0.45),
      length: L,
      kind: 'room',
    },
    {
      from: new THREE.Vector3(L + 0.45, 0.01, 0),
      to: new THREE.Vector3(L + 0.45, 0.01, W),
      length: W,
      kind: 'room',
    },
    {
      from: new THREE.Vector3(L + 0.25, 0, W + 0.25),
      to: new THREE.Vector3(L + 0.25, H, W + 0.25),
      length: H,
      kind: 'room',
    },
  ];
  const dimensionGroup = new THREE.Group();
  const dimMat = track(new THREE.LineBasicMaterial({ color: COLORS.dim }));
  for (const d of dimensions) dimensionGroup.add(dimensionLine(d.from, d.to, dimMat, track));
  root.add(dimensionGroup);

  // Contour de surbrillance de l'équipement sélectionné.
  let highlight: THREE.BoxHelper | null = null;
  const setHighlight = (id: string | null) => {
    if (highlight) {
      root.remove(highlight);
      highlight.geometry.dispose();
      (highlight.material as THREE.Material).dispose();
      highlight = null;
    }
    const g = id ? items.get(id) : undefined;
    if (g) {
      highlight = new THREE.BoxHelper(g, COLORS.highlight);
      (highlight.material as THREE.LineBasicMaterial).linewidth = 2;
      root.add(highlight);
    }
  };

  const setXray = (on: boolean) => {
    for (const m of shells) {
      m.opacity = on ? 0.16 : 1;
      m.depthWrite = !on;
      m.needsUpdate = true;
    }
    for (const o of internals) o.visible = on;
  };
  setXray(false);

  return {
    root,
    walls,
    pickables,
    items,
    zones,
    dimensions,
    dimensionGroup,
    cables,
    center,
    setXray,
    setHighlight,
    dispose: () => {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line)
          o.geometry.dispose();
      });
      disposables.forEach((d) => d.dispose());
    },
  };
}

/** Ligne de cote avec traits d'extrémité. */
function dimensionLine(
  a: THREE.Vector3,
  b: THREE.Vector3,
  mat: THREE.LineBasicMaterial,
  track: <T extends { dispose: () => void }>(o: T) => T,
): THREE.LineSegments {
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const tick =
    Math.abs(dir.y) > 0.9 ? new THREE.Vector3(0.08, 0, 0) : new THREE.Vector3(0, 0.08, 0);
  const pts = [
    a,
    b,
    a.clone().sub(tick),
    a.clone().add(tick),
    b.clone().sub(tick),
    b.clone().add(tick),
  ];
  const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
  return new THREE.LineSegments(geo, mat);
}

type Mats = Record<
  | 'body'
  | 'bodyBattery'
  | 'door'
  | 'accent'
  | 'vent'
  | 'display'
  | 'led'
  | 'module'
  | 'moduleFace'
  | 'blank'
  | 'vrla'
  | 'lfp'
  | 'terminal'
  | 'shelf'
  | 'power'
  | 'copper',
  Mat
>;

/** Détail d'un équipement (repère local : base au sol, face avant vers +Z). */
function buildItem(
  it: Item3D,
  M: Mats,
  blockGeo: THREE.BoxGeometry,
  internals: THREE.Object3D[],
): { group: THREE.Group; shell: THREE.Mesh } {
  const g = new THREE.Group();
  const { w, d, h } = it;
  const front = d / 2;
  const isBattery = it.kind === 'battery-cabinet' || it.kind === 'ebm';
  const shell = box(w, h, d, isBattery ? M.bodyBattery : M.body);
  g.add(shell);
  // Socle et bandeau d'accent (identité neutre, couleur du thème).
  if (h > 0.6) {
    g.add(box(w * 1.002, 0.06, d * 1.002, M.vent, 0, 0, 0));
    g.add(box(w * 0.96, 0.03, 0.006, M.accent, 0, h - 0.07, front + 0.003));
  }
  const face = (fw: number, fh: number, mat: Mat, x: number, y: number, depth = 0.006) =>
    box(fw, fh, depth, mat, x, y, front + depth / 2);

  if (it.kind === 'modular-frame' && it.modules) {
    // Partie haute : écran tactile et voyants ; zone des modules ; partie basse : organes de coupure.
    const top = Math.min(0.32, h * 0.18);
    const bottom = Math.min(0.38, h * 0.2);
    g.add(face(Math.min(0.24, w * 0.4), 0.14, M.display, -w * 0.18, h - top + 0.06));
    g.add(face(0.02, 0.02, M.led, w * 0.15, h - top + 0.12, 0.01));
    const cols = Math.max(1, Math.round(w / 0.5));
    const rows = Math.ceil(it.modules.slots / cols);
    const areaH = h - top - bottom;
    const slotH = Math.min(0.2, areaH / rows);
    const slotW = (w - 0.06) / cols;
    for (let s = 0; s < it.modules.slots; s++) {
      const c = s % cols;
      const r = Math.floor(s / cols);
      const x = -w / 2 + 0.03 + slotW * (c + 0.5);
      const y = bottom + r * slotH + 0.004;
      if (s < it.modules.installed) {
        g.add(face(slotW - 0.012, slotH - 0.012, M.moduleFace, x, y, 0.012));
        g.add(face(slotW * 0.3, 0.012, M.module, x, y + slotH * 0.35, 0.03)); // poignée
        g.add(face(0.012, 0.012, M.led, x + slotW * 0.38, y + slotH * 0.65, 0.016));
        // Corps du module, visible en mode intérieur.
        const body = box(slotW - 0.02, slotH - 0.02, d * 0.75, M.module, x, y, front - d * 0.4);
        body.visible = false;
        internals.push(body);
        g.add(body);
      } else {
        g.add(face(slotW - 0.012, slotH - 0.012, M.blank, x, y, 0.008));
      }
    }
    // Disjoncteurs de la partie basse.
    for (let i = 0; i < 4; i++)
      g.add(face(0.06, 0.14, M.vent, -w * 0.3 + i * 0.09, bottom * 0.35, 0.02));
  } else if (it.kind === 'ups-cabinet') {
    const door = face(w - 0.02, h - 0.1, M.door, 0, 0.07, 0.012);
    g.add(door);
    g.add(face(Math.min(0.2, w * 0.4), 0.12, M.display, 0, h * 0.78));
    g.add(face(0.018, 0.018, M.led, Math.min(0.14, w * 0.3), h * 0.8, 0.02));
    const nv = Math.max(4, Math.floor((w - 0.1) / 0.035));
    for (let i = 0; i < nv; i++)
      g.add(
        face(0.012, h * 0.35, M.vent, -w / 2 + 0.06 + i * ((w - 0.12) / (nv - 1)), 0.15, 0.016),
      );
    g.add(face(0.025, 0.18, M.moduleFace, w / 2 - 0.06, h * 0.5, 0.03)); // poignée
    // Organes internes : redresseur / onduleur, bus cuivre, ventilateurs.
    const inner = new THREE.Group();
    inner.add(box(w * 0.7, h * 0.32, d * 0.55, M.power, 0, h * 0.42, -d * 0.05));
    inner.add(box(w * 0.7, h * 0.18, d * 0.5, M.power, 0, h * 0.12, -d * 0.05));
    for (let i = 0; i < 3; i++)
      inner.add(box(0.02, h * 0.6, 0.06, M.copper, -w * 0.25 + i * w * 0.25, h * 0.1, -d * 0.38));
    inner.visible = false;
    internals.push(inner);
    g.add(inner);
  } else if (it.kind === 'ups-tower' || it.kind === 'ups-rack') {
    const lcdW = Math.min(0.09, w * 0.5);
    g.add(
      face(
        lcdW,
        Math.min(0.05, h * 0.4),
        M.display,
        it.kind === 'ups-rack' ? -w * 0.3 : 0,
        h * (it.kind === 'ups-rack' ? 0.3 : 0.75),
      ),
    );
    g.add(
      face(
        0.012,
        0.012,
        M.led,
        it.kind === 'ups-rack' ? -w * 0.1 : lcdW,
        h * (it.kind === 'ups-rack' ? 0.5 : 0.65),
        0.012,
      ),
    );
    const nv = Math.max(3, Math.floor(w / 0.04));
    for (let i = 0; i < nv; i++)
      g.add(
        face(
          0.008,
          h * 0.35,
          M.vent,
          -w / 2 + 0.03 + i * ((w - 0.06) / Math.max(1, nv - 1)),
          h * 0.08,
          0.008,
        ),
      );
    if (it.kind === 'ups-rack')
      for (const sx of [-1, 1])
        g.add(face(0.02, h * 0.9, M.moduleFace, sx * (w / 2 + 0.01), h * 0.05, 0.004)); // équerres
  } else if (isBattery) {
    if (h > 0.6) {
      g.add(face(w - 0.02, h - 0.1, M.door, 0, 0.07, 0.012));
      g.add(face(0.025, 0.18, M.moduleFace, w / 2 - 0.06, h * 0.5, 0.03));
      const nv = Math.max(4, Math.floor((w - 0.1) / 0.04));
      for (let i = 0; i < nv; i++)
        g.add(
          face(0.012, 0.25, M.vent, -w / 2 + 0.06 + i * ((w - 0.12) / (nv - 1)), h - 0.4, 0.016),
        );
    } else {
      const nv = Math.max(3, Math.floor(w / 0.04));
      for (let i = 0; i < nv; i++)
        g.add(
          face(
            0.008,
            h * 0.4,
            M.vent,
            -w / 2 + 0.03 + i * ((w - 0.06) / Math.max(1, nv - 1)),
            h * 0.3,
            0.008,
          ),
        );
    }
  }

  // Blocs batteries (instanciés) et étagères, visibles en mode intérieur.
  if (it.blocks && it.blocks.positions.length > 0) {
    const inner = new THREE.Group();
    const { size } = it.blocks;
    const lithium = it.blocks.lithium;
    const offsetZ = isBattery ? 0 : -d * 0.2;
    const inst = new THREE.InstancedMesh(
      blockGeo,
      lithium ? M.lfp : M.vrla,
      it.blocks.positions.length,
    );
    const term = new THREE.InstancedMesh(blockGeo, M.terminal, it.blocks.positions.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    // Les blocs sont rangés dans l'orientation qui maximise le remplissage.
    const bw = it.blocks.rotated ? size.d : size.w;
    const bd = it.blocks.rotated ? size.w : size.d;
    it.blocks.positions.forEach((p, i) => {
      m.compose(
        new THREE.Vector3(p.x, p.y, p.z + offsetZ),
        q,
        new THREE.Vector3(bw * 0.98, size.h * 0.98, bd * 0.98),
      );
      inst.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(p.x + bw * 0.3, p.y + size.h / 2 + 0.008, p.z + offsetZ),
        q,
        new THREE.Vector3(Math.min(0.03, bw * 0.15), 0.016, Math.min(0.03, bd * 0.15)),
      );
      term.setMatrixAt(i, m);
    });
    inst.castShadow = true;
    inner.add(inst, term);
    if (isBattery && h > 0.6)
      for (const y of it.blocks.shelves)
        inner.add(box(w - 0.04, 0.012, d - 0.04, M.shelf, 0, y - 0.012, 0));
    inner.visible = false;
    internals.push(inner);
    g.add(inner);
  }
  return { group: g, shell };
}
