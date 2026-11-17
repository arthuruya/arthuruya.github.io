import type { APIRoute } from 'astro';
import { SITE_URL } from '../config/site.ts';

/** The index points at the one sitemap file. No dependency: the site has seven pages. */
export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${new URL('/sitemap-0.xml', SITE_URL).href}</loc></sitemap>\n</sitemapindex>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
