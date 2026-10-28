/**
 * Rendu SVG du schéma unifilaire (symboles IEC 60617 simplifiés).
 *
 * Deux passes : les traits et symboles, puis tous les libellés par-dessus, pour qu'aucun trait ne
 * barre un texte. Le SVG est forcé en `direction: ltr` : en arabe, le sens hérité de la page
 * inversait l'ancrage des textes (libellés sur les traits, coupés au bord) et l'ordre « 10 mm² ».
 * Seuls les libellés contenant de l'arabe sont composés de droite à gauche, à la même place (voir
 * `Lines`).
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import type { Diagram, El } from './diagram';
import { fitText, isRtl, wrapText } from './textFit';

const INK = '#1b2430';
const FONT = 'system-ui, sans-serif';
const BOX_FILL = '#f5f7fa';
const BOX_INK = '#1f4e79';
/** Interligne, en fraction de la taille de police. */
const LH = 1.18;
/** Largeur disponible pour le libellé des batteries (jusqu'avant la sortie de l'UPS). */
const BATTERY_LABEL_W = 120;

type Layer = 'shapes' | 'labels';

/**
 * Composition RTL des libellés arabes. Désactivée pour le PDF : svg2pdf ignore `direction` et
 * appliquerait l'ancrage inversé tel quel, ce qui renverrait ces libellés sur les traits.
 */
const BidiContext = createContext(true);

export const SingleLineSvg = forwardRef<
  SVGSVGElement,
  { diagram: Diagram; title: string; bidi?: boolean }
>(function SingleLineSvg({ diagram, title, bidi = true }, ref) {
  return (
    <BidiContext.Provider value={bidi}>
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        role="img"
        aria-label={title}
        className="h-auto w-full rounded-lg border border-border bg-white"
        fontFamily={FONT}
        fontSize={10}
        direction="ltr"
        style={{ direction: 'ltr' }}
      >
        <title>{title}</title>
        <rect x={0} y={0} width={diagram.width} height={diagram.height} fill="#ffffff" />
        {diagram.elements.map((e, i) => (
          <Element key={`s${i}`} e={e} layer="shapes" />
        ))}
        {diagram.elements.map((e, i) => (
          <Element key={`l${i}`} e={e} layer="labels" />
        ))}
      </svg>
    </BidiContext.Provider>
  );
});

/** Texte sur plusieurs lignes (tspan), la première ligne étant posée en y. */
function Lines({
  x,
  y,
  lines,
  size,
  up = false,
  ...rest
}: {
  x: number;
  y: number;
  lines: string[];
  size: number;
  up?: boolean;
  textAnchor?: 'start' | 'middle' | 'end';
  fontWeight?: number;
  fill?: string;
}) {
  const y0 = up ? y - (lines.length - 1) * size * LH : y;
  // En RTL, « end » place le bord gauche du texte en x, comme « start » en LTR : la zone occupée
  // ne change pas, seul l'ordre de lecture (nombres et unités compris) suit la langue.
  const rtl = useContext(BidiContext) && lines.some(isRtl);
  const anchor = rest.textAnchor ?? 'start';
  const flipped = !rtl || anchor === 'middle' ? anchor : anchor === 'start' ? 'end' : 'start';
  return (
    <text
      x={x}
      y={y0}
      fontSize={size}
      {...rest}
      textAnchor={flipped}
      direction={rtl ? 'rtl' : undefined}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * LH}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function Element({ e, layer }: { e: El; layer: Layer }): ReactNode {
  if (layer === 'labels') return <Label e={e} />;
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
      return null;
    case 'box':
      return (
        <rect
          x={e.x}
          y={e.y}
          width={e.w}
          height={e.h}
          fill={BOX_FILL}
          stroke={BOX_INK}
          strokeWidth={1.4}
          strokeDasharray="6 3"
          rx={4}
        />
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
        </g>
      );
    case 'symbol':
      return <Symbol kind={e.kind} x={e.x} y={e.y} />;
  }
}

