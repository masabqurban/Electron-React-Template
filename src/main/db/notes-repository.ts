import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import type { Note } from '@shared/contract';

import { AppError } from '../errors';

interface NoteRow {
  id: string;
  title: string;
  body: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  pinned: row.pinned === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Escapes LIKE wildcards so a search for "50%" means the text "50%". */
const likePattern = (query: string): string => `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export type NotesRepository = ReturnType<typeof createNotesRepository>;

/**
 * All note storage goes through here. Every statement is parameterised.
 * `now` is injectable so tests control time.
 */
export function createNotesRepository(db: DatabaseSync, now: () => Date = () => new Date()) {
  const find = (id: string): Note => {
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined;
    if (!row) {
      throw new AppError('NOT_FOUND', 'That note no longer exists.');
    }
    return toNote(row);
  };

  return {
    list(query = ''): Note[] {
      const rows = query
        ? db
            .prepare(
              `SELECT * FROM notes
               WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\'
               ORDER BY pinned DESC, updated_at DESC`,
            )
            .all(likePattern(query), likePattern(query))
        : db.prepare('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC').all();

      return (rows as unknown as NoteRow[]).map(toNote);
    },

    get: find,

    create(input: { title: string; body: string }): Note {
      const id = randomUUID();
      const timestamp = now().toISOString();
      db.prepare('INSERT INTO notes (id, title, body, pinned, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(
        id,
        input.title,
        input.body,
        timestamp,
        timestamp,
      );
      return find(id);
    },

    update(
      id: string,
      changes: { title?: string | undefined; body?: string | undefined; pinned?: boolean | undefined },
    ): Note {
      const current = find(id);
      const next = {
        title: changes.title ?? current.title,
        body: changes.body ?? current.body,
        pinned: changes.pinned ?? current.pinned,
      };

      db.prepare('UPDATE notes SET title = ?, body = ?, pinned = ?, updated_at = ? WHERE id = ?').run(
        next.title,
        next.body,
        next.pinned ? 1 : 0,
        now().toISOString(),
        id,
      );
      return find(id);
    },

    remove(id: string): { id: string } {
      const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
      if (result.changes === 0) {
        throw new AppError('NOT_FOUND', 'That note no longer exists.');
      }
      return { id };
    },

    count(): number {
      return (db.prepare('SELECT COUNT(*) AS total FROM notes').get() as { total: number }).total;
    },
  };
}
