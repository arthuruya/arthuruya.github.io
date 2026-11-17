// WCAG 2.x contrast for the colour tokens in src/styles/tokens.css.
// No dependencies; used by scripts/check-contrast.mjs and the design page.

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parse `#rgb` or `#rrggbb` into [r, g, b] (0-255).
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function parseHex(hex) {
  if (!HEX.test(hex)) throw new Error(`not a #rgb or #rrggbb colour: ${hex}`);
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB channel (0-255) to linear light, per WCAG 2.x. */
const linear = (/** @type {number} */ c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/**
 * WCAG relative luminance of a hex colour (0 = black, 1 = white).
 * @param {string} hex
 */
export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two hex colours, 1 to 21. Order does not matter.
 * @param {string} a
 * @param {string} b
 */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Normalise a selector for comparison: drop whitespace and quotes. */
const norm = (/** @type {string} */ s) => s.replace(/\s+/g, '').replace(/["']/g, '');

/**
 * Read the day and night colour tokens from the text of tokens.css.
 * Day = the `:root` block. Night = day overridden by `:root[data-theme=night]`.
 * Only hex-valued custom properties count as colour tokens.
 * @param {string} css
 * @returns {{ day: Record<string, string>, night: Record<string, string>, nightOverrides: Record<string, string> }}
 */
export function parseThemes(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@[a-z-]+/i.test(text)) {
    throw new Error('tokens.css must stay flat (no @-rules); put responsive overrides in base.css');
  }
  /** @type {Record<string, string> | null} */
  let day = null;
  /** @type {Record<string, string> | null} */
  let night = null;
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map(norm);
    /** @type {Record<string, string>} */
    const colours = {};
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const value = d[2].trim();
      if (HEX.test(value)) colours[d[1]] = value.toLowerCase();
    }
    if (selectors.includes(':root')) day = { ...(day ?? {}), ...colours };
    if (selectors.includes(':root[data-theme=night]')) night = { ...(night ?? {}), ...colours };
  }
  if (!day) throw new Error('tokens.css has no :root block');
  if (!night) throw new Error("tokens.css has no :root[data-theme='night'] block");
  return { day, night: { ...day, ...night }, nightOverrides: night };
}

/**
 * @typedef {{ fg: string, bg: string, min: number, use: string }} Pair
 * @typedef {{ theme: string, fg: string, bg: string, fgValue: string, bgValue: string, ratio: number, min: number, use: string, pass: boolean }} PairResult
 */

/**
 * Check every pair in both themes. Also fails when a day colour token has no night
 * override (night would silently reuse a day colour) or a pair names an unknown token.
 * @param {string} css text of tokens.css
 * @param {{ pairs: Pair[] }} spec contents of pairs.json
 * @returns {{ results: PairResult[], errors: string[] }}
 */
export function checkContrast(css, spec) {
  const { day, night, nightOverrides } = parseThemes(css);
  /** @type {string[]} */
  const errors = [];
  for (const name of Object.keys(day)) {
    if (!(name in nightOverrides)) errors.push(`${name} has no night value`);
  }
  if (!Array.isArray(spec.pairs) || spec.pairs.length === 0) errors.push('pairs.json has no pairs');

  /** @type {PairResult[]} */
  const results = [];
  for (const [theme, tokens] of /** @type {const} */ ([
    ['day', day],
    ['night', night],
  ])) {
    for (const p of spec.pairs ?? []) {
      const fgValue = tokens[p.fg];
      const bgValue = tokens[p.bg];
      if (!fgValue || !bgValue) {
        errors.push(`${theme}: unknown token in pair ${p.fg} on ${p.bg}`);
        continue;
      }
      if (typeof p.min !== 'number' || p.min < 3) {
        errors.push(`pair ${p.fg} on ${p.bg}: min must be a number >= 3`);
        continue;
      }
      const ratio = contrastRatio(fgValue, bgValue);
      results.push({ theme, ...p, fgValue, bgValue, ratio, pass: ratio >= p.min });
    }
  }
  return { results, errors };
}
