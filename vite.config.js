import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Erzeugt dist/charakterbogen.html: eine Datei, ohne Server per Doppelklick nutzbar.
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: 'src/charakterbogen.html' },
  },
});
