// Fail on any hex, rgb(), hsl() or named colour outside src/styles/tokens.css.
import { readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { findColourViolations } from './lib/colours.mjs';
import { walk } from './lib/walk.mjs';

const root = resolve(import.meta.dirname, '..');
// public/favicon.svg is generated from tokens.css by scripts/build-brand.mjs; an SVG favicon
// cannot read CSS variables from the page. `check:brand` fails when it drifts from the tokens.
const EXEMPT = new Set([
  resolve(root, 'src/styles/tokens.css'),
  resolve(root, 'public/favicon.svg'),
]);
const SCANNED = new Set(['.css', '.astro', '.ts', '.js', '.mjs', '.svg', '.html']);

let failures = 0;
for (const dir of ['src', 'public']) {
  for (const file of walk(resolve(root, dir))) {
    if (EXEMPT.has(file) || !SCANNED.has(extname(file))) continue;
    for (const v of findColourViolations(readFileSync(file, 'utf8'))) {
      console.error(`${relative(root, file)}:${v.line}  ${v.message}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\ncheck:colours FAILED: ${failures} colour literal(s) outside tokens.css`);
  process.exit(1);
}
console.log('check:colours OK');
