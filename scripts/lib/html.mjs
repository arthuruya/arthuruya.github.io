import { existsSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { walk } from './walk.mjs';

/** `dist/id/index.html` -> `/id/`; `dist/404.html` -> `/404.html`. */
export function urlOf(distDir, file) {
  const rel = relative(distDir, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`(?:^|[\\s"'/])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
};

const tagsOf = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];

const hasId = (html, id) => new RegExp(`\\s(?:id|name)\\s*=\\s*(?:"${id}"|'${id}')`).test(html);

/** Resolve an internal href against a page URL to a dist file, or null if it points outside. */
function resolveTarget(distDir, pageUrl, href) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return { external: true };
  const [pathAndQuery, fragment = ''] = href.split('#');
  const path = pathAndQuery.split('?')[0];
  let abs;
  if (path === '') abs = pageUrl;
  else if (path.startsWith('/')) abs = path;
  else abs = posix.join(pageUrl.endsWith('/') ? pageUrl : posix.dirname(pageUrl) + '/', path);
  const base = join(distDir, abs);
  const candidates = abs.endsWith('/')
    ? [join(base, 'index.html')]
    : [base, join(base, 'index.html')];
  const file = candidates.find((c) => existsSync(c));
  return { external: false, abs, file, fragment };
}

/**
 * Check one built page. `pages` maps URL -> html for cross-page fragment checks.
 * Returns [message].
 */
export function checkPage({ distDir, url, html, pages = new Map() }) {
  const issues = [];
  const bad = (m) => issues.push(m);

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const lang = attr(htmlTag, 'lang');
  const expected = url.startsWith('/id/') ? 'id' : 'en';
  if (!lang) bad('missing <html lang>');
  else if (lang !== expected) bad(`<html lang="${lang}"> but expected "${expected}" for ${url}`);

  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) bad(`expected exactly one <h1>, found ${h1}`);

  for (const tag of tagsOf(html, 'img')) {
    if (attr(tag, 'alt') === null) bad(`<img> without alt: ${tag.slice(0, 80)}`);
  }

  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  if (!title) bad('missing or empty <title>');
  const desc = tagsOf(html, 'meta').find((t) => attr(t, 'name')?.toLowerCase() === 'description');
  if (!desc || !attr(desc, 'content')?.trim()) bad('missing or empty meta description');

  const robots = tagsOf(html, 'meta').find((t) => attr(t, 'name')?.toLowerCase() === 'robots');
  const noindex = /noindex/i.test(robots ? (attr(robots, 'content') ?? '') : '');
  if (url !== '/404.html' && !noindex) {
    const langs = new Set(
      tagsOf(html, 'link')
        .filter((t) => attr(t, 'rel')?.toLowerCase() === 'alternate' && attr(t, 'hreflang'))
        .map((t) => attr(t, 'hreflang').toLowerCase()),
    );
    for (const need of ['en', 'id']) if (!langs.has(need)) bad(`missing hreflang="${need}" link`);
  }

  const refs = [
    ...tagsOf(html, 'a').map((t) => ['a', attr(t, 'href'), t]),
    ...tagsOf(html, 'link')
      .filter((t) => !['alternate', 'canonical'].includes(attr(t, 'rel')?.toLowerCase() ?? ''))
      .map((t) => ['link', attr(t, 'href'), t]),
    ...tagsOf(html, 'script').map((t) => ['script', attr(t, 'src'), t]),
    ...tagsOf(html, 'img').map((t) => ['img', attr(t, 'src'), t]),
  ];
  for (const [kind, ref, tag] of refs) {
    if (ref === null) continue;
    if (kind === 'a' && (ref === '#' || ref.trim() === '')) {
      bad(`empty link target: ${tag.slice(0, 80)}`);
      continue;
    }
    if (/^(?:mailto|tel|javascript|data):/i.test(ref)) continue;
    const t = resolveTarget(distDir, url, ref);
    if (t.external) continue;
    if (!t.file) {
      bad(`dead internal ${kind} target: ${ref}`);
      continue;
    }
    if (kind === 'a' && t.fragment && t.file.endsWith('.html')) {
      const targetHtml = t.abs === url ? html : (pages.get(t.abs) ?? readFileSync(t.file, 'utf8'));
      if (!hasId(targetHtml, t.fragment)) bad(`dead fragment: ${ref}`);
    }
  }
  return issues;
}

/** Check every page in `distDir`. Returns { pages: [url], issues: [{ url, message }] }. */
export function checkSite(distDir) {
  const files = walk(distDir, { skipBinary: false }).filter((f) => f.endsWith('.html'));
  const pages = new Map(files.map((f) => [urlOf(distDir, f), readFileSync(f, 'utf8')]));
  const issues = [];
  const titles = new Map();
  const descs = new Map();

  for (const [url, html] of pages) {
    for (const message of checkPage({ distDir, url, html, pages })) issues.push({ url, message });
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const desc = tagsOf(html, 'meta').find((t) => attr(t, 'name')?.toLowerCase() === 'description');
    const d = desc ? attr(desc, 'content')?.trim() : null;
    if (title) titles.set(title, [...(titles.get(title) ?? []), url]);
    if (d) descs.set(d, [...(descs.get(d) ?? []), url]);
  }
  for (const [what, map] of [
    ['title', titles],
    ['meta description', descs],
  ]) {
    for (const [value, urls] of map) {
      if (urls.length > 1) {
        issues.push({
          url: urls.join(', '),
          message: `duplicate ${what}: "${value.slice(0, 60)}"`,
        });
      }
    }
  }
  return { pages: [...pages.keys()], issues };
}
