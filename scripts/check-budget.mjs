// Phase 7: total JavaScript in dist/ must stay <= 60 KB gzipped (the Snapshot is JSON, not counted).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT = 60 * 1024;
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.js')) files.push(p);
  }
};
walk('dist');
let total = 0;
for (const f of files) total += gzipSync(readFileSync(f)).length;
// inline scripts in HTML count too
const inline = [];
const walkHtml = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walkHtml(p);
    else if (n.endsWith('.html'))
      for (const m of readFileSync(p, 'utf8').matchAll(
        /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
      ))
        inline.push(m[1]);
  }
};
walkHtml('dist');
const inlineBytes = inline.reduce((a, s) => a + gzipSync(s).length, 0);
const kb = (n) => (n / 1024).toFixed(1);
console.log(`JS gzipped: files ${kb(total)} KB (${files.length}), inline ${kb(inlineBytes)} KB`);
if (total > LIMIT) {
  console.error(`check:budget FAILED: ${kb(total)} KB > 60 KB`);
  process.exit(1);
}
console.log('check:budget OK');
