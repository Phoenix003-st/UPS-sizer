/** Traductions (i18next) : français, anglais ; l'arabe (RTL) s'ajoute dans `ar.json`. */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';

export const LANGUAGES = [
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
] as const;
export type Lang = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'ups-sizer:lang';

function initialLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as Lang;
  } catch {
    // stockage indisponible (navigation privée) : langue du navigateur
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'fr';
  return (LANGUAGES.find((l) => l.code === nav)?.code ?? 'fr') as Lang;
}

/** Applique la langue au document (attributs `lang` et `dir`). */
export function applyDocumentLanguage(lang: string) {
  if (typeof document === 'undefined') return;
  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}

export function setLanguage(lang: Lang) {
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignoré
  }
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});
applyDocumentLanguage(i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
