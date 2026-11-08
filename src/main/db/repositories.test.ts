import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { defaultSettings } from '@shared/contract';

import { migrate, migrations, openDatabase } from './database';
import { createNotesRepository } from './notes-repository';
import { seedWelcomeNotes } from './seed';
import { createSettingsRepository } from './settings-repository';

const clock = () => {
  let time = Date.parse('2026-01-01T10:00:00Z');
  return () => new Date((time += 1000));
};

const setup = () => {
  const db = openDatabase(':memory:');
  return { db, notes: createNotesRepository(db, clock()), settings: createSettingsRepository(db) };
};

describe('migrations', () => {
  it('run once and record the schema version', () => {
    const db = openDatabase(':memory:');
    migrate(db);
    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: migrations.length });
  });

  it('roll back a failing migration and keep the last good version', () => {
    const db = new DatabaseSync(':memory:');
    const broken = [...migrations, 'CREATE TABLE half_done (id INTEGER); THIS IS NOT SQL;'];

    expect(() => migrate(db, broken)).toThrow(`Migration ${broken.length} failed`);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").get()).toBeUndefined();
    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: migrations.length });
  });
});

describe('notes repository', () => {
  it('creates, reads, updates and deletes notes', () => {
    const { notes } = setup();
    const note = notes.create({ title: 'First', body: 'Hello' });

    expect(note).toMatchObject({ title: 'First', body: 'Hello', pinned: false });
    expect(notes.get(note.id)).toEqual(note);

    const updated = notes.update(note.id, { body: 'Changed' });
    expect(updated).toMatchObject({ title: 'First', body: 'Changed' });
    expect(updated.updatedAt > note.updatedAt).toBe(true);

    expect(notes.remove(note.id)).toEqual({ id: note.id });
    expect(() => notes.get(note.id)).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
    expect(() => notes.remove(note.id)).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('lists pinned notes first, then the most recently edited', () => {
    const { notes } = setup();
    const a = notes.create({ title: 'A', body: '' });
    const b = notes.create({ title: 'B', body: '' });
    const c = notes.create({ title: 'C', body: '' });
    notes.update(a.id, { pinned: true });
    notes.update(b.id, { body: 'edited' });

    expect(notes.list().map((note) => note.title)).toEqual(['A', 'B', 'C']);
    expect(c.title).toBe('C');
  });

  it('searches titles and bodies, treating wildcards literally', () => {
    const { notes } = setup();
    notes.create({ title: 'Budget', body: 'Up 50% this year' });
    notes.create({ title: 'Groceries', body: 'Milk_and eggs' });
    notes.create({ title: 'Other', body: 'Nothing here' });

    expect(notes.list('budget').map((note) => note.title)).toEqual(['Budget']);
    expect(notes.list('50%').map((note) => note.title)).toEqual(['Budget']);
    expect(notes.list('k_a').map((note) => note.title)).toEqual(['Groceries']);
    expect(notes.list('%')).toHaveLength(1);
  });

  it('is safe against SQL injection in search', () => {
    const { notes } = setup();
    notes.create({ title: 'Keep me', body: '' });
    expect(notes.list("'; DROP TABLE notes; --")).toEqual([]);
    expect(notes.count()).toBe(1);
  });

  it('seeds welcome notes only into an empty database', () => {
    const { notes } = setup();
    seedWelcomeNotes(notes);
    seedWelcomeNotes(notes);
    expect(notes.count()).toBe(3);
    expect(notes.list()[0]?.title).toBe('Welcome to Acme Notes');
  });
});

describe('settings repository', () => {
  it('returns defaults, then persists partial changes', () => {
    const { settings } = setup();
    expect(settings.get()).toEqual(defaultSettings);

    expect(settings.update({ theme: 'dark' })).toEqual({ ...defaultSettings, theme: 'dark' });
    expect(settings.update({ closeToTray: true, theme: undefined })).toEqual({ theme: 'dark', closeToTray: true });
    expect(settings.get()).toEqual({ theme: 'dark', closeToTray: true });
  });

  it('falls back to defaults for corrupt or outdated stored values', () => {
    const { db, settings } = setup();
    db.prepare("INSERT INTO settings (key, value) VALUES ('app', ?)").run('{"theme":"neon","closeToTray":true}');
    expect(settings.get()).toEqual(defaultSettings);

    db.prepare("UPDATE settings SET value = 'not json' WHERE key = 'app'").run();
    expect(settings.get()).toEqual(defaultSettings);
  });
});
