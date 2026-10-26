import { describe, expect, it } from 'vitest';
import {
  autoPlace,
  computeLayout,
  doorSwing,
  intersection,
  itemGeometry,
  unionArea,
  worldSide,
  type LayoutSource,
} from '../layout';
import { project, settings } from './fixtures';

const ups: LayoutSource = {
  id: 'ups-A1',
  kind: 'ups',
  system: 'A',
  refId: 'U1',
  reference: 'UPS',
  w: 600,
  d: 850,
  h: 1900,
  weightKg: 400,
  clearances: { front: 1000, rear: 0, left: 0, right: 0, top: 500 },
  rackUnits: null,
};
const cab = (n: number, system: 'A' | 'B' = 'A'): LayoutSource => ({
  ...ups,
  id: `bat-${system}${n}`,
  system,
  kind: 'cabinet',
  refId: 'C1',
  reference: 'Armoire',
  w: 800,
  d: 800,
  weightKg: 700,
  clearances: { front: 1000, rear: 0, left: 0, right: 0, top: 300 },
});

function room(over: Partial<ReturnType<typeof project>['room']> = {}) {
  const r = project('server').room;
  return {
    ...r,
    lengthMm: 5000,
    widthMm: 4000,
    heightMm: 2700,
    door: { widthMm: 900, heightMm: 2100, wall: 'bottom' as const, offsetMm: 300 },
    floorLoadKgM2: 1000,
    ...over,
  };
}
const items = [ups, cab(1), cab(2), cab(3), cab(4)];

describe('géométrie', () => {
  it('rotation horaire des côtés', () => {
    expect(worldSide('front', 0)).toBe('bottom');
    expect(worldSide('front', 90)).toBe('left');
    expect(worldSide('front', 180)).toBe('top');
    expect(worldSide('front', 270)).toBe('right');
    expect(worldSide('left', 90)).toBe('top');
  });
  it('emprise et dégagement avant après rotation', () => {
    const g = itemGeometry(ups, 2000, 1000, 90);
    expect(g.body).toEqual({ x: 2000, y: 1000, w: 850, h: 600 });
    expect(g.zones).toEqual([{ side: 'front', rect: { x: 1000, y: 1000, w: 1000, h: 600 } }]);
  });
  it('intersection et union de rectangles', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(intersection(a, { x: 5, y: 5, w: 10, h: 10 })).toEqual({ w: 5, h: 5 });
    expect(intersection(a, { x: 10, y: 0, w: 10, h: 10 })).toBeNull();
    expect(unionArea([a, { x: 5, y: 5, w: 10, h: 10 }])).toBe(175);
    expect(unionArea([])).toBe(0);
  });
  it('zone de débattement de la porte sur chaque mur', () => {
    const r = room();
    expect(doorSwing(r)).toEqual({ x: 300, y: 3100, w: 900, h: 900 });
    expect(doorSwing({ ...r, door: { ...r.door, wall: 'top' } }).y).toBe(0);
    expect(doorSwing({ ...r, door: { ...r.door, wall: 'left' } })).toEqual({
      x: 0,
      y: 300,
      w: 900,
      h: 900,
    });
    expect(doorSwing({ ...r, door: { ...r.door, wall: 'right' } }).x).toBe(4100);
  });
});

describe('placement automatique', () => {
  it('en ligne, dos au mur le plus long', () => {
    const p = autoPlace(items, room());
    expect(p.map((x) => x.x)).toEqual([0, 600, 1400, 2200, 3000]);
    expect(p.every((x) => x.y === 0 && x.rot === 0)).toBe(true);
  });
  it('local plus large que long : ligne sur le mur de gauche', () => {
    const p = autoPlace([ups], room({ lengthMm: 3000, widthMm: 6000 }));
    expect(p[0]).toEqual({ x: 0, y: 0, rot: 270 });
  });
  it('ligne trop longue : le reste passe sur le mur opposé en évitant la porte', () => {
    const p = autoPlace(items, room({ lengthMm: 3000, widthMm: 2900 }));
    expect(p[4]).toEqual({ x: 1300, y: 2100, rot: 180 });
  });
  it('2N : le système B face au système A', () => {
    const p = autoPlace(
      [ups, cab(1), { ...ups, id: 'ups-B1', system: 'B' }, cab(1, 'B')],
      room({ lengthMm: 2000, widthMm: 1900 }),
    );
    expect(p[2]!.rot).toBe(180);
    expect(p[3]!.rot).toBe(180);
  });
});

