/** Paramètres de calcul (écran Paramètres), sauvegardés dans le navigateur. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultSettings, settingsSchema, type Settings } from '../settings/schema';
import { browserStorage } from './storage';

interface SettingsState {
  settings: Settings;
  setSettings: (s: Settings) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (setState) => ({
      settings: defaultSettings(),
      setSettings: (settings) => setState({ settings }),
      reset: () => setState({ settings: defaultSettings() }),
    }),
    {
      name: 'ups-sizer:settings',
      version: 1,
      storage: createJSONStorage(() => browserStorage),
      partialize: (s) => ({ settings: s.settings }),
      // Des paramètres enregistrés invalides (version antérieure…) sont remplacés par les défauts.
      merge: (persisted, current) => {
        const parsed = settingsSchema.safeParse(
          (persisted as { settings?: unknown } | undefined)?.settings,
        );
        return { ...current, settings: parsed.success ? parsed.data : current.settings };
      },
    },
  ),
);
