import { join } from 'node:path';

import { app, BrowserWindow, screen, type Rectangle } from 'electron';
import { z } from 'zod';

import type { SettingsRepository } from './db/settings-repository';
import { APP_ORIGIN, lockNavigation } from './security';

interface WindowOptions {
  settings: SettingsRepository;
  devServerUrl: string | undefined;
  isTrustedUrl: (url: string) => boolean;
  iconPath: string;
}

const BOUNDS_KEY = 'window.bounds';

// Stored bounds are validated: a corrupt value must never stop the app from starting.
const savedBoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(300).max(20_000),
  height: z.number().int().min(200).max(20_000),
  maximized: z.boolean().default(false),
});
type SavedBounds = z.infer<typeof savedBoundsSchema>;

const readBounds = (settings: SettingsRepository): SavedBounds | undefined => {
  const parsed = savedBoundsSchema.safeParse(settings.readValue(BOUNDS_KEY));
  return parsed.success ? parsed.data : undefined;
};
const DEFAULT_SIZE = { width: 1100, height: 720 };

/** Restores the last size and position, if it still fits on a connected display. */
function restoreBounds(saved: SavedBounds | undefined): Partial<Rectangle> {
  if (!saved) {
    return DEFAULT_SIZE;
  }

  const visible = screen
    .getAllDisplays()
    .some(
      ({ workArea }) =>
        saved.x >= workArea.x - 50 &&
        saved.y >= workArea.y - 50 &&
        saved.x + 100 <= workArea.x + workArea.width &&
        saved.y + 100 <= workArea.y + workArea.height,
    );

  const { x, y, width, height } = saved;
  return visible ? { x, y, width, height } : { width, height };
}

export function createMainWindow({ settings, devServerUrl, isTrustedUrl, iconPath }: WindowOptions): BrowserWindow {
  const saved = readBounds(settings);

  const window = new BrowserWindow({
    ...restoreBounds(saved),
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: app.getName(),
    icon: iconPath,
    backgroundColor: '#00000000',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      // The renderer is untrusted: no Node.js, isolated from the preload,
      // and sandboxed like a normal web page.
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
    },
  });

  if (saved?.maximized) {
    window.maximize();
  }

  // Show once painted, avoiding a white flash.
  window.once('ready-to-show', () => window.show());

  const persist = (): void => {
    if (window.isDestroyed() || window.isMinimized()) return;
    settings.writeValue(BOUNDS_KEY, { ...window.getNormalBounds(), maximized: window.isMaximized() });
  };
  window.on('resized', persist);
  window.on('moved', persist);
  window.on('close', persist);

  lockNavigation(window.webContents, isTrustedUrl);

  void window.loadURL(devServerUrl ?? `${APP_ORIGIN}/index.html`);

  return window;
}
