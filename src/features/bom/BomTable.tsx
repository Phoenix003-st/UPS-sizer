/** Nomenclature à l'écran ; colonne prix vide à compléter. */
import { useTranslation } from 'react-i18next';
import type { BomLine } from '../../engine/types';
import { formatNumber } from '../../ui/format';
import { bomDesignation } from './bomText';

export function BomTable({ lines }: { lines: BomLine[] }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">{t('bom.title')}</caption>
        <thead>
          <tr className="border-b-2 border-border text-xs uppercase text-muted">
            <th scope="col" className="py-2 pe-2 text-start">
              #
            </th>
            <th scope="col" className="py-2 pe-2 text-start">
              {t('bom.columns.reference')}
            </th>
            <th scope="col" className="py-2 pe-2 text-start">
              {t('bom.columns.designation')}
            </th>
            <th scope="col" className="py-2 pe-2 text-end">
              {t('bom.columns.qty')}
            </th>
            <th scope="col" className="py-2 pe-2 text-start">
              {t('bom.columns.unit')}
            </th>
            <th scope="col" className="py-2 pe-2 text-end">
              {t('bom.columns.unitPrice')}
            </th>
            <th scope="col" className="py-2 text-end">
              {t('bom.columns.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id} className="border-b border-border/60">
              <td className="py-1.5 pe-2 text-muted">{i + 1}</td>
              <td className="py-1.5 pe-2 font-medium">
                {l.reference}
                {l.sample && <span title={t('app.sample')}> *</span>}
              </td>
              <td className="py-1.5 pe-2">{bomDesignation(t, l)}</td>
              <td className="py-1.5 pe-2 text-end">{formatNumber(l.qty, i18n.language)}</td>
              <td className="py-1.5 pe-2">{t(`bom.unit.${l.unit}`)}</td>
              <td className="py-1.5 pe-2 text-end text-muted">—</td>
              <td className="py-1.5 text-end text-muted">—</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lines.some((l) => l.sample) && (
        <p className="mt-2 text-xs text-muted">{t('bom.sampleNote')}</p>
      )}
    </div>
  );
}
