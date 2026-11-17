import { describe, expect, it } from 'vitest';
import {
  compassPoint,
  gridSize,
  loopTime,
  newSample,
  sampleField,
  validateField,
  validateMeta,
  type Field,
  type SnapshotMeta,
} from '../../src/lib/drift/field.ts';
import { fieldVelocity, rk4Step, type Step, type Velocity } from '../../src/lib/drift/integrate.ts';
import { makeView } from '../../src/lib/drift/projection.ts';
import { MAKASSAR_STRAIT, UNTIA } from '../../src/lib/markers.ts';

const FILL = -32768;

function meta(over: Partial<SnapshotMeta> = {}): SnapshotMeta {
  return {
    version: 1,
    synthetic: true,
    source: 'test',
    bbox: { lon0: 116, lon1: 123, lat0: -8, lat1: 2 },
    dlon: 0.1,
    dlat: 0.1,
    nx: 71,
    ny: 101,
    steps: 24,
    dtSeconds: 3600,
    t0: '2026-10-29T00:00:00Z',
    units: 'cm/s',
    convention: 'toward',
    scale: 1,
    fill: FILL,
    ...over,
  };
}

function uniform(u: number, v: number, m = meta()): Field {
  const data = new Int16Array(m.nx * m.ny * m.steps * 2);
  for (let c = 0; c < data.length; c += 2) {
    data[c] = u * m.scale;
    data[c + 1] = v * m.scale;
  }
  return { meta: m, data };
}

const idx = (m: SnapshotMeta, s: number, j: number, i: number) => ((s * m.ny + j) * m.nx + i) * 2;
const metresPerDegLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

describe('sampleField', () => {
  it('returns the uniform value and is not land', () => {
    const s = sampleField(uniform(100, -20), 119.37, -3.33, 5000, newSample());
    expect(s.land).toBe(false);
    expect(s.u).toBeCloseTo(100, 6);
    expect(s.v).toBeCloseTo(-20, 6);
  });

  it('flags a point whose surrounding cells include fill as land', () => {
    const f = uniform(50, 0);
    const k = idx(f.meta, 0, 20, 10);
    f.data[k] = FILL;
    f.data[k + 1] = FILL;
    // lon 117.05, lat -5.95 lies between cells i 10..11 and j 20..21
    expect(sampleField(f, 117.05, -5.95, 0, newSample()).land).toBe(true);
    expect(sampleField(f, 120, 0, 0, newSample()).land).toBe(false);
  });

  it('treats fill in only one component as land', () => {
    const f = uniform(50, 0);
    f.data[idx(f.meta, 0, 20, 10) + 1] = FILL;
    expect(sampleField(f, 117.05, -5.95, 0, newSample()).land).toBe(true);
  });

  it('is land outside the grid', () => {
    expect(sampleField(uniform(1, 1), 124, 0, 0, newSample()).land).toBe(true);
    expect(sampleField(uniform(1, 1), 120, 3, 0, newSample()).land).toBe(true);
  });

  it('interpolates linearly in time and loops with no seam', () => {
    const m = meta();
    const f = uniform(0, 0, m);
    for (let s = 0; s < m.steps; s++) {
      for (let c = 0; c < m.nx * m.ny; c++) f.data[(s * m.nx * m.ny + c) * 2] = s * 10;
    }
    expect(sampleField(f, 120, -3, 1.5 * 3600, newSample()).u).toBeCloseTo(15, 6);
    // halfway between the last step (230) and the first (0): 115
    expect(sampleField(f, 120, -3, 23.5 * 3600, newSample()).u).toBeCloseTo(115, 6);
    const period = m.steps * m.dtSeconds;
    expect(sampleField(f, 120, -3, 1.5 * 3600 + period, newSample()).u).toBeCloseTo(15, 6);
    expect(sampleField(f, 120, -3, -0.5 * 3600, newSample()).u).toBeCloseTo(115, 6);
  });

  it('interpolates bilinearly in space', () => {
    const m = meta();
    const f = uniform(0, 0, m);
    for (let s = 0; s < m.steps; s++) {
      for (let j = 0; j < m.ny; j++) {
        for (let i = 0; i < m.nx; i++) f.data[idx(m, s, j, i)] = i * 4;
      }
    }
    // lon 116.25 is 2.5 cells east of lon0
    expect(sampleField(f, 116.25, -3, 0, newSample()).u).toBeCloseTo(10, 6);
  });

  it('honours scale', () => {
    const s = sampleField(uniform(12.5, -3.25, meta({ scale: 100 })), 120, -3, 0, newSample());
    expect(s.u).toBeCloseTo(12.5, 6);
    expect(s.v).toBeCloseTo(-3.25, 6);
  });
});

