import { describe, expect, it } from 'vitest';
import { findStyleViolations } from '../../scripts/lib/style-rules.mjs';

const count = (css) => findStyleViolations(css).length;

describe('check:style', () => {
  it('flags every gradient form', () => {
    expect(count('a { background: linear-gradient(red, blue); }')).toBe(1);
    expect(count('a { background-image: repeating-radial-gradient(x); }')).toBe(1);
    expect(count('a { mask: conic-gradient(x); }')).toBe(1);
  });

  it('flags backdrop-filter, blur and drop-shadow filters', () => {
    expect(count('a { backdrop-filter: blur(4px); }')).toBe(1);
    expect(count('a { -webkit-backdrop-filter: none; }')).toBe(1);
    expect(count('a { filter: blur(2px); }')).toBe(1);
    expect(count('a { filter: drop-shadow(0 0 2px x); }')).toBe(1);
    expect(count('a { filter: grayscale(1); }')).toBe(0);
  });

  it('allows radius up to 4px and flags anything larger or relative', () => {
    expect(count('a { border-radius: 0; } b { border-radius: 4px; } c { --radius: 2px; }')).toBe(0);
    expect(count('a { border-radius: 0.25rem; } b { border-top-left-radius: 3px 4px; }')).toBe(0);
    expect(count('a { border-radius: var(--radius); }')).toBe(0);
    expect(count('a { border-radius: 5px; }')).toBe(1);
    expect(count('a { border-radius: 50%; }')).toBe(1);
    expect(count('a { border-radius: 9999px; }')).toBe(1);
    expect(count('a { border-radius: 1rem; }')).toBe(1);
    expect(count(':root { --radius-card: 12px; }')).toBe(1);
  });

  it('allows a 1px rule as shadow and nothing heavier', () => {
    expect(count('a { box-shadow: none; } b { box-shadow: 0 1px 0 var(--contour); }')).toBe(0);
    expect(count('a { box-shadow: inset 0 -1px 0 var(--contour); }')).toBe(0);
    expect(count('a { box-shadow: 0 2px 0 var(--ink); }')).toBe(1);
    expect(count('a { box-shadow: 0 1px 3px var(--ink); }')).toBe(1);
    expect(count('a { box-shadow: 0 0 0 4px var(--ink); }')).toBe(1);
    expect(count('a { box-shadow: 0 1px 0 var(--a), 0 8px 24px var(--b); }')).toBe(1);
  });

  it('flags avoid-list fonts and custom cursors', () => {
    expect(count("a { font-family: 'Inter', sans-serif; }")).toBe(1);
    expect(count("a { font: 16px 'Space Grotesk'; }")).toBe(1);
    expect(count("a { font-family: 'Atkinson Hyperlegible Next'; }")).toBe(0);
    expect(count('a { cursor: url(x.png), auto; }')).toBe(1);
    expect(count('a { cursor: pointer; }')).toBe(0);
  });

  it('ignores prose that merely mentions the words', () => {
    expect(count('<p>No gradients and no backdrop-filter here.</p>')).toBe(0);
  });
});
