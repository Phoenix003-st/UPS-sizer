/**
 * Rapport PDF client (jsPDF + svg2pdf.js + jspdf-autotable, chargés à la demande) :
 * couverture avec logo neutre remplaçable, récapitulatif, solution retenue, plan, schéma
 * unifilaire, nomenclature et note de calcul. Le plan et le schéma restent vectoriels.
 * Chaque page porte la mention « Pré-dimensionnement indicatif… » et la pagination.
 *
 * Police : DejaVu Sans, embarquée (symboles η, √, ≤ et écriture arabe), chargée à la demande.
 */
import type { TFunction } from 'i18next';
import type { jsPDF as JsPdf } from 'jspdf';
import type { CellHookData, UserOptions } from 'jspdf-autotable';
import type { Catalogs } from '../../catalog/schemas';
import type { Project } from '../../engine/project';
import type { SizingResult, SolutionOption } from '../../engine/types';
import {
  formatDate,
  formatNumber,
  formatPct,
  traceLabel,
  TRACE_ORDER,
  alertMessage,
} from '../../ui/format';
import { autonomyData } from '../autonomy/autonomyData';
import { bomDesignation } from '../bom/bomText';
import type { Diagram } from '../single-line/diagram';
import fontBoldUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';
import fontUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import logoSvg from '../../ui/logo.svg?raw';

export interface ReportContext {
  project: Project;
  result: SizingResult;
  option: SolutionOption;
  diagram: Diagram;
  t: TFunction;
  lang: string;
  /** Logo (SVG en texte) ; par défaut le logo neutre de l'application. */
  logoSvg?: string;
  /** Catalogues : détail des équipements pour la vue 3D (page omise si absents). */
  catalogs?: Catalogs;
}

const FONT = 'DejaVuSans';
const PRIMARY: [number, number, number] = [31, 78, 121];
const MARGIN = 15;

async function toBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Convertit une chaîne SVG en élément attaché au document (requis par svg2pdf pour les styles). */
function svgElement(markup: string, host: HTMLElement): SVGSVGElement {
  const doc = new DOMParser().parseFromString(
    markup.replace(/font-family="[^"]*"/g, `font-family="${FONT}"`),
    'image/svg+xml',
  );
  const el = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
  el.setAttribute('font-family', FONT);
  host.appendChild(el);
  return el;
}

