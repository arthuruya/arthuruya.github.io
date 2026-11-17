// Fail on gradients, backdrop-filter, heavy shadows, radius above 4 px and the
// other anti-slop rules in scripts/lib/style-rules.mjs.
import { readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { findStyleViolations } from './lib/style-rules.mjs';
import { walk } from './lib/walk.mjs';

const root = resolve(import.meta.dirname, '..');
const SCANNED = new Set(['.css', '.astro', '.svg', '.html']);

let failures = 0;
let files = 0;
for (const dir of ['src', 'public']) {
  for (const file of walk(resolve(root, dir))) {
    if (!SCANNED.has(extname(file))) continue;
    files++;
    for (const v of findStyleViolations(readFileSync(file, 'utf8'))) {
      console.error(`${relative(root, file)}:${v.line}  ${v.message}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\ncheck:style FAILED: ${failures} violation(s)`);
  process.exit(1);
}
console.log(`check:style OK (${files} file(s))`);
