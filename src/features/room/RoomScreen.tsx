/** Étape 3 — Local d'installation, avec contrôles en direct. */
import { useTranslation } from 'react-i18next';
import type { Project, RoomKind, Wall } from '../../engine/project';
import type { Alert } from '../../engine/types';
import { useProjectStore } from '../../state/projectStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useSizing } from '../../state/useSizing';
import {
  AlertList,
  Card,
  Choice,
  Collapsible,
  NumberField,
  PageTitle,
  Toggle,
} from '../../ui/components';
import { FlowNav } from '../../ui/FlowNav';

const ROOM_CODES = ['room_too_small', 'items_overlap', 'door_blocked', 'rack_units'];
const DOOR_CODES = ['door_too_narrow', 'door_too_low'];
const FLOOR_CODES = [
  'floor_overload',
  'floor_overload_unknown',
  'floor_concentrated',
  'raised_floor_support',
];
const HVAC_CODES = ['hvac_insufficient', 'hvac_required'];

export function RoomScreen({ project }: { project: Project }) {
  const { t } = useTranslation();
  const update = useProjectStore((s) => s.update);
  const settings = useSettingsStore((s) => s.settings);
  const result = useSizing(project);
  const room = project.room;
  const reco = result?.options.find((o) => o.tier === 'recommended') ?? result?.options[0];
  const pick = (codes: string[]): Alert[] =>
    (reco?.alerts ?? []).filter((a) => codes.includes(a.code));
  const envAlerts = (result?.globalAlerts ?? []).filter(
    (a) =>
      a.code.startsWith('temp') || a.code.startsWith('humidity') || a.code.startsWith('altitude'),
  );
  const m = (mm: number) => mm / 1000;
  const set = (fn: (r: Project['room']) => void) => update((d) => fn(d.room));
  const lengths = project.installation.cableLengthsM ?? settings.electrical.defaultCableLengthsM;

  return (
    <>
      <PageTitle title={t('room.title')} subtitle={t('room.keepDefaults')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">{t('room.dimensions')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label={t('room.length')}
              unit="m"
              value={m(room.lengthMm)}
              min={0.5}
              max={100}
              onChange={(v) => set((r) => void (r.lengthMm = v * 1000))}
            />
            <NumberField
              label={t('room.width')}
              unit="m"
              value={m(room.widthMm)}
              min={0.5}
              max={100}
              onChange={(v) => set((r) => void (r.widthMm = v * 1000))}
            />
            <NumberField
              label={t('room.height')}
              unit="m"
              value={m(room.heightMm)}
              min={1.5}
              max={20}
              onChange={(v) => set((r) => void (r.heightMm = v * 1000))}
            />
          </div>
          <Choice
            className="mt-4"
            legend={t('room.kind')}
            value={room.kind}
            options={(['dedicated', 'shared', 'office', 'rack'] as RoomKind[]).map((k) => ({
              value: k,
              label: t(`room.kinds.${k}`),
            }))}
            onChange={(v) => set((r) => void (r.kind = v))}
          />
          <div className="mt-3">
            <AlertList alerts={pick(ROOM_CODES)} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">{t('room.door')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={t('room.doorWidth')}
              unit="m"
              value={m(room.door.widthMm)}
              min={0.5}
              max={10}
              onChange={(v) => set((r) => void (r.door.widthMm = v * 1000))}
            />
            <NumberField
              label={t('room.doorHeight')}
              unit="m"
              value={m(room.door.heightMm)}
              min={1.5}
              max={10}
              onChange={(v) => set((r) => void (r.door.heightMm = v * 1000))}
            />
          </div>
          <Choice
            className="mt-4"
            legend={t('room.doorWall')}
            value={room.door.wall}
            options={(['top', 'bottom', 'left', 'right'] as Wall[]).map((w) => ({
              value: w,
              label: t(`room.wall.${w}`),
            }))}
            onChange={(v) => set((r) => void (r.door.wall = v))}
          />
          <div className="mt-3">
            <AlertList alerts={pick(DOOR_CODES)} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">{t('room.floor')}</h2>
          <Toggle
            label={t('room.floorUnknown', { value: settings.room.defaultFloorLoadKgM2 })}
            checked={room.floorLoadKgM2 === null}
            onChange={(unknown) =>
              set(
                (r) => void (r.floorLoadKgM2 = unknown ? null : settings.room.defaultFloorLoadKgM2),
              )
            }
          />
          {room.floorLoadKgM2 !== null && (
            <NumberField
              className="mt-2 max-w-56"
              label={t('room.floor')}
              unit="kg/m²"
              value={room.floorLoadKgM2}
              min={50}
              max={10000}
              onChange={(v) => set((r) => void (r.floorLoadKgM2 = v))}
            />
          )}
          <div className="mt-2">
            <Toggle
              label={t('room.raisedFloor')}
              checked={room.raisedFloor}
              onChange={(v) => set((r) => void (r.raisedFloor = v))}
            />
          </div>
          <div className="mt-3">
            <AlertList alerts={pick(FLOOR_CODES)} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">{t('room.environment')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label={t('room.ambient')}
              unit="°C"
              value={room.ambientC}
              min={-20}
              max={60}
              onChange={(v) => set((r) => void (r.ambientC = v))}
            />
            <NumberField
              label={t('room.humidity')}
              unit="%"
              value={room.humidityPct}
              min={0}
              max={100}
              onChange={(v) => set((r) => void (r.humidityPct = v))}
            />
            <NumberField
              label={t('room.altitude')}
              unit="m"
              value={room.altitudeM}
              min={0}
              max={5000}
              onChange={(v) => set((r) => void (r.altitudeM = v))}
            />
          </div>
          <div className="mt-3">
            <Toggle
              label={t('room.hvac')}
              checked={room.hvac.present}
              onChange={(v) => set((r) => void (r.hvac.present = v))}
            />
            {room.hvac.present && (
              <NumberField
                className="mt-2 max-w-48"
                label={t('room.hvacKW')}
                unit="kW"
                value={room.hvac.kW}
                min={0}
                max={5000}
                onChange={(v) => set((r) => void (r.hvac.kW = v))}
              />
            )}
          </div>
          <div className="mt-3">
            <AlertList alerts={[...envAlerts, ...pick(HVAC_CODES)]} />
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Collapsible title={t('room.installation')}>
          <div className="space-y-2">
            <Toggle
              label={t('room.generator')}
              checked={project.installation.generator}
              onChange={(v) => update((d) => void (d.installation.generator = v))}
            />
            <Toggle
              label={t('room.maintenanceBypass')}
              checked={project.installation.externalMaintenanceBypass}
              onChange={(v) => update((d) => void (d.installation.externalMaintenanceBypass = v))}
            />
          </div>
          <h3 className="mb-2 mt-4 text-sm font-semibold">{t('room.cableLengths')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['input', 'bypass', 'output', 'battery'] as const).map((k) => (
              <NumberField
                key={k}
                label={t(`room.cable.${k}`)}
                unit="m"
                value={lengths[k]}
                min={0.5}
                max={1000}
                onChange={(v) =>
                  update((d) => {
                    d.installation.cableLengthsM = {
                      ...(d.installation.cableLengthsM ?? settings.electrical.defaultCableLengthsM),
                      [k]: v,
                    };
                  })
                }
              />
            ))}
          </div>
        </Collapsible>
      </div>
      <FlowNav back="power" next="solutions" />
    </>
  );
}
