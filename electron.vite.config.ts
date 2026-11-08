import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

// Paths are relative to the project root, where electron-vite runs.
const shared = resolve('src/shared');

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': shared } },
    build: {
      externalizeDeps: true,
    },
  },
  preload: {
    resolve: { alias: { '@shared': shared } },
    build: {
      // Sandboxed preloads can't load npm modules, so bundle everything in.
      externalizeDeps: false,
      rolldownOptions: {
        // Sandboxed preloads must be CommonJS, even in an ESM package.
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': shared,
      },
    },
    plugins: [react(), tailwindcss()],
    build: { minify: true },
  },
});
