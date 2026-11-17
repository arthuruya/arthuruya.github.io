// Dictionaries: same keys, no empty value, no untranslated value (allow-list aside).
// Content: every item exists in both languages with the same keys and a matching `lang`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkContentParity, compareDictionaries, parseAllowSame } from './lib/content-checks.mjs';
import { readCollections } from './lib/read-content.mjs';

const root = resolve(import.meta.dirname, '..');
const { en } = await import(resolve(root, 'src/i18n/en.ts'));
const { id } = await import(resolve(root, 'src/i18n/id.ts'));
const allow = parseAllowSame(
  readFileSync(resolve(import.meta.dirname, 'i18n-allow-same.txt'), 'utf8'),
);

const files = readCollections(resolve(root, 'src/content'));
const problems = [...compareDictionaries(en, id, allow), ...checkContentParity(files)];

for (const p of problems) console.error(p);
if (problems.length) {
  console.error(`\ncheck:i18n FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`check:i18n OK (dictionaries, ${files.length} content files)`);
