/** Mise en scène commune à la visionneuse et à l'instantané du PDF : lumières, caméra, coupe des murs. */
import * as THREE from 'three';
import type { Room3D } from './model';
import type { BuiltScene } from './scene';

export type ViewPreset = 'iso' | 'top' | 'front';

export function addLights(scene: THREE.Scene, room: Room3D): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  const span = Math.max(room.length, room.width);
  sun.position.set(room.length * 0.3, room.height + span, room.width * 1.2);
  sun.target.position.set(room.length / 2, 0, room.width / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera;
  c.left = -span;
  c.right = span;
  c.top = span;
  c.bottom = -span;
  c.near = 0.1;
  c.far = span * 4 + room.height * 2;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  // Éclairage de plafond, doux, pour les faces avant.
  const fill = new THREE.PointLight(0xffffff, 0.6 * span, span * 3, 1.2);
  fill.position.set(room.length / 2, room.height * 0.95, room.width / 2);
  scene.add(fill);
}

/** Emprise des équipements (centre et taille), ou le local s'il est vide. */
export function equipmentBounds(room: Room3D): { center: THREE.Vector3; size: number } {
  if (room.items.length === 0)
    return {
      center: new THREE.Vector3(room.length / 2, 0, room.width / 2),
      size: Math.max(room.length, room.width),
    };
  const box = new THREE.Box3();
  for (const it of room.items) {
    const r = Math.max(it.w, it.d) / 2;
    box.expandByPoint(new THREE.Vector3(it.x - r, it.y, it.z - r));
    box.expandByPoint(new THREE.Vector3(it.x + r, it.y + it.h, it.z + r));
  }
  const size = box.getSize(new THREE.Vector3());
  return { center: box.getCenter(new THREE.Vector3()), size: Math.max(size.x, size.z, size.y) };
}

/** Position de caméra, point visé et angle de champ pour une vue prédéfinie. */
export function cameraPreset(
  room: Room3D,
  view: ViewPreset,
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  const L = room.length;
  const W = room.width;
  const H = room.height;
  const span = Math.max(L, W);
  const eq = equipmentBounds(room);
  const target = new THREE.Vector3(eq.center.x, Math.min(0.9, H / 3), eq.center.z);
  if (view === 'top') {
    // Vue plongeante à champ étroit : rendu proche d'un plan.
    return {
      position: new THREE.Vector3(L / 2, span * 2 + H, W / 2 + 0.01),
      target: new THREE.Vector3(L / 2, 0, W / 2),
      fov: 30,
    };
  }
  // Cadrage resserré sur les équipements (petits UPS compris), sans dépasser le local.
  const dist = Math.min(span * 1.6, Math.max(2, eq.size * 1.6 + 1.2));
  if (view === 'front')
    return { position: new THREE.Vector3(target.x, H * 0.55, target.z + dist), target, fov: 40 };
  const dir = new THREE.Vector3(0.55, 0.62, 1).normalize();
  return { position: target.clone().addScaledVector(dir, dist * 1.15), target, fov: 45 };
}

/**
 * Coupe des murs : un mur situé entre la caméra et le local devient presque transparent, pour
 * voir à l'intérieur sans perdre le volume de la pièce.
 */
export function applyCutaway(built: BuiltScene, camera: THREE.Camera, room: Room3D): void {
  const p = camera.position;
  for (const w of built.walls) {
    const hide =
      (w.side === 'top' && p.z < 0) ||
      (w.side === 'bottom' && p.z > room.width) ||
      (w.side === 'left' && p.x < 0) ||
      (w.side === 'right' && p.x > room.length);
    const mat = w.mesh.material as THREE.MeshStandardMaterial;
    const base = (w.mesh.userData.baseOpacity as number | undefined) ?? 1;
    const opacity = hide ? 0.08 : base;
    if (mat.opacity !== opacity) {
      mat.opacity = opacity;
      mat.depthWrite = !hide;
    }
  }
}

/** Chaque mur reçoit son propre matériau (opacité réglée mur par mur). */
export function separateWallMaterials(built: BuiltScene): void {
  for (const w of built.walls) {
    const mat = (w.mesh.material as THREE.MeshStandardMaterial).clone();
    w.mesh.userData.baseOpacity = mat.opacity;
    w.mesh.material = mat;
  }
}

export function createRenderer(canvas?: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
