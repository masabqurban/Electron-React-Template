/**
 * Every IPC channel the renderer may use. Kept free of dependencies so the
 * sandboxed preload can import it without bundling validation code.
 */
export const invokeChannels = [
  'notes.list',
  'notes.get',
  'notes.create',
  'notes.update',
  'notes.remove',
  'settings.get',
  'settings.update',
  'app.info',
  'app.checkForUpdates',
  'app.installUpdate',
  'app.openExternal',
] as const;

export type InvokeChannel = (typeof invokeChannels)[number];

/** Events the main process pushes to the renderer. */
export const eventChannels = ['menu.newNote', 'navigate', 'update.status'] as const;

export type EventChannel = (typeof eventChannels)[number];
