export const PROTOCOL = 'acme-notes';

export type DeepLink = { action: 'new-note'; title: string } | { action: 'open'; to: '/' | '/settings' | '/about' };

/**
 * Parses `acme-notes://...` links. Anything unexpected returns null, because
 * any website or app can open a link with this scheme.
 */
export function parseDeepLink(raw: string): DeepLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== `${PROTOCOL}:`) {
    return null;
  }

  // `acme-notes://new` puts "new" in the host and `acme-notes:///new` in the
  // path, depending on the OS; normalise both forms.
  const path = (url.host + url.pathname).replace(/^\/+|\/+$/g, '');

  switch (path) {
    case 'new':
      return { action: 'new-note', title: (url.searchParams.get('title') ?? '').trim().slice(0, 200) };
    case 'settings':
      return { action: 'open', to: '/settings' };
    case 'about':
      return { action: 'open', to: '/about' };
    case '':
    case 'notes':
      return { action: 'open', to: '/' };
    default:
      return null;
  }
}

/** Finds a deep link among command-line arguments (Windows and Linux). */
export function findDeepLinkArg(argv: readonly string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
}
