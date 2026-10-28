/**
 * Génère le catalogue d'UPS génériques du site principal (src/catalog/generic.json).
 *
 * Le site principal ne propose ni ne recommande de marque : chaque fiche reprend les
 * caractéristiques types d'un modèle de catalogue (puissance, phases, format, batteries,
 * dimensions…) mais sans marque, sans référence produit, sans fiche technique ni source. Les
 * modèles de même technologie, format, phases et facteur de puissance forment une seule gamme
 * générique, avec une fiche par puissance. Toutes les fiches sont marquées « sample » : données
 * génériques à confirmer auprès du fabricant retenu.
 *
 * Usage : npm run catalogs:generic
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sourceJson from '../src/catalog/brands/infosec.json' with { type: 'json' };
import {
  batteryCabinetSchema,
  upsModelSchema,
  type BatteryCabinet,
  type FormFactor,
  type Technology,
  type UpsModel,
} from '../src/catalog/schemas';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'catalog', 'generic.json');

const TECH: Record<Technology, [string, string]> = {
  offline: ['OFF', 'off-line'],
  line_interactive: ['LI', 'line-interactive'],
  online_performance: ['OP', 'on-line'],
  online_double_conversion: ['ODC', 'on-line double conversion'],
  modular: ['MOD', 'modulaire'],
};
const FORM: Record<FormFactor, [string, string]> = {
  tower: ['T', 'tour'],
  tower_rack: ['TR', 'tour/rack 19"'],
  rack: ['R', 'rack 19"'],
  cabinet: ['A', 'armoire'],
};
const PHASES: Record<string, string> = { '1/1': 'mono/mono', '3/1': 'tri/mono', '3/3': 'tri/tri' };

const fr = (n: number) => String(n).replace('.', ',');
const power = (kVA: number) => (kVA < 1 ? `${Math.round(kVA * 1000)} VA` : `${fr(kVA)} kVA`);
const powerKW = (kW: number) => (kW < 1 ? `${Math.round(kW * 1000)} W` : `${fr(kW)} kW`);

// ── Modules et armoires batteries : contenu identique → une seule fiche générique ──
const cabinetIds = new Map<string, string>();
const cabinets: BatteryCabinet[] = [];
for (const raw of sourceJson.cabinets) {
  const c = batteryCabinetSchema.parse(raw);
  const signature = JSON.stringify([c.kind, c.dimensionsMm, c.capacity, c.breakerA]);
  const same = cabinets.find(
    (o) => JSON.stringify([o.kind, o.dimensionsMm, o.capacity, o.breakerA]) === signature,
  );
  if (same) {
    cabinetIds.set(c.id, same.id);
    continue;
  }
  const id = `GEN-EBM-${cabinets.length + 1}`;
  const blocks = [...new Set(c.capacity.map((k) => k.maxBlocks))].join(' ou ');
  const ah = c.capacity
    .map((k) => Number(k.blockId.replace(/^EX-VRLA-12V/, '')))
    .sort((a, b) => a - b)
    .join(', ');
  const cap = `${blocks} blocs 12 V (${ah} Ah)`;
  cabinetIds.set(c.id, id);
  cabinets.push(
    batteryCabinetSchema.parse({
      ...c,
      id,
      sample: true,
      brand: '',
      partNumber: '',
      reference: `Module batteries externe — ${cap}`,
      source: undefined,
    }),
  );
}

// ── UPS : une gamme par technologie, format, phases et facteur de puissance ──
const models: UpsModel[] = [];
for (const raw of sourceJson.models) {
  const m = upsModelSchema.parse(raw);
  const ph = `${m.phases.in}/${m.phases.out}`;
  const tx = /\bTX\b/.test(m.range);
  const [techId, techLabel] = TECH[m.technology];
  const [formId, formLabel] = FORM[m.formFactor];
  // Le facteur de puissance distingue les gammes d'une même technologie (0,9 ou 1 par exemple).
  const pf = `FP ${fr(Math.round((m.power.kW / m.power.kVA) * 10) / 10)}`;
  const range =
    m.technology === 'modular'
      ? `UPS modulaire ${PHASES[ph]}, ${pf}`
      : `UPS ${techLabel} ${formLabel} ${PHASES[ph]}, ${pf}${tx ? ", transformateur d'isolement" : ''}`;
  const size = m.modular
    ? `${m.modular.moduleKVA}x${m.modular.maxModules}`
    : `${Math.round(m.power.kVA * 1000)}VA-${Math.round(m.power.kW * 1000)}W`;
  const id = `GEN-${techId}-${formId}-${ph.replace('/', '')}${tx ? '-TX' : ''}-${size}`;
  if (models.some((o) => o.id === id)) continue;
  const reference = m.modular
    ? `UPS modulaire ${PHASES[ph]} jusqu'à ${fr(m.modular.frameMaxKVA)} kVA (modules de ${fr(m.modular.moduleKVA)} kVA)`
    : `UPS ${techLabel} ${power(m.power.kVA)} / ${powerKW(m.power.kW)} — ${formLabel}, ${PHASES[ph]}${tx ? ', transformateur' : ''}`;
  models.push(
    upsModelSchema.parse({
      ...m,
      id,
      sample: true,
      brand: '',
      partNumber: '',
      reference,
      range,
      datasheetUrl: '',
      source: undefined,
      estimated: [],
      battery: {
        ...m.battery,
        compatibleCabinetIds: [
          ...new Set(m.battery.compatibleCabinetIds.map((c) => cabinetIds.get(c) ?? c)),
        ],
      },
    }),
  );
}

// Fiches rangées par gamme (ordre d'apparition), puis par puissance.
const rangeOrder = [...new Set(models.map((m) => m.range))];
models.sort(
  (a, b) =>
    rangeOrder.indexOf(a.range) - rangeOrder.indexOf(b.range) ||
    (a.modular?.frameMaxKVA ?? a.power.kVA) - (b.modular?.frameMaxKVA ?? b.power.kVA),
);

const catalog = {
  meta: {
    schemaVersion: 1,
    catalogVersion: `${sourceJson.meta.catalogVersion.slice(0, 7)}-GENERIQUE`,
    sample: true,
    notice:
      'UPS génériques, sans marque ni référence produit : caractéristiques types, à confirmer auprès du fabricant retenu.',
  },
  models,
  cabinets,
};
writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${OUT} : ${models.length} UPS, ${cabinets.length} modules batteries`);
