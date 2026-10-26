/** Géométrie d'affichage commune au plan et à la mini-vue. */
import type { LayoutResult } from '../../engine/types';

/** Segment de la porte sur son mur, en mm. */
export function doorRect(layout: Pick<LayoutResult, 'room' | 'door'>) {
  const { lengthMm: L, widthMm: W } = layout.room;
  const { wall, offsetMm: o, widthMm: w } = layout.door;
  switch (wall) {
    case 'top':
      return { x1: o, y1: 0, x2: o + w, y2: 0 };
    case 'bottom':
      return { x1: o, y1: W, x2: o + w, y2: W };
    case 'left':
      return { x1: 0, y1: o, x2: 0, y2: o + w };
    default:
      return { x1: L, y1: o, x2: L, y2: o + w };
  }
}
