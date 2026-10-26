/** Mini-vue « Place dans le local » : vue de dessus à l'échelle, non interactive. */
import type { LayoutResult } from '../../engine/types';
import { doorRect } from './geometry';

export function MiniRoom({ layout, label }: { layout: LayoutResult; label: string }) {
  const { lengthMm: L, widthMm: W } = layout.room;
  const pad = Math.max(L, W) * 0.04;
  const door = doorRect(layout);
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${L + 2 * pad} ${W + 2 * pad}`}
      role="img"
      aria-label={label}
      className="h-auto max-h-56 w-full rounded-lg bg-bg"
      preserveAspectRatio="xMidYMid meet"
      style={{ direction: 'ltr' }}
    >
      <rect
        x={0}
        y={0}
        width={L}
        height={W}
        fill="var(--color-surface)"
        stroke="var(--color-text)"
        strokeWidth={Math.max(L, W) * 0.008}
      />
      {layout.items.flatMap((it) =>
        it.zones.map((z, i) => (
          <rect
            key={`${it.id}-z${i}`}
            x={z.rect.x}
            y={z.rect.y}
            width={z.rect.w}
            height={z.rect.h}
            fill="var(--color-accent)"
            opacity={0.15}
          />
        )),
      )}
      {layout.items.map((it) => (
        <rect
          key={it.id}
          x={it.body.x}
          y={it.body.y}
          width={it.body.w}
          height={it.body.h}
          fill={
            it.kind === 'ups' || it.kind === 'frame' ? 'var(--color-primary)' : 'var(--color-muted)'
          }
          stroke="var(--color-surface)"
          strokeWidth={Math.max(L, W) * 0.004}
        />
      ))}
      <line
        x1={door.x1}
        y1={door.y1}
        x2={door.x2}
        y2={door.y2}
        stroke="var(--color-warn)"
        strokeWidth={Math.max(L, W) * 0.02}
      />
    </svg>
  );
}
