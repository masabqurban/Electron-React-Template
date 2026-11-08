import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

const list = (page: Page) => page.getByRole('navigation', { name: 'Note list' });

test('first launch shows the welcome notes', async ({ mainWindow }) => {
  await expect(mainWindow).toHaveTitle('Acme Notes');
  await expect(list(mainWindow).getByRole('link')).toHaveCount(3);
  await expect(list(mainWindow).getByText('Welcome to Acme Notes')).toBeVisible();
});

test('creates, edits and finds a note, and keeps it after a restart', async ({ launch }) => {
  const first = await launch();
  let mainWindow = first.mainWindow;

  await mainWindow.getByRole('button', { name: 'New note' }).click();
  await mainWindow.getByLabel('Title').fill('Quarterly planning');
  await mainWindow.getByLabel('Note', { exact: true }).fill('Ship the desktop template');
  await expect(mainWindow.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await expect(list(mainWindow).getByText('Quarterly planning')).toBeVisible();

  await mainWindow.getByLabel('Search notes').fill('desktop template');
  await expect(list(mainWindow).getByRole('link')).toHaveCount(1);

  await first.app.close();
  ({ mainWindow } = await launch());

  await expect(list(mainWindow).getByText('Quarterly planning')).toBeVisible();
  await list(mainWindow).getByText('Quarterly planning').click();
  await expect(mainWindow.getByLabel('Note', { exact: true })).toHaveValue('Ship the desktop template');
});

test('pins and deletes notes', async ({ mainWindow }) => {
  await list(mainWindow).getByText('Keyboard shortcuts').click();
  await mainWindow.getByRole('button', { name: 'Pin note' }).click();
  await expect(list(mainWindow).getByRole('link').first()).toContainText('Keyboard shortcuts');

  await mainWindow.getByRole('button', { name: 'Delete note' }).click();
  await mainWindow.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(list(mainWindow).getByText('Keyboard shortcuts')).toHaveCount(0);
  await expect(mainWindow.getByText('Note deleted')).toBeVisible();
});

test('the New Note menu item creates a note', async ({ app, mainWindow }) => {
  await app.evaluate(({ Menu }) => {
    Menu.getApplicationMenu()?.getMenuItemById('new-note')?.click();
  });
  await expect(mainWindow.getByLabel('Title')).toBeFocused();
  await expect(list(mainWindow).getByRole('link')).toHaveCount(4);
});

test('settings persist and the about page shows versions', async ({ launch }) => {
  const first = await launch();
  let mainWindow = first.mainWindow;

  await mainWindow.getByRole('link', { name: 'Settings' }).click();
  await mainWindow.getByRole('radio', { name: 'Dark' }).click();
  await expect(mainWindow.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  expect(await first.app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe('dark');
  // Playwright emulates a light scheme by default; check what the page really gets.
  await mainWindow.emulateMedia({ colorScheme: null });
  expect(await mainWindow.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(true);

  await first.app.close();
  const second = await launch();
  mainWindow = second.mainWindow;
  expect(await second.app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe('dark');

  await mainWindow.getByRole('link', { name: 'About' }).click();
  await expect(mainWindow.getByText(/^Version \d+\.\d+\.\d+/)).toBeVisible();
  await expect(mainWindow.getByText('Updates are only checked in installed builds.')).toBeVisible();
});

test('the renderer is sandboxed and cannot reach Node or Electron', async ({ mainWindow }) => {
  const exposed = await mainWindow.evaluate(() => ({
    require: typeof (window as unknown as { require?: unknown }).require,
    process: typeof (window as unknown as { process?: unknown }).process,
    ipcRenderer: typeof (window as unknown as { ipcRenderer?: unknown }).ipcRenderer,
    apiKeys: Object.keys(window.api).sort(),
  }));

  expect(exposed).toEqual({
    require: 'undefined',
    process: 'undefined',
    ipcRenderer: 'undefined',
    apiKeys: ['invoke', 'on', 'platform'],
  });
});

test('IPC rejects unknown channels and invalid input', async ({ mainWindow }) => {
  const results = await mainWindow.evaluate(async () => {
    // Bypass the types to send a channel that isn't in the contract.
    const invoke = window.api.invoke as (channel: string) => Promise<unknown>;
    const unknown = await invoke('fs.readFile').catch((error: unknown) => (error as Error).message);
    const invalid = await window.api.invoke('notes.get', { id: 'not-a-uuid' });
    const external = await window.api.invoke('app.openExternal', { url: 'file:///etc/passwd' });
    return { unknown, invalid, external };
  });

  expect(results.unknown).toContain('Unknown channel');
  expect(results.invalid).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  expect(results.external).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
});

test('the page is served from app:// with a strict content security policy', async ({ mainWindow }) => {
  expect(mainWindow.url()).toMatch(/^app:\/\/acme\//);

  // An inline script injected into the page must not run.
  const ran = await mainWindow.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__injected = true';
    document.body.append(script);
    return (window as unknown as { __injected?: boolean }).__injected === true;
  });
  expect(ran).toBe(false);
});

test('new windows and navigation away from the app are blocked', async ({ app, mainWindow }) => {
  await mainWindow.evaluate(() => {
    // http:// so the test doesn't open a real browser (https links go to the system browser).
    window.open('http://example.com');
    window.location.href = 'http://example.com';
  });
  await mainWindow.waitForTimeout(500);

  expect(app.windows()).toHaveLength(1);
  expect(mainWindow.url()).toMatch(/^app:\/\/acme\//);
});
