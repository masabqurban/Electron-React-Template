import { describe, expect, it } from 'vitest';

import { findDeepLinkArg, parseDeepLink } from './deep-link';

describe('parseDeepLink', () => {
  it.each([
    ['acme-notes://new?title=Groceries', { action: 'new-note', title: 'Groceries' }],
    ['acme-notes://new', { action: 'new-note', title: '' }],
    ['acme-notes:///new/?title=%20Spaced%20', { action: 'new-note', title: 'Spaced' }],
    ['acme-notes://settings', { action: 'open', to: '/settings' }],
    ['acme-notes://about/', { action: 'open', to: '/about' }],
    ['acme-notes://', { action: 'open', to: '/' }],
  ])('parses %s', (url, expected) => {
    expect(parseDeepLink(url)).toEqual(expected);
  });

  it.each(['https://example.com/new', 'acme-notes://delete-everything', 'not a url', 'javascript:alert(1)'])(
    'ignores %s',
    (url) => {
      expect(parseDeepLink(url)).toBeNull();
    },
  );

  it('limits the title length', () => {
    const link = parseDeepLink(`acme-notes://new?title=${'a'.repeat(500)}`);
    expect(link).toEqual({ action: 'new-note', title: 'a'.repeat(200) });
  });
});

describe('findDeepLinkArg', () => {
  it('finds the link among command-line arguments', () => {
    expect(findDeepLinkArg(['app.exe', '--flag', 'acme-notes://new?title=Hi'])).toBe('acme-notes://new?title=Hi');
    expect(findDeepLinkArg(['app.exe', '.'])).toBeUndefined();
  });
});
