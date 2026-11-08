import electronUpdater from 'electron-updater';

import type { UpdateStatus } from '@shared/contract';

import { log } from './logger';

const { autoUpdater } = electronUpdater;

export interface Updater {
  check(): Promise<UpdateStatus>;
  install(): void;
  status(): UpdateStatus;
}

/**
 * Auto-updates from GitHub Releases (configured in electron-builder.yml).
 * Updates download in the background and install on the next quit, or
 * right away when the user chooses "Restart now".
 *
 * Disabled in development, where there is no installed app to replace.
 */
export function createUpdater(options: {
  enabled: boolean;
  disabledReason?: string;
  onStatus: (status: UpdateStatus) => void;
}): Updater {
  let status: UpdateStatus = options.enabled
    ? { state: 'idle' }
    : { state: 'disabled', reason: options.disabledReason ?? 'Updates are disabled.' };

  const set = (next: UpdateStatus): UpdateStatus => {
    status = next;
    options.onStatus(next);
    return next;
  };

  if (options.enabled) {
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => set({ state: 'available', version: info.version }));
    autoUpdater.on('update-not-available', () => set({ state: 'not-available' }));
    autoUpdater.on('download-progress', (progress) =>
      set({ state: 'downloading', percent: Math.round(progress.percent) }),
    );
    autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }));
    autoUpdater.on('error', (error) => {
      log.warn('Update check failed', error);
      set({ state: 'error', message: 'Could not check for updates.' });
    });
  }

  return {
    async check() {
      if (!options.enabled) return status;
      try {
        await autoUpdater.checkForUpdates();
      } catch {
        // Reported through the 'error' event.
      }
      return status;
    },
    install() {
      if (status.state === 'ready') {
        autoUpdater.quitAndInstall();
      }
    },
    status: () => status,
  };
}
