/**
 * The Snapshot and how to read it (RENCANA 4.1, 4.4). Pure functions, no DOM, so they
 * run under Vitest and in the browser.
 *
 * Layout of snapshot.bin: little-endian Int16 `[step][j][i][component]`, j from lat0
 * northward, i from lon0 eastward, component 0 = u (eastward), 1 = v (northward), in
 * cm/s times `scale`. Land and missing = `fill` in both components.
 */
import { LIMITS, M_PER_DEG_LAT, M_PER_DEG_LON_EQ } from './config.ts';

export interface SnapshotMeta {
  version: 1;
  synthetic: boolean;
  source: string;
  bbox: { lon0: number; lon1: number; lat0: number; lat1: number };
  dlon: number;
  dlat: number;
  nx: number;
  ny: number;
  steps: number;
  dtSeconds: number;
  t0: string;
  units: 'cm/s';
  convention: 'toward';
  scale: number;
  fill: number;
}

export interface Field {
  meta: SnapshotMeta;
  data: Int16Array;
}

/** One sample of the field, reused so the frame loop does not allocate. */
export interface Sample {
  /** eastward and northward, cm/s */
  u: number;
  v: number;
  land: boolean;
}

export const newSample = (): Sample => ({ u: 0, v: 0, land: true });

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Expected grid size from the bbox and spacing (RENCANA 4.1). */
export function gridSize(m: Pick<SnapshotMeta, 'bbox' | 'dlon' | 'dlat'>) {
  return {
    nx: Math.round((m.bbox.lon1 - m.bbox.lon0) / m.dlon) + 1,
    ny: Math.round((m.bbox.lat1 - m.bbox.lat0) / m.dlat) + 1,
  };
}

/**
 * Structural problems in snapshot.json. An empty array means the metadata is usable.
 * Value limits that need the binary (speed, fill share) are in `validateField`.
 */
export function validateMeta(raw: unknown): string[] {
  const errs: string[] = [];
  if (typeof raw !== 'object' || raw === null) return ['snapshot.json is not an object'];
  const m = raw as Record<string, unknown>;
  if (m.version !== 1) errs.push('version must be 1');
  if (typeof m.synthetic !== 'boolean') errs.push('synthetic must be a boolean');
  if (typeof m.source !== 'string' || m.source === '') errs.push('source must be a string');
  const b = m.bbox as Record<string, unknown> | undefined;
  if (!b || !['lon0', 'lon1', 'lat0', 'lat1'].every((k) => isNum(b[k]))) {
    errs.push('bbox needs numeric lon0, lon1, lat0, lat1');
  } else if ((b.lon1 as number) <= (b.lon0 as number) || (b.lat1 as number) <= (b.lat0 as number)) {
    errs.push('bbox must have lon1 > lon0 and lat1 > lat0');
  }
  for (const k of ['dlon', 'dlat', 'nx', 'ny', 'steps', 'dtSeconds', 'scale', 'fill']) {
    if (!isNum(m[k])) errs.push(`${k} must be a number`);
  }
  for (const k of ['nx', 'ny', 'steps']) {
    if (isNum(m[k]) && (!Number.isInteger(m[k]) || (m[k] as number) < 1)) {
      errs.push(`${k} must be a positive integer`);
    }
  }
  if (isNum(m.dlon) && m.dlon <= 0) errs.push('dlon must be positive');
  if (isNum(m.dlat) && m.dlat <= 0) errs.push('dlat must be positive');
  if (isNum(m.dtSeconds) && m.dtSeconds <= 0) errs.push('dtSeconds must be positive');
  if (isNum(m.scale) && m.scale <= 0) errs.push('scale must be positive');
  if (isNum(m.fill) && (!Number.isInteger(m.fill) || m.fill < -32768 || m.fill > 32767)) {
    errs.push('fill must be an Int16 integer');
  }
  if (typeof m.t0 !== 'string' || !ISO_UTC.test(m.t0) || Number.isNaN(Date.parse(m.t0))) {
    errs.push('t0 must be a UTC ISO time such as 2026-10-29T00:00:00Z');
  }
  if (m.units !== 'cm/s') errs.push('units must be "cm/s"');
  if (m.convention !== 'toward') errs.push('convention must be "toward"');
  if (errs.length === 0) {
    const meta = m as unknown as SnapshotMeta;
    const g = gridSize(meta);
    if (g.nx !== meta.nx) errs.push(`nx is ${meta.nx} but bbox and dlon give ${g.nx}`);
    if (g.ny !== meta.ny) errs.push(`ny is ${meta.ny} but bbox and dlat give ${g.ny}`);
  }
  return errs;
}

