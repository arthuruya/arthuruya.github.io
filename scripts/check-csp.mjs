// Fail on anything in dist/ that the Content-Security-Policy would block (RENCANA Phase 8).
import { existsSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { CSP } from '../src/config/csp.ts';
import { findAssetIssues, findCspIssues } from './lib/csp.mjs';
import { urlOf } from './lib/html.mjs';
import { walk } from './lib/walk.mjs';

const dist = resolve(import.meta.dirname, '..', 'dist');
if (!existsSync(dist)) {
  console.error('check:csp FAILED: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

let pages = 0;
let failures = 0;
const fail = (where, message) => {
  console.error(`${where}  ${message}`);
  failures++;
};
for (const file of walk(dist, { skipBinary: true })) {
  const ext = extname(file);
  if (ext === '.html') {
    pages++;
    for (const m of findCspIssues(readFileSync(file, 'utf8'), CSP)) fail(urlOf(dist, file), m);
  } else if (ext === '.css' || ext === '.js') {
    for (const m of findAssetIssues(readFileSync(file, 'utf8'), ext.slice(1))) {
      fail(relative(dist, file), m);
    }
  }
}
if (pages === 0) fail('dist/', 'no HTML pages');
if (failures) {
  console.error(`\ncheck:csp FAILED: ${failures} problem(s)`);
  process.exit(1);
}
console.log(`check:csp OK (${pages} page(s))`);
