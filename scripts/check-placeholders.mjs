// Lists every TODO(arya) in src/ and public/. With RELEASE=1 any hit fails (Phase 8).
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { findPlaceholders } from './lib/content-checks.mjs';
import { walk } from './lib/walk.mjs';

const root = resolve(import.meta.dirname, '..');
const hits = [];
for (const dir of ['src', 'public']) {
  for (const file of walk(resolve(root, dir))) {
    for (const h of findPlaceholders(readFileSync(file, 'utf8'))) {
      hits.push({ file: relative(root, file), ...h });
    }
  }
}
for (const h of hits) console.log(`${h.file}:${h.line}  ${h.text}`);

if (process.env.RELEASE === '1' && hits.length) {
  console.error(`\ncheck:placeholders FAILED (RELEASE=1): ${hits.length} TODO(arya) left`);
  process.exit(1);
}
console.log(
  `check:placeholders OK (${hits.length} TODO(arya) listed${process.env.RELEASE === '1' ? '' : '; RELEASE=1 would fail'})`,
);
