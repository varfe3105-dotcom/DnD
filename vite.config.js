import crypto from 'node:crypto';
import fs from 'node:fs';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// Standard: dist/charakterbogen.html, eine Datei, ohne Server per Doppelklick nutzbar.
// Mit --mode web: dist-web/ für Hosting, installierbar und offline nutzbar.
// Quelle heißt index.html (für die Web-Fassung); die Einzeldatei bekommt ihren sprechenden Namen.
const asSingleFile = {
  name: 'als-einzeldatei',
  closeBundle() { fs.renameSync('dist/index.html', 'dist/charakterbogen.html'); },
};

export default defineConfig(({ mode }) => {
  const web = mode === 'web';
  return {
    root: 'src',
    define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
    base: './',
    publicDir: web ? 'public' : false,
    plugins: [
      viteSingleFile(),
      ...(web ? [VitePWA({
        injectRegister: 'inline',
        registerType: 'autoUpdate',
        manifest: {
          name: 'D&D Charakterbogen', short_name: 'Charakterbogen', description: 'D&D 5e (2014) character sheet',
          start_url: './', scope: './', display: 'standalone', background_color: '#3a120e', theme_color: '#3a120e',
          icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
        },
        includeManifestIcons: false,
        workbox: {
          globPatterns: ['**/*.{html,png}'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallback: 'index.html',
          // Neue Fassungen sofort übernehmen statt zu warten, bis alle Tabs geschlossen sind.
          skipWaiting: true,
          clientsClaim: true,
          // Doppelte Einträge lassen die Installation scheitern; revision:null würde alte Fassungen festhalten.
          manifestTransforms: [entries => {
            const seen = new Map();
            for (const e of entries) { const old = seen.get(e.url); if (!old || (e.revision && !old.revision)) seen.set(e.url, e); }
            const manifest = [...seen.values()].map(e => (e.revision ? e : { ...e, revision: crypto.createHash('md5').update(fs.readFileSync('dist-web/' + e.url)).digest('hex') }));
            return { manifest, warnings: [] };
          }],
        },
      })] : [asSingleFile]),
    ],
    build: {
      outDir: web ? '../dist-web' : '../dist',
      emptyOutDir: true,
      assetsInlineLimit: 100_000_000,
      rollupOptions: { input: 'src/index.html' },
    },
  };
});
