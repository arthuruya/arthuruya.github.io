import { describe, expect, it } from 'vitest';
import { pathData } from '../../src/lib/contours';
import { isolines, mulberry32, placeholderContours } from '../../src/lib/placeholder-contours';

describe('pathData', () => {
  it('writes open polylines without Z and closed rings with Z', () => {
    expect(
      pathData([
        [
          [0, 0],
          [10, 0],
        ],
      ]),
    ).toBe('M0 0L10 0');
    expect(
      pathData([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 0],
        ],
      ]),
    ).toBe('M0 0L10 0L10 10Z');
  });

  it('rounds to the requested digits and skips degenerate lines', () => {
    expect(
      pathData(
        [
          [[1.234, 5.678]],
          [
            [1.26, 2],
            [3.04, 4],
          ],
        ],
        1,
      ),
    ).toBe('M1.3 2L3 4');
  });
});

describe('isolines', () => {
  it('traces one closed ring around a single peak', () => {
    // 5x5 grid, peak in the middle
    const nx = 5;
    const field = new Float64Array(25);
    field[2 * nx + 2] = 1;
    const lines = isolines(field, nx, 5, 10, 0.5);
    expect(lines).toHaveLength(1);
    const ring = lines[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    // every point is half-way between the peak (20,20) and a neighbour
    for (const [x, y] of ring) expect(Math.abs(x - 20) + Math.abs(y - 20)).toBeCloseTo(5, 10);
  });
});

describe('placeholderContours', () => {
  it('is flagged synthetic and deterministic', () => {
    const a = placeholderContours();
    const b = placeholderContours();
    expect(a.synthetic).toBe(true);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(placeholderContours({ seed: 2 }))).not.toBe(JSON.stringify(a));
  });

  it('stays inside its box and produces lines on every level', () => {
    const set = placeholderContours({ width: 400, height: 200, levels: 5 });
    expect(set.contours).toHaveLength(5);
    for (const c of set.contours) {
      expect(c.lines.length).toBeGreaterThan(0);
      for (const line of c.lines)
        for (const [x, y] of line) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(400);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(200);
        }
    }
  });

  it('mulberry32 is in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
