import { lineOf } from './walk.mjs';

// Anti-slop style rules (RENCANA Phase 1, PLAN.md "Avoid"):
//   no gradients, no backdrop-filter, no shadow heavier than a 1 px rule,
//   no border radius above 4 px, no Inter / Space Grotesk, no custom cursor,
//   no blur or drop-shadow filters (the glassmorphism toolkit).
// Deliberately no escape comment: change the rule here, with a reason, or not at all.

const MAX_RADIUS_PX = 4;
const MAX_SHADOW_PX = 1;
const REM_PX = 16;

const GRADIENT = /(?<![\w-])(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/gi;
const BACKDROP = /(?<![\w-])(?:-webkit-)?backdrop-filter\s*:/gi;
const RADIUS =
  /(?<![\w-])(border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius|--radius[\w-]*)\s*:\s*([^;}{]*)/gi;
const SHADOW = /(?<![\w-])(box-shadow|--shadow[\w-]*)\s*:\s*([^;}{]*)/gi;
const FILTER = /(?<![\w-])filter\s*:\s*([^;}{]*)/gi;
const FONT = /(?<![\w-])(font(?:-family)?|--font[\w-]*)\s*:\s*([^;}{]*)/gi;
const CURSOR = /(?<![\w-])cursor\s*:\s*[^;}{]*url\(/gi;

/** Lengths in a CSS value, in px. Returns null for a unit we cannot judge (e.g. %). */
function lengthsPx(value) {
  const cleaned = value.replace(/var\([^)]*\)/gi, ' ').replace(/calc\([^)]*\)/gi, ' CALC ');
  if (/CALC/.test(cleaned)) return null;
  const out = [];
  for (const m of cleaned.matchAll(/(-?\d*\.?\d+)(px|rem|em|%|vw|vh|vmin|vmax|ch)?(?![\w-])/gi)) {
    const n = parseFloat(m[1]);
    const unit = (m[2] ?? '').toLowerCase();
    if (unit === 'px' || (unit === '' && n === 0)) out.push(n);
    else if (unit === 'rem' || unit === 'em') out.push(n * REM_PX);
    else if (n === 0) out.push(0);
    else return null;
  }
  return out;
}

/**
 * Find anti-slop style violations in CSS (or an .astro file's text).
 * Returns [{ line, message }].
 */
export function findStyleViolations(text) {
  const hits = [];
  const add = (index, message) => hits.push({ line: lineOf(text, index), message });

  for (const m of text.matchAll(GRADIENT)) add(m.index, `gradient: ${m[0].replace(/\s*\($/, '')}`);
  for (const m of text.matchAll(BACKDROP)) add(m.index, 'backdrop-filter');

  for (const m of text.matchAll(RADIUS)) {
    const lengths = lengthsPx(m[2]);
    if (lengths === null) add(m.index, `${m[1]}: "${m[2].trim()}" (use px/rem <= 4px)`);
    else if (lengths.some((v) => Math.abs(v) > MAX_RADIUS_PX))
      add(m.index, `${m[1]} above ${MAX_RADIUS_PX}px: "${m[2].trim()}"`);
  }

  for (const m of text.matchAll(SHADOW)) {
    const value = m[2].trim();
    if (/^(none|initial|unset|inherit|revert)$/i.test(value) || /^var\([^)]*\)$/i.test(value))
      continue;
    for (const shadow of value.split(/,(?![^(]*\))/)) {
      const lengths = lengthsPx(shadow);
      const blur = lengths?.[2] ?? 0;
      const spread = lengths?.[3] ?? 0;
      if (
        lengths === null ||
        blur !== 0 ||
        spread !== 0 ||
        lengths.some((v) => Math.abs(v) > MAX_SHADOW_PX)
      ) {
        add(m.index, `${m[1]} heavier than a ${MAX_SHADOW_PX}px rule: "${shadow.trim()}"`);
      }
    }
  }

  for (const m of text.matchAll(FILTER)) {
    if (/drop-shadow\(|blur\(/i.test(m[1])) add(m.index, `filter: "${m[1].trim()}"`);
  }
  for (const m of text.matchAll(FONT)) {
    const f = m[2].match(/\b(Inter|Space Grotesk)\b/i);
    if (f) add(m.index, `font ${f[1]} is on the avoid list`);
  }
  for (const m of text.matchAll(CURSOR)) add(m.index, 'custom cursor');

  return hits;
}
