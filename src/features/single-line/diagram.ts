/**
 * Générateur du schéma unifilaire : transforme une solution en éléments graphiques positionnés
 * (traits, symboles IEC 60617 simplifiés, textes), indépendants de React pour être testés et
 * exportés tels quels.
 *
 * Topologie par système (A, et B en 2N) : réseau (+ groupe électrogène et inverseur de source) →
 * jeu de barres d'entrée → disjoncteurs d'entrée redresseur et bypass → UPS (redresseur, onduleur,
 * bypass statique) ou châssis modulaire, en parallèle → disjoncteur batterie et armoires →
 * disjoncteur de sortie → bus de sortie → tableau ondulé et départs ; bypass de maintenance externe
 * en dérivation du jeu de barres d'entrée vers le tableau ondulé.
 */
import type { UpsModel } from '../../catalog/schemas';
import type { CircuitResult, SolutionOption } from '../../engine/types';

export type SymbolKind =
  'source' | 'generator' | 'ats' | 'rectifier' | 'inverter' | 'staticSwitch' | 'battery';

export type El =
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      bus?: boolean;
      dashed?: boolean;
    }
  | { type: 'breaker'; x: number; y: number; tag: string; rating: string; cable?: string }
  | { type: 'symbol'; kind: SymbolKind; x: number; y: number; label?: string }
  | { type: 'box'; x: number; y: number; w: number; h: number; label: string; sub?: string }
  | {
      type: 'text';
      x: number;
      y: number;
      text: string;
      anchor?: 'start' | 'middle' | 'end';
      bold?: boolean;
      size?: number;
    }
  | { type: 'arrow'; x: number; y: number }
  | { type: 'dot'; x: number; y: number };

export interface Diagram {
  width: number;
  height: number;
  elements: El[];
}

export interface DiagramLabels {
  mains: string;
  generator: string;
  system: (s: 'A' | 'B') => string;
  board: string;
  maintenanceBypass: string;
  battery: string;
  feeder: string;
  modules: (n: number, kw: number) => string;
  units: (n: number) => string;
}

const UNIT_W = 190;
const MAX_DRAWN = 3;

function rating(c: CircuitResult | undefined): string {
  if (!c) return '—';
  return `${c.breakerA ?? '?'} A ${c.poles}P${c.dc ? ' DC' : ''}`;
}
function cable(c: CircuitResult | undefined): string | undefined {
  if (!c?.cable) return undefined;
  return `${c.cable.parallel > 1 ? `${c.cable.parallel}×` : ''}${c.cable.sectionMm2} mm²`;
}

