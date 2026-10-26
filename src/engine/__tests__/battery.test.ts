import { describe, expect, it } from 'vitest';
import { batteryCatalogSchema } from '../../catalog/schemas';
import {
  autonomyAt,
  batteryCandidates,
  cabinetsFor,
  cellPowerAt,
  chemistryFamily,
  dischargeTable,
  sizeBattery,
  tempFactor,
  voltageCompatible,
  type BatteryRequest,
} from '../battery';
import { block, cabinet, catalogs, model, settings } from './fixtures';

const catalog = batteryCatalogSchema.parse({
  meta: { schemaVersion: 1, catalogVersion: 't', sample: true },
  blocks: [block()],
  cabinets: [cabinet()],
});

function req(over: Partial<BatteryRequest> = {}): BatteryRequest {
  return {
    model: model(),
    catalog,
    settings,
    designPowerW: 60000,
    actualPowerW: 50000,
    autonomyMin: 10,
    ambientC: 25,
    chemistry: 'VRLA',
    eodVpc: 1.75,
    ...over,
  };
}

describe('tables de décharge', () => {
  it('choisit la tension de fin la plus proche et convertit par élément', () => {
    expect(dischargeTable(block(), 1.7).eodVpc).toBe(1.67);
    expect(dischargeTable(block(), 1.75).points[0]).toEqual({ x: 10, y: 100 });
    const perBlock = block({
      discharge: {
        unit: 'W_per_block',
        refTempC: 25,
        tables: [
          {
            eodVpc: 1.75,
            points: [
              { min: 10, W: 600 },
              { min: 30, W: 300 },
            ],
          },
        ],
      },
    });
    expect(dischargeTable(perBlock, 1.75).points[0]!.y).toBe(100);
  });
  it('une seule table pour le lithium, quelle que soit la tension demandée', () => {
    const li = catalogs.batteries.blocks.find((b) => b.chemistry === 'LI_LFP')!;
    expect(dischargeTable(li, 1.75).eodVpc).toBe(2.8);
    expect(chemistryFamily('LI_LFP')).toBe('LI');
    expect(chemistryFamily('VRLA_GEL')).toBe('VRLA');
  });
  it('puissance disponible : interpolation log-log, prudente avant la table, nulle au-delà', () => {
    const t = dischargeTable(block(), 1.75);
    expect(cellPowerAt(t, 5)).toBe(100);
    expect(cellPowerAt(t, 30)).toBeCloseTo(50);
    expect(cellPowerAt(t, 20)).toBeCloseTo(100 * Math.pow(2, Math.log(0.5) / Math.log(3)), 6);
    expect(cellPowerAt(t, 120)).toBeNull();
  });
  it('autonomie : inverse de la table, borne inférieure au-delà', () => {
    const t = dischargeTable(block(), 1.75);
    expect(autonomyAt(t, 50).minutes).toBeCloseTo(30);
    expect(autonomyAt(t, 10)).toEqual({ minutes: 90, lowerBound: true });
    expect(autonomyAt(t, 200).minutes).toBeLessThan(10);
  });
  it('correction de température : pas de crédit au-dessus de 25 °C', () => {
    expect(tempFactor(block(), 10)).toBeCloseTo(1.25);
    expect(tempFactor(block(), 25)).toBe(1);
    expect(tempFactor(block(), 40)).toBe(1);
  });
  it('compatibilité de tension des blocs (classe 12 V)', () => {
    expect(voltageCompatible(block({ nominalV: 12.8 }), model())).toBe(true);
    expect(voltageCompatible(block({ nominalV: 2 }), model())).toBe(false);
  });
  it('nombre d’armoires', () => {
    expect(cabinetsFor(4, 40, 40)).toBe(4);
    expect(cabinetsFor(4, 20, 40)).toBe(2);
    expect(cabinetsFor(2, 40, 32)).toBe(4);
  });
});

