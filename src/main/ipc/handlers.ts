import { app, shell } from 'electron';

import type { NotesRepository } from '../db/notes-repository';
import type { SettingsRepository } from '../db/settings-repository';
import type { Updater } from '../updater';
import type { Handlers } from './dispatcher';

interface Dependencies {
  notes: NotesRepository;
  settings: SettingsRepository;
  updater: Updater;
  /** Called after settings change so the main process can react (theme, tray). */
  onSettingsChanged: () => void;
}

/**
 * The implementation of every IPC channel. Handlers receive validated input
 * and talk to the main process through injected dependencies.
 */
export function createHandlers({ notes, settings, updater, onSettingsChanged }: Dependencies): Handlers {
  return {
    'notes.list': ({ query }) => notes.list(query),
    'notes.get': ({ id }) => notes.get(id),
    'notes.create': (input) => notes.create(input),
    'notes.update': ({ id, ...changes }) => notes.update(id, changes),
    'notes.remove': ({ id }) => notes.remove(id),

    'settings.get': () => settings.get(),
    'settings.update': (changes) => {
      const next = settings.update(changes);
      onSettingsChanged();
      return next;
    },

    'app.info': () => ({
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
      },
      userDataPath: app.getPath('userData'),
      isPackaged: app.isPackaged,
    }),
    'app.checkForUpdates': () => updater.check(),
    'app.installUpdate': () => {
      updater.install();
      return { ok: true };
    },
    'app.openExternal': async ({ url }) => {
      await shell.openExternal(url);
      return { ok: true };
    },
  };
}