export async function buildReportPdf(ctx: ReportContext): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }, autoTableMod, staticSvg, regular, bold] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
    import('jspdf-autotable'),
    import('./staticSvg'),
    toBase64(fontUrl),
    toBase64(fontBoldUrl),
  ]);
  const autoTable = autoTableMod.default;
  const { project, result, option, diagram, t, lang } = ctx;
  const rtl = lang.startsWith('ar');
  const n = (v: number, d = 1) => formatNumber(v, lang, d);

  const doc: JsPdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('DejaVuSans.ttf', regular);
  doc.addFont('DejaVuSans.ttf', FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', bold);
  doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
  doc.setProperties({
    title: `${t('app.name')} — ${project.name}`,
    creator: 'UPS Sizer',
    subject: t('app.disclaimer'),
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const x0 = MARGIN;
  const usable = W - 2 * MARGIN;
  const align = rtl ? 'right' : 'left';
  const xText = rtl ? W - MARGIN : MARGIN;
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1000px;height:1000px;overflow:hidden;';
  document.body.appendChild(host);

  /** Position verticale courante (mm) sur la page. */
  let cursor = 28;
  const finalY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  /**
   * Tableau paginé. En arabe : colonnes en miroir, et texte des cellules dessiné ligne par ligne
   * (autotable passe des tableaux de lignes à jsPDF, ce qui contourne le traitement bidirectionnel).
   */
  const table = (
    head: string[] | null,
    body: (string | number)[][],
    opts: Partial<UserOptions> = {},
  ) => {
    const mirror = <T>(r: T[]) => (rtl ? [...r].reverse() : r);
    const cols = (head ?? body[0] ?? []).length;
    const columnStyles = opts.columnStyles;
    const mirroredStyles =
      rtl && columnStyles
        ? Object.fromEntries(
            Object.entries(columnStyles).map(([k, v]) => [String(cols - 1 - Number(k)), v]),
          )
        : columnStyles;
    const rtlText = new WeakMap<object, string[]>();
    const rtlHooks: Partial<UserOptions> = rtl
      ? {
          willDrawCell: (d: CellHookData) => {
            rtlText.set(d.cell, d.cell.text);
            d.cell.text = [];
          },
          didDrawCell: (d: CellHookData) => {
            const lines = rtlText.get(d.cell) ?? [];
            const k = doc.internal.scaleFactor;
            const fs = d.cell.styles.fontSize;
            const lh = (fs * 1.15) / k;
            const right = d.cell.styles.halign !== 'left';
            const x = right
              ? d.cell.x + d.cell.width - d.cell.padding('right')
              : d.cell.x + d.cell.padding('left');
            const y0 = d.cell.y + d.cell.padding('top') + (fs * 0.85) / k;
            lines.forEach((line, i) =>
              doc.text(line, x, y0 + i * lh, { align: right ? 'right' : 'left' }),
            );
          },
        }
      : {};
    autoTable(doc, {
      head: head ? [mirror(head)] : undefined,
      body: body.map((r) => mirror(r.map(String))),
      startY: cursor,
      margin: { left: MARGIN, right: MARGIN, top: 22, bottom: 18 },
      styles: { font: FONT, fontSize: 8.5, cellPadding: 1.6, halign: align, overflow: 'linebreak' },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold', font: FONT },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      ...opts,
      ...(mirroredStyles ? { columnStyles: mirroredStyles } : {}),
      ...rtlHooks,
    });
    cursor = finalY() + 4;
  };
  const heading = (text: string) => {
    if (cursor > H - 40) {
      doc.addPage();
      cursor = 28;
    }
    cursor += 5;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY);
    doc.text(text, xText, cursor, { align });
    doc.setTextColor(27, 36, 48);
    doc.setFont(FONT, 'normal');
    cursor += 3;
  };
  const newPage = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    doc.addPage('a4', orientation);
    cursor = 22;
  };

  // ── Couverture ──
  try {
    await svg2pdf(svgElement(ctx.logoSvg ?? logoSvg, host), doc, {
      x: rtl ? W - MARGIN - 28 : x0,
      y: 22,
      width: 28,
      height: 28,
    });
  } catch {
    // logo absent : couverture sans logo
  }
  doc.setFont(FONT, 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...PRIMARY);
  doc.text(t('report.title'), xText, 75, { align });
  doc.setFontSize(15);
  doc.setTextColor(27, 36, 48);
  doc.text(project.name || t('projects.untitled'), xText, 88, { align, maxWidth: usable });
  doc.setFont(FONT, 'normal');
  doc.setFontSize(11);
  const cover: [string, string][] = [
    [t('projects.client'), project.client || '—'],
    [t('projects.author'), project.author || '—'],
    [t('report.date'), formatDate(new Date().toISOString(), lang)],
    [t('report.installation'), t(`scenario.${project.scenario}.title`)],
    [t(`solutions.tier.${option.tier}`), option.ups.reference],
  ];
  cover.forEach(([k, v], i) =>
    doc.text(`${k} : ${v}`, xText, 104 + i * 8, { align, maxWidth: usable }),
  );
  doc.setFillColor(255, 242, 220);
  doc.setDrawColor(138, 75, 0);
  doc.roundedRect(x0, 160, usable, 22, 2, 2, 'FD');
  doc.setTextColor(138, 75, 0);
  doc.setFont(FONT, 'bold');
  doc.text(
    doc.splitTextToSize(t('app.disclaimer'), usable - 8),
    rtl ? W - MARGIN - 4 : x0 + 4,
    169,
    { align },
  );
  doc.setFont(FONT, 'normal');
  if (option.display.sample) {
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(t('report.sampleNotice'), usable), xText, 192, { align });
  }
  doc.setTextColor(27, 36, 48);

  // ── Récapitulatif et solution ──
  newPage();
  const inp = result.inputs;
  const b = option.battery;
  heading(t('report.summary'));
  table(
    null,
    [
      [t('power.loadReal'), `${n(inp.loadW / 1000, 2)} kW`],
      [t('power.design'), `${n(inp.designW / 1000, 2)} kW / ${n(inp.designVA / 1000, 2)} kVA`],
      [t('power.autonomy'), `${n(inp.autonomyMin, 0)} min`],
      [t('power.redundancy'), inp.redundancy],
      [
        t('power.phases'),
        `${inp.phases === 3 ? t('power.phasesTri') : t('power.phasesMono')} ${inp.voltageV} V ${inp.freqHz} Hz`,
      ],
      [
        t('room.dimensions'),
        `${n(project.room.lengthMm / 1000, 2)} × ${n(project.room.widthMm / 1000, 2)} × ${n(project.room.heightMm / 1000, 2)} m`,
      ],
      [t('room.ambient'), `${n(project.room.ambientC, 0)} °C`],
    ],
    { columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } } },
  );
  heading(t('calcNote.solution'));
  table(
    null,
    [
      [t(`solutions.tier.${option.tier}`), option.ups.reference],
      [
        t('solutions.technology'),
        `${t(`tech.${option.ups.technology}`)} — ${t(`formFactor.${option.display.formFactor}`)}`,
      ],
      [
        t('solutions.configuration'),
        `${option.ups.units} × ${option.ups.modulesPerSystem !== undefined ? `(${option.ups.modulesPerSystem * option.ups.systems} modules) ` : ''}${option.ups.redundancy}`,
      ],
      [t('solutions.loadRate'), formatPct(option.ups.loadRate, lang)],
      [t('solutions.efficiency'), formatPct(option.ups.efficiency, lang, 1)],
      [
        t('solutions.battery'),
        `${t(`chemistry.${b.chemistry}`)} ${n(b.blockV)} V ${n(b.capacityAh, 0)} Ah — ${b.blocksPerString} × ${b.strings} × ${b.sets}`,
      ],
      [
        t('solutions.autonomy'),
        `${n(b.autonomyMin, 1)} min — ${t('solutions.autonomyNew', { min: n(b.autonomyNewMin, 0) })}`,
      ],
      [
        t('solutions.dimensions'),
        `${option.display.dimensionsSummary.w} × ${option.display.dimensionsSummary.d} × ${option.display.dimensionsSummary.h} mm`,
      ],
      [t('solutions.weight'), `${n(option.display.totalWeightKg, 0)} kg`],
      [t('solutions.footprint'), `${n(option.layout.footprintWithClearancesM2, 1)} m²`],
      ...(option.display.noiseDb !== null
        ? [[t('solutions.noise'), `${option.display.noiseDb} dB(A)`]]
        : []),
    ],
    { columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } } },
  );
  const alerts = [...result.globalAlerts, ...option.alerts];
  if (alerts.length) {
    heading(t('calcNote.alerts'));
    table(
      null,
      alerts.map((a) => [t(`solutions.status.${a.level}`), alertMessage(t, a, lang)]),
      {
        columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' } },
        didParseCell: (d: CellHookData) => {
          const raw = String(d.cell.raw);
          if (
            ![
              t('solutions.status.block'),
              t('solutions.status.warn'),
              t('solutions.status.ok'),
            ].includes(raw)
          )
            return;
          d.cell.styles.textColor =
            raw === t('solutions.status.block')
              ? [164, 22, 26]
              : raw === t('solutions.status.warn')
                ? [138, 75, 0]
                : [20, 108, 46];
        },
      },
    );
  }

  // ── Plan ──
  newPage();
  heading(t('plan.title'));
  const planSvg = svgElement(
    staticSvg.planSvgMarkup(option, {
      title: t('plan.title'),
      door: t('plan.door'),
      remaining: t('plan.remaining', { m2: n(option.layout.remainingAreaM2, 1) }),
    }),
    host,
  );
  const [, , vbW, vbH] = (planSvg.getAttribute('viewBox') ?? '0 0 1 1').split(' ').map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const planH = Math.min(H - 60, (usable * vbH) / vbW);
  const planW = (planH * vbW) / vbH;
  await svg2pdf(planSvg, doc, {
    x: x0 + (usable - planW) / 2,
    y: cursor + 2,
    width: planW,
    height: planH,
  });
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(t('plan.legend'), usable), xText, cursor + planH + 8, { align });

  // ── Vue 3D : extérieur et intérieur (si WebGL est disponible) ──
  if (ctx.catalogs) {
    const [{ buildRoom3D }, { render3DSnapshot }] = await Promise.all([
      import('../room-3d/model'),
      import('../room-3d/snapshot'),
    ]);
    const room3d = buildRoom3D(option, ctx.catalogs, project.room.kind);
    const outside = render3DSnapshot(room3d, { xray: false });
    const inside = outside ? render3DSnapshot(room3d, { xray: true }) : null;
    if (outside && inside) {
      newPage();
      heading(t('room3d.snapshot'));
      const imgW = usable;
      const imgH = (imgW * 1000) / 1600;
      doc.addImage(outside, 'PNG', x0, cursor + 2, imgW, imgH, undefined, 'FAST');
      doc.setFontSize(9);
      doc.text(t('room3d.views.iso'), xText, cursor + imgH + 7, { align });
      doc.addImage(inside, 'PNG', x0, cursor + imgH + 11, imgW, imgH, undefined, 'FAST');
      doc.text(
        `${t('room3d.xray')} — ${t('room3d.roomSize', { l: `${n(room3d.length, 2)} m`, w: `${n(room3d.width, 2)} m`, h: `${n(room3d.height, 2)} m` })}`,
        xText,
        cursor + 2 * imgH + 16,
        { align },
      );
    }
  }

  // ── Schéma unifilaire (paysage) ──
  newPage('landscape');
  const LW = doc.internal.pageSize.getWidth();
  const LH = doc.internal.pageSize.getHeight();
  doc.setFont(FONT, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text(t('singleLine.title'), rtl ? LW - MARGIN : MARGIN, 26, { align });
  doc.setTextColor(27, 36, 48);
  doc.setFont(FONT, 'normal');
  const sld = svgElement(staticSvg.singleLineSvgMarkup(diagram, t('singleLine.title')), host);
  const sw = LW - 2 * MARGIN;
  const sh = LH - 50;
  const scale = Math.min(sw / diagram.width, sh / diagram.height);
  await svg2pdf(sld, doc, {
    x: MARGIN + (sw - diagram.width * scale) / 2,
    y: 32,
    width: diagram.width * scale,
    height: diagram.height * scale,
  });
  doc.setFontSize(8.5);
  doc.text(t('singleLine.legend'), rtl ? LW - MARGIN : MARGIN, LH - 22, { align });

  // ── Autonomie selon la charge ──
  const autonomy = ctx.catalogs ? autonomyData(option, result.inputs, ctx.catalogs) : null;
  if (autonomy) {
    newPage();
    heading(t('autonomyLoad.title'));
    const m = (v: number, lowerBound: boolean) =>
      `${lowerBound ? '≥ ' : ''}${n(v, v < 10 ? 1 : 0)}`;
    table(
      [
        t('autonomyLoad.loadPct'),
        t('autonomyLoad.loadKw'),
        t('autonomyLoad.endOfLife'),
        t('autonomyLoad.new'),
        '',
      ],
      autonomy.rows.map((r) => [
        `${n(r.loadPct, 0)} %`,
        n(r.loadW / 1000, 2),
        m(r.endOfLifeMin, r.endOfLifeLowerBound),
        m(r.newMin, r.newLowerBound),
        r.mark ? t(`autonomyLoad.mark.${r.mark}`) : '',
      ]),
      {
        columnStyles: {
          0: { halign: 'right' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      },
    );
    doc.setFontSize(8);
    doc.text(
      doc.splitTextToSize(
        t('autonomyLoad.note', {
          factors: `${n(b.kAging, 2)} × ${n(b.kTemp, 3)} × ${n(b.kMargin, 2)}`,
          eod: n(b.eodVpc, 2),
        }),
        usable,
      ),
      xText,
      cursor + 1,
      { align },
    );
  }

  // ── Nomenclature ──
  newPage();
  heading(t('bom.title'));
  table(
    [
      '#',
      t('bom.columns.reference'),
      t('bom.columns.designation'),
      t('bom.columns.qty'),
      t('bom.columns.unit'),
      t('bom.columns.unitPrice'),
    ],
    option.bom.map((l, i) => [
      i + 1,
      l.reference + (l.sample ? ' *' : ''),
      bomDesignation(t, l),
      n(l.qty, 0),
      t(`bom.unit.${l.unit}`),
      '',
    ]),
    {
      columnStyles: {
        0: { cellWidth: 8 },
        3: { halign: 'right', cellWidth: 14 },
        4: { cellWidth: 14 },
        5: { cellWidth: 24 },
      },
    },
  );
  if (option.bom.some((l) => l.sample)) {
    doc.setFontSize(8);
    doc.text(t('bom.sampleNote'), xText, cursor + 1, { align });
  }

  // ── Note de calcul ──
  newPage();
  heading(t('calcNote.currents'));
  table(
    [
      t('calcNote.circuit'),
      t('calcNote.qty'),
      t('calcNote.ib'),
      t('calcNote.in'),
      t('calcNote.section'),
      t('calcNote.length'),
      t('calcNote.drop'),
    ],
    option.electrical.circuits.map((c) => [
      `${t(`bom.circuit.${c.id}`)}${option.ups.systems === 2 ? ` (${c.system})` : ''}`,
      c.qty,
      n(c.currentA, 1),
      c.breakerA ?? '—',
      c.cable
        ? `${c.cable.parallel > 1 ? `${c.cable.parallel} × ` : ''}${c.cable.sectionMm2} mm²`
        : '—',
      `${n(c.lengthM, 0)} m`,
      c.cable ? `${n(c.cable.voltageDropPct, 2)} %` : '—',
    ]),
  );
  heading(`${t('calcNote.thermal')} · ${t('calcNote.floor')} · ${t('calcNote.ventilation')}`);
  table(
    null,
    [
      [
        t('calc.thermal.total'),
        `${n(option.thermal.totalW / 1000, 2)} kW — ${n(option.thermal.totalBtuH, 0)} BTU/h`,
      ],
      [
        t('room.hvacKW'),
        option.thermal.hvacKW === null ? '—' : `${n(option.thermal.hvacKW, 1)} kW`,
      ],
      [
        t('calc.layout.floor'),
        `${n(option.layout.floor.maxDistributedKgM2, 0)} kg/m² (${t('room.floor')} : ${n(option.layout.floor.admissibleKgM2, 0)} kg/m²)`,
      ],
      [
        t('calc.vent.flow'),
        option.ventilation.applicable
          ? `${n(option.ventilation.flowM3h, 2)} m³/h — ${n(option.ventilation.freeAreaCm2, 0)} cm²`
          : t('calcNote.notApplicable'),
      ],
    ],
    { columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } } },
  );
  for (const key of TRACE_ORDER) {
    const tr = option.traces[key];
    if (!tr) continue;
    heading(traceLabel(t, tr.title));
    table(
      ['', t('calcNote.formula'), t('calcNote.values'), t('calcNote.result')],
      tr.steps.map((s) => [
        traceLabel(t, s.label) + (s.ref ? `\n${s.ref}` : ''),
        s.formula,
        s.substituted,
        `${typeof s.result === 'number' ? formatNumber(s.result, lang, 3) : s.result} ${s.unit}`,
      ]),
      {
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 52, halign: 'left' },
          2: { halign: 'left' },
          3: { cellWidth: 26, halign: 'right' },
        },
      },
    );
  }

  // ── Pied de page sur toutes les pages ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(74, 88, 104);
    doc.setDrawColor(201, 209, 219);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, ph - 13, pw - MARGIN, ph - 13);
    doc.text(t('app.disclaimer'), rtl ? pw - MARGIN : MARGIN, ph - 8, { align });
    doc.text(`${p} / ${pages}`, rtl ? MARGIN : pw - MARGIN, ph - 8, {
      align: rtl ? 'left' : 'right',
    });
    if (p > 1) {
      doc.text(`${t('app.name')} — ${project.name}`, rtl ? pw - MARGIN : MARGIN, 12, { align });
    }
  }
  host.remove();
  return doc.output('blob');
}