export function buildSingleLine(
  option: SolutionOption,
  model: UpsModel | undefined,
  installation: { generator: boolean; externalMaintenanceBypass: boolean },
  feeders: number,
  labels: DiagramLabels,
): Diagram {
  const els: El[] = [];
  const systems: ('A' | 'B')[] = option.ups.systems === 2 ? ['A', 'B'] : ['A'];
  const units = option.ups.unitsPerSystem;
  const drawn = Math.min(units, MAX_DRAWN);
  const ellipsis = units > MAX_DRAWN;
  const sysW =
    120 +
    drawn * UNIT_W +
    (ellipsis ? 90 : 0) +
    (installation.externalMaintenanceBypass ? 110 : 30);
  const setsPerSystem = option.battery.sets / option.ups.systems;
  const shared = setsPerSystem < units;
  let breakerNo = 0;
  const q = () => `Q${++breakerNo}`;

  systems.forEach((s, si) => {
    const x0 = si * (sysW + 40);
    const circ = (id: CircuitResult['id']) =>
      option.electrical.circuits.find((c) => c.id === id && c.system === s);
    const firstX = x0 + 110;
    const lastX = firstX + (drawn - 1) * UNIT_W + 80;
    const busEnd = installation.externalMaintenanceBypass
      ? lastX + 140 + (ellipsis ? 90 : 0)
      : lastX + 20 + (ellipsis ? 90 : 0);
    const mainsX = x0 + 60;

    if (systems.length > 1)
      els.push({
        type: 'text',
        x: x0 + sysW / 2,
        y: 18,
        text: labels.system(s),
        anchor: 'middle',
        bold: true,
        size: 15,
      });

    // Sources
    els.push({
      type: 'symbol',
      kind: 'source',
      x: mainsX,
      y: 50,
      label: systems.length > 1 ? `${labels.mains} ${s}` : labels.mains,
    });
    let feedY = 72;
    if (installation.generator) {
      els.push({
        type: 'symbol',
        kind: 'generator',
        x: mainsX + 90,
        y: 50,
        label: option.electrical.generatorKVA
          ? `${labels.generator} ${Math.round(option.electrical.generatorKVA / systems.length)} kVA`
          : labels.generator,
      });
      els.push({ type: 'line', x1: mainsX, y1: 72, x2: mainsX, y2: 100 });
      els.push({ type: 'line', x1: mainsX + 90, y1: 72, x2: mainsX + 90, y2: 100 });
      els.push({
        type: 'symbol',
        kind: 'ats',
        x: mainsX + 45,
        y: 112,
        label: `ATS ${rating(circ('ats'))}`,
      });
      els.push({ type: 'line', x1: mainsX + 45, y1: 124, x2: mainsX + 45, y2: 150 });
      els.push({ type: 'line', x1: mainsX + 45, y1: 150, x2: mainsX, y2: 150 });
      feedY = 150;
    }
    els.push({ type: 'line', x1: mainsX, y1: feedY, x2: mainsX, y2: 170 });
    // Jeu de barres d'entrée
    els.push({ type: 'line', x1: mainsX - 10, y1: 170, x2: busEnd, y2: 170, bus: true });

    const unitXs = Array.from({ length: drawn }, (_, i) => firstX + i * UNIT_W);
    unitXs.forEach((ux, i) => {
      const bx = ux + 80; // ligne bypass
      // Entrées
      els.push({ type: 'dot', x: ux, y: 170 }, { type: 'dot', x: bx, y: 170 });
      els.push(
        { type: 'line', x1: ux, y1: 170, x2: ux, y2: 250 },
        { type: 'line', x1: bx, y1: 170, x2: bx, y2: 250 },
      );
      els.push({
        type: 'breaker',
        x: ux,
        y: 210,
        tag: q(),
        rating: rating(circ('rectifier')),
        cable: cable(circ('rectifier')),
      });
      els.push({
        type: 'breaker',
        x: bx,
        y: 210,
        tag: q(),
        rating: rating(circ('bypass')),
        cable: cable(circ('bypass')),
      });
      // UPS
      const isModular = !!model?.modular;
      const mods = option.ups.modulesPerFrame?.[i];
      els.push({
        type: 'box',
        x: ux - 40,
        y: 250,
        w: 160,
        h: 162,
        label: isModular ? `${shortRef(option.ups.reference)}` : shortRef(option.ups.reference),
        sub:
          isModular && mods !== undefined && model?.modular
            ? labels.modules(mods, model.modular.moduleKW)
            : undefined,
      });
      els.push({ type: 'symbol', kind: 'rectifier', x: ux, y: 297 });
      els.push({ type: 'line', x1: ux, y1: 315, x2: ux, y2: 339 });
      els.push({ type: 'symbol', kind: 'inverter', x: ux, y: 357 });
      els.push({ type: 'line', x1: bx, y1: 250, x2: bx, y2: 342 });
      els.push({ type: 'symbol', kind: 'staticSwitch', x: bx, y: 352 });
      els.push({ type: 'line', x1: bx, y1: 362, x2: bx, y2: 397 });
      els.push({ type: 'line', x1: ux, y1: 375, x2: ux, y2: 397 });
      els.push({ type: 'line', x1: ux, y1: 397, x2: bx, y2: 397 });
      // Sortie
      const ox = (ux + bx) / 2;
      els.push({ type: 'line', x1: ox, y1: 397, x2: ox, y2: 480 });
      els.push({
        type: 'breaker',
        x: ox,
        y: 445,
        tag: q(),
        rating: rating(circ('output')),
        cable: cable(circ('output')),
      });
      els.push({ type: 'dot', x: ox, y: 480 });
      // Batterie (une par unité, ou commune au système)
      if (!shared || i === 0) {
        const bxBat = ux - 40;
        els.push({ type: 'line', x1: ux, y1: 327, x2: bxBat, y2: 327 });
        els.push({ type: 'line', x1: bxBat, y1: 327, x2: ux - 70, y2: 327 });
        els.push({ type: 'line', x1: ux - 70, y1: 327, x2: ux - 70, y2: 470 });
        els.push({
          type: 'breaker',
          x: ux - 70,
          y: 435,
          tag: q(),
          rating: rating(circ('battery')),
          cable: cable(circ('battery')),
        });
        const b = option.battery;
        const cab = b.cabinets[0];
        els.push({
          type: 'symbol',
          kind: 'battery',
          x: ux - 70,
          y: 490,
          label: `${b.blocksPerString}×${b.blockV} V ${b.capacityAh} Ah × ${b.strings}${cab ? ` — ${cab.qty} × ${shortRef(cab.reference)}` : ''}`,
        });
      }
    });
    if (ellipsis) {
      const ex = firstX + drawn * UNIT_W + 10;
      els.push({ type: 'text', x: ex, y: 330, text: '…', anchor: 'middle', bold: true, size: 22 });
      els.push({ type: 'text', x: ex, y: 355, text: labels.units(units), anchor: 'middle' });
    }

    // Bus de sortie et tableau ondulé
    const outFirst = unitXs[0]! + 40;
    const outLast = unitXs[unitXs.length - 1]! + 40 + (ellipsis ? 90 : 0);
    els.push({
      type: 'line',
      x1: outFirst - 10,
      y1: 480,
      x2: outLast + 10,
      y2: 480,
      bus: units > 1,
    });
    const boardX = outFirst;
    els.push({ type: 'line', x1: boardX, y1: 480, x2: boardX, y2: 560 });
    const boardEnd = Math.max(busEnd, boardX + (feeders - 1) * 75 + 40);
    els.push({ type: 'line', x1: boardX - 20, y1: 560, x2: boardEnd, y2: 560, bus: true });
    els.push({
      type: 'text',
      x: boardX - 20,
      y: 552,
      text: labels.board,
      anchor: 'start',
      bold: true,
    });

    if (installation.externalMaintenanceBypass) {
      const mx = busEnd - 20;
      els.push({ type: 'dot', x: mx, y: 170 });
      els.push({ type: 'line', x1: mx, y1: 170, x2: mx, y2: 560, dashed: false });
      els.push({
        type: 'breaker',
        x: mx,
        y: 370,
        tag: q(),
        rating: rating(circ('maintenanceBypass')),
        cable: cable(circ('maintenanceBypass')),
      });
      els.push({
        type: 'text',
        x: mx + 8,
        y: 300,
        text: labels.maintenanceBypass,
        anchor: 'start',
      });
      els.push({ type: 'dot', x: mx, y: 560 });
    }

    // Départs
    const feeder = circ('feeder');
    for (let f = 0; f < feeders; f++) {
      const fx = boardX + 10 + f * 75;
      els.push({ type: 'dot', x: fx, y: 560 });
      els.push({ type: 'line', x1: fx, y1: 560, x2: fx, y2: 640 });
      els.push({ type: 'breaker', x: fx, y: 600, tag: q(), rating: rating(feeder) });
      els.push({ type: 'arrow', x: fx, y: 648 });
    }
    els.push({ type: 'text', x: boardX + 10, y: 675, text: labels.feeder, anchor: 'start' });
  });

  const width = systems.length * sysW + (systems.length - 1) * 40 + 40;
  // En 2N, les titres « Système A / B » ont leur propre bandeau : on décale le reste du schéma.
  const top = systems.length > 1 ? 28 : 0;
  const shifted = top
    ? els.map((e): El => {
        if (e.type === 'text' && e.size === 15) return e;
        if (e.type === 'line') return { ...e, y1: e.y1 + top, y2: e.y2 + top };
        return { ...e, y: e.y + top };
      })
    : els;
  return { width: Math.max(width, 520), height: 690 + top, elements: shifted };
}

function shortRef(ref: string): string {
  return ref.replace(/^EXEMPLE\s+/, '');
}
