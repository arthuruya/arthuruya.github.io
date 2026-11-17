/**
 * PLACEHOLDER. Synthetic contours for ContourBackdrop until Phase 4 builds the real
 * Natural Earth bathymetry (src/assets/chart.json). This is NOT geography and NOT
 * data: an abstract smooth field (seeded Gaussian bumps) traced with marching
 * squares, so the design system can be judged with realistic-looking linework.
 * The result is flagged `synthetic: true`; ContourBackdrop renders that as
 * `data-synthetic`, so a release check can refuse it (Phase 4 / Phase 8).
 */
import type { ContourSet, Point, Polyline } from './contours';

export interface PlaceholderOptions {
  width?: number;
  height?: number;
  /** Grid step in box units. */
  cell?: number;
  levels?: number;
  bumps?: number;
  seed?: number;
}

/** Small deterministic PRNG (mulberry32). Same seed, same output. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Marching squares: edges 0 top, 1 right, 2 bottom, 3 left. Case bits tl=8 tr=4 br=2 bl=1.
const TABLE: Record<number, [number, number][]> = {
  1: [[3, 2]],
  2: [[2, 1]],
  3: [[3, 1]],
  4: [[0, 1]],
  6: [[0, 2]],
  7: [[3, 0]],
  8: [[3, 0]],
  9: [[0, 2]],
  11: [[0, 1]],
  12: [[3, 1]],
  13: [[2, 1]],
  14: [[3, 2]],
};

/** Trace the isolines of `field` (row-major, nx by ny) at `t` into joined polylines. */
export function isolines(
  field: Float64Array,
  nx: number,
  ny: number,
  cell: number,
  t: number,
): Polyline[] {
  const at = (i: number, j: number) => field[j * nx + i];
  const points = new Map<string, Point>();
  const segs: [string, string][] = [];

  const edge = (i: number, j: number, e: number): string => {
    // Each edge has one global key so neighbouring cells share the point.
    const [key, i0, j0, i1, j1] =
      e === 0
        ? [`h${i},${j}`, i, j, i + 1, j]
        : e === 2
          ? [`h${i},${j + 1}`, i, j + 1, i + 1, j + 1]
          : e === 3
            ? [`v${i},${j}`, i, j, i, j + 1]
            : [`v${i + 1},${j}`, i + 1, j, i + 1, j + 1];
    if (!points.has(key)) {
      const a = at(i0, j0);
      const b = at(i1, j1);
      const f = (t - a) / (b - a);
      points.set(key, [(i0 + (i1 - i0) * f) * cell, (j0 + (j1 - j0) * f) * cell]);
    }
    return key;
  };

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const tl = at(i, j);
      const tr = at(i + 1, j);
      const br = at(i + 1, j + 1);
      const bl = at(i, j + 1);
      const c = (tl >= t ? 8 : 0) | (tr >= t ? 4 : 0) | (br >= t ? 2 : 0) | (bl >= t ? 1 : 0);
      let pairs = TABLE[c];
      if (c === 5 || c === 10) {
        const centreHigh = (tl + tr + br + bl) / 4 >= t;
        // Saddle: decide from the centre value which corners are joined.
        pairs =
          (c === 5) === centreHigh
            ? [
                [3, 0],
                [2, 1],
              ]
            : [
                [0, 1],
                [3, 2],
              ];
      }
      for (const [e0, e1] of pairs ?? []) segs.push([edge(i, j, e0), edge(i, j, e1)]);
    }
  }
  return join(segs, points);
}

/** Join edge-keyed segments into polylines; closed loops end on their first point. */
function join(segs: [string, string][], points: Map<string, Point>): Polyline[] {
  const adj = new Map<string, number[]>();
  segs.forEach(([a, b], i) => {
    for (const k of [a, b]) {
      const list = adj.get(k);
      if (list) list.push(i);
      else adj.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const out: Polyline[] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const chain = [segs[s][0], segs[s][1]];
    for (const forward of [true, false]) {
      for (;;) {
        const end = forward ? chain[chain.length - 1] : chain[0];
        const next = (adj.get(end) ?? []).find((i) => !used[i]);
        if (next === undefined) break;
        used[next] = 1;
        const [a, b] = segs[next];
        const other = a === end ? b : a;
        if (forward) chain.push(other);
        else chain.unshift(other);
      }
    }
    out.push(chain.map((k) => points.get(k) as Point));
  }
  return out;
}

/** The synthetic contour set used until Phase 4. Deterministic for a given seed. */
export function placeholderContours(opts: PlaceholderOptions = {}): ContourSet {
  const { width = 960, height = 540, cell = 10, levels = 11, bumps = 7, seed = 1729 } = opts;
  const nx = Math.round(width / cell) + 1;
  const ny = Math.round(height / cell) + 1;
  const rand = mulberry32(seed);
  const peaks = Array.from({ length: bumps }, () => ({
    x: rand() * width,
    y: rand() * height,
    s: (0.08 + rand() * 0.2) * width,
    a: (rand() < 0.3 ? -1 : 1) * (0.5 + rand() * 0.5),
  }));
  const field = new Float64Array(nx * ny);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = i * cell;
      const y = j * cell;
      let v = (0.35 * x) / width;
      for (const p of peaks)
        v += p.a * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (2 * p.s ** 2));
      field[j * nx + i] = v;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  const contours = Array.from({ length: levels }, (_, k) => {
    const level = min + ((k + 1) * (max - min)) / (levels + 1);
    return { level, major: k % 4 === 1, lines: isolines(field, nx, ny, cell, level) };
  });
  return { synthetic: true, width, height, contours };
}
