// Fail on strings that must never reach the public repo (RENCANA section 0, rule 4).
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { findSanitizeViolations, parseAllowlist } from './lib/sanitize.mjs';
import { walk } from './lib/walk.mjs';

const root = resolve(import.meta.dirname, '..');
const allowPath = resolve(root, 'scripts/allowlist.txt');
const allow = parseAllowlist(existsSync(allowPath) ? readFileSync(allowPath, 'utf8') : '');

let failures = 0;
for (const dir of ['src', 'public', 'docs']) {
  for (const file of walk(resolve(root, dir))) {
    for (const v of findSanitizeViolations(readFileSync(file, 'utf8'), allow)) {
      console.error(`${relative(root, file)}:${v.line}  ${v.message}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\ncheck:sanitize FAILED: ${failures} finding(s)`);
  process.exit(1);
}
console.log('check:sanitize OK');
