import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const file = resolve(import.meta.dirname, '../../public/theme.js');
const source = readFileSync(file, 'utf8');

/** Run public/theme.js against fake browser globals; return the chosen theme. */
function run({ stored, dark = false, storageThrows = false }) {
  const root = { dataset: {} };
  runInNewContext(source, {
    document: { documentElement: root },
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error('SecurityError');
        return stored ?? null;
      },
    },
    matchMedia: (q) => ({ matches: q === '(prefers-color-scheme: dark)' && dark }),
  });
  return root.dataset.theme;
}

describe('public/theme.js', () => {
  it('fits the 400-byte budget', () => {
    expect(statSync(file).size).toBeLessThanOrEqual(400);
  });

  it('uses a stored day or night choice first', () => {
    expect(run({ stored: 'night', dark: false })).toBe('night');
    expect(run({ stored: 'day', dark: true })).toBe('day');
  });

  it('falls back to prefers-color-scheme for missing or junk values', () => {
    expect(run({ stored: null, dark: true })).toBe('night');
    expect(run({ stored: null, dark: false })).toBe('day');
    expect(run({ stored: 'purple', dark: true })).toBe('night');
  });

  it('survives storage that throws', () => {
    expect(run({ storageThrows: true, dark: true })).toBe('night');
    expect(run({ storageThrows: true, dark: false })).toBe('day');
  });
});
