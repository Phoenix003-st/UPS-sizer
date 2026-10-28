/**
 * Mise en page des libellés du schéma unifilaire sans mesure DOM (le rendu sert aussi au PDF et aux
 * tests) : largeur estimée par classe de caractères, avec une marge, puis retour à la ligne par mots
 * et réduction de la taille si le texte ne tient pas dans le nombre de lignes permis.
 */

/** Largeur approximative d'un caractère, en fraction de la taille de police (system-ui). */
function charEm(ch: string): number {
  if (/\s/.test(ch)) return 0.3;
  if (/[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/.test(ch)) return 0.55;
  if (/[il.,:;'|!()[\]"/·-]/.test(ch)) return 0.32;
  if (/[mwMW@%—]/.test(ch)) return 0.9;
  if (/[A-Z0-9×]/.test(ch)) return 0.66;
  return 0.56;
}

/** Largeur estimée (px) d'un texte, volontairement un peu majorée. */
export function textWidth(text: string, fontSize: number, bold = false): number {
  let em = 0;
  for (const ch of text) em += charEm(ch);
  return em * fontSize * (bold ? 1.08 : 1);
}

/**
 * Coupe un texte en lignes de largeur ≤ maxWidth ; un mot trop long reste seul sur sa ligne. Un
 * texte qui ne tient pas sur une ligne est d'abord coupé après ses tirets « — » (référence, puis
 * désignation), pour garder ensemble « réf. 67338 ».
 */
export function wrapText(text: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const parts = text.split(/(?<=\s—)\s+/);
  if (parts.length > 1 && textWidth(text, fontSize, bold) > maxWidth)
    return parts.flatMap((p) => wrapWords(p, maxWidth, fontSize, bold));
  return wrapWords(text, maxWidth, fontSize, bold);
}

function wrapWords(text: string, maxWidth: number, fontSize: number, bold: boolean): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(next, fontSize, bold) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/**
 * Ajuste un texte à une zone : on essaie les tailles proposées (de la plus grande à la plus petite)
 * et on garde la première pour laquelle toutes les lignes tiennent en largeur et en nombre.
 * À défaut, la plus petite taille est utilisée sans rien tronquer.
 */
export function fitText(
  text: string,
  maxWidth: number,
  sizes: { size: number; maxLines: number }[],
  bold = false,
): { lines: string[]; size: number } {
  for (const { size, maxLines } of sizes) {
    const lines = wrapText(text, maxWidth, size, bold);
    if (lines.length <= maxLines && lines.every((l) => textWidth(l, size, bold) <= maxWidth))
      return { lines, size };
  }
  const size = sizes[sizes.length - 1]!.size;
  return { lines: wrapText(text, maxWidth, size, bold), size };
}

/** Le texte contient-il de l'arabe (à composer de droite à gauche) ? */
export function isRtl(text: string): boolean {
  return /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/.test(text);
}
