/** Affiche les options calculées pour chaque scénario par défaut : `npm run demo`. */
import { DEFAULT_CATALOGS } from '../src/catalog';
import { createProject, runSizing } from '../src/engine';
import { DEFAULT_SETTINGS } from '../src/settings/schema';
import type { ScenarioId } from '../src/settings/schema';
for (const sc of [
  'cctv',
  'office',
  'server',
  'datacenter',
  'airport',
  'building',
  'custom',
] as ScenarioId[]) {
  const p = createProject(sc, DEFAULT_SETTINGS, { id: 'x', now: '2026-01-01' });
  const r = runSizing(p, DEFAULT_CATALOGS, DEFAULT_SETTINGS);
  console.log(
    `\n== ${sc} load ${p.load.value} kW, aut ${p.autonomyMin} min, red ${p.advanced.redundancy}; global:`,
    r.globalAlerts.map((a) => a.code).join(','),
  );
  for (const o of r.options) {
    const b = o.battery;
    console.log(
      `  ${o.tier.padEnd(12)} ${o.ups.reference} ×${o.ups.units}${o.ups.modulesPerSystem ? ` (${o.ups.modulesPerSystem} mod)` : ''} rate ${(o.ups.loadRate * 100).toFixed(0)}% η ${o.ups.efficiency.toFixed(3)} | ${b.blockReference} ${b.blocksPerString}×${b.strings} int${b.internalStrings} sets ${b.sets} cab ${b.cabinets.map((c) => c.id + '×' + c.qty).join()} aut ${b.autonomyMin.toFixed(1)} (new ${b.autonomyNewMin.toFixed(1)}) | ${o.thermal.totalW.toFixed(0)} W | ${o.layout.footprintWithClearancesM2.toFixed(2)} m² | ${o.status} ${o.alerts
        .filter((a) => a.level !== 'ok')
        .map((a) => a.code + JSON.stringify(a.params))
        .join(' ')}`,
    );
  }
}
