// Builds src/assets/chart.json from Natural Earth shapefiles (RENCANA 4.2). The raw files
// are NOT committed. Usage, with the files unpacked in one directory:
//   node scripts/build-chart.mjs <dir-with-shp-files>
// Exact download and run commands, version and date: scripts/build-chart.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clipRing, readPolygonRings, roundRing, simplifyRing } from './lib/shapefile.mjs';

const MARGIN = 0.5;
const BUDGET = 120 * 1024;
// Snapshot window (docs/snapshot-spec.md) plus margin.
const box = { lon0: 116 - MARGIN, lon1: 123 + MARGIN, lat0: -8 - MARGIN, lat1: 2 + MARGIN };
const LAYERS = [
  { key: 'land', file: 'ne_10m_land.shp' },
  { key: '200', file: 'ne_10m_bathymetry_K_200.shp' },
  { key: '1000', file: 'ne_10m_bathymetry_J_1000.shp' },
  { key: '2000', file: 'ne_10m_bathymetry_I_2000.shp' },
  { key: '4000', file: 'ne_10m_bathymetry_G_4000.shp' },
];

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/build-chart.mjs <dir with the Natural Earth .shp files>');
  process.exit(2);
}

const clipped = {};
for (const { key, file } of LAYERS) {
  const path = resolve(dir, file);
  if (!existsSync(path)) {
    console.error(`missing ${file} in ${dir}`);
    process.exit(2);
  }
  clipped[key] = readPolygonRings(new Uint8Array(readFileSync(path)))
    .map((r) => clipRing(r, box))
    .filter((r) => r.length);
}

let tol = 0.004;
let out;
for (let i = 0; i < 40; i++, tol *= 1.25) {
  const simp = (rings) => rings.map((r) => roundRing(simplifyRing(r, tol))).filter((r) => r.length);
  out = {
    version: 1,
    source: 'Natural Earth (public domain), ne_10m_land and ne_10m_bathymetry',
    bbox: box,
    land: simp(clipped.land),
    depth: Object.fromEntries(
      LAYERS.filter((l) => l.key !== 'land').map((l) => [l.key, simp(clipped[l.key])]),
    ),
  };
  if (Buffer.byteLength(JSON.stringify(out)) <= BUDGET) break;
}
const size = Buffer.byteLength(JSON.stringify(out));
if (size > BUDGET) throw new Error(`chart.json is ${size} bytes after simplifying, over ${BUDGET}`);
mkdirSync(resolve(import.meta.dirname, '../src/assets'), { recursive: true });
writeFileSync(resolve(import.meta.dirname, '../src/assets/chart.json'), JSON.stringify(out));
console.log(
  `build-chart: wrote src/assets/chart.json, ${size} bytes, tolerance ${tol.toFixed(4)} deg`,
);
