/** Rendu SVG du schéma unifilaire (symboles IEC 60617 simplifiés). */
import { forwardRef } from 'react';
import type { Diagram, El } from './diagram';

const INK = '#1b2430';
const FONT = 'system-ui, sans-serif';

export const SingleLineSvg = forwardRef<SVGSVGElement, { diagram: Diagram; title: string }>(
  function SingleLineSvg({ diagram, title }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        role="img"
        aria-label={title}
        className="h-auto w-full rounded-lg border border-border bg-white"
        fontFamily={FONT}
        fontSize={10}
      >
        <title>{title}</title>
        <rect x={0} y={0} width={diagram.width} height={diagram.height} fill="#ffffff" />
        {diagram.elements.map((e, i) => (
          <Element key={i} e={e} />
        ))}
      </svg>
    );
  },
);

function Element({ e }: { e: El }) {
  switch (e.type) {
    case 'line':
      return (
        <line
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={INK}
          strokeWidth={e.bus ? 4 : 1.4}
          strokeDasharray={e.dashed ? '5 4' : undefined}
        />
      );
    case 'dot':
      return <circle cx={e.x} cy={e.y} r={3} fill={INK} />;
    case 'arrow':
      return (
        <path
          d={`M ${e.x - 5} ${e.y - 8} L ${e.x} ${e.y} L ${e.x + 5} ${e.y - 8}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.4}
        />
      );
    case 'text':
      return (
        <text
          x={e.x}
          y={e.y}
          textAnchor={e.anchor ?? 'start'}
          fontWeight={e.bold ? 700 : 400}
          fontSize={e.size ?? 10}
          fill={INK}
        >
          {e.text}
        </text>
      );
    case 'box':
      return (
        <g>
          <rect
            x={e.x}
            y={e.y}
            width={e.w}
            height={e.h}
            fill="#f5f7fa"
            stroke="#1f4e79"
            strokeWidth={1.4}
            strokeDasharray="6 3"
            rx={4}
          />
          <text
            x={e.x + e.w / 2}
            y={e.y + 13}
            textAnchor="middle"
            fontWeight={700}
            fontSize={9.5}
            fill="#1f4e79"
          >
            {e.label}
          </text>
          {e.sub && (
            <text
              x={e.x + e.w / 2}
              y={e.y + e.h - 6}
              textAnchor="middle"
              fontSize={9}
              fill="#1f4e79"
            >
              {e.sub}
            </text>
          )}
        </g>
      );
    case 'breaker':
      // Disjoncteur (IEC 60617 07-13-05) : contact ouvert avec croix au point fixe.
      return (
        <g>
          <rect x={e.x - 3} y={e.y - 14} width={6} height={28} fill="#ffffff" />
          <line x1={e.x} y1={e.y + 14} x2={e.x - 9} y2={e.y - 10} stroke={INK} strokeWidth={1.6} />
          <path
            d={`M ${e.x - 4} ${e.y - 18} L ${e.x + 4} ${e.y - 10} M ${e.x + 4} ${e.y - 18} L ${e.x - 4} ${e.y - 10}`}
            stroke={INK}
            strokeWidth={1.4}
          />
          <text x={e.x + 8} y={e.y - 4} fontWeight={700} fill={INK}>
            {e.tag}
          </text>
          <text x={e.x + 8} y={e.y + 8} fill={INK}>
            {e.rating}
          </text>
          {e.cable && (
            <text x={e.x + 8} y={e.y + 19} fill="#4a5868" fontSize={9}>
              {e.cable}
            </text>
          )}
        </g>
      );
    case 'symbol':
      return <Symbol kind={e.kind} x={e.x} y={e.y} label={e.label} />;
  }
}

function Symbol({ kind, x, y, label }: { kind: string; x: number; y: number; label?: string }) {
  const sq = (inner: React.ReactNode) => (
    <g>
      <rect
        x={x - 18}
        y={y - 18}
        width={36}
        height={36}
        fill="#ffffff"
        stroke={INK}
        strokeWidth={1.4}
      />
      <line x1={x - 18} y1={y + 18} x2={x + 18} y2={y - 18} stroke={INK} strokeWidth={1} />
      {inner}
    </g>
  );
  const ac = (cx: number, cy: number) => (
    <path d={`M ${cx - 6} ${cy} q 3 -5 6 0 t 6 0`} fill="none" stroke={INK} strokeWidth={1.3} />
  );
  const dc = (cx: number, cy: number) => (
    <path
      d={`M ${cx - 6} ${cy - 2} h 12 M ${cx - 6} ${cy + 2} h 3 M ${cx - 1} ${cy + 2} h 3 M ${cx + 4} ${cy + 2} h 2`}
      stroke={INK}
      strokeWidth={1.3}
    />
  );
  switch (kind) {
    case 'rectifier':
      return sq(
        <>
          {ac(x - 9, y - 8)}
          {dc(x + 8, y + 8)}
        </>,
      );
    case 'inverter':
      return sq(
        <>
          {dc(x - 8, y - 8)}
          {ac(x + 9, y + 8)}
        </>,
      );
    case 'staticSwitch':
      // Bypass statique : thyristors tête-bêche.
      return (
        <g stroke={INK} strokeWidth={1.3} fill="#ffffff">
          <rect x={x - 14} y={y - 10} width={28} height={20} />
          <path d={`M ${x - 9} ${y - 5} l 5 8 l 5 -8 z M ${x - 9} ${y + 3} h 10`} />
          <path d={`M ${x + 1} ${y + 5} l 5 -8 l 5 8 z M ${x + 1} ${y - 3} h 10`} />
        </g>
      );
    case 'battery':
      return (
        <g>
          <line x1={x - 14} y1={y - 8} x2={x + 14} y2={y - 8} stroke={INK} strokeWidth={1.6} />
          <line x1={x - 7} y1={y - 3} x2={x + 7} y2={y - 3} stroke={INK} strokeWidth={3} />
          <line x1={x - 14} y1={y + 2} x2={x + 14} y2={y + 2} stroke={INK} strokeWidth={1.6} />
          <line x1={x - 7} y1={y + 7} x2={x + 7} y2={y + 7} stroke={INK} strokeWidth={3} />
          {label?.split(' — ').map((l, i) => (
            <text key={i} x={x - 18} y={y + 22 + i * 11} fill={INK} fontSize={9}>
              {l}
            </text>
          ))}
        </g>
      );
    case 'ats':
      return (
        <g>
          <rect
            x={x - 22}
            y={y - 12}
            width={44}
            height={24}
            fill="#ffffff"
            stroke={INK}
            strokeWidth={1.4}
          />
          <path
            d={`M ${x - 12} ${y - 6} L ${x} ${y + 6} M ${x + 12} ${y - 6} L ${x + 4} ${y + 2}`}
            stroke={INK}
            strokeWidth={1.3}
          />
          {label && (
            <text x={x + 26} y={y + 4} fill={INK}>
              {label}
            </text>
          )}
        </g>
      );
    default:
      // Source réseau (~) ou groupe électrogène (G).
      return (
        <g>
          <circle cx={x} cy={y} r={20} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
          {kind === 'generator' ? (
            <text x={x} y={y + 5} textAnchor="middle" fontWeight={700} fontSize={14} fill={INK}>
              G
            </text>
          ) : (
            <path
              d={`M ${x - 9} ${y} q 4.5 -8 9 0 t 9 0`}
              fill="none"
              stroke={INK}
              strokeWidth={1.6}
            />
          )}
          {label && (
            <text x={x} y={y - 25} textAnchor="middle" fontWeight={700} fill={INK}>
              {label}
            </text>
          )}
        </g>
      );
  }
}