describe('contrôles d’implantation', () => {
  it('tient dans le local : emprise, surface restante, charge au sol', () => {
    const r = computeLayout(items, { room: room(), layout: { positions: {} } }, settings);
    expect(r.value.fits).toBe(true);
    // UPS 600 × 1 850 + 4 armoires 800 × 1 800
    expect(r.value.footprintWithClearancesM2).toBeCloseTo(6.87, 6);
    expect(r.value.remainingAreaM2).toBeCloseTo(13.13, 6);
    expect(r.value.equipmentAreaM2).toBeCloseTo(0.51 + 2.56, 6);
    // armoire : 700 kg ÷ 0,64 m² = 1 094 kg/m² concentrée ; ÷ (0,64 + 0,8) = 486 kg/m² répartie
    expect(r.value.floor.maxConcentratedKgM2).toBeCloseTo(1093.75, 2);
    expect(r.value.floor.maxDistributedKgM2).toBeCloseTo(700 / 1.44, 2);
    // 1 094 kg/m² ≤ 2 × 1 000 : pas d'alerte ; > 2 × 500 : à vérifier
    expect(r.alerts.find((a) => a.code === 'floor_concentrated')).toBeUndefined();
    const soft = computeLayout(
      items,
      { room: room({ floorLoadKgM2: 500 }), layout: { positions: {} } },
      settings,
    );
    expect(soft.alerts.find((a) => a.code === 'floor_concentrated')?.level).toBe('warn');
    expect(r.value.floor.totalWeightKg).toBe(400 + 4 * 700);
  });
  it('local trop étroit : manque en largeur, en mètres', () => {
    const r = computeLayout(
      items,
      { room: room({ widthMm: 1500 }), layout: { positions: {} } },
      settings,
    );
    expect(r.value.fits).toBe(false);
    expect(r.value.missingMm.width).toBe(350);
    expect(r.alerts).toContainEqual({
      level: 'block',
      code: 'room_too_small',
      params: { axis: 'width', missing: 0.35 },
    });
  });
  it('hauteur insuffisante', () => {
    const r = computeLayout(
      [ups],
      { room: room({ heightMm: 2200 }), layout: { positions: {} } },
      settings,
    );
    expect(r.value.missingMm.height).toBe(200);
  });
  it('porte trop étroite et trop basse', () => {
    const r = computeLayout(
      [ups],
      {
        room: room({ door: { widthMm: 600, heightMm: 1800, wall: 'bottom', offsetMm: 300 } }),
        layout: { positions: {} },
      },
      settings,
    );
    expect(r.value.door_check.ok).toBe(false);
    expect(r.alerts.map((a) => a.code)).toEqual(
      expect.arrayContaining(['door_too_narrow', 'door_too_low']),
    );
    expect(r.alerts.find((a) => a.code === 'door_too_narrow')!.params.missing).toBe(0.05);
  });
  it('sol insuffisant : bloquant si la valeur est connue, à vérifier sinon', () => {
    const known = computeLayout(
      items,
      { room: room({ floorLoadKgM2: 300 }), layout: { positions: {} } },
      settings,
    );
    expect(known.alerts.find((a) => a.code === 'floor_overload')?.level).toBe('block');
    const unknown = computeLayout(
      items,
      { room: room({ floorLoadKgM2: null }), layout: { positions: {} } },
      { ...settings, room: { ...settings.room, defaultFloorLoadKgM2: 300 } },
    );
    expect(unknown.alerts.find((a) => a.code === 'floor_overload_unknown')?.level).toBe('warn');
  });
  it('positions glissées : chevauchement, dégagement occupé, débordement', () => {
    const positions = { 'bat-A1': { x: 100, y: 0, rot: 0 as const } };
    const r = computeLayout(items, { room: room(), layout: { positions } }, settings);
    expect(r.value.collisions).toContainEqual(['ups-A1', 'bat-A1']);
    expect(r.alerts.some((a) => a.code === 'items_overlap')).toBe(true);
    const front = computeLayout(
      [ups, cab(1)],
      { room: room(), layout: { positions: { 'bat-A1': { x: 0, y: 1500, rot: 0 } } } },
      settings,
    );
    expect(front.value.missingMm.width).toBeGreaterThan(0);
    const out = computeLayout(
      [ups],
      { room: room(), layout: { positions: { 'ups-A1': { x: 4700, y: 0, rot: 0 } } } },
      settings,
    );
    expect(out.value.missingMm.length).toBe(300);
    const side = computeLayout(
      [ups, cab(1)],
      { room: room(), layout: { positions: { 'bat-A1': { x: 0, y: 1300, rot: 90 } } } },
      settings,
    );
    expect(side.value.missingMm.length).toBeGreaterThan(0);
  });
  it('porte bloquée et faux plancher', () => {
    const r = computeLayout(
      [cab(1)],
      {
        room: room({ raisedFloor: true }),
        layout: { positions: { 'bat-A1': { x: 300, y: 3200, rot: 180 } } },
      },
      settings,
    );
    expect(r.alerts.map((a) => a.code)).toEqual(
      expect.arrayContaining(['door_blocked', 'raised_floor_support']),
    );
  });
  it('baie existante : unités de rack, pas de contrôle du local', () => {
    const rackUps = { ...ups, w: 438, d: 600, h: 88, weightKg: 25, rackUnits: 2 };
    const r = computeLayout(
      [rackUps],
      { room: room({ kind: 'rack', lengthMm: 100, widthMm: 100 }), layout: { positions: {} } },
      settings,
    );
    expect(r.value.fits).toBe(true);
    expect(r.value.rackUnitsTotal).toBe(2);
    expect(r.alerts[0]).toMatchObject({ code: 'rack_units', params: { u: 2 } });
  });
});
