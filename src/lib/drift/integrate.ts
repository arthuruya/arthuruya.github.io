/**
 * Classical RK4 in lon/lat (RENCANA 4.4). The velocity comes in as a function so the
 * same step integrates the real Field and the analytic fields used by the tests.
 */
import {
  sampleField,
  uDegPerSec,
  vDegPerSec,
  newSample,
  type Field,
  type Sample,
} from './field.ts';

/** Writes degrees per second into `out` and returns false if the point is land. */
export type Velocity = (
  lon: number,
  lat: number,
  t: number,
  out: { dlon: number; dlat: number },
) => boolean;

export interface Step {
  lon: number;
  lat: number;
  /** true if any stage touched land: the particle is dead */
  land: boolean;
}

/** Velocity function for a Field, in degrees per second. */
export function fieldVelocity(field: Field): Velocity {
  const s: Sample = newSample();
  return (lon, lat, t, out) => {
    sampleField(field, lon, lat, t, s);
    if (s.land) return false;
    out.dlon = uDegPerSec(s.u, lat);
    out.dlat = vDegPerSec(s.v);
    return true;
  };
}

/**
 * One RK4 step of h seconds from (lon, lat) at model time t. Writes into `out`.
 * `dtField` is how far the field clock moves over the step (default h, the physical case);
 * the hero advects faster than the field evolves, so it passes a smaller one.
 */
export function rk4Step(
  vel: Velocity,
  lon: number,
  lat: number,
  t: number,
  h: number,
  out: Step,
  dtField: number = h,
): Step {
  const k = { dlon: 0, dlat: 0 };
  out.land = true;
  out.lon = lon;
  out.lat = lat;
  if (!vel(lon, lat, t, k)) return out;
  const k1x = k.dlon;
  const k1y = k.dlat;
  if (!vel(lon + 0.5 * h * k1x, lat + 0.5 * h * k1y, t + 0.5 * dtField, k)) return out;
  const k2x = k.dlon;
  const k2y = k.dlat;
  if (!vel(lon + 0.5 * h * k2x, lat + 0.5 * h * k2y, t + 0.5 * dtField, k)) return out;
  const k3x = k.dlon;
  const k3y = k.dlat;
  if (!vel(lon + h * k3x, lat + h * k3y, t + dtField, k)) return out;
  const k4x = k.dlon;
  const k4y = k.dlat;
  out.lon = lon + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
  out.lat = lat + (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
  out.land = false;
  return out;
}
