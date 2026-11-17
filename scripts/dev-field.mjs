// Writes a SYNTHETIC current field to public/data/ for local development (RENCANA Phase 4).
// It is not geography and not data: smooth analytic flow plus a tide-like oscillation, with
// blobs of "land" from smooth noise. snapshot.json says `"synthetic": true`, and
// `check:snapshot` refuses it for a release. Never runs under NODE_ENV=production and never
// overwrites a real (non-synthetic) snapshot.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gridSize } from '../src/lib/drift/field.ts';

const root = resolve(import.meta.dirname, '..');
const dir = resolve(root, 'public/data');
const jsonPath = resolve(dir, 'snapshot.json');

if (process.env.NODE_ENV === 'production') {
  console.log('dev-field: NODE_ENV is production, nothing written');
  process.exit(0);
}
if (existsSync(jsonPath)) {
  try {
    if (JSON.parse(readFileSync(jsonPath, 'utf8')).synthetic === false) {
      console.log('dev-field: a real snapshot is in place, left untouched');
      process.exit(0);
    }
  } catch {
    // unreadable: regenerate
  }
}

const meta = {
  version: 1,
  synthetic: true,
  source: 'SYNTHETIC development field, not data',
  bbox: { lon0: 116.0, lon1: 123.0, lat0: -8.0, lat1: 2.0 },
  dlon: 0.1,
  dlat: 0.1,
  nx: 71,
  ny: 101,
  steps: 48,
  dtSeconds: 3600,
  t0: '2026-01-01T00:00:00Z',
  units: 'cm/s',
  convention: 'toward',
  scale: 1,
  fill: -32768,
};
const g = gridSize(meta);
if (g.nx !== meta.nx || g.ny !== meta.ny) throw new Error('dev-field: grid size mismatch');

// Small deterministic PRNG (mulberry32), so the file is the same every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(1729);
const bumps = Array.from({ length: 14 }, () => ({
  x: 116 + rand() * 7,
  y: -8 + rand() * 10,
  r: 0.4 + rand() * 0.9,
  a: rand() < 0.5 ? -1 : 1,
}));
const smooth = (lon, lat) =>
  bumps.reduce(
    (s, b) => s + b.a * Math.exp(-((lon - b.x) ** 2 + (lat - b.y) ** 2) / (2 * b.r * b.r)),
    0,
  );

const data = new Int16Array(meta.nx * meta.ny * meta.steps * 2);
const { fill } = meta;
for (let s = 0; s < meta.steps; s++) {
  const phase = (2 * Math.PI * s) / 24; // 24 h oscillation, divides the 48-step loop
  for (let j = 0; j < meta.ny; j++) {
    const lat = meta.bbox.lat0 + j * meta.dlat;
    for (let i = 0; i < meta.nx; i++) {
      const lon = meta.bbox.lon0 + i * meta.dlon;
      const k = ((s * meta.ny + j) * meta.nx + i) * 2;
      if (smooth(lon, lat) > 1.15) {
        data[k] = fill;
        data[k + 1] = fill;
        continue;
      }
      // a slow southward throughflow, a meander, and an oscillation that reverses it
      const through = -30 - 25 * Math.cos((lat + 3) / 2);
      const meander = 35 * Math.sin(lon * 2.4 + lat * 0.9);
      const tide = 40 * Math.sin(phase + lon * 0.8);
      const eddyU = -20 * (lat + 4) * Math.exp(-((lon - 119.5) ** 2 + (lat + 4) ** 2) / 3);
      const eddyV = 20 * (lon - 119.5) * Math.exp(-((lon - 119.5) ** 2 + (lat + 4) ** 2) / 3);
      data[k] = Math.round(meander + tide * 0.6 + eddyU * 6);
      data[k + 1] = Math.round(through + tide + eddyV * 6);
    }
  }
}

mkdirSync(dir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + '\n');
writeFileSync(
  resolve(dir, 'snapshot.bin'),
  Buffer.from(data.buffer, data.byteOffset, data.byteLength),
);
console.log(`dev-field: wrote SYNTHETIC snapshot (${data.byteLength} bytes) to public/data/`);
