/**
 * Plan d'implantation : vue de dessus à l'échelle (1 unité SVG = 1 mm), grille de 100 mm, cotes,
 * dégagements hachurés, porte avec arc d'ouverture, surface restante.
 *
 * Les équipements se déplacent à la souris ou au doigt (Pointer Events), et au clavier (flèches :
 * 100 mm, Maj + flèches : 10 mm, R : rotation de 90°). Collisions et dégagements sont re-vérifiés
 * en direct par le moteur (computeLayout).
 */
import { forwardRef, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { computeLayout, doorSwing, type LayoutSource } from '../../engine/layout';
import type { Project } from '../../engine/project';
import type { LayoutItem, SolutionOption } from '../../engine/types';
import { useProjectStore } from '../../state/projectStore';
import { useSettingsStore } from '../../state/settingsStore';
import { AlertList, Button } from '../../ui/components';
import { formatNumber } from '../../ui/format';
import { doorRect } from './geometry';

type Positions = Project['layout']['positions'];
type Rot = LayoutItem['rot'];
const SNAP = 50;

function toSource(i: LayoutItem): LayoutSource {
  return {
    id: i.id,
    kind: i.kind,
    system: i.system,
    refId: i.refId,
    reference: i.reference,
    w: i.w,
    d: i.d,
    h: i.h,
    weightKg: i.weightKg,
    clearances: i.clearances,
    rackUnits: i.rackUnits ?? null,
  };
}

export function LayoutPlan({
  project,
  option,
  svgRef,
}: {
  project: Project;
  option: SolutionOption;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const update = useProjectStore((s) => s.update);
  const [live, setLive] = useState<Positions | null>(null);
  const sources = useMemo(() => option.layout.items.map(toSource), [option.layout.items]);
  const positions = live ?? project.layout.positions;
  const layout = useMemo(
    () => computeLayout(sources, { room: project.room, layout: { positions } }, settings),
    [sources, project.room, positions, settings],
  );

  const commit = (next: Positions) => {
    setLive(null);
    update((d) => void (d.layout.positions = next));
  };
  const current = (it: LayoutItem): { x: number; y: number; rot: Rot } =>
    positions[it.id] ?? { x: it.x, y: it.y, rot: it.rot };
  const withItem = (it: LayoutItem, p: { x: number; y: number; rot: Rot }): Positions => {
    const all: Positions = {};
    for (const x of layout.value.items) all[x.id] = current(x);
    all[it.id] = p;
    return all;
  };
  const colliding = new Set(layout.value.collisions.flat());

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {t('plan.legend')} {t('plan.dragHelp')}
        </p>
        <Button
          onClick={() => commit({})}
          disabled={Object.keys(project.layout.positions).length === 0}
        >
          {t('plan.reset')}
        </Button>
      </div>
      <PlanSvg
        ref={svgRef}
        layout={layout.value}
        colliding={colliding}
        title={t('plan.title')}
        doorLabel={t('plan.door')}
        remainingLabel={t('plan.remaining', {
          m2: formatNumber(layout.value.remainingAreaM2, i18n.language, 1),
        })}
        onMove={(it, p, done) => {
          const next = withItem(it, p);
          if (done) commit(next);
          else setLive(next);
        }}
        current={current}
      />
      <div className="mt-3">
        <AlertList
          alerts={layout.alerts.filter((a) => a.level !== 'ok')}
          empty={t('room.noAlert')}
        />
      </div>
    </div>
  );
}

interface PlanSvgProps {
  layout: SolutionOption['layout'];
  colliding?: Set<string>;
  title: string;
  doorLabel: string;
  remainingLabel: string;
  /** Absent : plan statique (rapport PDF). */
  onMove?: (it: LayoutItem, p: { x: number; y: number; rot: Rot }, done: boolean) => void;
  current?: (it: LayoutItem) => { x: number; y: number; rot: Rot };
  /** Impression / PDF : grille au mètre en traits simples (motifs imbriqués mal rendus en PDF). */
  print?: boolean;
}

/** Rendu SVG du plan (réutilisé tel quel dans le rapport PDF). */
export const PlanSvg = forwardRef<SVGSVGElement, PlanSvgProps>(function PlanSvg(
  {
    layout,
    colliding = new Set(),
    title,
    doorLabel,
    remainingLabel,
    onMove,
    current,
    print = false,
  },
  ref,
) {
  const { lengthMm: L, widthMm: W } = layout.room;
  const m = Math.max(L, W);
  const margin = m * 0.09;
  const font = m * 0.022;
  const stroke = m * 0.0025;
  const localRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; rot: Rot; moved: boolean } | null>(
    null,
  );
  const door = doorRect(layout);
  const dw = layout.door.widthMm;
  const swing = doorSwing({ lengthMm: L, widthMm: W, door: layout.door } as Parameters<
    typeof doorSwing
  >[0]);

  const toSvg = (e: RPointerEvent) => {
    const svg = localRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: r.x, y: r.y };
  };
  const snap = (v: number) => Math.round(v / SNAP) * SNAP;

  // Arc d'ouverture de la porte (quart de cercle vers l'intérieur).
  const arc = (() => {
    const { wall } = layout.door;
    if (wall === 'top') return `M ${door.x1} ${dw} A ${dw} ${dw} 0 0 0 ${door.x2} 0`;
    if (wall === 'bottom') return `M ${door.x1} ${W - dw} A ${dw} ${dw} 0 0 1 ${door.x2} ${W}`;
    if (wall === 'left') return `M ${dw} ${door.y1} A ${dw} ${dw} 0 0 1 0 ${door.y2}`;
    return `M ${L - dw} ${door.y1} A ${dw} ${dw} 0 0 0 ${L} ${door.y2}`;
  })();
  const leaf = (() => {
    const { wall } = layout.door;
    if (wall === 'top') return { x1: door.x1, y1: 0, x2: door.x1, y2: dw };
    if (wall === 'bottom') return { x1: door.x1, y1: W, x2: door.x1, y2: W - dw };
    if (wall === 'left') return { x1: 0, y1: door.y1, x2: dw, y2: door.y1 };
    return { x1: L, y1: door.y1, x2: L - dw, y2: door.y1 };
  })();

  return (
    <svg
      ref={(el) => {
        localRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-margin} ${-margin} ${L + 2 * margin} ${W + 2 * margin}`}
      role="group"
      aria-label={title}
      className="h-auto w-full select-none rounded-lg border border-border bg-white"
      style={{ maxHeight: '70vh', direction: 'ltr' }}
      fontFamily="system-ui, sans-serif"
    >
      <title>{title}</title>
      <defs>
        <pattern id="grid100" width={100} height={100} patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e3e8ef" strokeWidth={stroke * 0.6} />
        </pattern>
        <pattern id="grid1000" width={1000} height={1000} patternUnits="userSpaceOnUse">
          <rect width={1000} height={1000} fill="url(#grid100)" />
          <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#c9d1db" strokeWidth={stroke} />
        </pattern>
        <pattern
          id="hatch"
          width={80}
          height={80}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={80} height={80} fill="#0f766e" opacity={0.06} />
          <line x1={0} y1={0} x2={0} y2={80} stroke="#0f766e" strokeWidth={14} opacity={0.35} />
        </pattern>
      </defs>

      {/* Local et grille */}
      {print ? (
        <g stroke="#c9d1db" strokeWidth={stroke}>
          {Array.from({ length: Math.floor(L / 1000) }, (_, i) => (
            <line key={`gx${i}`} x1={(i + 1) * 1000} y1={0} x2={(i + 1) * 1000} y2={W} />
          ))}
          {Array.from({ length: Math.floor(W / 1000) }, (_, i) => (
            <line key={`gy${i}`} x1={0} y1={(i + 1) * 1000} x2={L} y2={(i + 1) * 1000} />
          ))}
        </g>
      ) : (
        <rect x={0} y={0} width={L} height={W} fill="url(#grid1000)" />
      )}
      <rect
        x={0}
        y={0}
        width={L}
        height={W}
        fill="none"
        stroke="#1b2430"
        strokeWidth={stroke * 6}
      />

      {/* Porte */}
      <line
        x1={door.x1}
        y1={door.y1}
        x2={door.x2}
        y2={door.y2}
        stroke="#ffffff"
        strokeWidth={stroke * 8}
      />
      <path
        d={arc}
        fill="none"
        stroke="#8a4b00"
        strokeWidth={stroke * 1.5}
        strokeDasharray={`${stroke * 6} ${stroke * 4}`}
      />
      <line {...leaf} stroke="#8a4b00" strokeWidth={stroke * 3} />
      <text
        x={swing.x + swing.w / 2}
        y={swing.y + swing.h / 2}
        dominantBaseline="middle"
        fontSize={font * 0.85}
        textAnchor="middle"
        fill="#8a4b00"
      >
        {doorLabel} {formatMm(dw)}
      </text>

      {/* Cotes du local */}
      <Dimension
        x1={0}
        y1={-margin * 0.45}
        x2={L}
        y2={-margin * 0.45}
        label={formatMm(L)}
        font={font}
        stroke={stroke}
      />
      <Dimension
        x1={-margin * 0.45}
        y1={0}
        x2={-margin * 0.45}
        y2={W}
        label={formatMm(W)}
        font={font}
        stroke={stroke}
        vertical
      />

      {/* Dégagements */}
      {layout.items.flatMap((it) =>
        it.zones.map((z, i) => (
          <rect
            key={`${it.id}-z${i}`}
            x={z.rect.x}
            y={z.rect.y}
            width={z.rect.w}
            height={z.rect.h}
            fill="url(#hatch)"
            stroke="#0f766e"
            strokeWidth={stroke * 0.8}
            strokeDasharray={`${stroke * 4} ${stroke * 3}`}
          />
        )),
      )}

      {/* Équipements */}
      {layout.items.map((it) => {
        const isUps = it.kind === 'ups' || it.kind === 'frame';
        const bad = colliding.has(it.id);
        const label = shortLabel(it);
        const interactive = !!onMove && !!current;
        const fs = Math.min(font, it.body.w / Math.max(4, label.length * 0.62), it.body.h / 2.2);
        return (
          <g
            key={it.id}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? 'button' : undefined}
            aria-label={
              interactive
                ? `${it.reference} (${it.id}) — x ${formatMm(it.x)}, y ${formatMm(it.y)}, ${it.rot}°`
                : undefined
            }
            className={
              interactive
                ? 'cursor-grab touch-none outline-none focus-visible:[&>rect:first-child]:stroke-[var(--color-accent)]'
                : undefined
            }
            onPointerDown={(e) => {
              if (!interactive) return;
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              const p = toSvg(e);
              const c = current!(it);
              drag.current = { id: it.id, dx: p.x - c.x, dy: p.y - c.y, rot: c.rot, moved: false };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.id !== it.id) return;
              const p = toSvg(e);
              d.moved = true;
              onMove!(it, { x: snap(p.x - d.dx), y: snap(p.y - d.dy), rot: d.rot }, false);
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              drag.current = null;
              if (!d || !d.moved) return;
              const p = toSvg(e);
              onMove!(it, { x: snap(p.x - d.dx), y: snap(p.y - d.dy), rot: d.rot }, true);
            }}
            onDoubleClick={() => {
              if (!interactive) return;
              const c = current!(it);
              onMove!(it, { ...c, rot: ((c.rot + 90) % 360) as Rot }, true);
            }}
            onKeyDown={(e) => {
              if (!interactive) return;
              const c = current!(it);
              const step = e.shiftKey ? 10 : 100;
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              if (moves[e.key]) {
                e.preventDefault();
                onMove!(it, { ...c, x: c.x + moves[e.key]![0], y: c.y + moves[e.key]![1] }, true);
              } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                onMove!(it, { ...c, rot: ((c.rot + 90) % 360) as Rot }, true);
              }
            }}
          >
            <rect
              x={it.body.x}
              y={it.body.y}
              width={it.body.w}
              height={it.body.h}
              fill={bad ? '#a4161a' : isUps ? '#1f4e79' : '#4a5868'}
              stroke={bad ? '#a4161a' : '#ffffff'}
              strokeWidth={stroke * 3}
              rx={stroke * 4}
            />
            <FrontMark it={it} stroke={stroke} />
            <text
              x={it.body.x + it.body.w / 2}
              y={it.body.y + it.body.h / 2}
              fontSize={fs}
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {label}
            </text>
            {it.body.h > fs * 3.2 && (
              <text
                x={it.body.x + it.body.w / 2}
                y={it.body.y + it.body.h / 2 + fs * 1.25}
                fontSize={fs * 0.75}
                fill="#dbe4ee"
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
              >
                {it.w} × {it.d}
              </text>
            )}
          </g>
        );
      })}

      <text x={L} y={W + margin * 0.6} fontSize={font} textAnchor="end" fill="#1b2430">
        {remainingLabel}
      </text>
      <ScaleBar x={0} y={W + margin * 0.45} font={font} stroke={stroke} />
    </svg>
  );
});

/** Repère de la face avant (trait épais côté accès). */
function FrontMark({ it, stroke }: { it: LayoutItem; stroke: number }) {
  const b = it.body;
  const s = stroke * 5;
  const lines: Record<number, [number, number, number, number]> = {
    0: [b.x, b.y + b.h - s, b.x + b.w, b.y + b.h - s],
    90: [b.x + s, b.y, b.x + s, b.y + b.h],
    180: [b.x, b.y + s, b.x + b.w, b.y + s],
    270: [b.x + b.w - s, b.y, b.x + b.w - s, b.y + b.h],
  };
  const [x1, y1, x2, y2] = lines[it.rot]!;
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7ee08a" strokeWidth={s} pointerEvents="none" />
  );
}

function Dimension({
  x1,
  y1,
  x2,
  y2,
  label,
  font,
  stroke,
  vertical,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  font: number;
  stroke: number;
  vertical?: boolean;
}) {
  const t = font * 0.4;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g stroke="#4a5868" strokeWidth={stroke}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - t} y1={y1} x2={x1 + t} y2={y1} />
          <line x1={x2 - t} y1={y2} x2={x2 + t} y2={y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - t} x2={x1} y2={y1 + t} />
          <line x1={x2} y1={y2 - t} x2={x2} y2={y2 + t} />
        </>
      )}
      <text
        x={mx}
        y={my}
        dy={vertical ? 0 : -t}
        fontSize={font}
        stroke="none"
        fill="#1b2430"
        textAnchor="middle"
        transform={vertical ? `rotate(-90 ${mx} ${my}) translate(0 ${-t})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

function ScaleBar({ x, y, font, stroke }: { x: number; y: number; font: number; stroke: number }) {
  return (
    <g>
      <rect x={x} y={y - font * 0.3} width={500} height={font * 0.3} fill="#1b2430" />
      <rect
        x={x + 500}
        y={y - font * 0.3}
        width={500}
        height={font * 0.3}
        fill="#fff"
        stroke="#1b2430"
        strokeWidth={stroke}
      />
      <text x={x} y={y + font} fontSize={font * 0.8} fill="#1b2430">
        0
      </text>
      <text x={x + 1000} y={y + font} fontSize={font * 0.8} fill="#1b2430" textAnchor="middle">
        1 m
      </text>
    </g>
  );
}

function shortLabel(it: LayoutItem): string {
  const ref = it.reference.replace(/^EXEMPLE\s+/, '');
  if (it.kind === 'cabinet' || it.kind === 'ebm') return `BAT ${it.id.split('-')[1]}`;
  return `${ref.length > 18 ? ref.slice(0, 17) + '…' : ref}`;
}

function formatMm(mm: number): string {
  return `${(mm / 1000).toFixed(2).replace(/\.?0+$/, '')} m`;
}