/** Libellés, dessinés après les traits. */
function Label({ e }: { e: El }): ReactNode {
  switch (e.type) {
    case 'text': {
      const size = e.size ?? 10;
      const bold = !!e.bold;
      const lines = e.maxWidth ? wrapText(e.text, e.maxWidth, size, bold) : [e.text];
      return (
        <Lines
          x={e.x}
          y={e.y}
          lines={lines}
          size={size}
          up={e.growUp}
          textAnchor={e.anchor ?? 'start'}
          fontWeight={bold ? 700 : 400}
          fill={INK}
        />
      );
    }
    case 'box': {
      // Titre : retour à la ligne puis réduction pour tenir dans le bandeau (40 px) sans troncature.
      const pad = 6;
      const title = fitText(
        e.label,
        e.w - 2 * pad,
        [
          { size: 9.5, maxLines: 2 },
          { size: 8.5, maxLines: 3 },
          { size: 7.5, maxLines: 4 },
        ],
        true,
      );
      const titleH = title.lines.length * title.size * LH;
      const sub = e.sub
        ? fitText(e.sub, e.w - 2 * pad, [
            { size: 9, maxLines: 1 },
            { size: 8, maxLines: 1 },
            { size: 7, maxLines: 2 },
          ])
        : undefined;
      const subH = sub ? sub.lines.length * sub.size * LH : 0;
      // Fond plein derrière les textes : les traits qui traversent le cadre passent dessous.
      return (
        <g>
          <rect x={e.x + 2} y={e.y + 2} width={e.w - 4} height={titleH + 4} fill={BOX_FILL} />
          <Lines
            x={e.x + e.w / 2}
            y={e.y + 3 + title.size}
            lines={title.lines}
            size={title.size}
            textAnchor="middle"
            fontWeight={700}
            fill={BOX_INK}
          />
          {sub && (
            <>
              <rect
                x={e.x + 2}
                y={e.y + e.h - subH - 5}
                width={e.w - 4}
                height={subH + 3}
                fill={BOX_FILL}
              />
              <Lines
                x={e.x + e.w / 2}
                y={e.y + e.h - subH - 4 + sub.size}
                lines={sub.lines}
                size={sub.size}
                textAnchor="middle"
                fill={BOX_INK}
              />
            </>
          )}
        </g>
      );
    }
    case 'breaker':
      // À droite du symbole (le contact penche à gauche) : rien ne croise ces textes.
      return (
        <g>
          <Lines x={e.x + 8} y={e.y - 4} lines={[e.tag]} size={10} fontWeight={700} fill={INK} />
          <Lines x={e.x + 8} y={e.y + 8} lines={[e.rating]} size={10} fill={INK} />
          {e.cable && <Lines x={e.x + 8} y={e.y + 19} lines={[e.cable]} size={9} fill="#4a5868" />}
        </g>
      );
    case 'symbol':
      return <SymbolLabel kind={e.kind} x={e.x} y={e.y} label={e.label} />;
    default:
      return null;
  }
}

function SymbolLabel({
  kind,
  x,
  y,
  label,
}: {
  kind: string;
  x: number;
  y: number;
  label?: string;
}) {
  if (!label) return null;
  switch (kind) {
    case 'battery': {
      const lines = label.split(' — ').flatMap((l) => wrapText(l, BATTERY_LABEL_W, 9));
      return <Lines x={x - 18} y={y + 22} lines={lines} size={9} fill={INK} />;
    }
    case 'ats':
      return <Lines x={x + 26} y={y + 4} lines={[label]} size={10} fill={INK} />;
    case 'source':
    case 'generator':
      return (
        <Lines
          x={x}
          y={y - 25}
          lines={[label]}
          size={10}
          textAnchor="middle"
          fontWeight={700}
          fill={INK}
        />
      );
    default:
      return null;
  }
}

function Symbol({ kind, x, y }: { kind: string; x: number; y: number }) {
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
        </g>
      );
  }
}
