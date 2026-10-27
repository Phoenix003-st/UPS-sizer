import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import { createProject, runSizing } from '../../engine';
import { DEFAULT_SETTINGS, type ScenarioId } from '../../settings/schema';
import { arrangeBlocks, blocksInCabinet, buildRoom3D, planRotToY } from '../room-3d/model';
import { doorSwingRect, existingRackGear, overlaps, RACK_BASE, RACK_U } from '../room-3d/furnish';
import { buildScene } from '../room-3d/scene';
import { cameraPreset, equipmentBounds } from '../room-3d/stage';

function room3d(scenario: ScenarioId, tweak?: (p: ReturnType<typeof createProject>) => void) {
  const p = createProject(scenario, DEFAULT_SETTINGS, { id: 't', now: '2026-01-01' });
  tweak?.(p);
  const option = runSizing(p, DEFAULT_CATALOGS, DEFAULT_SETTINGS).options[0]!;
  return { option, room: buildRoom3D(option, DEFAULT_CATALOGS, p.room) };
}

describe('modèle 3D', () => {
  it('rotation du plan → rotation 3D (face avant vers +Z à 0°)', () => {
    const front = (rot: 0 | 90 | 180 | 270) => {
      const v = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        planRotToY(rot),
      );
      return [Math.round(v.x) + 0, Math.round(v.z) + 0]; // + 0 : pas de -0
    };
    expect(front(0)).toEqual([0, 1]); // vers le bas du plan
    expect(front(90)).toEqual([-1, 0]); // vers la gauche
    expect(front(180)).toEqual([0, -1]);
    expect(front(270)).toEqual([1, 0]);
  });

  it('rangement des blocs sur les étagères d’une armoire', () => {
    // Armoire 0,8 × 0,85 × 1,9 m, blocs 0,307 × 0,169 × 0,211 m.
    const r = arrangeBlocks(40, { w: 0.8, d: 0.85, h: 1.9 }, { w: 0.307, d: 0.169, h: 0.211 });
    expect(r.drawn).toBe(40);
    expect(r.shelves.length).toBeGreaterThan(1);
    // Tous les blocs restent dans l'armoire.
    for (const p of r.positions) {
      expect(Math.abs(p.x)).toBeLessThan(0.4);
      expect(Math.abs(p.z)).toBeLessThan(0.425);
      expect(p.y).toBeLessThan(1.9);
    }
    // Trop de blocs pour la hauteur : seuls ceux qui tiennent sont dessinés.
    expect(
      arrangeBlocks(10_000, { w: 0.8, d: 0.85, h: 1.9 }, { w: 0.307, d: 0.169, h: 0.211 }).drawn,
    ).toBeLessThan(10_000);
    expect(arrangeBlocks(5, { w: 0.1, d: 0.1, h: 1 }, { w: 0.3, d: 0.2, h: 0.2 }).drawn).toBe(0);
  });

  it('répartition des blocs entre les armoires d’un jeu', () => {
    // 120 blocs dans 3 armoires : 40 chacune ; 50 blocs dans 3 : 17, 17, 16.
    expect([1, 2, 3].map((k) => blocksInCabinet(k, 120, 3))).toEqual([40, 40, 40]);
    expect([1, 2, 3].map((k) => blocksInCabinet(k, 50, 3))).toEqual([17, 17, 16]);
    expect(blocksInCabinet(4, 50, 3)).toBe(17); // deuxième jeu
  });

  it('data center modulaire : modules installés et blocs dans les armoires', () => {
    const { option, room } = room3d('datacenter', (p) => {
      p.settingsOverrides = { scenarios: { datacenter: { technologies: ['modular'] } } };
    });
    const frame = room.items.find((i) => i.kind === 'modular-frame')!;
    expect(frame.modules!.installed).toBe(option.ups.modulesPerFrame![0]);
    const cabinets = room.items.filter((i) => i.kind === 'battery-cabinet');
    const perSet =
      option.battery.blocksPerString * (option.battery.strings - option.battery.internalStrings);
    expect(cabinets.reduce((s, c) => s + c.blocks!.count, 0)).toBe(perSet * option.battery.sets);
    expect(room.zones.length).toBeGreaterThan(0);
    expect(room.length).toBeCloseTo(option.layout.room.lengthMm / 1000);
  });

  it('2N : deux systèmes, équipements dans le local', () => {
    const { room } = room3d('airport');
    expect(new Set(room.items.map((i) => i.system))).toEqual(new Set(['A', 'B']));
    for (const it of room.items) {
      expect(it.x).toBeGreaterThan(0);
      expect(it.x).toBeLessThan(room.length);
      expect(it.z).toBeGreaterThan(0);
      expect(it.z).toBeLessThan(room.width);
    }
  });

  it('équipements rackables : debout hors baie, montés en bas d’une baie existante', () => {
    const tower = room3d('office').room.items.find((i) => i.dimsMm.h <= 150 && i.dimsMm.w > 300);
    if (tower) expect(tower.h).toBeGreaterThan(tower.w); // posé en tour
    const { room } = room3d('office', (p) => void (p.room.kind = 'rack'));
    expect(room.rack).not.toBeNull();
    expect(room.racks.length).toBeGreaterThanOrEqual(1);
    const stacked = room.items.filter((i) => i.y > 0);
    expect(stacked.length).toBeGreaterThan(0);
    expect(stacked.every((i) => i.x === room.rack!.x && i.z === room.rack!.z)).toBe(true);
    // Montage à partir de l'unité 1 (charges lourdes en bas de baie).
    expect(Math.min(...stacked.map((i) => i.y))).toBeCloseTo(RACK_BASE);
    // Le contenu existant commence au-dessus des équipements montés, sans chevauchement.
    const top = Math.max(...stacked.map((i) => i.y + i.h));
    for (const g of room.rack!.gear) {
      expect(RACK_BASE + (g.u - 1) * RACK_U).toBeGreaterThanOrEqual(top - 1e-6);
      expect(g.u + g.n - 1).toBeLessThanOrEqual(42);
    }
    // Les autres baies de la rangée sont déjà équipées.
    for (const r of room.racks.filter((x) => !x.host)) expect(r.gear.length).toBeGreaterThan(5);
    expect(room.zones).toEqual([]);
  });
});

