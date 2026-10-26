/** Affichage d'une ou plusieurs traces de calcul (« Voir le calcul », note de calcul). */
import { useTranslation } from 'react-i18next';
import type { CalcTrace } from '../engine/trace';
import { formatNumber, traceLabel, TRACE_ORDER } from './format';

export function TraceTable({ trace }: { trace: CalcTrace }) {
  const { t, i18n } = useTranslation();
  return (
    <section className="mb-5 break-inside-avoid">
      <h3 className="mb-2 font-semibold">{traceLabel(t, trace.title)}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-start text-xs uppercase text-muted">
              <th scope="col" className="py-1 pe-2 text-start font-semibold"></th>
              <th scope="col" className="py-1 pe-2 text-start font-semibold">
                {t('calcNote.formula')}
              </th>
              <th scope="col" className="py-1 pe-2 text-start font-semibold">
                {t('calcNote.values')}
              </th>
              <th scope="col" className="py-1 text-end font-semibold">
                {t('calcNote.result')}
              </th>
            </tr>
          </thead>
          <tbody>
            {trace.steps.map((s, i) => (
              <tr key={i} className="border-b border-border/60 align-top">
                <th scope="row" className="py-1.5 pe-2 text-start font-medium">
                  {traceLabel(t, s.label)}
                  {s.ref && <span className="block text-xs font-normal text-muted">{s.ref}</span>}
                </th>
                <td className="py-1.5 pe-2 font-mono text-xs" dir="ltr">
                  {s.formula}
                </td>
                <td className="py-1.5 pe-2 font-mono text-xs" dir="ltr">
                  {s.substituted}
                </td>
                <td className="py-1.5 text-end font-semibold whitespace-nowrap">
                  {typeof s.result === 'number'
                    ? formatNumber(s.result, i18n.language, 3)
                    : s.result}{' '}
                  {s.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TraceList({ traces }: { traces: Record<string, CalcTrace> }) {
  return (
    <>
      {TRACE_ORDER.filter((k) => traces[k]).map((k) => (
        <TraceTable key={k} trace={traces[k]!} />
      ))}
    </>
  );
}
