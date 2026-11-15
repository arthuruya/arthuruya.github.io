import { lineOf } from './walk.mjs';

/** CSS named colours (not system colours such as ButtonText, which are allowed). */
const NAMED = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue
darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange
darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise
darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia
gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo
ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue
lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon
mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen
paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red
rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue
slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
whitesmoke yellow yellowgreen`.split(/\s+/),
);

const COLOUR_FN = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/gi;

// Hex only counts when it starts a value: not an anchor (href="#abc"), not a URL
// fragment, not an HTML entity (&#123;), not a selector in querySelector('#abc').
const HEX =
  /(?<![^\s:(,"'=;|])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z_-])/gi;
const HEX_EXEMPT_BEFORE =
  /(?:href|aria-controls|aria-labelledby|aria-describedby|for)\s*=\s*["']$|url\(\s*["']?$|(?:querySelector|querySelectorAll|closest|matches)\(\s*["'`]$/i;

const CSS_PROP =
  /(?<![\w-])(color|background(?:-color)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|stop-color|flood-color|lighting-color|caret-color|accent-color|column-rule(?:-color)?|text-decoration(?:-color)?|text-emphasis(?:-color)?|box-shadow|text-shadow|scrollbar-color|-webkit-text-fill-color|-webkit-tap-highlight-color)\s*:\s*([^;}{]*)/gi;

const ATTR =
  /(?<![\w-])(fill|stroke|stop-color|flood-color|lighting-color|color|bgcolor|bordercolor)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

const JS_PROP =
  /(?<![\w-])(fillStyle|strokeStyle|shadowColor|backgroundColor|borderColor|outlineColor)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

function namedIn(value) {
  const cleaned = value
    .replace(/var\([^)]*\)/gi, ' ')
    .replace(/url\([^)]*\)/gi, ' ')
    .replace(/(["'])[^"']*\1/g, ' ');
  return cleaned
    .split(/[^a-zA-Z-]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => NAMED.has(w));
}

/**
 * Find colour literals in `text`. Returns [{ line, message }].
 * A line containing `colour-ok` is exempt (for rare false positives).
 */
export function findColourViolations(text) {
  const hits = [];
  const add = (index, message) => hits.push({ line: lineOf(text, index), message });

  for (const m of text.matchAll(COLOUR_FN)) add(m.index, `colour function ${m[1]}()`);

  for (const m of text.matchAll(HEX)) {
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    if (HEX_EXEMPT_BEFORE.test(before)) continue;
    add(m.index, `hex colour ${m[0]}`);
  }

  for (const m of text.matchAll(CSS_PROP)) {
    for (const w of namedIn(m[2])) add(m.index, `named colour "${w}" in ${m[1]}`);
  }
  for (const m of text.matchAll(ATTR)) {
    for (const w of namedIn(m[2] ?? m[3] ?? '')) add(m.index, `named colour "${w}" in ${m[1]}=`);
  }
  for (const m of text.matchAll(JS_PROP)) {
    for (const w of namedIn(m[2] ?? m[3] ?? m[4] ?? ''))
      add(m.index, `named colour "${w}" in ${m[1]}`);
  }

  const lines = text.split('\n');
  return hits.filter((h) => !lines[h.line - 1].includes('colour-ok'));
}
