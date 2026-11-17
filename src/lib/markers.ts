/**
 * The two places named on the hero chart (RENCANA F2) and the projection that puts
 * them on a box. Equirectangular, x scaled by cos(latMid) of the whole Snapshot window
 * (lat 8°S to 2°N), the same projection Phase 4's Drift Field uses (RENCANA 4.3).
 */

export interface LonLat {
  lon: number;
  lat: number;
}

/** Untia: rounded to 0.01° from Arya's value. */
export const UNTIA: LonLat = { lat: -5.07, lon: 119.47 };
/** Label point of the Makassar Strait (Marine Regions, IHO Sea Area). */
export const MAKASSAR_STRAIT: LonLat = { lat: -2.11, lon: 118.21 };

/** latMid of the Snapshot window, lat0 -8 and lat1 2. */
export const LAT_MID = -3;

export interface FitOptions {
  width: number;
  height: number;
  /** share of each box side kept free around the points, 0 to 0.45 */
  pad?: number;
}

export interface Placed {
  x: number;
  y: number;
}

/**
 * Place points in a width by height box, y down, keeping the true aspect ratio and
 * centring them. The scale is the largest that keeps every point inside the padding.
 */
export function fitPoints(points: readonly LonLat[], opts: FitOptions): Placed[] {
  const { width, height, pad = 0.2 } = opts;
  if (points.length === 0) return [];
  const k = Math.cos((LAT_MID * Math.PI) / 180);
  const xs = points.map((p) => p.lon * k);
  const ys = points.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const usableW = width * (1 - 2 * pad);
  const usableH = height * (1 - 2 * pad);
  const scale = Math.min(
    spanX > 0 ? usableW / spanX : Infinity,
    spanY > 0 ? usableH / spanY : Infinity,
  );
  const s = Number.isFinite(scale) ? scale : 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return xs.map((x, i) => ({
    x: width / 2 + (x - cx) * s,
    y: height / 2 - (ys[i] - cy) * s,
  }));
}
