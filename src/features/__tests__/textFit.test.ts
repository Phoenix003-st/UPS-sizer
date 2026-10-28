import { describe, expect, it } from 'vitest';
import { fitText, isRtl, textWidth, wrapText } from '../single-line/textFit';

describe('libellés du schéma unifilaire', () => {
  it('passe à la ligne sans dépasser la largeur', () => {
    const lines = wrapText('UPS on-line double conversion 10 kVA / 10 kW', 120, 9, true);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(textWidth(l, 9, true)).toBeLessThanOrEqual(120);
    expect(lines.join(' ')).toBe('UPS on-line double conversion 10 kVA / 10 kW');
  });

  it('coupe de préférence après le tiret « — »', () => {
    expect(wrapText('INFOSEC M5T 150K — réf. 67688', 140, 9.5, true)).toEqual([
      'INFOSEC M5T 150K —',
      'réf. 67688',
    ]);
    // Tient sur une ligne : pas de coupure.
    expect(wrapText('A — B', 200, 10)).toEqual(['A — B']);
  });

  it('réduit la taille plutôt que de tronquer', () => {
    const long = 'UPS on-line double conversion 10 kVA / 10 kW — tour/rack 19", mono/mono';
    const fit = fitText(long, 158, [
      { size: 9.5, maxLines: 2 },
      { size: 8.5, maxLines: 3 },
      { size: 7.5, maxLines: 4 },
    ]);
    expect(fit.size).toBeLessThan(9.5);
    expect(fit.lines.length).toBeLessThanOrEqual(4);
    expect(fit.lines.join(' ')).toBe(long);
  });

  it('détecte les libellés arabes', () => {
    expect(isRtl('لوحة التوزيع المحمية')).toBe(true);
    expect(isRtl('10 mm²')).toBe(false);
  });
});
