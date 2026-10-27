/**
 * Rendu three.js de l'aménagement du local (`furnish.ts`) : revêtement de sol, baies 19"
 * existantes avec leur contenu, mobilier et équipements techniques du bâtiment.
 */
import * as THREE from 'three';
import type { Decor3D, FloorFinish, Rack3D, RackGear } from './furnish';
import { RACK_BASE, RACK_U } from './furnish';

type Track = <T extends { dispose: () => void }>(o: T) => T;
type Mat = THREE.MeshStandardMaterial;

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): Mat {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, ...opts });
}

/** Boîte dont l'origine est le centre de la face inférieure. */
function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export interface FurnishMaterials {
  rackFrame: Mat;
  rackDoor: Mat;
  rackSide: Mat;
  gearDark: Mat;
  gearGrey: Mat;
  gearLight: Mat;
  port: Mat;
  ledGreen: Mat;
  ledAmber: Mat;
  ledBlue: Mat;
  // Bâtiment (matériaux transparents : ils suivent la coupe des murs).
  panel: Mat;
  panelDoor: Mat;
  acWhite: Mat;
  acGrille: Mat;
  tray: Mat;
  red: Mat;
  black: Mat;
  shelf: Mat;
  carton: Mat;
  deskTop: Mat;
  deskLeg: Mat;
  screen: Mat;
  chair: Mat;
  windowFrame: Mat;
  glass: Mat;
  pot: Mat;
  leaf: Mat;
}

export function furnishMaterials(track: Track): FurnishMaterials {
  const t = (m: Mat) => track(m);
  const wallMounted = { transparent: true, opacity: 1 };
  return {
    rackFrame: t(mat(0x1e2227, { metalness: 0.55, roughness: 0.5 })),
    rackDoor: t(
      mat(0x14171b, { transparent: true, opacity: 0.18, metalness: 0.6, depthWrite: false }),
    ),
    rackSide: t(mat(0x23282e, { metalness: 0.45, roughness: 0.55 })),
    gearDark: t(mat(0x2a2f35, { metalness: 0.4 })),
    gearGrey: t(mat(0x6c757f, { metalness: 0.5 })),
    gearLight: t(mat(0xc9cfd6, { metalness: 0.5, roughness: 0.45 })),
    port: t(mat(0x0d0f12, { roughness: 0.9 })),
    ledGreen: t(mat(0x39d353, { emissive: 0x39d353, emissiveIntensity: 1.1 })),
    ledAmber: t(mat(0xffb300, { emissive: 0xffb300, emissiveIntensity: 0.9 })),
    ledBlue: t(mat(0x4fc3f7, { emissive: 0x4fc3f7, emissiveIntensity: 0.9 })),
    panel: t(mat(0xe9ebee, { metalness: 0.3, ...wallMounted })),
    panelDoor: t(mat(0xdfe2e6, { metalness: 0.3, ...wallMounted })),
    acWhite: t(mat(0xf7f8f9, { roughness: 0.5, metalness: 0.05, ...wallMounted })),
    acGrille: t(mat(0x9aa3ad, { roughness: 0.6, ...wallMounted })),
    tray: t(mat(0xa7adb3, { metalness: 0.8, roughness: 0.35, ...wallMounted })),
    red: t(mat(0xc62828, { roughness: 0.45 })),
    black: t(mat(0x1a1c1f, { roughness: 0.6 })),
    shelf: t(mat(0x8a939c, { metalness: 0.6, roughness: 0.45 })),
    carton: t(mat(0xb68a5a, { roughness: 0.9, metalness: 0 })),
    deskTop: t(mat(0xd8c3a5, { roughness: 0.6, metalness: 0 })),
    deskLeg: t(mat(0x5b6168, { metalness: 0.6 })),
    screen: t(mat(0x111418, { roughness: 0.3, metalness: 0.3 })),
    chair: t(mat(0x2f3a46, { roughness: 0.8, metalness: 0.1 })),
    windowFrame: t(mat(0xfafafa, { roughness: 0.5, ...wallMounted })),
    glass: t(
      mat(0xa9c9e3, {
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        metalness: 0.1,
        depthWrite: false,
      }),
    ),
    pot: t(mat(0x8d6e63, { roughness: 0.8, metalness: 0 })),
    leaf: t(mat(0x4f8a3c, { roughness: 0.85, metalness: 0 })),
  };
}

