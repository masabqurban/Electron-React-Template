import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { app, type BrowserWindow, Menu, nativeTheme, type Tray } from 'electron';

import type { EventChannel } from '@shared/channels';
import type { AppPath, EventPayloads } from '@shared/contract';
import { findDeepLinkArg, parseDeepLink, PROTOCOL } from '@shared/deep-link';

import { openDatabase } from './db/database';
import { createNotesRepository } from './db/notes-repository';
import { seedWelcomeNotes } from './db/seed';
import { createSettingsRepository } from './db/settings-repository';
import { createDispatcher } from './ipc/dispatcher';
import { createHandlers } from './ipc/handlers';
import { registerIpcHandlers } from './ipc/register';
import { setUpLogging } from './logger';
import { buildMenu } from './menu';
import { applyDevCsp, createTrustedUrlCheck, denyAllPermissions, registerAppScheme, serveRenderer } from './security';
import { createTray } from './tray';
import { createUpdater } from './updater';
import { createMainWindow } from './window';

/*
 * Composition root: creates every service once and wires them together.
 * Everything else receives its dependencies, which keeps modules testable.
 */

const devServerUrl = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;
const log = setUpLogging(devServerUrl !== undefined);

// Tests (and multiple dev profiles) can run against an isolated data folder.
const userDataOverride = process.env.ACME_NOTES_USER_DATA;
if (userDataOverride) {
  app.setPath('userData', resolve(userDataOverride));
}

registerAppScheme();

// One instance only: a second launch (or a deep link) focuses the first.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void start();
}

async function start(): Promise<void> {
  // In development on Windows/Linux, Electron must be told how to relaunch this project.
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  let mainWindow: BrowserWindow | undefined;
  let tray: Tray | undefined;
  let isQuitting = false;
  let pendingLink = findDeepLinkArg(process.argv);

  // macOS delivers links through this event, possibly before the app is ready.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      handleDeepLink(url);
    } else {
      pendingLink = url;
    }
  });

  await app.whenReady();

  const dataDir = app.getPath('userData');
  mkdirSync(dataDir, { recursive: true });
  const db = openDatabase(join(dataDir, 'acme-notes.sqlite'));
  const notes = createNotesRepository(db);
  const settings = createSettingsRepository(db);
  seedWelcomeNotes(notes);

  const iconPath = join(import.meta.dirname, '../../resources/icon.png');
  const isTrustedUrl = createTrustedUrlCheck(devServerUrl);

  if (devServerUrl) {
    applyDevCsp(devServerUrl);
  } else {
    serveRenderer(join(import.meta.dirname, '../renderer'));
  }
  denyAllPermissions();

  const send = <E extends EventChannel>(channel: E, payload: EventPayloads[E]): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  };

  const showWindow = (): BrowserWindow => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = openWindow();
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  };

  const navigate = (to: AppPath): void => {
    showWindow();
    send('navigate', { to });
  };

  const newNote = (): void => {
    showWindow();
    send('menu.newNote', undefined);
  };

  function handleDeepLink(raw: string): void {
    const link = parseDeepLink(raw);
    if (!link) {
      log.warn('Ignored an invalid deep link');
      return;
    }
    if (link.action === 'new-note') {
      const note = notes.create({ title: link.title, body: '' });
      navigate(`/notes/${note.id}`);
    } else {
      navigate(link.to);
    }
  }

  const applySettings = (): void => {
    const current = settings.get();
    nativeTheme.themeSource = current.theme;

    if (current.closeToTray && !tray) {
      tray = createTray(iconPath, { show: showWindow, newNote, quit: () => app.quit() });
    } else if (!current.closeToTray && tray) {
      tray.destroy();
      tray = undefined;
    }
  };

  const updater = createUpdater({
    enabled: app.isPackaged && process.env.ACME_NOTES_DISABLE_UPDATES !== '1',
    disabledReason: app.isPackaged
      ? 'Updates are turned off for this build.'
      : 'Updates are only checked in installed builds.',
    onStatus: (status) => send('update.status', status),
  });

  const dispatch = createDispatcher(
    createHandlers({ notes, settings, updater, onSettingsChanged: applySettings }),
    log,
  );
  registerIpcHandlers(dispatch, isTrustedUrl);

  function openWindow(): BrowserWindow {
    const window = createMainWindow({ settings, devServerUrl, isTrustedUrl, iconPath });

    window.on('close', (event) => {
      if (!isQuitting && settings.get().closeToTray) {
        event.preventDefault();
        window.hide();
      }
    });

    window.webContents.once('did-finish-load', () => {
      if (pendingLink) {
        handleDeepLink(pendingLink);
        pendingLink = undefined;
      }
    });

    return window;
  }

  Menu.setApplicationMenu(buildMenu({ newNote, navigate }));
  applySettings();
  mainWindow = openWindow();

  // Windows and Linux deliver deep links to the running instance this way.
  app.on('second-instance', (_event, argv) => {
    const link = findDeepLinkArg(argv);
    if (link) {
      handleDeepLink(link);
    } else {
      showWindow();
    }
  });

  app.on('activate', () => showWindow());
  app.on('before-quit', () => {
    isQuitting = true;
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('will-quit', () => db.close());

  if (updater.status().state === 'idle') {
    // Check shortly after launch, without delaying startup.
    setTimeout(() => void updater.check(), 10_000);
  }

  log.info(`${app.getName()} ${app.getVersion()} started`);
}
