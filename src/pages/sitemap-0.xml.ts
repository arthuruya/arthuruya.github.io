import type { APIRoute } from 'astro';
import { SITE_URL } from '../config/site.ts';
import { pagePairs } from '../lib/routes.ts';

const abs = (path: string) => new URL(path, SITE_URL).href;

/** Every indexable page once, with its hreflang alternates. 404 is left out. */
export const GET: APIRoute = () => {
  const urls = pagePairs()
    .flatMap(([en, id]) => [en, id].map((loc) => ({ loc, en, id })))
    .map(
      ({ loc, en, id }) =>
        `  <url>\n    <loc>${abs(loc)}</loc>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${abs(en)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="id" href="${abs(id)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(en)}"/>\n  </url>`,
    )
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
