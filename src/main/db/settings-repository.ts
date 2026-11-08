import type { DatabaseSync } from 'node:sqlite';

import { defaultSettings, settingsSchema, type Settings } from '@shared/contract';

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;

export type SettingsChanges = { [K in keyof Settings]?: Settings[K] | undefined };

/** Drops keys whose value is undefined, so they don't overwrite stored values. */
const defined = (changes: SettingsChanges): Partial<Settings> =>
  Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));

/**
 * Settings are stored as one JSON document. Values from an older or
 * hand-edited database fall back to the defaults instead of crashing.
 */
export function createSettingsRepository(db: DatabaseSync) {
  /** Returns the stored JSON value, unvalidated: callers parse it. */
  const read = (key: string): unknown => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as unknown;
    } catch {
      return undefined;
    }
  };

  const write = (key: string, value: unknown): void => {
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    ).run(key, JSON.stringify(value));
  };

  return {
    get(): Settings {
      const parsed = settingsSchema.partial().safeParse(read('app') ?? {});
      return { ...defaultSettings, ...(parsed.success ? defined(parsed.data) : {}) };
    },

    update(changes: SettingsChanges): Settings {
      const next = settingsSchema.parse({ ...this.get(), ...defined(changes) });
      write('app', next);
      return next;
    },

    /** Free-form values owned by the main process, such as window bounds. */
    readValue: read,
    writeValue: write,
  };
}
