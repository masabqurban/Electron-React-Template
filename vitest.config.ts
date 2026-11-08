import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@': resolve('src/renderer/src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // `electron` can't be imported outside Electron; modules under test avoid it.
    restoreMocks: true,
  },
});
