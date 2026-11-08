import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { net, protocol, session, shell, type WebContents } from 'electron';

export const APP_SCHEME = 'app';
export const APP_HOST = 'acme';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/**
 * Content Security Policy for the renderer. Production allows only the app's
 * own files. Development adds what Vite's hot reload needs (an inline React
 * Refresh preamble and a WebSocket), and nothing else.
 */
export function contentSecurityPolicy(devServerUrl?: string): string {
  const dev = devServerUrl ? new URL(devServerUrl) : undefined;

  return [
    "default-src 'self'",
    dev ? `script-src 'self' 'unsafe-inline' ${dev.origin}` : "script-src 'self'",
    // Radix positions popovers with inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    dev ? `connect-src 'self' ${dev.origin} ws://${dev.host}` : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Must run before the app is ready. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

/**
 * Serves the built renderer from `app://acme/`. Requests can't escape the
 * renderer folder, unknown paths fall back to index.html, and every response
 * carries the CSP and hardening headers.
 */
export function serveRenderer(rendererDir: string): void {
  const root = resolve(rendererDir);
  const csp = contentSecurityPolicy();

  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.host !== APP_HOST) {
      return new Response('Not found', { status: 404 });
    }

    const requested = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    const insideRoot = requested === root || !relative(root, requested).startsWith('..');
    if (!insideRoot) {
      return new Response('Forbidden', { status: 403 });
    }

    const isFile = requested !== root && !requested.endsWith(sep) && /\.[a-z0-9]+$/i.test(requested);
    const response = await net.fetch(pathToFileURL(isFile ? requested : resolve(root, 'index.html')).toString());

    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', csp);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    return new Response(response.body, { status: response.status, headers });
  });
}

/** In development the page comes from Vite, so the CSP is added as a header here. */
export function applyDevCsp(devServerUrl: string): void {
  const csp = contentSecurityPolicy(devServerUrl);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  });
}

/** Whether a URL belongs to the app itself (production protocol or dev server). */
export function createTrustedUrlCheck(devServerUrl?: string): (url: string) => boolean {
  const devOrigin = devServerUrl ? new URL(devServerUrl).origin : undefined;
  return (url) => {
    try {
      const parsed = new URL(url);
      // Custom schemes have an opaque origin ("null"), so compare scheme and host.
      const isApp = parsed.protocol === `${APP_SCHEME}:` && parsed.host === APP_HOST;
      return isApp || (devOrigin !== undefined && parsed.origin === devOrigin);
    } catch {
      return false;
    }
  };
}

/** The renderer never needs camera, microphone, location or notifications prompts. */
export function denyAllPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
}

/**
 * Keeps the window on the app: in-page navigation elsewhere is blocked,
 * and links that open a new window go to the system browser instead
 * (https only).
 */
export function lockNavigation(contents: WebContents, isTrustedUrl: (url: string) => boolean): void {
  contents.on('will-navigate', (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  contents.on('will-attach-webview', (event) => event.preventDefault());
}
