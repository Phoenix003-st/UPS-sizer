/** Rendu statique (chaînes SVG) du plan et de l'unifilaire, pour le rapport PDF. */
import { renderToStaticMarkup } from 'react-dom/server';
import type { SolutionOption } from '../../engine/types';
import { PlanSvg } from '../layout-plan/LayoutPlan';
import type { Diagram } from '../single-line/diagram';
import { SingleLineSvg } from '../single-line/SingleLineDiagram';

export function planSvgMarkup(
  option: SolutionOption,
  labels: { title: string; door: string; remaining: string },
): string {
  return renderToStaticMarkup(
    <PlanSvg
      layout={option.layout}
      title={labels.title}
      doorLabel={labels.door}
      remainingLabel={labels.remaining}
    />,
  );
}

export function singleLineSvgMarkup(diagram: Diagram, title: string): string {
  return renderToStaticMarkup(<SingleLineSvg diagram={diagram} title={title} />);
}
