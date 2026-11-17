// Every case-study fact names a section of the context document and every number in it
// appears in that section. This is how invented numbers are kept out.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkFacts } from './lib/content-checks.mjs';
import { readCollections } from './lib/read-content.mjs';

const root = resolve(import.meta.dirname, '..');
const sections = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'context-sections.json'), 'utf8'),
);
const studies = readCollections(resolve(root, 'src/content')).filter(
  (f) => f.collection === 'caseStudies',
);

const problems = checkFacts(studies, sections);
for (const p of problems) console.error(p);
if (problems.length) {
  console.error(`\ncheck:facts FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`check:facts OK (${studies.length} case-study files)`);
