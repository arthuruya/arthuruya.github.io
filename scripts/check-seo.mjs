// SEO and share checks on dist/ (RENCANA Phase 8): meta lengths, canonical, hreflang, theme-color,
// icons, share tags and images, JSON-LD shape and author order, sitemap and robots, GoatCounter.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { GOATCOUNTER_CODE, SITE_URL } from '../src/config/site.ts';
import { pagePairs } from '../src/lib/routes.ts';
import { urlOf } from './lib/html.mjs';
import { findSeoIssues, jsonLdOf } from './lib/seo.mjs';
import { walk } from './lib/walk.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
if (!existsSync(dist)) {
  console.error('check:seo FAILED: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

let failures = 0;
const fail = (where, message) => {
  console.error(`${where}  ${message}`);
  failures++;
};
const read = (rel) => readFileSync(resolve(dist, rel), 'utf8');

const homes = new Set(['/', '/id/']);
const pages = walk(dist, { skipBinary: false }).filter((f) => f.endsWith('.html'));
for (const file of pages) {
  const url = urlOf(dist, file);
  const html = readFileSync(file, 'utf8');
  const noindex = /<meta\b[^>]*name="robots"[^>]*noindex/i.test(html);
  for (const m of findSeoIssues({ url, html, origin: SITE_URL, isHome: homes.has(url), noindex })) {
    fail(url, m);
  }
  // GoatCounter: exactly one script on every page, or none when the code is empty
  const gc = html.match(/<script\b[^>]*gc\.zgo\.at[^>]*>/gi) ?? [];
  const wantGc = GOATCOUNTER_CODE === '' ? 0 : 1;
  if (gc.length !== wantGc)
    fail(url, `expected ${wantGc} GoatCounter script(s), found ${gc.length}`);
  else if (
    wantGc &&
    !gc[0].includes(`data-goatcounter="https://${GOATCOUNTER_CODE}.goatcounter.com/count"`)
  ) {
    fail(url, 'GoatCounter script has the wrong data-goatcounter endpoint');
  }
}

// the ScholarlyArticle must list the authors in the order of the DOI record
for (const lang of ['en', 'id']) {
  const url = lang === 'en' ? '/' : '/id/';
  const md = readFileSync(resolve(root, 'src/content/papers/awas-guncang.' + lang + '.md'), 'utf8');
  const paper = parse(md.split(/^---$/m)[1]);
  const article = jsonLdOf(read(url === '/' ? 'index.html' : `${url.slice(1)}index.html`)).find(
    (b) => b['@type'] === 'ScholarlyArticle',
  );
  const got = (article?.author ?? []).map((a) => a.name);
  if (JSON.stringify(got) !== JSON.stringify(paper.authors))
    fail(url, 'ScholarlyArticle authors differ from the paper file');
}

// share images: present in dist, 1200x630 PNG, at most 150 KB
for (const lang of ['en', 'id']) {
  const rel = `share/share-${lang}.png`;
  if (!existsSync(resolve(dist, rel))) {
    fail(rel, 'missing');
    continue;
  }
  const buf = readFileSync(resolve(dist, rel));
  const size = statSync(resolve(dist, rel)).size;
  if (buf.readUInt32BE(16) !== 1200 || buf.readUInt32BE(20) !== 630) fail(rel, 'not 1200x630');
  if (size > 150 * 1024) fail(rel, `${size} bytes, limit 153600`);
}
for (const rel of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']) {
  if (!existsSync(resolve(dist, rel))) fail(rel, 'missing');
}

// robots.txt allows everything and names the sitemap; the sitemap lists every page once
const robots = read('robots.txt');
if (!/^User-agent: \*\s*\nAllow: \/\s*$/m.test(robots) || /Disallow/i.test(robots))
  fail('robots.txt', 'must allow all');
if (!robots.includes(`Sitemap: ${new URL('/sitemap-index.xml', SITE_URL).href}`))
  fail('robots.txt', 'no Sitemap line');
const sitemap = read('sitemap-0.xml');
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expected = pagePairs()
  .flat()
  .map((p) => new URL(p, SITE_URL).href);
for (const u of expected) if (!listed.includes(u)) fail('sitemap-0.xml', `missing ${u}`);
if (new Set(listed).size !== listed.length) fail('sitemap-0.xml', 'duplicate <loc>');
if (listed.length !== expected.length)
  fail('sitemap-0.xml', `${listed.length} URLs, expected ${expected.length}`);

if (failures) {
  console.error(`\ncheck:seo FAILED: ${failures} problem(s)`);
  process.exit(1);
}
console.log(`check:seo OK (${pages.length} page(s))`);
