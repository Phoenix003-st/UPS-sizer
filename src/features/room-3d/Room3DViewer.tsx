/**
 * Visionneuse 3D immersive du local (chargée à la demande) : rotation / zoom / déplacement à la
 * souris, au doigt ou au clavier, vues prédéfinies (3D, dessus, face), mode « intérieur » qui
 * montre modules et batteries, cotes du local et de l'équipement sélectionné, dégagements,
 * plein écran et capture PNG.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Project } from '../../engine/project';
import type { SolutionOption } from '../../engine/types';
import { useCatalogStore } from '../../state/catalogStore';
import { Button } from '../../ui/components';
import { downloadBlob, safeFilename } from '../../ui/files';
import { formatNumber } from '../../ui/format';
import { buildRoom3D, type Item3D } from './model';
import { buildScene, type BuiltScene } from './scene';
import {
  addLights,
  applyCutaway,
  cameraPreset,
  createRenderer,
  separateWallMaterials,
  type ViewPreset,
  webglAvailable,
} from './stage';

interface Props {
  option: SolutionOption;
  project: Project;
  /** Hauteur de la vue (CSS), 60vh par défaut. */
  height?: string;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  labels: CSS2DRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  built: BuiltScene;
  scene: THREE.Scene;
  roomLabels: CSS2DObject[];
  itemLabels: CSS2DObject[];
  selection: THREE.Group;
  fly: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    tFrom: THREE.Vector3;
    tTo: THREE.Vector3;
    fovFrom: number;
    fovTo: number;
    start: number;
  } | null;
}

function label(text: string, className: string): CSS2DObject {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return new CSS2DObject(el);
}

const LABEL_ROOM =
  'rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-on-primary shadow';
const LABEL_ITEM =
  'rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-text shadow ring-1 ring-black/10 whitespace-nowrap';
const LABEL_SEL = 'rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-black shadow';

