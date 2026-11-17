// Copy rules (RENCANA Phase 6): no word from scripts/banned-words.txt anywhere in the site's
// copy (content collections and dictionaries, EN and ID), and each case study stays within
// 700 words per language.
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { caseStudyWords, findBannedWords, parseBannedWords } from './lib/content-checks.mjs';
import { readCollections } from './lib/read-content.mjs';
import { walk } from './lib/walk.mjs';

const MAX_WORDS = 700;
const root = resolve(import.meta.dirname, '..');
const banned = parseBannedWords(
  readFileSync(resolve(import.meta.dirname, 'banned-words.txt'), 'utf8'),
);

const problems = [];
const files = [
  ...walk(resolve(root, 'src/content')).filter((f) => f.endsWith('.md')),
  ...walk(resolve(root, 'src/i18n')).filter((f) => f.endsWith('.ts')),
];
for (const file of files) {
  for (const h of findBannedWords(readFileSync(file, 'utf8'), banned)) {
    problems.push(`${relative(root, file)}:${h.line}  banned word "${h.match}" (${h.term})`);
  }
}

const studies = readCollections(resolve(root, 'src/content')).filter(
  (f) => f.collection === 'caseStudies',
);
const counts = [];
for (const cs of studies) {
  const n = caseStudyWords(cs.data);
  counts.push(`${cs.file} ${n}`);
  if (n > MAX_WORDS) problems.push(`caseStudies/${cs.file}: ${n} words (limit ${MAX_WORDS})`);
}

for (const p of problems) console.error(p);
if (problems.length) {
  console.error(`\ncheck:copy FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(
  `check:copy OK (${banned.length} banned terms, ${files.length} files; words: ${counts.join(', ')})`,
);
