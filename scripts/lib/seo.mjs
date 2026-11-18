// Per-page SEO and share checks on built HTML (RENCANA Phase 8, items 1 to 5).

export const TITLE_MAX = 60;
export const DESC_MAX = 155;

const attrOf = (tag, name) => {
  const m = tag.match(new RegExp(`(?:^|[\\s"'/])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  const v = m ? (m[1] ?? m[2]) : null;
  return v === null
    ? null
    : v
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
};
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
const meta = (html, key, value) =>
  tags(html, 'meta').filter((t) => attrOf(t, key)?.toLowerCase() === value);

/** JSON-LD blocks of a page, parsed. */
export function jsonLdOf(html) {
  return [
    ...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => JSON.parse(m[1]));
}

const FORBIDDEN_TYPES = new Set(['Review', 'AggregateRating', 'Rating', 'Offer', 'Product']);

function* typesOf(node) {
  if (Array.isArray(node)) for (const n of node) yield* typesOf(n);
  else if (node && typeof node === 'object') {
    if (node['@type']) yield* [].concat(node['@type']);
    for (const v of Object.values(node)) yield* typesOf(v);
  }
}

/**
 * @param {{ url: string, html: string, origin: string, isHome: boolean, noindex: boolean }} page
 * @returns {string[]}
 */
export function findSeoIssues({ url, html, origin, isHome, noindex }) {
  const issues = [];
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
  const desc = attrOf(meta(html, 'name', 'description')[0] ?? '', 'content') ?? '';
  if (title.length > TITLE_MAX) issues.push(`title is ${title.length} chars, limit ${TITLE_MAX}`);
  if (desc.length > DESC_MAX) issues.push(`description is ${desc.length} chars, limit ${DESC_MAX}`);

  const themes = meta(html, 'name', 'theme-color');
  const media = themes.map((t) => attrOf(t, 'media'));
  if (
    themes.length !== 2 ||
    !media.includes('(prefers-color-scheme: light)') ||
    !media.includes('(prefers-color-scheme: dark)')
  ) {
    issues.push('expected two theme-color metas (light and dark)');
  }
  for (const rel of ['icon', 'apple-touch-icon']) {
    if (!tags(html, 'link').some((t) => attrOf(t, 'rel') === rel))
      issues.push(`no <link rel="${rel}">`);
  }

  if (noindex) return issues;

  const links = tags(html, 'link');
  const canonical = links.filter((t) => attrOf(t, 'rel') === 'canonical');
  if (canonical.length !== 1) issues.push(`expected one canonical, found ${canonical.length}`);
  else if (attrOf(canonical[0], 'href') !== new URL(url, origin).href) {
    issues.push(`canonical ${attrOf(canonical[0], 'href')} is not this page's own URL`);
  }
  const langs = links
    .filter((t) => attrOf(t, 'rel') === 'alternate')
    .map((t) => attrOf(t, 'hreflang'));
  for (const need of ['en', 'id', 'x-default']) {
    if (!langs.includes(need)) issues.push(`missing hreflang="${need}"`);
  }

  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
    if (!meta(html, 'property', prop).length) issues.push(`missing ${prop}`);
  }
  for (const name of ['twitter:card', 'twitter:image', 'twitter:image:alt']) {
    if (!meta(html, 'name', name).length) issues.push(`missing ${name}`);
  }
  const ogUrl = attrOf(meta(html, 'property', 'og:url')[0] ?? '', 'content');
  if (ogUrl && ogUrl !== new URL(url, origin).href)
    issues.push(`og:url ${ogUrl} is not this page's URL`);

  const ld = (() => {
    try {
      return jsonLdOf(html);
    } catch (e) {
      issues.push(`JSON-LD does not parse: ${e.message}`);
      return [];
    }
  })();
  const kinds = ld.map((b) => b['@type']);
  const want = isHome ? ['Person', 'ScholarlyArticle'] : [];
  if (kinds.length !== want.length || want.some((w) => !kinds.includes(w))) {
    issues.push(`JSON-LD types are [${kinds}], expected [${want}]`);
  }
  for (const t of typesOf(ld)) if (FORBIDDEN_TYPES.has(t)) issues.push(`JSON-LD contains a ${t}`);
  return issues;
}
