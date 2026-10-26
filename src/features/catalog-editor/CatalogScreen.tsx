/**
 * Éditeur de catalogues : tableaux UPS / blocs / armoires / équipements, modification d'une fiche
 * en JSON (validée par Zod), import / export JSON et retour aux exemples. Les vraies fiches
 * remplacent les exemples sans toucher au code.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  batteryBlockSchema,
  batteryCabinetSchema,
  batteryCatalogSchema,
  equipmentItemSchema,
  equipmentLibrarySchema,
  formatZodError,
  upsCatalogSchema,
  upsModelSchema,
} from '../../catalog/schemas';
import { useCatalogStore } from '../../state/catalogStore';
import { Button, Card, Modal, PageTitle, SampleBadge, TabPanel, Tabs } from '../../ui/components';
import { downloadText, pickTextFile } from '../../ui/files';
import { formatNumber } from '../../ui/format';

type Tab = 'ups' | 'blocks' | 'cabinets' | 'equipment';
interface Row {
  id: string;
  cells: (string | number)[];
  sample: boolean;
  source?: string;
  raw: unknown;
}

export function CatalogScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const store = useCatalogStore();
  const { catalogs } = store;
  const [tab, setTab] = useState<Tab>('ups');
  const [editing, setEditing] = useState<{ index: number | null; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const n = (v: number) => formatNumber(v, lang);

  const columns: Record<Tab, string[]> = {
    ups: ['reference', 'technology', 'power', 'dimensions', 'weight'],
    blocks: ['reference', 'chemistry', 'capacity', 'dimensions', 'weight'],
    cabinets: ['reference', 'capacity', 'dimensions', 'weight'],
    equipment: ['reference', 'category', 'defaultW'],
  };
  const rows: Row[] =
    tab === 'ups'
      ? catalogs.ups.models.map((m) => ({
          id: m.id,
          sample: m.sample,
          source: m.source?.brand,
          raw: m,
          cells: [
            m.reference,
            t(`tech.${m.technology}`),
            `${n(m.power.kVA)} kVA / ${n(m.power.kW)} kW`,
            `${m.dimensionsMm.w} × ${m.dimensionsMm.d} × ${m.dimensionsMm.h}`,
            `${n(m.weightKg)} kg`,
          ],
        }))
      : tab === 'blocks'
        ? catalogs.batteries.blocks.map((b) => ({
            id: b.id,
            sample: b.sample,
            source: b.source?.brand,
            raw: b,
            cells: [
              b.reference,
              t(`chemistry.${b.chemistry}`),
              `${n(b.nominalV)} V ${n(b.capacityAh)} Ah`,
              `${b.dimensionsMm.w} × ${b.dimensionsMm.d} × ${b.dimensionsMm.h}`,
              `${n(b.weightKg)} kg`,
            ],
          }))
        : tab === 'cabinets'
          ? catalogs.batteries.cabinets.map((c) => ({
              id: c.id,
              sample: c.sample,
              source: c.source?.brand,
              raw: c,
              cells: [
                c.reference,
                c.capacity.map((x) => `${x.blockId} × ${x.maxBlocks}`).join(', '),
                `${c.dimensionsMm.w} × ${c.dimensionsMm.d} × ${c.dimensionsMm.h}`,
                `${n(c.emptyWeightKg)} kg`,
              ],
            }))
          : catalogs.equipment.map((e) => ({
              id: e.id,
              sample: false,
              raw: e,
              cells: [
                e.label[lang as 'fr'] ?? e.label.fr,
                t(`power.library.category.${e.category}`),
                `${n(e.defaultW)} W`,
              ],
            }));

  /** Remplace (index) ou ajoute (null) une fiche, après validation ; renvoie les erreurs. */
  const saveItem = (index: number | null, raw: unknown): string[] => {
    const replace = <T,>(list: T[], item: T) => {
      const copy = [...list];
      if (index === null) copy.push(item);
      else copy[index] = item;
      return copy;
    };
    if (tab === 'ups') {
      const item = upsModelSchema.safeParse(raw);
      if (!item.success) return formatZodError(item.error);
      const cat = upsCatalogSchema.safeParse({
        ...catalogs.ups,
        models: replace(catalogs.ups.models, item.data),
      });
      if (!cat.success) return formatZodError(cat.error);
      store.setUps(cat.data);
    } else if (tab === 'blocks' || tab === 'cabinets') {
      const schema = tab === 'blocks' ? batteryBlockSchema : batteryCabinetSchema;
      const item = schema.safeParse(raw);
      if (!item.success) return formatZodError(item.error);
      const next =
        tab === 'blocks'
          ? {
              ...catalogs.batteries,
              blocks: replace(
                catalogs.batteries.blocks,
                item.data as (typeof catalogs.batteries.blocks)[number],
              ),
            }
          : {
              ...catalogs.batteries,
              cabinets: replace(
                catalogs.batteries.cabinets,
                item.data as (typeof catalogs.batteries.cabinets)[number],
              ),
            };
      const cat = batteryCatalogSchema.safeParse(next);
      if (!cat.success) return formatZodError(cat.error);
      store.setBatteries(cat.data);
    } else {
      const item = equipmentItemSchema.safeParse(raw);
      if (!item.success) return formatZodError(item.error);
      const cat = equipmentLibrarySchema.safeParse(replace(catalogs.equipment, item.data));
      if (!cat.success) return formatZodError(cat.error);
      store.setEquipment(cat.data);
    }
    return [];
  };

  const remove = (index: number) => {
    const name = String(rows[index]?.cells[0] ?? '');
    if (!window.confirm(t('catalogs.confirmDelete', { name }))) return;
    if (tab === 'ups')
      store.setUps({ ...catalogs.ups, models: catalogs.ups.models.filter((_, i) => i !== index) });
    else if (tab === 'blocks') {
      const id = catalogs.batteries.blocks[index]!.id;
      const next = {
        ...catalogs.batteries,
        blocks: catalogs.batteries.blocks.filter((_, i) => i !== index),
        cabinets: catalogs.batteries.cabinets
          .map((c) => ({ ...c, capacity: c.capacity.filter((x) => x.blockId !== id) }))
          .filter((c) => c.capacity.length > 0),
      };
      store.setBatteries(next);
    } else if (tab === 'cabinets')
      store.setBatteries({
        ...catalogs.batteries,
        cabinets: catalogs.batteries.cabinets.filter((_, i) => i !== index),
      });
    else store.setEquipment(catalogs.equipment.filter((_, i) => i !== index));
  };

  const exportCatalog = () => {
    if (tab === 'ups') downloadText('ups.json', JSON.stringify(catalogs.ups, null, 2));
    else if (tab === 'equipment')
      downloadText('equipment.json', JSON.stringify(catalogs.equipment, null, 2));
    else downloadText('batteries.json', JSON.stringify(catalogs.batteries, null, 2));
  };

  const importCatalog = async () => {
    const text = await pickTextFile('application/json,.json');
    if (text === null) return;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setErrors([String(e)]);
      return;
    }
    const r =
      tab === 'ups'
        ? upsCatalogSchema.safeParse(data)
        : tab === 'equipment'
          ? equipmentLibrarySchema.safeParse(data)
          : batteryCatalogSchema.safeParse(data);
    if (!r.success) {
      setErrors(formatZodError(r.error));
      setMessage(null);
      return;
    }
    if (tab === 'ups') store.setUps(r.data as typeof catalogs.ups);
    else if (tab === 'equipment') store.setEquipment(r.data as typeof catalogs.equipment);
    else store.setBatteries(r.data as typeof catalogs.batteries);
    setErrors([]);
    setMessage(t('catalogs.imported'));
  };

  const part = tab === 'ups' ? 'ups' : tab === 'equipment' ? 'equipment' : 'batteries';

  return (
    <>
      <PageTitle title={t('catalogs.title')} subtitle={t('catalogs.intro')} />
      <Card>
        <Tabs
          label={t('catalogs.title')}
          value={tab}
          onChange={(x) => (setTab(x), setErrors([]), setMessage(null))}
          tabs={(['ups', 'blocks', 'cabinets', 'equipment'] as Tab[]).map((id) => ({
            id,
            label: t(`catalogs.tabs.${id}`),
          }))}
        />
        <TabPanel id={tab}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() =>
                setEditing({
                  index: null,
                  text: JSON.stringify(
                    { ...(rows[0]?.raw as object), id: `NOUVEAU-${Date.now().toString(36)}` },
                    null,
                    2,
                  ),
                })
              }
            >
              ＋ {t('catalogs.add')}
            </Button>
            <Button onClick={importCatalog}>{t('catalogs.import')}</Button>
            <Button onClick={exportCatalog}>{t('catalogs.export')}</Button>
            <Button
              variant="danger"
              onClick={() => window.confirm(t('catalogs.confirmReset')) && store.reset(part)}
            >
              {t('catalogs.reset')}
            </Button>
            <span className="text-sm text-muted">
              {t('catalogs.count', { count: rows.length })}
            </span>
          </div>
          <div role="status" aria-live="polite">
            {message && <p className="mb-2 text-sm text-ok">{message}</p>}
            {errors.length > 0 && (
              <div className="mb-3 rounded-lg border border-block bg-block-bg p-3 text-sm text-block">
                <p className="font-semibold">{t('catalogs.invalid')}</p>
                <ul className="list-disc ps-5">
                  {errors.slice(0, 20).map((e) => (
                    <li key={e} className="font-mono text-xs">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-border text-xs uppercase text-muted">
                  {columns[tab].map((c) => (
                    <th key={c} scope="col" className="py-2 pe-2 text-start">
                      {t(`catalogs.columns.${c}`)}
                    </th>
                  ))}
                  {tab !== 'equipment' && (
                    <th scope="col" className="py-2 pe-2 text-start">
                      {t('catalogs.columns.source')}
                    </th>
                  )}
                  <th scope="col" className="py-2 text-end">
                    {t('catalogs.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/60">
                    {r.cells.map((c, j) => (
                      <td key={j} className={`py-1.5 pe-2 ${j === 0 ? 'font-medium' : ''}`}>
                        {c}
                        {j === 0 && r.sample && (
                          <span className="ms-2">
                            <SampleBadge />
                          </span>
                        )}
                      </td>
                    ))}
                    {tab !== 'equipment' && (
                      <td className="py-1.5 pe-2 text-xs text-muted">{r.source ?? '—'}</td>
                    )}
                    <td className="py-1 text-end whitespace-nowrap">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setEditing({ index: i, text: JSON.stringify(r.raw, null, 2) })
                        }
                      >
                        {t('catalogs.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => remove(i)}
                        aria-label={`${t('catalogs.delete')} ${r.cells[0]}`}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => (setEditing(null), setErrors([]))}
        title={t('catalogs.edit')}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              let raw: unknown;
              try {
                raw = JSON.parse(editing.text);
              } catch (err) {
                setErrors([String(err)]);
                return;
              }
              const errs = saveItem(editing.index, raw);
              setErrors(errs);
              if (errs.length === 0) setEditing(null);
            }}
          >
            <label htmlFor="json-edit" className="mb-1 block text-sm text-muted">
              {t('catalogs.editHelp')}
            </label>
            <textarea
              id="json-edit"
              value={editing.text}
              spellCheck={false}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              className="h-[50vh] w-full rounded-lg border border-border bg-bg p-3 font-mono text-xs"
              dir="ltr"
            />
            {errors.length > 0 && (
              <ul
                role="alert"
                className="mt-2 list-disc rounded-lg border border-block bg-block-bg p-3 ps-6 text-xs text-block"
              >
                {errors.slice(0, 20).map((e) => (
                  <li key={e} className="font-mono">
                    {e}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button onClick={() => (setEditing(null), setErrors([]))}>
                {t('catalogs.cancel')}
              </Button>
              <Button type="submit" variant="primary">
                {t('catalogs.save')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