describe('RK4 in a uniform field', () => {
  it('advances a particle the expected distance for 100 cm/s eastward', () => {
    const vel = fieldVelocity(uniform(100, 0));
    const lat = -3;
    const out: Step = { lon: 0, lat: 0, land: false };
    rk4Step(vel, 120, lat, 0, 3600, out);
    expect(out.land).toBe(false);
    // 1 m/s for one hour = 3600 m east
    expect(out.lon - 120).toBeCloseTo(3600 / metresPerDegLon(lat), 6);
    expect(out.lat).toBeCloseTo(lat, 12);
  });

  it('advances a particle north by v / 110 574', () => {
    const vel = fieldVelocity(uniform(0, 50));
    const out: Step = { lon: 0, lat: 0, land: false };
    rk4Step(vel, 120, -3, 0, 7200, out);
    expect(out.lat - -3).toBeCloseTo((0.5 * 7200) / 110_574, 9);
  });

  it('flags land when a stage enters a fill cell', () => {
    const f = uniform(100, 0);
    const m = f.meta;
    // block cells i = 31..32 (lon 119.1..119.2) for every step
    for (let s = 0; s < m.steps; s++) {
      for (let j = 0; j < m.ny; j++) {
        for (const i of [31, 32]) {
          f.data[idx(m, s, j, i)] = FILL;
          f.data[idx(m, s, j, i) + 1] = FILL;
        }
      }
    }
    const vel = fieldVelocity(f);
    const out: Step = { lon: 0, lat: 0, land: false };
    rk4Step(vel, 118.95, -3, 0, 3600, out);
    expect(out.land).toBe(false);
    // 1 m/s east moves ~0.032 deg per hour: three hours from 119.0 end between cells 30 and 31
    rk4Step(vel, 119.0, -3, 0, 3600 * 3, out);
    expect(out.land).toBe(true);
  });
});

describe('RK4 on solid-body rotation', () => {
  // dlon/dt = -w (lat - latC), dlat/dt = w (lon - lonC)
  const w = (2 * Math.PI) / (48 * 3600);
  const lonC = 120;
  const latC = -3;
  const vel: Velocity = (lon, lat, _t, out) => {
    out.dlon = -w * (lat - latC);
    out.dlat = w * (lon - lonC);
    return true;
  };

  it('returns within 1e-6 of the start after one period of 96 steps', () => {
    let lon = 121;
    let lat = latC;
    const n = 96;
    const h = (2 * Math.PI) / w / n;
    const out: Step = { lon: 0, lat: 0, land: false };
    for (let i = 0; i < n; i++) {
      rk4Step(vel, lon, lat, i * h, h, out);
      lon = out.lon;
      lat = out.lat;
    }
    expect(Math.hypot(lon - 121, lat - latC)).toBeLessThan(1e-6);
    expect(Math.hypot(lon - lonC, lat - latC)).toBeCloseTo(1, 6);
  });
});