describe('aménagement selon le type de local', () => {
  const kinds = ['dedicated', 'shared', 'office', 'rack'] as const;

  it.each(kinds)(
    '%s : rien ne chevauche les équipements, leurs dégagements ni la porte',
    (kind) => {
      // Pas de solution rackable pour un data center : il n'est pas testé en baie existante.
      const scenarios =
        kind === 'rack'
          ? (['server', 'office'] as const)
          : (['server', 'office', 'datacenter'] as const);
      for (const scenario of scenarios) {
        const { option, room } = room3d(scenario, (p) => void (p.room.kind = kind));
        const mm = (r: { x: number; y: number; w: number; h: number }) => ({
          x: r.x / 1000,
          z: r.y / 1000,
          w: r.w / 1000,
          d: r.h / 1000,
        });
        const racked = new Set(room.items.filter((i) => i.y > 0).map((i) => i.id));
        const blocked = [
          doorSwingRect(room),
          ...option.layout.items
            .filter((it) => !racked.has(it.id))
            .flatMap((it) => [it.body, ...it.zones.map((z) => z.rect)].map(mm)),
        ];
        for (const d of room.furnishing.decor.filter((x) => x.y === 0)) {
          const quarter = d.wall === 'left' || d.wall === 'right';
          const r = {
            x: d.x - (quarter ? d.d : d.w) / 2,
            z: d.z - (quarter ? d.w : d.d) / 2,
            w: quarter ? d.d : d.w,
            d: quarter ? d.w : d.d,
          };
          for (const b of blocked)
            expect(overlaps(r, b), `${kind} ${scenario} ${d.kind}`).toBe(false);
          expect(r.x).toBeGreaterThanOrEqual(-1e-6);
          expect(r.z).toBeGreaterThanOrEqual(-1e-6);
          expect(r.x + r.w).toBeLessThanOrEqual(room.length + 1e-6);
          expect(r.z + r.d).toBeLessThanOrEqual(room.width + 1e-6);
        }
      }
    },
  );

  it('chaque type de local a son propre aménagement', () => {
    const decor = (kind: (typeof kinds)[number]) =>
      new Set(
        room3d('server', (p) => void (p.room.kind = kind)).room.furnishing.decor.map((d) => d.kind),
      );
    expect(decor('dedicated').has('electrical-panel')).toBe(true);
    expect(decor('dedicated').has('cable-tray')).toBe(true);
    expect(decor('office').has('desk')).toBe(true);
    expect(decor('office').has('window')).toBe(true);
    expect(decor('shared').has('shelving')).toBe(true);
    expect(decor('office').has('electrical-panel')).toBe(false);
    expect(room3d('server', (p) => void (p.room.kind = 'office')).room.furnishing.floor).toBe(
      'carpet',
    );
    // Grande salle climatisée : armoire de précision plutôt qu'un split mural.
    expect(room3d('datacenter').room.furnishing.decor.some((d) => d.kind === 'crac')).toBe(true);
    expect(room3d('datacenter').room.furnishing.floor).toBe('raised');
    expect(room3d('server').room.racks).toEqual([]);
  });

  it('contenu type d’une baie : brassage en haut, rien sous l’unité demandée', () => {
    const gear = existingRackGear(0, 10);
    expect(gear[0]).toMatchObject({ u: 42, type: 'patch' });
    expect(Math.min(...gear.map((g) => g.u))).toBeGreaterThanOrEqual(10);
    // Les équipements ne se chevauchent pas.
    const used = new Set<number>();
    for (const g of gear)
      for (let u = g.u; u < g.u + g.n; u++) {
        expect(used.has(u)).toBe(false);
        used.add(u);
      }
  });
});

