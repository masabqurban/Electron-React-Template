import { DatabaseSync } from 'node:sqlite';

/**
 * Schema migrations, applied in order. The database records how many have
 * run in `PRAGMA user_version`, so each one runs exactly once. Never edit a
 * migration that has shipped: append a new one.
 */
export const migrations: readonly string[] = [
  `CREATE TABLE notes (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL DEFAULT '',
     pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX notes_updated_at ON notes (pinned DESC, updated_at DESC);

   CREATE TABLE settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );`,
];

/**
 * Opens (or creates) the database and brings its schema up to date.
 * Uses Node's built-in SQLite, so there's no native module to rebuild for
 * each platform and Electron version.
 */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  migrate(db);

  return db;
}

export function migrate(db: DatabaseSync, list: readonly string[] = migrations): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const current = row.user_version;

  for (let version = current; version < list.length; version++) {
    db.exec('BEGIN');
    try {
      db.exec(list[version]!);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${version + 1} failed`, { cause: error });
    }
  }
}
