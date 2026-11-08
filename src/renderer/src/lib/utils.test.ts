import { describe, expect, it } from 'vitest';

import { formatUpdated, preview } from './utils';

describe('formatUpdated', () => {
  const now = Date.parse('2026-06-15T12:00:00Z');
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

  it('describes recent edits relatively', () => {
    expect(formatUpdated(ago(10), now)).toBe('just now');
    expect(formatUpdated(ago(5 * 60), now)).toMatch(/5 minutes ago/);
    expect(formatUpdated(ago(3 * 3600), now)).toMatch(/3 hours ago/);
    expect(formatUpdated(ago(86_400), now)).toMatch(/yesterday|1 day ago/);
  });

  it('shows a date for anything older than a week', () => {
    expect(formatUpdated(ago(30 * 86_400), now)).toMatch(/2026/);
  });
});

describe('preview', () => {
  it('returns the first non-empty line', () => {
    expect(preview('\n\n  Hello  \nWorld')).toBe('Hello');
    expect(preview('   \n')).toBe('');
  });
});