describe('scène three.js', () => {
  it('construit le local, les équipements, les blocs instanciés et les cotes', () => {
    const { room } = room3d('datacenter', (p) => {
      p.settingsOverrides = { scenarios: { datacenter: { technologies: ['modular'] } } };
    });
    const s = buildScene(room);
    expect(s.items.size).toBe(room.items.length);
    expect(s.pickables).toHaveLength(room.items.length);
    expect(s.walls.length).toBeGreaterThanOrEqual(5); // 4 murs, dont un découpé par la porte, + battant
    expect(s.dimensions.map((d) => d.length)).toEqual([room.length, room.width, room.height]);
    let instances = 0;
    s.root.traverse((o) => {
      if (
        o instanceof THREE.InstancedMesh &&
        o.material !== undefined &&
        (o.geometry as THREE.BoxGeometry).parameters?.width === 1
      )
        instances += o.count;
    });
    // Chaque bloc dessiné = un corps + une borne.
    const drawn = room.items.reduce((n, i) => n + (i.blocks?.positions.length ?? 0), 0);
    expect(instances).toBe(drawn * 2);
    // Intérieur masqué par défaut, visible en mode « intérieur ».
    const hiddenInternals = () => {
      let h = 0;
      s.root.traverse((o) => o instanceof THREE.InstancedMesh && !o.parent?.visible && h++);
      return h;
    };
    expect(hiddenInternals()).toBeGreaterThan(0);
    s.setXray(true);
    expect(hiddenInternals()).toBe(0);
    s.setHighlight(room.items[0]!.id);
    s.setHighlight(null);
    s.dispose();
  });

  it('vues prédéfinies cadrées sur les équipements', () => {
    const { room } = room3d('server');
    const eq = equipmentBounds(room);
    for (const v of ['iso', 'top', 'front'] as const) {
      const p = cameraPreset(room, v);
      expect(p.position.y).toBeGreaterThan(0);
      expect(p.fov).toBeGreaterThan(20);
    }
    expect(cameraPreset(room, 'iso').target.x).toBeCloseTo(eq.center.x);
    expect(cameraPreset(room, 'top').position.y).toBeGreaterThan(room.height);
  });
});
