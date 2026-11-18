// Pure builders for the favicon and the share image. No file or browser access here, so
// `check:brand` and the unit tests can call them. Colours arrive as arguments (read from
// src/styles/tokens.css by the caller); this file holds no colour literal.

/** The nav-buoy: a lit marker ring above two lines of swell, on the raised surface. */
export function faviconSvg({ day, night, radius = 4 }) {
  const rules = (t) =>
    `.bg{fill:${t['paper-2']}}.wave{fill:none;stroke:${t['ink-2']};stroke-width:1.5;stroke-linecap:round}` +
    `.buoy{fill:${t['mark-yellow']};stroke:${t.ink};stroke-width:2.5}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">\n` +
    `<style>${rules(day)}@media (prefers-color-scheme:dark){${rules(night)}}</style>\n` +
    `<rect class="bg" width="32" height="32" rx="${radius}"/>\n` +
    `<path class="wave" d="M3 22q6.5-4 13 0t13 0"/>\n` +
    `<path class="wave" d="M3 27.5q6.5-4 13 0t13 0"/>\n` +
    `<circle class="buoy" cx="16" cy="12.5" r="6.5"/>\n` +
    `</svg>\n`
  );
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * The 1200x630 share image as an HTML page (rendered by Playwright). The chart is the
 * static base map only, never the Snapshot (RENCANA Phase 8, item 3).
 * `chart` is { paths: [{ d, major }], markers: [{ x, y, label }], width, height }.
 */
export function shareHtml({ tokens: t, fontsBase, lang, name, line, host, chart }) {
  const paths = chart.paths
    .map((p) => `<path${p.major ? ' class="major"' : ''} d="${p.d}"/>`)
    .join('');
  const markers = chart.markers
    .map(
      (m) =>
        `<circle class="pin" cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="9"/>` +
        `<text x="${(m.x + 20).toFixed(1)}" y="${(m.y + 8).toFixed(1)}">${esc(m.label)}</text>`,
    )
    .join('');
  return `<!doctype html>
<html lang="${lang}"><meta charset="utf-8"><title>share</title>
<style>
@font-face{font-family:'Atkinson Hyperlegible Next';src:url('${fontsBase}/atkinson-hyperlegible-next-var.woff2');font-weight:400 700}
@font-face{font-family:'Newsreader';src:url('${fontsBase}/newsreader-var.woff2');font-weight:400 700}
@font-face{font-family:'IBM Plex Mono';src:url('${fontsBase}/ibm-plex-mono-var.woff2');font-weight:400 600}
*{box-sizing:border-box}
html,body{margin:0}
body{position:relative;width:1200px;height:630px;overflow:hidden;background:${t.paper};color:${t.ink};font-family:'Atkinson Hyperlegible Next',sans-serif}
.copy{position:absolute;inset:0 auto 0 72px;width:540px;display:flex;flex-direction:column;justify-content:center;gap:30px}
.key{width:96px;height:6px;background:${t['mark-yellow']}}
h1{margin:0;font:500 84px/1.04 'Newsreader',serif;letter-spacing:-0.01em;font-optical-sizing:auto;text-wrap:balance}
.line{margin:0;font-size:32px;line-height:1.35;color:${t['ink-2']}}
.host{font:500 26px 'IBM Plex Mono',monospace;color:${t['ink-2']}}
.chart{position:absolute;inset:0 0 0 auto;width:${chart.width}px;height:${chart.height}px;background:${t['paper-2']};border-left:1px solid ${t.contour}}
.chart svg{display:block;width:100%;height:100%}
.contours{fill:none;stroke:${t.contour};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.contours .major{stroke:${t['ink-2']};stroke-width:2.2;opacity:.55}
.pin{fill:${t['mark-yellow']};stroke:${t.ink};stroke-width:2.5}
text{font:500 22px 'IBM Plex Mono',monospace;fill:${t.ink};paint-order:stroke;stroke:${t['paper-2']};stroke-width:6px}
</style>
<body>
<div class="copy"><div class="key"></div><h1>${esc(name)}</h1><p class="line">${esc(line)}</p><div class="host">${esc(host)}</div></div>
<div class="chart"><svg viewBox="0 0 ${chart.width} ${chart.height}" aria-hidden="true"><g class="contours">${paths}</g>${markers}</svg></div>
</body></html>
`;
}