export const FLOOR_STYLE: Record<FloorFinish, { color: number; grid: number; step: number }> = {
  epoxy: { color: 0xdfe3e8, grid: 0xb9c2cc, step: 0.5 },
  raised: { color: 0xd3d8de, grid: 0x8f99a4, step: 0.6 },
  concrete: { color: 0xbfc2c4, grid: 0xa5a9ad, step: 1 },
  carpet: { color: 0x9aa7b4, grid: 0x8d99a6, step: 0.5 },
};

/** Face avant d'un équipement de baie de `n` U (repère de la baie, face avant vers +Z). */
function buildGear(g: RackGear, M: FurnishMaterials, z: number): THREE.Group {
  const grp = new THREE.Group();
  const h = g.n * RACK_U - 0.002;
  const y = RACK_BASE + (g.u - 1) * RACK_U + 0.001;
  const W = 0.482; // façade 19"
  const depth = g.type === 'patch' || g.type === 'cable' || g.type === 'blank' ? 0.12 : 0.7;
  const faceZ = z;
  const bodyMat =
    g.type === 'patch' || g.type === 'storage'
      ? M.gearGrey
      : g.type === 'server'
        ? M.gearLight
        : M.gearDark;
  const body = box(
    W - 0.04,
    h,
    depth,
    g.type === 'blank' ? M.gearDark : M.gearDark,
    0,
    y,
    faceZ - depth / 2,
  );
  body.castShadow = false;
  grp.add(body);
  const front = (w: number, hh: number, m: Mat, x: number, yy: number, dz = 0.006) =>
    grp.add(box(w, hh, dz, m, x, yy, faceZ + dz / 2));
  front(W, h, bodyMat, 0, y, 0.004);
  const mid = y + h / 2;
  switch (g.type) {
    case 'patch':
    case 'switch': {
      // Deux rangées de ports RJ45 et voyants.
      const ports = 24;
      for (let i = 0; i < ports; i++) {
        const col = i % 12;
        const row = Math.floor(i / 12);
        const x = -0.17 + col * 0.026 + (col >= 6 ? 0.02 : 0);
        front(0.016, 0.011, M.port, x, y + 0.008 + row * 0.016, 0.008);
      }
      if (g.type === 'switch') {
        front(0.006, 0.006, M.ledGreen, 0.19, mid, 0.01);
        front(0.006, 0.006, M.ledAmber, 0.2, mid - 0.012, 0.01);
      }
      break;
    }
    case 'cable':
      // Guide-câbles : anneaux.
      for (let i = 0; i < 5; i++)
        front(0.03, h * 0.7, M.port, -0.18 + i * 0.09, y + h * 0.15, 0.03);
      break;
    case 'router':
    case 'firewall':
      for (let i = 0; i < 8; i++)
        front(0.016, 0.011, M.port, -0.12 + i * 0.024, mid - 0.006, 0.008);
      front(0.006, 0.006, g.type === 'firewall' ? M.ledAmber : M.ledGreen, 0.18, mid, 0.01);
      break;
    case 'server': {
      // Baies de disques et voyants.
      const bays = g.n === 1 ? 8 : 12;
      const rows = g.n === 1 ? 1 : 2;
      for (let r = 0; r < rows; r++)
        for (let i = 0; i < bays / rows; i++)
          front(
            0.042,
            h / rows - 0.012,
            M.gearGrey,
            -0.15 + i * 0.047,
            y + 0.005 + (r * h) / rows,
            0.008,
          );
      front(0.006, 0.006, M.ledGreen, 0.2, mid + 0.005, 0.01);
      front(0.006, 0.006, M.ledBlue, 0.2, mid - 0.01, 0.01);
      break;
    }
    case 'storage': {
      const cols = 12;
      const rows = Math.max(1, g.n - 1);
      for (let r = 0; r < rows; r++)
        for (let i = 0; i < cols; i++)
          front(
            0.028,
            h / rows - 0.01,
            M.gearDark,
            -0.2 + i * 0.034,
            y + 0.005 + (r * h) / rows,
            0.008,
          );
      front(0.006, 0.006, M.ledGreen, 0.215, mid, 0.01);
      break;
    }
    case 'kvm':
      front(0.12, h * 0.6, M.port, -0.1, y + h * 0.2, 0.008);
      front(0.006, 0.006, M.ledBlue, 0.15, mid, 0.01);
      break;
    case 'blank':
      break;
  }
  return grp;
}

