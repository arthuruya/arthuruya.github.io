import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkContrast,
  contrastRatio,
  parseHex,
  parseThemes,
  relativeLuminance,
} from '../../scripts/lib/contrast.mjs';

describe('contrast math (WCAG 2.x)', () => {
  it('parses short and long hex', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#0B1422')).toEqual([11, 20, 34]);
    expect(() => parseHex('#12345')).toThrow();
    expect(() => parseHex('red')).toThrow();
  });

  it('gives luminance 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000')).toBe(0);
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 10);
  });

  it('uses the linear segment below the 0.04045 knee', () => {
    // #0a0a0a: 10/255 = 0.0392 <= 0.04045, so linear = 0.0392 / 12.92
    expect(relativeLuminance('#0a0a0a')).toBeCloseTo(10 / 255 / 12.92, 10);
  });

  it('matches known reference ratios', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 10);
    expect(contrastRatio('#777', '#777')).toBe(1);
    // Widely quoted reference values (WebAIM contrast checker)
    expect(contrastRatio('#767676', '#fff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#fff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#0000ff', '#fff')).toBeCloseTo(8.59, 2);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#142033', '#efe9d8')).toBe(contrastRatio('#efe9d8', '#142033'));
  });
});

describe('token parsing and pair checks', () => {
  const css = `
    /* comment with #000 and :root */
    :root { color-scheme: light; --paper: #ffffff; --ink: #000; --s-1: 0.25rem; }
    :root[data-theme='night'] { --paper: #000000; --ink: #ffffff; }
  `;

  it('reads day and night colour tokens, ignoring non-colour tokens', () => {
    const t = parseThemes(css);
    expect(t.day).toEqual({ '--paper': '#ffffff', '--ink': '#000' });
    expect(t.night).toEqual({ '--paper': '#000000', '--ink': '#ffffff' });
  });

  it('accepts double-quoted night selector', () => {
    expect(parseThemes(css.replace(`'night'`, '"night"')).night['--paper']).toBe('#000000');
  });

  it('passes good pairs and fails low ones', () => {
    const ok = checkContrast(css, { pairs: [{ fg: '--ink', bg: '--paper', min: 4.5, use: 't' }] });
    expect(ok.errors).toEqual([]);
    expect(ok.results.map((r) => [r.theme, r.pass])).toEqual([
      ['day', true],
      ['night', true],
    ]);

    const low = css.replace('--ink: #ffffff', '--ink: #111111');
    const bad = checkContrast(low, { pairs: [{ fg: '--ink', bg: '--paper', min: 4.5, use: 't' }] });
    expect(bad.results.find((r) => r.theme === 'night')?.pass).toBe(false);
  });

  it('errors on a missing night value, an unknown token, a weak threshold, @-rules', () => {
    const noNight = css.replace('--ink: #ffffff;', '');
    expect(checkContrast(noNight, { pairs: [] }).errors.join('\n')).toMatch(/--ink has no night/);
    const unknown = checkContrast(css, {
      pairs: [{ fg: '--x', bg: '--paper', min: 4.5, use: '' }],
    });
    expect(unknown.errors.join('\n')).toMatch(/unknown token/);
    const weak = checkContrast(css, { pairs: [{ fg: '--ink', bg: '--paper', min: 2, use: '' }] });
    expect(weak.errors.join('\n')).toMatch(/min must be/);
    expect(() => parseThemes(css + '@media (x) { :root { --a: #fff; } }')).toThrow(/flat/);
  });
});

describe('the real tokens', () => {
  const root = resolve(import.meta.dirname, '../..');
  const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');
  const spec = JSON.parse(readFileSync(resolve(root, 'src/styles/pairs.json'), 'utf8'));

  it('pass every declared pair in both themes', () => {
    const { results, errors } = checkContrast(css, spec);
    expect(errors).toEqual([]);
    expect(results.filter((r) => !r.pass)).toEqual([]);
    expect(new Set(results.map((r) => r.theme))).toEqual(new Set(['day', 'night']));
  });
});
