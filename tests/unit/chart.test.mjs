import { describe, expect, it } from 'vitest';
import { clipRing, readPolygonRings, simplifyRing } from '../../scripts/lib/shapefile.mjs';

/** Build a one-record Polygon .shp in memory. */
function shp(rings) {
  const nPts = rings.reduce((n, r) => n + r.length, 0);
  const content = 44 + rings.length * 4 + nPts * 16;
  const buf = new ArrayBuffer(100 + 8 + content);
  const dv = new DataView(buf);
  dv.setInt32(0, 9994, false);
  dv.setInt32(24, buf.byteLength / 2, false);
  dv.setInt32(28, 1000, true);
  dv.setInt32(32, 5, true);
  dv.setInt32(100, 1, false);
  dv.setInt32(104, content / 2, false);
  const s = 108;
  dv.setInt32(s, 5, true);
  dv.setInt32(s + 36, rings.length, true);
  dv.setInt32(s + 40, nPts, true);
  let start = 0;
  rings.forEach((r, i) => {
    dv.setInt32(s + 44 + i * 4, start, true);
    start += r.length;
  });
  let p = s + 44 + rings.length * 4;
  for (const r of rings) {
    for (const [x, y] of r) {
      dv.setFloat64(p, x, true);
      dv.setFloat64(p + 8, y, true);
      p += 16;
    }
  }
  return new Uint8Array(buf);
}

const square = (x0, y0, x1, y1) => [
  [x0, y0],
  [x0, y1],
  [x1, y1],
  [x1, y0],
  [x0, y0],
];

describe('readPolygonRings', () => {
  it('reads every ring of a multi-part polygon', () => {
    const rings = [square(0, 0, 4, 4), square(1, 1, 2, 2)];
    expect(readPolygonRings(shp(rings))).toEqual(rings);
  });
  it('rejects a file that is not a polygon shapefile', () => {
    expect(() => readPolygonRings(new Uint8Array(120))).toThrow(/not a shapefile/);
  });
});

describe('clipRing', () => {
  const box = { lon0: 0, lon1: 10, lat0: 0, lat1: 10 };
  it('keeps a ring that is inside, and drops one that is outside', () => {
    expect(clipRing(square(1, 1, 2, 2), box)).toHaveLength(5);
    expect(clipRing(square(20, 20, 30, 30), box)).toEqual([]);
  });
  it('cuts a ring that crosses the box to the box edge', () => {
    const r = clipRing(square(5, 5, 15, 15), box);
    const xs = r.map((p) => p[0]);
    const ys = r.map((p) => p[1]);
    expect(Math.max(...xs)).toBe(10);
    expect(Math.max(...ys)).toBe(10);
    expect(Math.min(...xs)).toBe(5);
    expect(r[0]).toEqual(r[r.length - 1]);
  });
});

describe('simplifyRing', () => {
  it('removes points closer to the line than the tolerance and keeps the corners', () => {
    const ring = [
      [0, 0],
      [5, 0.001],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const out = simplifyRing(ring, 0.01);
    expect(out.length).toBeLessThan(ring.length);
    for (const corner of [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]) {
      expect(out.some((p) => p[0] === corner[0] && p[1] === corner[1])).toBe(true);
    }
    expect(out[0]).toEqual(out[out.length - 1]);
  });
});
