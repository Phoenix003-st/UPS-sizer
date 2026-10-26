import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOGS } from '../../catalog';
import { createProject, runSizing } from '../../engine';
import i18n from '../../i18n';
import { DEFAULT_SETTINGS } from '../../settings/schema';
import { bomToCsv, bomToXlsx } from '../bom/exportBom';

const project = createProject('server', DEFAULT_SETTINGS, {
  id: 't',
  now: '2026-01-01',
  name: 'Salle « A »; test',
});
const option = runSizing(project, DEFAULT_CATALOGS, DEFAULT_SETTINGS).options[0]!;

describe('exports de la nomenclature', () => {
  it('CSV : BOM UTF-8, séparateur « ; », colonne prix vide, échappement', async () => {
    await i18n.changeLanguage('fr');
    const csv = bomToCsv({ project, option, t: i18n.t, lang: 'fr' });
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('Nomenclature;"Salle « A »; test"'); // trim() retire le BOM
    expect(lines).toContain('#;Référence;Désignation;Qté;Unité;Prix unitaire;Total');
    const data = lines.filter((l) => /^\d+;/.test(l));
    expect(data).toHaveLength(option.bom.length);
    expect(data.every((l) => l.endsWith(';;'))).toBe(true);
    expect(csv).toContain('Pré-dimensionnement indicatif');
  });

  it('Excel : classeur valide avec totaux en formule', async () => {
    const blob = await bomToXlsx({ project, option, t: i18n.t, lang: 'fr' });
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.worksheets[0]!;
    expect(ws.getCell('A1').value).toBe('Nomenclature');
    expect(ws.getCell('A4').value).toContain('Pré-dimensionnement indicatif');
    const first = ws.getRow(7);
    expect(first.getCell(4).value).toBe(option.bom[0]!.qty);
    expect(first.getCell(6).value).toBeNull();
    expect((first.getCell(7).value as { formula: string }).formula).toBe('IF(F7="","",D7*F7)');
  });
});
