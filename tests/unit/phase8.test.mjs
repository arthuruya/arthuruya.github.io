import { crc32, deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CSP } from '../../src/config/csp.ts';
import { articleLd, personLd } from '../../src/lib/jsonld.ts';
import { readTokens } from '../../src/lib/tokens.ts';
import { faviconSvg } from '../../scripts/lib/brand.mjs';
import { findAssetIssues, findCspIssues } from '../../scripts/lib/csp.mjs';
import { decodePng, encodeIndexed, quantize, toIndexedPng } from '../../scripts/lib/png.mjs';
import { findSeoIssues } from '../../scripts/lib/seo.mjs';

const page = (head, body = '') =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">${head}</head><body>${body}</body></html>`;

describe('CSP policy', () => {
  it('matches the plan and forbids what it should', () => {
    expect(CSP).toContain("default-src 'none'");
    expect(CSP).toContain("script-src 'self' https://gc.zgo.at");
    expect(CSP).toContain("style-src 'self'");
    expect(CSP).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(CSP).not.toContain('frame-ancestors'); // not allowed in a meta policy
  });
});

describe('findCspIssues', () => {
  it('accepts external scripts, the counter and a JSON-LD data block', () => {
    const html = page(
      `<script src="/theme.js"></script><script async data-goatcounter="https://x.goatcounter.com/count" src="https://gc.zgo.at/count.js"></script><script type="application/ld+json">{"a":1}</script><link rel="stylesheet" href="/_astro/a.css">`,
    );
    expect(findCspIssues(html, CSP)).toEqual([]);
  });

  it.each([
    ['inline script body', page('<script>alert(1)</script>'), /inline <script> body/],
    ['style attribute', page('', '<p style="color:red">x</p>'), /style= attribute/],
    ['style element', page('<style>p{}</style>'), /inline <style>/],
    ['event handler', page('', '<button onclick="go()">x</button>'), /onclick= handler/],
    ['javascript url', page('', '<a href="javascript:void(0)">x</a>'), /javascript: URL/],
    [
      'foreign script',
      page('<script src="https://cdn.example.com/a.js"></script>'),
      /outside the policy/,
    ],
    [
      'foreign image',
      page('', '<img src="https://example.com/a.png" alt="">'),
      /outside the policy/,
    ],
    ['wrong policy', page('').replace(CSP, 'default-src *'), /differs from/],
  ])('rejects %s', (_name, html, message) => {
    expect(findCspIssues(html, CSP).join('\n')).toMatch(message);
  });

  it('rejects a missing policy and a policy that comes after a script', () => {
    expect(
      findCspIssues('<html><head><script src="/a.js"></script></head></html>', CSP)[0],
    ).toMatch(/no Content-Security-Policy/);
    const late = `<html><head><script src="/a.js"></script><meta http-equiv="Content-Security-Policy" content="${CSP}"></head></html>`;
    expect(findCspIssues(late, CSP).join()).toMatch(/comes after/);
  });

  it('flags assets that reach another origin or use eval', () => {
    expect(findAssetIssues('@font-face{src:url(https://x.test/f.woff2)}', 'css')).toHaveLength(1);
    expect(findAssetIssues('a{background:url(/fonts/a.woff2)}', 'css')).toEqual([]);
    expect(findAssetIssues('eval("1")', 'js')).toHaveLength(1);
  });
});

const seoPage = ({ title = 'T', desc = 'D', extra = '', ld = [] } = {}) =>
  page(
    `<title>${title}</title><meta name="description" content="${desc}">` +
      `<meta name="theme-color" content="x" media="(prefers-color-scheme: light)"><meta name="theme-color" content="y" media="(prefers-color-scheme: dark)">` +
      `<link rel="icon" href="/favicon.svg"><link rel="apple-touch-icon" href="/a.png">` +
      `<link rel="canonical" href="https://s.test/p/"><link rel="alternate" hreflang="en" href="https://s.test/p/"><link rel="alternate" hreflang="id" href="https://s.test/id/p/"><link rel="alternate" hreflang="x-default" href="https://s.test/p/">` +
      `<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:url" content="https://s.test/p/"><meta property="og:image" content="i"><meta property="og:image:alt" content="a">` +
      `<meta name="twitter:card" content="c"><meta name="twitter:image" content="i"><meta name="twitter:image:alt" content="a">` +
      ld.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('') +
      extra,
  );
const seo = (html, over = {}) =>
  findSeoIssues({
    url: '/p/',
    html,
    origin: 'https://s.test',
    isHome: false,
    noindex: false,
    ...over,
  });