/** Problems in the pair (metadata, binary). Includes everything `check:snapshot` fails on. */
export function validateField(meta: SnapshotMeta, data: Int16Array): string[] {
  const errs: string[] = [];
  const expected = meta.nx * meta.ny * meta.steps * 2;
  if (data.length !== expected) {
    errs.push(`snapshot.bin holds ${data.length} values, expected nx*ny*steps*2 = ${expected}`);
    return errs;
  }
  if (data.byteLength > LIMITS.maxBytes) {
    errs.push(`snapshot.bin is ${data.byteLength} bytes, over the ${LIMITS.maxBytes} limit`);
  }
  if (meta.steps < LIMITS.minSteps) errs.push(`steps is ${meta.steps}, minimum ${LIMITS.minSteps}`);
  let fills = 0;
  let maxSpeed = 0;
  const cells = expected / 2;
  for (let c = 0; c < cells; c++) {
    const a = data[2 * c];
    const b = data[2 * c + 1];
    if (a === meta.fill || b === meta.fill) {
      fills++;
      continue;
    }
    const sp = Math.hypot(a, b) / meta.scale;
    if (sp > maxSpeed) maxSpeed = sp;
  }
  if (maxSpeed > LIMITS.maxSpeedCms) {
    errs.push(`max speed ${maxSpeed.toFixed(1)} cm/s is over the ${LIMITS.maxSpeedCms} limit`);
  }
  if (fills / cells > LIMITS.maxFillShare) {
    errs.push(
      `${((100 * fills) / cells).toFixed(1)} % of cells are fill, limit ${100 * LIMITS.maxFillShare} %`,
    );
  }
  return errs;
}

/** Wrap a model time (seconds from t0) into one loop of the Snapshot. */
export function loopTime(meta: Pick<SnapshotMeta, 'steps' | 'dtSeconds'>, t: number): number {
  const period = meta.steps * meta.dtSeconds;
  return ((t % period) + period) % period;
}

/**
 * Sample the field at (lon, lat) and model time t (seconds from t0, looping).
 * Bilinear in space, linear in time between steps; the last step blends into the first,
 * so the loop has no seam. If any of the four surrounding cells is `fill` in either
 * step used, or the point is outside the grid, the sample is land. Writes to `out`.
 */
export function sampleField(
  field: Field,
  lon: number,
  lat: number,
  t: number,
  out: Sample,
): Sample {
  const { meta, data } = field;
  const { nx, ny, steps, fill, scale } = meta;
  const fi = (lon - meta.bbox.lon0) / meta.dlon;
  const fj = (lat - meta.bbox.lat0) / meta.dlat;
  out.land = true;
  out.u = 0;
  out.v = 0;
  if (!(fi >= 0 && fj >= 0 && fi <= nx - 1 && fj <= ny - 1)) return out;
  const i0 = Math.min(Math.floor(fi), nx - 2);
  const j0 = Math.min(Math.floor(fj), ny - 2);
  const wx = fi - i0;
  const wy = fj - j0;
  const ft = loopTime(meta, t) / meta.dtSeconds;
  const s0 = Math.floor(ft) % steps;
  const s1 = (s0 + 1) % steps;
  const wt = ft - Math.floor(ft);
  const plane = nx * ny * 2;
  const base00 = (j0 * nx + i0) * 2;
  const w00 = (1 - wx) * (1 - wy);
  const w10 = wx * (1 - wy);
  const w01 = (1 - wx) * wy;
  const w11 = wx * wy;
  let u = 0;
  let v = 0;
  for (let k = 0; k < 2; k++) {
    const off = (k === 0 ? s0 : s1) * plane + base00;
    const a = off;
    const b = off + 2;
    const c = off + nx * 2;
    const d = c + 2;
    if (
      data[a] === fill ||
      data[b] === fill ||
      data[c] === fill ||
      data[d] === fill ||
      data[a + 1] === fill ||
      data[b + 1] === fill ||
      data[c + 1] === fill ||
      data[d + 1] === fill
    ) {
      return out;
    }
    const w = k === 0 ? 1 - wt : wt;
    u += w * (w00 * data[a] + w10 * data[b] + w01 * data[c] + w11 * data[d]);
    v += w * (w00 * data[a + 1] + w10 * data[b + 1] + w01 * data[c + 1] + w11 * data[d + 1]);
  }
  out.u = u / scale;
  out.v = v / scale;
  out.land = false;
  return out;
}

/** cm/s to degrees per second at a latitude (RENCANA 4.4). */
export const uDegPerSec = (uCms: number, latDeg: number) =>
  (uCms * 0.01) / (M_PER_DEG_LON_EQ * Math.cos((latDeg * Math.PI) / 180));
export const vDegPerSec = (vCms: number) => (vCms * 0.01) / M_PER_DEG_LAT;

/** Eight compass points of the flow-toward vector, for the live region (RENCANA 4.6). */
export const COMPASS = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
] as const;
export type Compass = (typeof COMPASS)[number];

/** Flow-toward direction: atan2(u, v), clockwise from north, no +180 (ADR 0001). */
export function compassPoint(uCms: number, vCms: number): Compass {
  const deg = ((Math.atan2(uCms, vCms) * 180) / Math.PI + 360) % 360;
  return COMPASS[Math.round(deg / 45) % 8];
}