describe('dimensionnement à puissance constante', () => {
  it('calcul vérifié à la main : 60 kW, 10 min, 40 blocs × 6 éléments', () => {
    // P_dc = 60 000 ÷ 0,95 = 63 158 W ; × 1,25 × 1,10 = 86 842 W
    // 3 chaînes : 86 842 ÷ 720 = 120,6 W/él. > 100 → refusé ; 4 chaînes : 90,46 W/él. ≤ 100 → retenu
    const r = sizeBattery(req()).value!;
    expect(r.strings).toBe(4);
    expect(r.cellPowerRequiredW).toBeCloseTo(86842.1 / 960, 1);
    expect(r.cellPowerAvailableW).toBe(100);
    expect(r.cabinet).toMatchObject({ qty: 4 });
    // t = 10 × (90,46 / 100)^(1 / pente), pente = ln(0,5) / ln(3)
    expect(r.autonomyMin).toBeCloseTo(11.72, 1);
    // batteries neuves à 50 kW : 52 632 ÷ 960 = 54,8 W/él. → ≈ 25,9 min
    expect(r.autonomyNewMin).toBeCloseTo(25.9, 0);
    expect(r.wh).toBe(160 * 12 * 40);
    expect(r.weightKg).toBe(160 * 14 + 4 * 100);
  });
  it('la correction de température augmente le nombre de chaînes', () => {
    // 86 842 × 1,25 ÷ (240 × 100) = 4,52 → 5 chaînes, mais 5 armoires > 4 autorisées
    expect(sizeBattery(req({ ambientC: 10 })).value).toBeNull();
    const roomy = model({ battery: { ...model().battery, maxExternalCabinets: 8 } });
    const r = sizeBattery(req({ ambientC: 10, model: roomy })).value!;
    expect(r.kTemp).toBeCloseTo(1.25);
    expect(r.strings).toBe(5);
  });
  it('aucune solution si l’autonomie dépasse la table ou les limites', () => {
    expect(sizeBattery(req({ autonomyMin: 120 })).value).toBeNull();
    expect(sizeBattery(req({ chemistry: 'LI' })).value).toBeNull();
    const t = sizeBattery(req({ autonomyMin: 120 })).trace;
    expect(t.steps.at(-1)?.label).toBe('calc.battery.none');
  });
  it('batteries internes seules, puis modules externes du même bloc', () => {
    const small = model({
      battery: {
        ...model().battery,
        blocksPerString: { allowed: [4], default: 4 },
        internal: { blockId: 'B1', blocks: 4, strings: 1 },
        compatibleCabinetIds: ['C1'],
      },
    });
    // 1 chaîne interne : 24 éléments ; 1 000 W → 1 052,6 × 1,375 ÷ 24 = 60,3 W/él. → OK à 10 min
    const a = sizeBattery(req({ model: small, designPowerW: 1000, actualPowerW: 800 })).value!;
    expect(a.cabinet).toBeNull();
    expect(a.internalStrings).toBe(1);
    // 3 000 W → 180,9 W/él. : il faut 2 chaînes de plus (une armoire de 40 blocs = 10 chaînes)
    const b = sizeBattery(req({ model: small, designPowerW: 3000, actualPowerW: 2500 })).value!;
    expect(b.cabinet?.qty).toBe(1);
    expect(b.strings).toBe(11);
    expect(b.internalStrings).toBe(1);
    expect(b.weightKg).toBe(40 * 14 + 100);
  });
  it('bloc interne inconnu : aucune solution', () => {
    const bad = model({
      battery: { ...model().battery, internal: { blockId: 'X', blocks: 4, strings: 1 } },
    });
    expect(batteryCandidates(req({ model: bad }))).toEqual([]);
  });
  it('choisit la plus petite énergie installée parmi plusieurs blocs', () => {
    const big = block({
      id: 'B2',
      capacityAh: 100,
      discharge: {
        ...block().discharge,
        tables: block().discharge.tables.map((t) => ({
          ...t,
          points: t.points.map((p) => ({ ...p, W: p.W * 2.5 })),
        })),
      },
    });
    const cat = batteryCatalogSchema.parse({
      meta: { schemaVersion: 1, catalogVersion: 't', sample: true },
      blocks: [block(), big],
      cabinets: [
        cabinet({
          capacity: [
            { blockId: 'B1', maxBlocks: 40 },
            { blockId: 'B2', maxBlocks: 40 },
          ],
        }),
      ],
    });
    const r = sizeBattery(req({ catalog: cat })).value!;
    // B1 : 4 × 40 × 12 × 40 = 76,8 kWh ; B2 : 2 × 40 × 12 × 100 = 96 kWh → B1
    expect(r.block.id).toBe('B1');
  });
});