/** Baie 19" 42U : châssis, montants, porte avant perforée, contenu existant. */
export function buildRack(
  r: Rack3D,
  M: FurnishMaterials,
): { group: THREE.Group; doors: THREE.Mesh[] } {
  const g = new THREE.Group();
  g.position.set(r.x, 0, r.z);
  g.rotation.y = r.rotY;
  const post = 0.035;
  const { w, d, h } = r;
  // Socle, toit, montants d'angle.
  g.add(box(w, 0.08, d, M.rackFrame, 0, 0, 0));
  g.add(box(w, 0.05, d, M.rackFrame, 0, h - 0.05, 0));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      g.add(box(post, h, post, M.rackFrame, (sx * (w - post)) / 2, 0, (sz * (d - post)) / 2));
  // Rails 19" avant et arrière.
  const railX = 0.465 / 2 + 0.01;
  for (const sx of [-1, 1])
    for (const z of [d / 2 - 0.09, -d / 2 + 0.12])
      g.add(box(0.018, h - 0.16, 0.012, M.gearGrey, sx * railX, 0.08, z));
  // Panneaux latéraux en bout de rangée.
  if (r.sides.left) g.add(box(0.012, h - 0.13, d - 0.02, M.rackSide, -w / 2 + 0.006, 0.08, 0));
  if (r.sides.right) g.add(box(0.012, h - 0.13, d - 0.02, M.rackSide, w / 2 - 0.006, 0.08, 0));
  // Contenu existant (face avant en retrait de la porte).
  const faceZ = d / 2 - 0.08;
  for (const gear of r.gear) g.add(buildGear(gear, M, faceZ));
  // Porte avant perforée et porte arrière (translucides : le contenu reste visible).
  const front = box(w - 0.01, h - 0.14, 0.012, M.rackDoor, 0, 0.08, d / 2 - 0.006);
  const back = box(w - 0.01, h - 0.14, 0.012, M.rackDoor, 0, 0.08, -d / 2 + 0.006);
  front.castShadow = back.castShadow = false;
  g.add(front, back);
  // Poignée et ventilation de toit.
  g.add(box(0.02, 0.16, 0.025, M.gearLight, w / 2 - 0.05, h * 0.5, d / 2 + 0.006));
  return { group: g, doors: [front, back] };
}

/**
 * Élément d'aménagement. Les éléments fixés au mur sont renvoyés dans `wallMeshes` pour suivre
 * la coupe de leur mur (ils deviennent transparents quand le mur l'est).
 */
