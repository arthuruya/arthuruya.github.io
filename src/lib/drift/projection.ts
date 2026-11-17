/**
 * Equirectangular projection scaled by cos(latMid) on x (RENCANA 4.3). The map is fitted
 * to COVER the box, never distorted, centred near the two markers, and the crop is
 * chosen so the markers stay in view with padding.
 */
import type { LonLat } from '../markers.ts';

export interface Bbox {
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
}

export interface View {
  /** pixels per degree of latitude */
  scale: number;
  /** projected x factor, cos(latMid) */
  k: number;
  /** lon/lat at the box centre */
  lonC: number;
  latC: number;
  width: number;
  height: number;
  /** true when every marker lies inside the padded box */
  markersVisible: boolean;
  toPx(lon: number, lat: number): { x: number; y: number };
  toLonLat(x: number, y: number): LonLat;
}

export const latMidOf = (b: Bbox) => (b.lat0 + b.lat1) / 2;

export function makeView(
  bbox: Bbox,
  markers: readonly LonLat[],
  width: number,
  height: number,
  pad: number,
): View {
  const k = Math.cos((latMidOf(bbox) * Math.PI) / 180);
  const spanX = (bbox.lon1 - bbox.lon0) * k;
  const spanY = bbox.lat1 - bbox.lat0;
  const scale = Math.max(width / spanX, height / spanY);
  // visible half-extent in degrees
  const halfLon = width / (2 * scale * k);
  const halfLat = height / (2 * scale);
  const mLon = markers.length ? markers.map((m) => m.lon) : [(bbox.lon0 + bbox.lon1) / 2];
  const mLat = markers.length ? markers.map((m) => m.lat) : [(bbox.lat0 + bbox.lat1) / 2];
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const lonC = clamp(
    (Math.min(...mLon) + Math.max(...mLon)) / 2,
    bbox.lon0 + halfLon,
    bbox.lon1 - halfLon,
  );
  const latC = clamp(
    (Math.min(...mLat) + Math.max(...mLat)) / 2,
    bbox.lat0 + halfLat,
    bbox.lat1 - halfLat,
  );
  const toPx = (lon: number, lat: number) => ({
    x: width / 2 + (lon - lonC) * k * scale,
    y: height / 2 - (lat - latC) * scale,
  });
  const toLonLat = (x: number, y: number): LonLat => ({
    lon: lonC + (x - width / 2) / (k * scale),
    lat: latC - (y - height / 2) / scale,
  });
  const markersVisible = markers.every((m) => {
    const p = toPx(m.lon, m.lat);
    return (
      p.x >= width * pad &&
      p.x <= width * (1 - pad) &&
      p.y >= height * pad &&
      p.y <= height * (1 - pad)
    );
  });
  return { scale, k, lonC, latC, width, height, markersVisible, toPx, toLonLat };
}