describe('findSeoIssues', () => {
  it('passes a complete page', () => expect(seo(seoPage())).toEqual([]));
  it('limits title and description length', () => {
    expect(seo(seoPage({ title: 'x'.repeat(61) })).join()).toMatch(/title is 61/);
    expect(seo(seoPage({ desc: 'x'.repeat(156) })).join()).toMatch(/description is 156/);
    expect(seo(seoPage({ title: 'x'.repeat(60), desc: 'x'.repeat(155) }))).toEqual([]);
  });
  it('wants the canonical to be the page itself', () => {
    expect(
      seo(
        seoPage().replace(
          'https://s.test/p/"><link rel="alternate" hreflang="en"',
          'https://s.test/q/"><link rel="alternate" hreflang="en"',
        ),
      ).join(),
    ).toMatch(/canonical/);
  });
  it('wants Person and ScholarlyArticle on the home pages only', () => {
    const person = { '@type': 'Person' };
    const article = { '@type': 'ScholarlyArticle' };
    expect(seo(seoPage({ ld: [person, article] }), { isHome: true })).toEqual([]);
    expect(seo(seoPage({ ld: [person] }), { isHome: true }).join()).toMatch(/JSON-LD types/);
    expect(seo(seoPage({ ld: [person] })).join()).toMatch(/JSON-LD types/);
  });
  it('refuses reviews and ratings anywhere in the data', () => {
    const bad = { '@type': 'Person', review: { '@type': 'Review' } };
    expect(
      seo(seoPage({ ld: [bad, { '@type': 'ScholarlyArticle' }] }), { isHome: true }).join(),
    ).toMatch(/contains a Review/);
  });
  it('still checks theme-color and icons on a noindex page', () => {
    expect(seo('<html><head><title>t</title></head></html>', { noindex: true }).join()).toMatch(
      /theme-color/,
    );
  });
});

describe('structured data', () => {
  const person = personLd({
    lang: 'en',
    homePath: '/',
    name: 'N',
    jobTitle: 'Engineer',
    worksFor: 'B',
    alumniOf: 'S',
    sameAs: ['https://a.test'],
  });
  it('builds a plain Person with no email and no rating', () => {
    expect(person['@type']).toBe('Person');
    expect(person.url).toBe('https://arthuruya.github.io/');
    expect(JSON.stringify(person)).not.toMatch(/email|rating|review/i);
  });
  it('keeps the author order of the record', () => {
    const a = articleLd({
      title: 'T',
      authors: ['A', 'B', 'C'],
      venue: 'V',
      published: new Date('2025-12-12'),
      doi: '10.1/x',
      url: 'https://doi.org/10.1/x',
    });
    expect(a.author.map((x) => x.name)).toEqual(['A', 'B', 'C']);
    expect(a.datePublished).toBe('2025-12-12');
    expect(a).not.toHaveProperty('abstract');
  });
});

describe('tokens and favicon', () => {
  it('reads both themes from tokens.css', () => {
    expect(readTokens('day').paper).toMatch(/^#[0-9a-f]{6}$/i);
    expect(readTokens('night').paper).not.toBe(readTokens('day').paper);
  });
  it('draws the favicon only from token values', () => {
    const day = readTokens('day');
    const night = readTokens('night');
    const svg = faviconSvg({ day, night });
    for (const v of [day['paper-2'], day.ink, day['mark-yellow'], night['paper-2']])
      expect(svg).toContain(v);
    expect(svg).toContain('prefers-color-scheme:dark');
  });
});

describe('png', () => {
  /** Truecolour PNG written with node:zlib, so the test needs no browser. */
  const rgbPng = (w, h, pixel) => {
    const raw = Buffer.alloc(h * (w * 3 + 1));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 3 + 1) + 1 + x * 3);
    const chunk = (t, d) => {
      const b = Buffer.concat([Buffer.from(t), d]);
      const o = Buffer.alloc(12 + d.length);
      o.writeUInt32BE(d.length, 0);
      b.copy(o, 4);
      o.writeUInt32BE(crc32(b) >>> 0, 8 + d.length);
      return o;
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr.set([8, 2, 0, 0, 0], 8);
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  };
  const px = (x, y) => [((x * 7) % 4) * 60, ((y * 5) % 3) * 90, ((x + y) % 2) * 120];

  it('keeps every pixel when the image has at most 256 colours', () => {
    const before = decodePng(rgbPng(40, 30, px));
    const { palette, index } = quantize(before);
    expect(palette.length).toBeLessThanOrEqual(256);
    for (let i = 0; i < before.width * before.height; i++) {
      const k = palette[index[i]];
      expect([k >> 16, (k >> 8) & 255, k & 255]).toEqual([
        before.rgb[i * 3],
        before.rgb[i * 3 + 1],
        before.rgb[i * 3 + 2],
      ]);
    }
  });

  it('writes a valid indexed PNG header', () => {
    const out = toIndexedPng(rgbPng(16, 16, px));
    expect(out.subarray(1, 4).toString()).toBe('PNG');
    expect(out.readUInt32BE(16)).toBe(16);
    expect(out[25]).toBe(3); // colour type 3: indexed
    expect(encodeIndexed).toBeTypeOf('function');
  });
});
