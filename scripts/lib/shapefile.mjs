// Minimal reader for ESRI shapefile polygons plus the small geometry steps the chart build
// needs (RENCANA 4.2). No dependency: Natural Earth ships plain Polygon (type 5) files.

/** @typedef {[number, number]} Pt */

/**
 * Read every ring of every polygon record of a .shp buffer, in lon/lat.
 * @param {Uint8Array} bytes
 * @returns {Pt[][]} rings (closed: last point equals the first)
 */
export function readPolygonRings(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getInt32(0, false) !== 9994) throw new Error('not a shapefile (bad file code)');
  const type = dv.getInt32(32, true);
  if (type !== 5) throw new Error(`expected Polygon shapes (type 5), got ${type}`);
  const rings = [];
  let off = 100;
  while (off + 8 <= bytes.byteLength) {
    const words = dv.getInt32(off + 4, false);
    const start = off + 8;
    off = start + words * 2;
    const shape = dv.getInt32(start, true);
    if (shape === 0) continue; // null shape
    const nParts = dv.getInt32(start + 36, true);
    const nPts = dv.getInt32(start + 40, true);
    const partsAt = start + 44;
    const ptsAt = partsAt + nParts * 4;
    for (let p = 0; p < nParts; p++) {
      const a = dv.getInt32(partsAt + p * 4, true);
      const b = p + 1 < nParts ? dv.getInt32(partsAt + (p + 1) * 4, true) : nPts;
      const ring = [];
      for (let i = a; i < b; i++) {
        ring.push([dv.getFloat64(ptsAt + i * 16, true), dv.getFloat64(ptsAt + i * 16 + 8, true)]);
      }
      rings.push(ring);
    }
  }
  return rings;
}

/**
 * Sutherland-Hodgman clip of one ring to a lon/lat box.
 * @param {Pt[]} ring
 * @param {{lon0:number,lon1:number,lat0:number,lat1:number}} box
 * @returns {Pt[]} closed ring, or [] when nothing is left
 */
export function clipRing(ring, box) {
  const edges = [
    { inside: (p) => p[0] >= box.lon0, cut: (a, b) => lerpAt(a, b, 0, box.lon0) },
    { inside: (p) => p[0] <= box.lon1, cut: (a, b) => lerpAt(a, b, 0, box.lon1) },
    { inside: (p) => p[1] >= box.lat0, cut: (a, b) => lerpAt(a, b, 1, box.lat0) },
    { inside: (p) => p[1] <= box.lat1, cut: (a, b) => lerpAt(a, b, 1, box.lat1) },
  ];
  let pts = ring.slice(0, -1);
  for (const e of edges) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      if (e.inside(cur)) {
        if (!e.inside(prev)) out.push(e.cut(prev, cur));
        out.push(cur);
      } else if (e.inside(prev)) {
        out.push(e.cut(prev, cur));
      }
    }
    pts = out;
    if (pts.length === 0) return [];
  }
  return pts.length < 3 ? [] : [...pts, pts[0]];
}

function lerpAt(a, b, axis, value) {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return axis === 0 ? [value, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), value];
}

/**
 * Douglas-Peucker on a closed ring (kept closed, at least 4 points or dropped).
 * @param {Pt[]} ring
 * @param {number} tol degrees
 * @returns {Pt[]}
 */
export function simplifyRing(ring, tol) {
  const pts = ring.slice(0, -1);
  if (pts.length < 4) return [];
  // split at the two points farthest apart so the ring has no privileged start
  let far = 1;
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const a = dp(pts.slice(0, far + 1), tol);
  const b = dp([...pts.slice(far), pts[0]], tol);
  const out = [...a.slice(0, -1), ...b];
  return out.length < 4 ? [] : out;
}

function dp(line, tol) {
  if (line.length < 3) return line;
  const [ax, ay] = line[0];
  const [bx, by] = line[line.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  let idx = -1;
  let max = 0;
  for (let i = 1; i < line.length - 1; i++) {
    const [px, py] = line[i];
    const d =
      len === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [line[0], line[line.length - 1]];
  const left = dp(line.slice(0, idx + 1), tol);
  const right = dp(line.slice(idx), tol);
  return [...left.slice(0, -1), ...right];
}

export const roundRing = (ring, digits = 3) => {
  const f = 10 ** digits;
  return ring.map(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f]);
};
