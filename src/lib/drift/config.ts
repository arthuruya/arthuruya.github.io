/**
 * Named constants of the Drift Field (RENCANA 4.4 to 4.8). Nothing here is read from
 * the Snapshot; the Snapshot only supplies the field.
 */

/**
 * Model seconds of FIELD TIME that pass per real second: the Snapshot advances one model
 * hour per six real seconds (RENCANA 4.4). The hero is an ACCELERATED depiction and carries
 * no label for this (ADR 0001); the constant is named so it can change in one place.
 */
export const TIME_SCALE = 3600 / 6;

/**
 * Model seconds of ADVECTION per real second, the step size of the RK4 integrator.
 * RENCANA 4.4 uses TIME_SCALE here too, but at one model hour per six seconds a 0.5 m/s
 * current moves a particle about 0.15 px per real second at hero size: nothing is visible.
 * So particles are advected with their own, larger scale (0.5 m/s is then about 26 px/s on a
 * 4:5 hero) while the field itself evolves at TIME_SCALE. Deviation, reported in the status.
 */
export const ADVECTION_SCALE = 100_000;

/** Metres per degree of latitude, and per degree of longitude at the equator. */
export const M_PER_DEG_LAT = 110_574;
export const M_PER_DEG_LON_EQ = 111_320;

/** Longest frame step integrated in one go, real seconds (a stalled tab must not jump). */
export const MAX_FRAME_SECONDS = 0.1;

/** Particle count: clamp(round(area / 900), 600, 3500); capped under 40 rem. */
export const PARTICLE_AREA_DIVISOR = 900;
export const PARTICLE_MIN = 600;
export const PARTICLE_MAX = 3500;
export const PARTICLE_MAX_NARROW = 1200;
/** Under 40 rem (640 px at 16 px). */
export const NARROW_PX = 640;
/** The governor never goes below this. */
export const PARTICLE_FLOOR = 400;

export const LIFE_MIN_FRAMES = 90;
export const LIFE_MAX_FRAMES = 220;

export const ALPHA_MIN = 0.35;
export const ALPHA_MAX = 0.7;
/** Per-frame fill of --paper that fades the trails. */
export const TRAIL_FADE = 0.08;

/** Governor: frames sampled, mean frame time over which it sheds particles, and by how much. */
export const GOVERNOR_FRAMES = 30;
export const GOVERNOR_MS = 20;
export const GOVERNOR_SHED = 0.2;

/** Buoys (RENCANA 4.6). */
export const BUOY_MAX = 5;
export const BUOY_TRAIL = 400;
export const BUOY_RADIUS_PX = 6;
export const TAP_MAX_MS = 250;
export const TAP_MAX_MOVE_PX = 8;

/** Reduced motion (RENCANA 4.8): fixed seed, so the still frame is the same every visit. */
export const STILL_SEED = 20261029;
export const STILL_STREAMLINES = 1800;
export const STILL_STEPS = 40;
/**
 * Real seconds of animated drift a buoy shows at once under reduced motion. RENCANA 4.8 says
 * "next 12 model hours", which at true speed is about 10 px; this draws what the animation
 * would show in this many seconds instead (ADVECTION_SCALE applies). Deviation, reported.
 */
export const STILL_BUOY_SECONDS = 6;

/** Share of each side kept free around the two markers when choosing the crop. */
export const MARKER_PAD = 0.22;

/** Snapshot limits shared by the browser and `check:snapshot` (RENCANA 4.1). */
export const LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxSpeedCms: 400,
  maxFillShare: 0.7,
  minSteps: 24,
} as const;
