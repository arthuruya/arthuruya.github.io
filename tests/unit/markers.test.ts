import { describe, expect, it } from 'vitest';
import { fitPoints, MAKASSAR_STRAIT, UNTIA } from '../../src/lib/markers.ts';

describe('fitPoints', () => {
  const box = { width: 400, height: 500, pad: 0.2 };
  const [strait, untia] = fitPoints([MAKASSAR_STRAIT, UNTIA], box);

  it('puts the Strait north (smaller y) and west (smaller x) of Untia', () => {
    expect(strait.y).toBeLessThan(untia.y);
    expect(strait.x).toBeLessThan(untia.x);
  });

  it('keeps both points inside the padded box', () => {
    for (const p of [strait, untia]) {
      expect(p.x).toBeGreaterThanOrEqual(box.width * 0.2 - 1e-9);
      expect(p.x).toBeLessThanOrEqual(box.width * 0.8 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(box.height * 0.2 - 1e-9);
      expect(p.y).toBeLessThanOrEqual(box.height * 0.8 + 1e-9);
    }
  });

  it('does not distort: pixel distances keep the cos(latMid) ratio', () => {
    const dLon = MAKASSAR_STRAIT.lon - UNTIA.lon;
    const dLat = MAKASSAR_STRAIT.lat - UNTIA.lat;
    const ratio = (untia.x - strait.x) / (untia.y - strait.y);
    const expected = Math.abs((dLon * Math.cos((-3 * Math.PI) / 180)) / dLat);
    expect(ratio).toBeCloseTo(expected, 6);
  });

  it('centres a single point', () => {
    expect(fitPoints([UNTIA], { width: 100, height: 60 })).toEqual([{ x: 50, y: 30 }]);
  });

  it('returns nothing for no points', () => {
    expect(fitPoints([], box)).toEqual([]);
  });
});