export default function Room3DViewer({ option, project, height = '60vh' }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const catalogs = useCatalogStore((s) => s.catalogs);
  const room = useMemo(
    () => buildRoom3D(option, catalogs, project.room.kind),
    [option, catalogs, project.room.kind],
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [supported] = useState(webglAvailable);
  const [view, setView] = useState<ViewPreset>('iso');
  const [xray, setXray] = useState(false);
  const [dims, setDims] = useState(true);
  const [zones, setZones] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const m = (v: number) => `${formatNumber(v, lang, 2)} m`;

  // Création de la scène (à chaque changement de solution ou de local).
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;
    const renderer = createRenderer();
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    const labels = new CSS2DRenderer();
    labels.domElement.style.position = 'absolute';
    labels.domElement.style.inset = '0';
    labels.domElement.style.pointerEvents = 'none';
    host.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8edf3);
    const built = buildScene(room);
    separateWallMaterials(built);
    scene.add(built.root);
    addLights(scene, room);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
    const preset = cameraPreset(room, 'iso');
    camera.position.copy(preset.position);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(preset.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 0.5;
    controls.maxDistance = Math.max(room.length, room.width) * 4 + 10;
    controls.listenToKeyEvents(wrapRef.current ?? window);
    controls.update();

    // Cotes du local.
    const roomLabels = built.dimensions.map((d) => {
      const o = label(m(d.length), LABEL_ROOM);
      o.position.copy(d.from).lerp(d.to, 0.5);
      built.dimensionGroup.add(o);
      return o;
    });
    // Étiquettes des équipements.
    // Étiquettes : une par UPS ou châssis, une seule par rangée d'armoires batteries (lisibilité).
    const itemLabels: CSS2DObject[] = [];
    const batteryRows = new Map<string, Item3D[]>();
    for (const it of room.items) {
      if (it.kind === 'battery-cabinet' || it.kind === 'ebm') {
        batteryRows.set(it.system, [...(batteryRows.get(it.system) ?? []), it]);
        continue;
      }
      const o = label(shortName(it), LABEL_ITEM);
      o.position.set(it.x, it.y + it.h + 0.12, it.z);
      built.dimensionGroup.add(o);
      itemLabels.push(o);
    }
    for (const [system, row] of batteryRows) {
      const text = `${t(`room3d.kinds.${row[0]!.kind}`)}${room.items.some((i) => i.system === 'B') ? ` ${system}` : ''} × ${row.length}`;
      const o = label(text, LABEL_ITEM);
      const top = Math.max(...row.map((r) => r.y + r.h));
      o.position.set(
        row.reduce((a, r) => a + r.x, 0) / row.length,
        top + 0.12,
        row.reduce((a, r) => a + r.z, 0) / row.length,
      );
      built.dimensionGroup.add(o);
      itemLabels.push(o);
    }
    const selection = new THREE.Group();
    scene.add(selection);

    const stage: Stage = {
      renderer,
      labels,
      camera,
      controls,
      built,
      scene,
      roomLabels,
      itemLabels,
      selection,
      fly: null,
    };
    stageRef.current = stage;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      labels.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Clic (sans glisser) : sélection d'un équipement.
    const raycaster = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(built.pickables, false)[0];
      setSelected((hit?.object.userData.itemId as string | undefined) ?? null);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const f = stage.fly;
      if (f) {
        const k = Math.min(1, (now - f.start) / 650);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        camera.position.lerpVectors(f.from, f.to, e);
        controls.target.lerpVectors(f.tFrom, f.tTo, e);
        camera.fov = f.fovFrom + (f.fovTo - f.fovFrom) * e;
        camera.updateProjectionMatrix();
        if (k >= 1) stage.fly = null;
      }
      controls.update();
      applyCutaway(built, camera, room);
      renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      built.dispose();
      renderer.dispose();
      host.innerHTML = '';
      stageRef.current = null;
    };
    // `m` dépend de la langue : les étiquettes sont recréées avec la scène.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, supported, lang]);

  // Options d'affichage.
  useEffect(() => stageRef.current?.built.setXray(xray), [xray, room, lang]);
  useEffect(() => {
    const s = stageRef.current;
    if (!s) return;
    s.built.dimensionGroup.visible = dims;
    for (const o of [...s.roomLabels, ...s.itemLabels])
      o.element.style.display = dims ? '' : 'none';
  }, [dims, room, lang]);
  useEffect(() => {
    const s = stageRef.current;
    if (s) s.built.zones.visible = zones;
  }, [zones, room, lang]);

  // Sélection : surbrillance et cotes de l'équipement (L, P, H).
  useEffect(() => {
    const s = stageRef.current;
    if (!s) return;
    s.built.setHighlight(selected);
    s.selection.children.slice().forEach((c) => {
      s.selection.remove(c);
      if (c instanceof CSS2DObject) c.element.remove();
      if (c instanceof THREE.LineSegments) c.geometry.dispose();
    });
    const it = room.items.find((i) => i.id === selected);
    const g = selected ? s.built.items.get(selected) : undefined;
    if (!it || !g) return;
    g.updateWorldMatrix(true, false);
    const P = (x: number, y: number, z: number) => g.localToWorld(new THREE.Vector3(x, y, z));
    const off = 0.12;
    const lines: [THREE.Vector3, THREE.Vector3, string][] = [
      [P(-it.w / 2, 0.02, it.d / 2 + off), P(it.w / 2, 0.02, it.d / 2 + off), `${it.dimsMm.w} mm`],
      [
        P(it.w / 2 + off, it.h + 0.02, -it.d / 2),
        P(it.w / 2 + off, it.h + 0.02, it.d / 2),
        `${it.dimsMm.d} mm`,
      ],
      [
        P(it.w / 2 + off, 0, it.d / 2 + off),
        P(it.w / 2 + off, it.h, it.d / 2 + off),
        `${it.dimsMm.h} mm`,
      ],
    ];
    const mat = new THREE.LineBasicMaterial({ color: 0xffb300 });
    for (const [a, b, text] of lines) {
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      s.selection.add(new THREE.LineSegments(geo, mat));
      const o = label(text, LABEL_SEL);
      o.position.copy(a).lerp(b, 0.5);
      s.selection.add(o);
    }
    return () => mat.dispose();
  }, [selected, room, lang]);

  // Vues prédéfinies, avec transition.
  const goTo = (v: ViewPreset) => {
    setView(v);
    const s = stageRef.current;
    if (!s) return;
    const p = cameraPreset(room, v);
    s.fly = {
      from: s.camera.position.clone(),
      to: p.position,
      tFrom: s.controls.target.clone(),
      tTo: p.target,
      fovFrom: s.camera.fov,
      fovTo: p.fov,
      start: performance.now(),
    };
  };

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const capture = () => {
    const s = stageRef.current;
    if (!s) return;
    s.renderer.render(s.scene, s.camera);
    s.renderer.domElement.toBlob(
      (b) => b && downloadBlob(`${safeFilename(project.name || 'ups-sizer')}-3d.png`, b),
      'image/png',
    );
  };

  if (!supported)
    return (
      <p className="rounded-lg border border-warn bg-warn-bg p-3 text-sm text-warn">
        {t('room3d.noWebgl')}
      </p>
    );

  const sel = room.items.find((i) => i.id === selected);
  const toggle = (on: boolean, set: (v: boolean) => void, text: string) => (
    <Button variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => set(!on)}>
      {text}
    </Button>
  );

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      aria-label={t('room3d.title')}
      className={`relative overflow-hidden rounded-xl border border-border bg-bg focus-visible:outline-3 focus-visible:outline-[var(--color-accent)] ${fullscreen ? 'flex flex-col' : ''}`}
    >
      <div
        className="flex flex-wrap items-center gap-2 border-b border-border bg-surface p-2"
        role="toolbar"
        aria-label={t('room3d.toolbar')}
      >
        {(['iso', 'top', 'front'] as ViewPreset[]).map((v) => (
          <Button
            key={v}
            variant={view === v ? 'primary' : 'ghost'}
            aria-pressed={view === v}
            onClick={() => goTo(v)}
          >
            {t(`room3d.views.${v}`)}
          </Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        {toggle(xray, setXray, t('room3d.xray'))}
        {toggle(dims, setDims, t('room3d.dims'))}
        {toggle(zones, setZones, t('room3d.zones'))}
        <span className="ms-auto" />
        <Button variant="ghost" onClick={capture}>
          {t('room3d.capture')}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            document.fullscreenElement
              ? document.exitFullscreen()
              : wrapRef.current?.requestFullscreen?.()
          }
        >
          {fullscreen ? t('room3d.exitFullscreen') : t('room3d.fullscreen')}
        </Button>
      </div>
      <div
        className="relative w-full min-h-0"
        style={{ height: fullscreen ? undefined : height, flex: fullscreen ? 1 : undefined }}
      >
        <div ref={hostRef} className="absolute inset-0 touch-none" />
        <p className="pointer-events-none absolute bottom-2 start-2 max-w-[70%] rounded bg-white/80 px-2 py-1 text-xs text-muted">
          {t('room3d.help')}
        </p>
      </div>
      {sel && (
        <aside
          className="absolute end-2 top-16 w-64 rounded-xl border border-border bg-surface/95 p-3 text-sm shadow-lg"
          aria-live="polite"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">
              {sel.reference.replace(/^EXEMPLE\s+/, '')}
            </h3>
            <button
              type="button"
              className="min-h-8 px-1 text-muted"
              aria-label={t('common.close')}
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-muted">
            {t(`room3d.kinds.${sel.kind}`)} · {t('room3d.system', { s: sel.system })}
          </p>
          <dl className="mt-2 space-y-0.5">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{t('room3d.size')}</dt>
              <dd dir="ltr">
                {sel.dimsMm.w} × {sel.dimsMm.d} × {sel.dimsMm.h} mm
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{t('solutions.weight')}</dt>
              <dd>{formatNumber(sel.weightKg, lang, 0)} kg</dd>
            </div>
            {sel.modules && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{t('room3d.modulesLabel')}</dt>
                <dd>
                  {t('room3d.modules', {
                    installed: sel.modules.installed,
                    slots: sel.modules.slots,
                    kw: sel.modules.kw,
                  })}
                </dd>
              </div>
            )}
            {sel.blocks && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{t('solutions.battery')}</dt>
                <dd className="text-end">
                  {t('room3d.blocks', {
                    count: sel.blocks.count,
                    ref: sel.blocks.reference.replace(/^EXEMPLE\s+/, ''),
                  })}
                </dd>
              </div>
            )}
          </dl>
          {(sel.blocks || sel.modules) && !xray && (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setXray(true)}>
              {t('room3d.seeInside')}
            </Button>
          )}
        </aside>
      )}
      <details className="border-t border-border bg-surface px-3 py-2 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-medium">
          {t('room3d.itemsList', { count: room.items.length })}
        </summary>
        <ul className="flex flex-wrap gap-1 pb-2">
          {room.items.map((it) => (
            <li key={it.id}>
              <Button
                variant={selected === it.id ? 'primary' : 'ghost'}
                aria-pressed={selected === it.id}
                onClick={() => setSelected(selected === it.id ? null : it.id)}
              >
                {shortName(it)}
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          {t('room3d.roomSize', { l: m(room.length), w: m(room.width), h: m(room.height) })}
        </p>
      </details>
    </div>
  );
}

function shortName(it: Item3D): string {
  const ref = it.reference.replace(/^EXEMPLE\s+/, '');
  if (it.kind === 'battery-cabinet' || it.kind === 'ebm') return `BAT ${it.id.split('-')[1]}`;
  return `${ref.length > 22 ? `${ref.slice(0, 21)}…` : ref} (${it.id.split('-')[1]})`;
}
