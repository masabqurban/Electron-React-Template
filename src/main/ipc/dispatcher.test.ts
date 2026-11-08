import { describe, expect, it, vi } from 'vitest';

import { openDatabase } from '../db/database';
import { createNotesRepository } from '../db/notes-repository';
import { createSettingsRepository } from '../db/settings-repository';
import { createDispatcher, type Handlers } from './dispatcher';

const setup = () => {
  const db = openDatabase(':memory:');
  const notes = createNotesRepository(db);
  const settings = createSettingsRepository(db);
  const logger = { error: vi.fn() };

  const handlers = {
    'notes.list': ({ query }) => notes.list(query),
    'notes.get': ({ id }) => notes.get(id),
    'notes.create': (input) => notes.create(input),
    'notes.update': ({ id, ...changes }) => notes.update(id, changes),
    'notes.remove': ({ id }) => notes.remove(id),
    'settings.get': () => settings.get(),
    'settings.update': (changes) => settings.update(changes),
    'app.info': () => {
      throw new Error('disk on fire');
    },
    'app.checkForUpdates': () => ({ state: 'idle' }),
    'app.installUpdate': () => ({ ok: true }),
    'app.openExternal': () => ({ ok: true }),
  } satisfies Handlers;

  return { dispatch: createDispatcher(handlers, logger), logger };
};

describe('IPC dispatcher', () => {
  it('passes validated input to the handler and wraps the result', async () => {
    const { dispatch } = setup();
    const created = await dispatch('notes.create', { title: '  Trimmed  ' });

    expect(created).toMatchObject({ ok: true, data: { title: 'Trimmed', body: '' } });
  });

  it('applies defaults when input is omitted', async () => {
    const { dispatch } = setup();
    await dispatch('notes.create', undefined);
    expect(await dispatch('notes.list', undefined)).toMatchObject({ ok: true, data: [{ title: '' }] });
  });

  it('rejects invalid input before the handler runs', async () => {
    const { dispatch } = setup();
    const result = await dispatch('notes.get', { id: 'not-a-uuid' });

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(result.ok ? [] : result.error.issues).toEqual([expect.stringContaining('id:')]);
  });

  it('rejects oversized input', async () => {
    const { dispatch } = setup();
    const result = await dispatch('notes.create', { title: 'x'.repeat(201) });
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('only opens https links', async () => {
    const { dispatch } = setup();
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'http://example.com', 'acme-notes://new']) {
      expect(await dispatch('app.openExternal', { url })).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    }
    expect(await dispatch('app.openExternal', { url: 'https://example.com' })).toEqual({
      ok: true,
      data: { ok: true },
    });
  });

  it('returns known errors with their code and message', async () => {
    const { dispatch } = setup();
    const result = await dispatch('notes.get', { id: crypto.randomUUID() });
    expect(result).toEqual({ ok: false, error: { code: 'NOT_FOUND', message: 'That note no longer exists.' } });
  });

  it('logs unexpected errors and hides their details', async () => {
    const { dispatch, logger } = setup();
    const result = await dispatch('app.info', undefined);

    expect(result).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    });
    expect(JSON.stringify(result)).not.toContain('disk on fire');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
