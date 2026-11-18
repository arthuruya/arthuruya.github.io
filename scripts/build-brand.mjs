// Builds the favicon set and the two share images from tokens.css and the static chart.
//   node scripts/build-brand.mjs          write public/favicon.svg, favicon-32.png,
//                                         apple-touch-icon.png and public/share/share-{en,id}.png
//   node scripts/build-brand.mjs --check  only verify that favicon.svg still matches tokens.css
// The PNGs are rendered by Playwright's Chromium (already a dev dependency). Run it after a
// change to tokens.css, the chart, or the share strings, then commit the files it wrote.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { SITE_URL } from '../src/config/site.ts';
import { pathData } from '../src/lib/contours.ts';
import { makeView } from '../src/lib/drift/projection.ts';
import { MARKER_PAD } from '../src/lib/drift/config.ts';
import { MAKASSAR_STRAIT, UNTIA } from '../src/lib/markers.ts';
import { readTokens } from '../src/lib/tokens.ts';
import { faviconSvg, shareHtml } from './lib/brand.mjs';
import { toIndexedPng } from './lib/png.mjs';

const root = resolve(import.meta.dirname, '..');
const tokens = { day: readTokens('day', root), night: readTokens('night', root) };
const SHARE_LIMIT = 150 * 1024;

const favicon = faviconSvg(tokens);
const faviconPath = resolve(root, 'public/favicon.svg');

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(faviconPath, 'utf8');
  } catch {
    // reported below
  }
  if (current !== favicon) {
    console.error(
      'check:brand FAILED: public/favicon.svg is missing or out of date with tokens.css.',
    );
    console.error('Run `node scripts/build-brand.mjs` and commit the result.');
    process.exit(1);
  }
  console.log('check:brand OK');
  process.exit(0);
}

const frontmatter = (lang) => {
  const text = readFileSync(resolve(root, `src/content/site/site.${lang}.md`), 'utf8');
  return parse(text.split(/^---$/m)[1]);
};
const dictionary = async (lang) => (await import(`../src/i18n/${lang}.ts`))[lang];

/** The static hero chart, projected into the share image's chart panel (same projection). */
function chartFor(hero, width, height) {
  const file = JSON.parse(readFileSync(resolve(root, 'src/assets/chart.json'), 'utf8'));
  const view = makeView(
    { lon0: 116, lon1: 123, lat0: -8, lat1: 2 },
    [MAKASSAR_STRAIT, UNTIA],
    width,
    height,
    MARKER_PAD,
  );
  const project = (rings) =>
    rings.map((r) =>
      r.map(([lon, lat]) => {
        const p = view.toPx(lon, lat);
        return [p.x, p.y];
      }),
    );
  const paths = [
    ...Object.values(file.depth).map((rings) => ({ d: pathData(project(rings)), major: false })),
    { d: pathData(project(file.land)), major: true },
  ];
  const at = (m) => view.toPx(m.lon, m.lat);
  return {
    width,
    height,
    paths,
    markers: [
      { ...at(MAKASSAR_STRAIT), label: hero.markerStrait },
      { ...at(UNTIA), label: hero.markerUntia },
    ],
  };
}

const { chromium } = await import('@playwright/test');
const work = mkdtempSync(join(tmpdir(), 'brand-'));
const browser = await chromium.launch();
try {
  writeFileSync(faviconPath, favicon);

  // favicon PNGs: the day variant, drawn straight at the target size
  for (const [file, size, radius] of [
    ['favicon-32.png', 32, 4],
    ['apple-touch-icon.png', 180, 0],
  ]) {
    const svgFile = join(work, `${file}.svg`);
    writeFileSync(
      svgFile,
      faviconSvg({ ...tokens, radius }).replace(
        'width="32" height="32"',
        `width="${size}" height="${size}"`,
      ),
    );
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      colorScheme: 'light',
    });
    await page.goto(pathToFileURL(svgFile).href);
    await page.screenshot({ path: resolve(root, 'public', file) });
    await page.close();
  }

  mkdirSync(resolve(root, 'public/share'), { recursive: true });
  const host = new URL(SITE_URL).host;
  const fontsBase = pathToFileURL(resolve(root, 'public/fonts')).href;
  for (const lang of ['en', 'id']) {
    const site = frontmatter(lang);
    const dict = await dictionary(lang);
    const html = shareHtml({
      tokens: tokens.day,
      fontsBase,
      lang,
      name: site.name,
      line: site.meta.shareLine,
      host,
      chart: chartFor(dict.hero, 504, 630),
    });
    const htmlFile = join(work, `share-${lang}.html`);
    writeFileSync(htmlFile, html);
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(pathToFileURL(htmlFile).href);
    await page.evaluate('document.fonts.ready');
    const out = resolve(root, `public/share/share-${lang}.png`);
    writeFileSync(out, toIndexedPng(await page.screenshot()));
    await page.close();
    const size = statSync(out).size;
    console.log(`share-${lang}.png ${(size / 1024).toFixed(1)} KB`);
    if (size > SHARE_LIMIT) {
      console.error(`share-${lang}.png is over the ${SHARE_LIMIT / 1024} KB limit`);
      process.exitCode = 1;
    }
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
