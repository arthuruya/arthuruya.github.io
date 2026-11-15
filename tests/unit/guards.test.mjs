import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findColourViolations } from '../../scripts/lib/colours.mjs';
import { checkSite } from '../../scripts/lib/html.mjs';
import { findSanitizeViolations, parseAllowlist } from '../../scripts/lib/sanitize.mjs';

describe('check:colours', () => {
  it('flags hex, functions and named colours', () => {
    const css = `a { color: #fff; background: rgb(1 2 3); border: 1px solid red; fill: hsl(0 0% 0%); }`;
    expect(findColourViolations(css).length).toBe(4);
  });

  it('flags SVG attributes and canvas styles', () => {
    expect(findColourViolations('<circle fill="#abc" stroke="navy" />').length).toBe(2);
    expect(findColourViolations(`ctx.fillStyle = 'tomato';`).length).toBe(1);
  });

  it('allows tokens, keywords, system colours, anchors and entities', () => {
    const ok = [
      'a { color: var(--ink); border: 1px solid ButtonText; fill: currentColor; background: none; }',
      'a { color: var(--mark-red); }',
      '<a href="#abc">x</a> <a href="#fade">y</a> &#123; url(#glow)',
      `document.querySelector('#add');`,
    ].join('\n');
    expect(findColourViolations(ok)).toEqual([]);
  });

  it('honours the colour-ok escape', () => {
    expect(findColourViolations('a { color: red; } /* colour-ok */')).toEqual([]);
  });
});

describe('check:sanitize', () => {
  it('flags IPs, forbidden words, token assignments, private hosts, ports', () => {
    const text = [
      'host 203.0.113.7',
      'the password is',
      'token=abc',
      'see printer.local',
      'http://example.com:8080/x',
      'mail me at someone@bmkg.go.id',
      'api.bmkg.go.id',
    ].join('\n');
    const lines = new Set(findSanitizeViolations(text).map((v) => v.line));
    expect([...lines].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('lets allowlisted hosts through and nothing else', () => {
    const allow = parseAllowlist('# comment\nmaritim.bmkg.go.id\n');
    expect(findSanitizeViolations('see maritim.bmkg.go.id', allow)).toEqual([]);
    expect(findSanitizeViolations('see other.bmkg.go.id', allow).length).toBe(1);
  });

  it('ignores ordinary version numbers and prose', () => {
    expect(findSanitizeViolations('Zabbix 7.0 LTS, WireGuard, 12M+ downloads, 3.5.x')).toEqual([]);
  });
});

describe('check:html', () => {
  const page = (o = {}) => `<!doctype html><html lang="${o.lang ?? 'en'}"><head>
<title>${o.title ?? 'T'}</title><meta name="description" content="${o.desc ?? 'D'}">
${o.head ?? '<link rel="alternate" hreflang="en" href="/"><link rel="alternate" hreflang="id" href="/id/">'}
</head><body>${o.body ?? '<h1 id="top">Hi</h1>'}</body></html>`;

  const site = (files) => {
    const dir = mkdtempSync(join(tmpdir(), 'dist-'));
    for (const [path, html] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), html);
    }
    return dir;
  };
  const messages = (dir) => checkSite(dir).issues.map((i) => i.message);

  it('passes a valid pair of pages', () => {
    const dir = site({
      'index.html': page({ body: '<h1>Hi</h1><a href="/id/">ID</a><img src="/x.png" alt="">' }),
      'id/index.html': page({ lang: 'id', title: 'T2', desc: 'D2' }),
      'x.png': 'x',
    });
    expect(messages(dir)).toEqual([]);
  });

  it('fails on each broken rule', () => {
    const dir = site({
      'index.html': page({
        lang: 'fr',
        head: '',
        body: '<h1>a</h1><h1>b</h1><img src="/missing.png"><a href="#">x</a><a href="/nope/">y</a><a href="#ghost">z</a>',
      }),
      'id/index.html': page({ lang: 'id' }),
    });
    const m = messages(dir).join('\n');
    expect(m).toMatch(/expected "en"/);
    expect(m).toMatch(/exactly one <h1>/);
    expect(m).toMatch(/<img> without alt/);
    expect(m).toMatch(/dead internal img target/);
    expect(m).toMatch(/empty link target/);
    expect(m).toMatch(/dead internal a target: \/nope\//);
    expect(m).toMatch(/dead fragment: #ghost/);
    expect(m).toMatch(/missing hreflang="en"/);
    expect(m).toMatch(/duplicate title/);
    expect(m).toMatch(/duplicate meta description/);
  });
});
