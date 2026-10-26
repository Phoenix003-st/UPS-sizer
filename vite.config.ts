/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Deux builds :
 * - normal (`npm run build`) : site statique + PWA hors ligne, dans dist/ ; sur GitHub Pages le
 *   chemin du dépôt est fourni par la CI (BASE_PATH), sinon chemins relatifs ;
 * - fichier unique (`npm run build:single`) : un seul index.html autonome dans dist-single/,
 *   à envoyer par e-mail ou à ouvrir hors ligne.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'singlefile';
  const base = process.env.BASE_PATH ?? './';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      single
        ? viteSingleFile({ removeViteModuleLoader: true })
        : VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'script-defer',
            includeAssets: ['icons/apple-touch-icon.png'],
            manifest: {
              name: 'UPS Sizer — pré-dimensionnement d’onduleurs',
              short_name: 'UPS Sizer',
              description:
                "Pré-dimensionnement d'onduleurs (UPS) d'intérieur, sans compte ni serveur.",
              lang: 'fr',
              start_url: '.',
              scope: '.',
              display: 'standalone',
              background_color: '#f5f7fa',
              theme_color: '#1f4e79',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: 'icons/maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              // Tout est mis en cache, police du PDF comprise : l'application fonctionne sans réseau.
              globPatterns: ['**/*.{js,css,html,svg,png,ttf,woff2,json}'],
              maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
              navigateFallback: 'index.html',
              // Les éditions de marque publiées dans des sous-dossiers ont leur propre index.html.
              navigateFallbackDenylist: [/\/(infosec|concurrents)\//],
            },
          }),
    ],
    build: single
      ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 10_000 }
      : { outDir: 'dist', chunkSizeWarningLimit: 1500 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/engine/**/*.ts'],
        exclude: ['src/engine/**/*.test.ts', 'src/engine/__tests__/**', 'src/engine/types.ts'],
        thresholds: { lines: 90, functions: 90, statements: 90, branches: 80 },
      },
    },
  };
});
