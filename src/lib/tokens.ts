/**
 * Reads the design tokens out of `src/styles/tokens.css`, the only file allowed to hold a
 * colour literal (`check:colours`). Anything that needs a literal value outside CSS
 * (`<meta name="theme-color">`, the generated favicon and share images) reads it here, so
 * the palette stays in one place.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Theme = 'day' | 'night';

const SELECTOR: Record<Theme, string> = {
  day: ':root {',
  night: ":root[data-theme='night'] {",
};

/** Token name (without `--`) to value for one theme. */
export function readTokens(theme: Theme, root = process.cwd()): Record<string, string> {
  const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
  const open = css.indexOf(SELECTOR[theme]);
  if (open === -1) throw new Error(`tokens.css has no "${SELECTOR[theme]}" block`);
  const start = open + SELECTOR[theme].length;
  const end = css.indexOf('\n}', start);
  const out: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}