export function buildDecor(
  dc: Decor3D,
  M: FurnishMaterials,
): { group: THREE.Group; wallMeshes: THREE.Mesh[] } {
  const g = new THREE.Group();
  g.position.set(dc.x, dc.y, dc.z);
  g.rotation.y = dc.rotY;
  const wallMeshes: THREE.Mesh[] = [];
  const { w, d, h } = dc;
  const front = d / 2;
  const add = (m: THREE.Mesh, onWall = false) => {
    g.add(m);
    if (onWall) wallMeshes.push(m);
    return m;
  };
  switch (dc.kind) {
    case 'electrical-panel': {
      // Armoire de distribution sur socle, porte pleine, poignée, plaque signalétique.
      add(box(w, h, d, M.panel, 0, 0.1, 0));
      add(box(w, 0.1, d, M.black, 0, 0, 0));
      add(box(w - 0.03, h - 0.03, 0.01, M.panelDoor, 0, 0.115, front + 0.005));
      add(box(0.025, 0.12, 0.025, M.black, w / 2 - 0.06, 0.1 + h * 0.5, front + 0.02));
      add(box(0.09, 0.09, 0.004, M.ledAmber, 0, 0.1 + h - 0.16, front + 0.012)); // ⚡
      break;
    }
    case 'split-ac': {
      add(box(w, h, d, M.acWhite), true);
      add(box(w * 0.9, 0.035, 0.01, M.acGrille, 0, 0.02, front), true);
      add(box(0.05, 0.012, 0.004, M.ledBlue, w * 0.35, h * 0.55, front + 0.002), true);
      break;
    }
    case 'crac': {
      // Armoire de climatisation de précision : panneaux grillagés, écran.
      add(box(w, h, d, M.acWhite));
      for (let i = 0; i < 2; i++)
        add(box(w - 0.08, h * 0.38, 0.01, M.acGrille, 0, 0.1 + i * h * 0.45, front + 0.005));
      add(box(0.14, 0.09, 0.012, M.ledBlue, w * 0.25, h - 0.17, front + 0.006));
      break;
    }
    case 'cable-tray': {
      // Échelle à câbles : deux longerons et barreaux, câbles posés dessus.
      for (const sz of [-1, 1]) add(box(w, h, 0.01, M.tray, 0, 0, (sz * d) / 2), true);
      const rungs = Math.max(2, Math.floor(w / 0.3));
      for (let i = 0; i <= rungs; i++)
        add(box(0.02, 0.01, d, M.tray, -w / 2 + (i * w) / rungs, 0, 0), true);
      add(box(w * 0.98, 0.025, d * 0.55, M.black, 0, 0.01, 0), true);
      break;
    }
    case 'extinguisher': {
      // Extincteur CO₂ (classe B / risques électriques) : corps rouge, tête et diffuseur noirs.
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h * 0.8, 20), M.red);
      body.position.set(0, (h * 0.8) / 2, 0);
      body.castShadow = true;
      add(body);
      add(box(0.06, h * 0.12, 0.06, M.black, 0, h * 0.8, 0));
      add(box(0.05, 0.03, 0.18, M.black, 0, h * 0.86, 0.08));
      break;
    }
    case 'shelving': {
      // Rayonnage métallique 5 niveaux avec cartons.
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          add(box(0.03, h, 0.03, M.shelf, (sx * (w - 0.03)) / 2, 0, (sz * (d - 0.03)) / 2));
      const levels = 5;
      for (let i = 0; i < levels; i++) {
        const y = 0.08 + (i * (h - 0.12)) / (levels - 1);
        add(box(w, 0.02, d, M.shelf, 0, y, 0));
        if (i < levels - 1) {
          const n = 2 + ((i + Math.round(dc.x * 10)) % 2);
          for (let k = 0; k < n; k++)
            add(
              box(
                w / n - 0.05,
                0.22 + 0.05 * (k % 2),
                d - 0.08,
                M.carton,
                -w / 2 + (w / n) * (k + 0.5),
                y + 0.02,
                0,
              ),
            );
        }
      }
      break;
    }
    case 'network-cabinet': {
      // Coffret mural 19" à porte vitrée, commutateur et brassage visibles.
      add(box(w, h, d, M.rackSide), true);
      add(box(w - 0.04, h - 0.06, 0.008, M.glass, 0, 0.03, front + 0.004), true);
      for (let i = 0; i < 3; i++)
        add(
          box(
            0.44,
            0.04,
            0.02,
            i === 1 ? M.gearDark : M.gearGrey,
            0,
            0.12 + i * 0.12,
            front - 0.03,
          ),
          true,
        );
      add(box(0.006, 0.006, 0.004, M.ledGreen, 0.18, 0.26, front - 0.018), true);
      break;
    }
    case 'window': {
      // Fenêtre : dormant, traverse, vitrage, appui.
      add(box(w, 0.05, d, M.windowFrame, 0, 0, 0), true);
      add(box(w, 0.05, d, M.windowFrame, 0, h - 0.05, 0), true);
      for (const x of [-w / 2 + 0.025, 0, w / 2 - 0.025])
        add(box(0.05, h, d, M.windowFrame, x, 0, 0), true);
      add(box(w - 0.05, h - 0.1, 0.01, M.glass, 0, 0.05, 0), true);
      add(box(w + 0.1, 0.03, d + 0.1, M.windowFrame, 0, -0.03, 0.05), true);
      break;
    }
    case 'desk': {
      // Bureau, écran, clavier, fauteuil devant le poste.
      add(box(w, 0.03, d, M.deskTop, 0, h - 0.03, 0));
      for (const sx of [-1, 1])
        add(box(0.05, h - 0.03, d - 0.1, M.deskLeg, (sx * (w - 0.08)) / 2, 0, 0));
      add(box(0.55, 0.33, 0.03, M.screen, -w * 0.15, h + 0.12, -d * 0.2));
      add(box(0.06, 0.12, 0.06, M.deskLeg, -w * 0.15, h, -d * 0.22));
      add(box(0.42, 0.015, 0.14, M.black, -w * 0.15, h, d * 0.12));
      add(box(0.18, 0.4, 0.24, M.black, w * 0.32, 0, -d * 0.05)); // unité centrale sous le bureau
      // Fauteuil (repère du bureau : devant = +Z).
      const cz = front + 0.35;
      add(box(0.5, 0.08, 0.48, M.chair, -w * 0.15, 0.42, cz));
      add(box(0.48, 0.5, 0.06, M.chair, -w * 0.15, 0.52, cz + 0.24));
      add(box(0.05, 0.42, 0.05, M.deskLeg, -w * 0.15, 0, cz));
      add(box(0.55, 0.03, 0.55, M.deskLeg, -w * 0.15, 0.02, cz));
      break;
    }
    case 'plant': {
      add(box(0.32, 0.36, 0.32, M.pot));
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), M.leaf);
      leaves.position.set(0, h - 0.38, 0);
      leaves.scale.set(1, 1.4, 1);
      leaves.castShadow = true;
      add(leaves);
      break;
    }
  }
  return { group: g, wallMeshes };
}
