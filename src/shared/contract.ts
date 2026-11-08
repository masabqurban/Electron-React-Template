import { z } from 'zod';

import type { EventChannel, InvokeChannel } from './channels';

/*
 * The IPC contract: one place that defines what the renderer can ask the
 * main process to do, how inputs are validated, and what comes back.
 * Both sides import it, so a change here is a type error everywhere it
 * matters.
 */

const id = z.uuid();

export const noteSchema = z.object({
  id,
  title: z.string(),
  body: z.string(),
  pinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

export const themeSchema = z.enum(['system', 'light', 'dark']);
export type Theme = z.infer<typeof themeSchema>;

export const settingsSchema = z.object({
  theme: themeSchema,
  /** Closing the window keeps the app running in the tray. */
  closeToTray: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = { theme: 'system', closeToTray: false };

const title = z.string().trim().max(200);
const body = z.string().max(100_000);

/** Input schemas, validated in the main process before any handler runs. */
export const inputSchemas = {
  'notes.list': z.object({ query: z.string().trim().max(200).default('') }).default({ query: '' }),
  'notes.get': z.object({ id }),
  'notes.create': z.object({ title: title.default(''), body: body.default('') }).default({ title: '', body: '' }),
  'notes.update': z.object({
    id,
    title: title.optional(),
    body: body.optional(),
    pinned: z.boolean().optional(),
  }),
  'notes.remove': z.object({ id }),
  'settings.get': z.undefined(),
  'settings.update': settingsSchema.partial(),
  'app.info': z.undefined(),
  'app.checkForUpdates': z.undefined(),
  'app.installUpdate': z.undefined(),
  // Only web links: never file://, javascript: or custom schemes.
  'app.openExternal': z.object({
    url: z.url({ protocol: /^https$/ }),
  }),
} as const satisfies Record<InvokeChannel, z.ZodType>;

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  versions: { electron: string; chrome: string; node: string };
  userDataPath: string;
  isPackaged: boolean;
}

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'disabled'; reason: string }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string };

/** What each channel resolves to. */
export interface Outputs {
  'notes.list': Note[];
  'notes.get': Note;
  'notes.create': Note;
  'notes.update': Note;
  'notes.remove': { id: string };
  'settings.get': Settings;
  'settings.update': Settings;
  'app.info': AppInfo;
  'app.checkForUpdates': UpdateStatus;
  'app.installUpdate': { ok: true };
  'app.openExternal': { ok: true };
}

/** Routes the main process may send the renderer to. */
export type AppPath = '/' | '/settings' | '/about' | `/notes/${string}`;

/** Payloads of the events pushed from main to renderer. */
export interface EventPayloads {
  'menu.newNote': undefined;
  navigate: { to: AppPath };
  'update.status': UpdateStatus;
}

/** What the renderer sends (before defaults are applied). */
export type Input<C extends InvokeChannel> = z.input<(typeof inputSchemas)[C]>;
/** What handlers receive (after validation and defaults). */
export type ParsedInput<C extends InvokeChannel> = z.output<(typeof inputSchemas)[C]>;

/** Errors cross the IPC boundary as data, keeping a stable `code`. */
export type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL';

export type IpcResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string; issues?: string[] } };

/** The API the preload exposes on `window.api`. Plain functions: they don't use `this`. */
export interface PreloadApi {
  invoke: <C extends InvokeChannel>(
    channel: C,
    ...input: Input<C> extends undefined ? [] : [Input<C>]
  ) => Promise<IpcResult<Outputs[C]>>;
  on: <E extends EventChannel>(event: E, listener: (payload: EventPayloads[E]) => void) => () => void;
  platform: string;
}

// Compile-time checks: every channel has an output type and every event a
// payload, with no extras. A mismatch fails type checking here.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type ContractIsComplete = [
  Assert<Exact<keyof Outputs, InvokeChannel>>,
  Assert<Exact<keyof EventPayloads, EventChannel>>,
];
