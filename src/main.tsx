import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/theme.css';
import './i18n';
import { App } from './app/App';
import logoUrl from './ui/logo.svg';

// Favicon depuis le bundle : fonctionne aussi dans le build « fichier unique ».
document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', logoUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
