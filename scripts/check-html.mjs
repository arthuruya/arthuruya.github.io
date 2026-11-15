// Structural checks on the built site in dist/.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkSite } from './lib/html.mjs';

const dist = resolve(import.meta.dirname, '..', 'dist');
if (!existsSync(dist)) {
  console.error('check:html FAILED: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const { pages, issues } = checkSite(dist);
if (pages.length === 0) {
  console.error('check:html FAILED: dist/ contains no HTML pages');
  process.exit(1);
}
for (const i of issues) console.error(`${i.url}  ${i.message}`);
if (issues.length) {
  console.error(`\ncheck:html FAILED: ${issues.length} issue(s) in ${pages.length} page(s)`);
  process.exit(1);
}
console.log(`check:html OK (${pages.length} page(s))`);
