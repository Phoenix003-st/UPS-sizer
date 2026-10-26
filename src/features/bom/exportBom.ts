/**
 * Exports de la nomenclature : CSV (séparateur « ; », UTF-8 avec BOM, pour Excel FR) et Excel
 * (.xlsx, ExcelJS chargé à la demande) avec colonne prix vide et totaux en formule.
 */
import type { TFunction } from 'i18next';
import type { Project } from '../../engine/project';
import type { SolutionOption } from '../../engine/types';
import { numberLocale } from '../../ui/format';
import { bomDesignation } from './bomText';

export interface BomExportContext {
  project: Project;
  option: SolutionOption;
  t: TFunction;
  lang: string;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Nomenclature au format CSV (« ; », virgule décimale en français). */
export function bomToCsv({ project, option, t, lang }: BomExportContext): string {
  const num = (n: number) =>
    new Intl.NumberFormat(numberLocale(lang), {
      useGrouping: false,
      maximumFractionDigits: 3,
    }).format(n);
  const rows: (string | number)[][] = [
    [t('bom.title'), project.name || t('projects.untitled')],
    [t('projects.client'), project.client],
    [t(`solutions.tier.${option.tier}`), option.ups.reference],
    [t('app.disclaimer')],
    [],
    [
      '#',
      t('bom.columns.reference'),
      t('bom.columns.designation'),
      t('bom.columns.qty'),
      t('bom.columns.unit'),
      t('bom.columns.unitPrice'),
      t('bom.columns.total'),
    ],
    ...option.bom.map((l, i) => [
      i + 1,
      l.reference + (l.sample ? ' *' : ''),
      bomDesignation(t, l),
      num(l.qty),
      t(`bom.unit.${l.unit}`),
      '',
      '',
    ]),
  ];
  if (option.bom.some((l) => l.sample)) rows.push([], [t('bom.sampleNote')]);
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

/** Nomenclature au format Excel (.xlsx). */
export async function bomToXlsx({ project, option, t }: BomExportContext): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'UPS Sizer';
  wb.created = new Date();
  const ws = wb.addWorksheet(t('bom.title').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 6 }],
  });
  ws.columns = [
    { key: 'n', width: 5 },
    { key: 'ref', width: 34 },
    { key: 'des', width: 46 },
    { key: 'qty', width: 9 },
    { key: 'unit', width: 8 },
    { key: 'price', width: 14 },
    { key: 'total', width: 14 },
  ];
  ws.addRow([t('bom.title'), project.name || t('projects.untitled')]).font = {
    bold: true,
    size: 14,
  };
  ws.addRow([t('projects.client'), project.client]);
  ws.addRow([t(`solutions.tier.${option.tier}`), option.ups.reference]);
  const disclaimer = ws.addRow([t('app.disclaimer')]);
  disclaimer.font = { bold: true, color: { argb: 'FF8A4B00' } };
  ws.addRow([]);
  const header = ws.addRow([
    '#',
    t('bom.columns.reference'),
    t('bom.columns.designation'),
    t('bom.columns.qty'),
    t('bom.columns.unit'),
    t('bom.columns.unitPrice'),
    t('bom.columns.total'),
  ]);
  header.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    c.alignment = { vertical: 'middle' };
  });
  const first = ws.rowCount + 1;
  option.bom.forEach((l, i) => {
    const r = ws.addRow([
      i + 1,
      l.reference + (l.sample ? ' *' : ''),
      bomDesignation(t, l),
      l.qty,
      t(`bom.unit.${l.unit}`),
      null,
      null,
    ]);
    const n = r.number;
    r.getCell(7).value = { formula: `IF(F${n}="","",D${n}*F${n})` };
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0.00';
    r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2DC' } };
  });
  const last = ws.rowCount;
  const total = ws.addRow([
    '',
    '',
    t('bom.columns.total'),
    '',
    '',
    '',
    { formula: `SUM(G${first}:G${last})` },
  ]);
  total.font = { bold: true };
  total.getCell(7).numFmt = '#,##0.00';
  if (option.bom.some((l) => l.sample)) {
    ws.addRow([]);
    ws.addRow([t('bom.sampleNote')]).font = { italic: true };
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
