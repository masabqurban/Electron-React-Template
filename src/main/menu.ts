import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron';

interface MenuActions {
  newNote: () => void;
  navigate: (to: '/' | '/settings' | '/about') => void;
}

const REPOSITORY_URL = 'https://github.com/masabqurban/Electron-React-Template';

/**
 * The application menu. macOS puts the app menu first and Settings in it;
 * Windows and Linux put Settings under File. Standard roles give native
 * behaviour (copy/paste, zoom, window management) on every platform.
 */
export function buildMenu(actions: MenuActions): Menu {
  const isMac = process.platform === 'darwin';

  const settingsItem: MenuItemConstructorOptions = {
    label: isMac ? 'Settings…' : 'Settings',
    accelerator: 'CmdOrCtrl+,',
    click: () => actions.navigate('/settings'),
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { label: `About ${app.getName()}`, click: () => actions.navigate('/about') },
              { type: 'separator' },
              settingsItem,
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { id: 'new-note', label: 'New Note', accelerator: 'CmdOrCtrl+N', click: actions.newNote },
        ...(isMac ? [] : [{ type: 'separator' as const }, settingsItem]),
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Notes', accelerator: 'CmdOrCtrl+1', click: () => actions.navigate('/') },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        // Developer tools only in development builds.
        ...(app.isPackaged
          ? []
          : [{ type: 'separator' as const }, { role: 'reload' as const }, { role: 'toggleDevTools' as const }]),
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        ...(isMac ? [] : [{ label: `About ${app.getName()}`, click: () => actions.navigate('/about') }]),
        { label: 'Documentation', click: () => void shell.openExternal(`${REPOSITORY_URL}#readme`) },
        { label: 'Report an Issue', click: () => void shell.openExternal(`${REPOSITORY_URL}/issues`) },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
