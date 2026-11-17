/**
 * Contour data for ContourBackdrop. Coordinates are already projected into the
 * backdrop's own box (0..width, 0..height, y down). Phase 4 projects the Natural
 * Earth bathymetry from chart.json into this shape; until then the backdrop uses
 * the synthetic set from placeholder-contours.ts.
 */

export type Point = readonly [number, number];
/** An open polyline, or a closed ring when the last point equals the first. */
export type Polyline = readonly Point[];

export interface Contour {
  /** Depth or field level of this isoline; only used to pick major lines. */
  level: number;
  /** Major (index) contour, drawn heavier, as on a printed chart. */
  major?: boolean;
  lines: readonly Polyline[];
}

export interface ContourSet {
  /** True for generated placeholder data. Rendered as data-synthetic for later checks. */
  synthetic: boolean;
  width: number;
  height: number;
  contours: readonly Contour[];
}

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/**
 * SVG path data for a set of polylines: `M x y L x y ...`, with `Z` for closed
 * rings. Polylines with fewer than two points are skipped.
 */
export function pathData(lines: readonly Polyline[], digits = 1): string {
  const parts: string[] = [];
  for (const line of lines) {
    if (line.length < 2) continue;
    const first = line[0];
    const last = line[line.length - 1];
    const closed = line.length > 2 && first[0] === last[0] && first[1] === last[1];
    const pts = closed ? line.slice(0, -1) : line;
    const coords = pts.map(([x, y]) => `${round(x, digits)} ${round(y, digits)}`);
    parts.push(`M${coords.join('L')}${closed ? 'Z' : ''}`);
  }
  return parts.join('');
}
