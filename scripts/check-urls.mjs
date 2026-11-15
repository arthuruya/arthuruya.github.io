// URLs are permanent. urls.txt lists every built URL; one may never disappear versus `main`.
//   node scripts/check-urls.mjs          verify
//   node scripts/check-urls.mjs --write  regenerate urls.txt from dist/
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { urlOf } from './lib/html.mjs';
import { walk } from './lib/walk.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const listFile = resolve(root, 'urls.txt');

if (!existsSync(dist)) {
  console.error('check:urls FAILED: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const PUBLIC_EXT = new Set(['.html', '.txt', '.xml', '.pdf']);
const built = walk(dist, { skipBinary: false })
  .filter((f) => {
    const rel = relative(dist, f);
    // build assets and font licence texts are not pages
    return (
      PUBLIC_EXT.has(extname(f)) &&
      !rel.startsWith('_astro' + sep) &&
      !rel.startsWith('fonts' + sep)
    );
  })
  .map((f) => urlOf(dist, f))
  .sort();

const toText = (list) => list.join('\n') + '\n';
const parse = (text) => text.split('\n').filter(Boolean);

if (process.argv.includes('--write')) {
  writeFileSync(listFile, toText(built));
  console.log(`urls.txt written (${built.length} URLs)`);
  process.exit(0);
}

let baseline = null;
let baselineRef = null;
for (const ref of ['main', 'origin/main']) {
  try {
    baseline = parse(
      execFileSync('git', ['show', `${ref}:urls.txt`], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString(),
    );
    baselineRef = ref;
    break;
  } catch {
    // ref or file does not exist yet (first commit): nothing to compare against
  }
}

const problems = [];
if (baseline) {
  for (const url of baseline)
    if (!built.includes(url)) problems.push(`URL disappeared vs ${baselineRef}: ${url}`);
}
const committed = existsSync(listFile) ? parse(readFileSync(listFile, 'utf8')) : [];
if (toText(committed) !== toText(built)) {
  problems.push('urls.txt is out of date with dist/. Run `npm run urls:write` and commit it.');
}

if (problems.length) {
  for (const p of problems) console.error(p);
  console.error(`\ncheck:urls FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(
  `check:urls OK (${built.length} URLs${baseline ? `, baseline ${baselineRef}` : ', no baseline on main yet'})`,
);