describe('compassPoint', () => {
  it('uses the flow-toward vector with no 180 degree flip', () => {
    expect(compassPoint(0, 10)).toBe('north');
    expect(compassPoint(10, 10)).toBe('north-east');
    expect(compassPoint(10, 0)).toBe('east');
    expect(compassPoint(10, -10)).toBe('south-east');
    expect(compassPoint(0, -10)).toBe('south');
    expect(compassPoint(-10, -10)).toBe('south-west');
    expect(compassPoint(-10, 0)).toBe('west');
    expect(compassPoint(-10, 10)).toBe('north-west');
  });
});

describe('metadata and binary validation', () => {
  it('accepts a good header and the grid size formula', () => {
    expect(validateMeta(meta())).toEqual([]);
    expect(gridSize(meta())).toEqual({ nx: 71, ny: 101 });
  });

  it('rejects wrong nx, non-UTC t0 and a bad convention', () => {
    expect(validateMeta(meta({ nx: 70 })).join()).toMatch(/nx is 70/);
    expect(validateMeta(meta({ t0: '2026-10-29T00:00:00+07:00' })).join()).toMatch(/UTC/);
    expect(validateMeta({ ...meta(), convention: 'from' }).join()).toMatch(/convention/);
  });

  it('checks the binary length, speed, fill share and step count', () => {
    const f = uniform(10, 10);
    expect(validateField(f.meta, f.data)).toEqual([]);
    expect(validateField(f.meta, f.data.subarray(2)).join()).toMatch(/expected/);
    expect(validateField(f.meta, uniform(300, 300).data).join()).toMatch(/max speed/);
    const mostlyLand = uniform(10, 10);
    mostlyLand.data.fill(FILL, 0, Math.floor(mostlyLand.data.length * 0.8));
    expect(validateField(mostlyLand.meta, mostlyLand.data).join()).toMatch(/fill/);
    const short = uniform(10, 10, meta({ steps: 12 }));
    expect(validateField(short.meta, short.data).join()).toMatch(/steps is 12/);
  });
});

describe('loopTime', () => {
  it('wraps both directions', () => {
    const m = { steps: 24, dtSeconds: 3600 };
    expect(loopTime(m, 24 * 3600)).toBe(0);
    expect(loopTime(m, -3600)).toBe(23 * 3600);
  });
});

describe('makeView', () => {
  const bbox = { lon0: 116, lon1: 123, lat0: -8, lat1: 2 };
  const markers = [MAKASSAR_STRAIT, UNTIA];

  it('round-trips pixels and lon/lat', () => {
    const v = makeView(bbox, markers, 400, 500, 0.22);
    const p = v.toPx(119.47, -5.07);
    const back = v.toLonLat(p.x, p.y);
    expect(back.lon).toBeCloseTo(119.47, 9);
    expect(back.lat).toBeCloseTo(-5.07, 9);
  });

  it('keeps both markers in view on boxes as tall as the hero (4:5) or squarer', () => {
    for (const [w, h] of [
      [360, 450],
      [400, 500],
      [640, 800],
      [500, 500],
    ]) {
      expect(makeView(bbox, markers, w, h, 0.15).markersVisible).toBe(true);
    }
  });

  it('covers the box: the visible window never leaves the bbox', () => {
    const v = makeView(bbox, markers, 360, 450, 0.22);
    const nw = v.toLonLat(0, 0);
    const se = v.toLonLat(360, 450);
    expect(nw.lon).toBeGreaterThanOrEqual(bbox.lon0 - 1e-9);
    expect(se.lon).toBeLessThanOrEqual(bbox.lon1 + 1e-9);
    expect(nw.lat).toBeLessThanOrEqual(bbox.lat1 + 1e-9);
    expect(se.lat).toBeGreaterThanOrEqual(bbox.lat0 - 1e-9);
  });

  it('does not distort: x per degree of lon is cos(latMid) times y per degree of lat', () => {
    const v = makeView(bbox, markers, 400, 500, 0.22);
    const a = v.toPx(120, -3);
    const dx = v.toPx(121, -3).x - a.x;
    const dy = a.y - v.toPx(120, -2).y;
    expect(dx / dy).toBeCloseTo(Math.cos((-3 * Math.PI) / 180), 9);
  });
});
