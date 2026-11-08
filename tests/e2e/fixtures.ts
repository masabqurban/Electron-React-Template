import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { _electron as electron, test as base, type ElectronApplication, type Page } from '@playwright/test';

interface Fixtures {
  /** A fresh data folder, kept for the whole test so the app can be relaunched against it. */
  userDataDir: string;
  launch: () => Promise<{ app: ElectronApplication; mainWindow: Page }>;
  app: ElectronApplication;
  /** The app's main window. Named so it doesn't shadow the DOM `window` inside `evaluate()`. */
  mainWindow: Page;
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring
  userDataDir: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), 'acme-notes-e2e-'));
    await use(dir);
    rmSync(dir, { recursive: true, force: true });
  },

  launch: async ({ userDataDir }, use) => {
    const launched: ElectronApplication[] = [];
    await use(async () => {
      // Terminals inside VS Code (itself Electron) set ELECTRON_RUN_AS_NODE,
      // which would start Electron as plain Node.js instead of the app.
      const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;
      const app = await electron.launch({
        args: ['.'],
        env: { ...env, ACME_NOTES_USER_DATA: userDataDir, ACME_NOTES_DISABLE_UPDATES: '1' },
      });
      launched.push(app);
      const mainWindow = await app.firstWindow();
      await mainWindow.waitForLoadState('domcontentloaded');
      return { app, mainWindow };
    });
    await Promise.all(launched.map((app) => app.close().catch(() => undefined)));
  },

  app: async ({ launch }, use) => {
    const { app } = await launch();
    await use(app);
  },

  mainWindow: async ({ app }, use) => {
    await use(await app.firstWindow());
  },
});

export { expect } from '@playwright/test';
