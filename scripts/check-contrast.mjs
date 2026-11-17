// Fail when a declared text/background token pair is below its WCAG threshold in
// either theme. Pairs: src/styles/pairs.json. Tokens: src/styles/tokens.css.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkContrast } from './lib/contrast.mjs';

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
const spec = JSON.parse(readFileSync(resolve(root, 'src/styles/pairs.json'), 'utf8'));

let results;
let errors;
try {
  ({ results, errors } = checkContrast(css, spec));
} catch (e) {
  console.error(`check:contrast FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
for (const r of results) {
  console.log(
    `${r.pass ? 'ok  ' : 'FAIL'} ${pad(r.theme, 6)}${pad(r.fg, 14)}on ${pad(r.bg, 10)}` +
      `${r.ratio.toFixed(2).padStart(6)} >= ${r.min}  ${r.use}`,
  );
}
const failed = results.filter((r) => !r.pass);
for (const e of errors) console.error(`error: ${e}`);
if (failed.length || errors.length) {
  console.error(
    `\ncheck:contrast FAILED: ${failed.length} pair(s) below threshold, ${errors.length} error(s)`,
  );
  process.exit(1);
}
const themes = new Set(results.map((r) => r.theme)).size;
console.log(`check:contrast OK (${results.length / themes} pairs x ${themes} themes)`);
