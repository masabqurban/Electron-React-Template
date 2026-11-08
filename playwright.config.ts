import { defineConfig } from '@playwright/test';

/** End-to-end tests launch the built app (`npm run build` first) through Playwright's Electron support. */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // Each test launches its own app instance with its own data folder.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
