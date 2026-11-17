// Regenerates scripts/context-sections.json from the context document that lives outside
// this repo. Run it only when that document changes:
//   node scripts/sync-context-sections.mjs ../myself/CONTEXT-Portfolio-Arya-Bratasena.md
// The output holds section numbers, titles and the numbers written in each section, and
// nothing else. check:facts reads the JSON, so a clean clone needs no sibling folder.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractContextSections } from './lib/content-checks.mjs';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/sync-context-sections.mjs <path to CONTEXT-Portfolio-*.md>');
  process.exit(1);
}
const sections = extractContextSections(readFileSync(resolve(src), 'utf8'));
writeFileSync(
  resolve(import.meta.dirname, 'context-sections.json'),
  JSON.stringify(sections, null, 2) + '\n',
);
console.log(`context-sections.json written (${Object.keys(sections).length} sections)`);
