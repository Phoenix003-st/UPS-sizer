/** Paramètres de calcul (écran Paramètres), sauvegardés dans le navigateur. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  defaultSettings,
  mergeSettings,
  settingsSchema,
  type Settings,
  type SettingsOverrides,
} from '../settings/schema';
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
      version: 2,
      storage: createJSONStorage(() => browserStorage),
      partialize: (s) => ({ settings: s.settings }),
      // v1 → v2 : la marge d'extension par défaut passe de 20 % à 0 % ; une valeur restée à
      // l'ancien défaut est ramenée au nouveau, une valeur choisie par l'utilisateur est gardée.
      migrate: (persisted, version) => {
        const st = persisted as { settings?: { power?: { growthMargin?: number } } } | undefined;
        if (version < 2 && st?.settings?.power?.growthMargin === 0.2)
          st.settings.power.growthMargin = defaultSettings().power.growthMargin;
        return st as { settings: Settings };
      },
      // Les paramètres enregistrés complètent les défauts (un secteur ajouté depuis reçoit ses
      // valeurs par défaut) ; s'ils restent invalides, ils sont remplacés par les défauts.
      merge: (persisted, current) => {
        const saved = (persisted as { settings?: unknown } | undefined)?.settings;
        const parsed = settingsSchema.safeParse(
          saved && typeof saved === 'object'
            ? mergeSettings(defaultSettings(), saved as SettingsOverrides)
            : saved,
        );
        return { ...current, settings: parsed.success ? parsed.data : current.settings };
      },
    },
  ),
);
