/** Instantané PNG de la scène 3D (rapport PDF), rendu hors écran. */
import * as THREE from 'three';
import type { Room3D } from './model';
import { buildScene } from './scene';
import {
  addLights,
  applyCutaway,
  cameraPreset,
  createRenderer,
  separateWallMaterials,
  type ViewPreset,
  webglAvailable,
} from './stage';

/** Rendu de la scène en image PNG (data URL), ou null si WebGL est indisponible. */
export function render3DSnapshot(
  room: Room3D,
  opts: { width?: number; height?: number; xray?: boolean; view?: ViewPreset } = {},
): string | null {
  if (!webglAvailable()) return null;
  const width = opts.width ?? 1600;
  const height = opts.height ?? 1000;
  const canvas = document.createElement('canvas');
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8edf3);
  const built = buildScene(room);
  separateWallMaterials(built);
  built.setXray(opts.xray ?? false);
  scene.add(built.root);
  addLights(scene, room);
  const preset = cameraPreset(room, opts.view ?? 'iso');
  const camera = new THREE.PerspectiveCamera(preset.fov, width / height, 0.05, 500);
  camera.position.copy(preset.position);
  camera.lookAt(preset.target);
  applyCutaway(built, camera, room);
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  built.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}
