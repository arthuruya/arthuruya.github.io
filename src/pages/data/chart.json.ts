/**
 * Serves the base map (src/assets/chart.json, built by scripts/build-chart.md) to the Drift
 * Field canvas as /data/chart.json. Optional: until the file exists the hero falls back to
 * the Snapshot's own land mask. The static hero SVG reads the same file at build time.
 */
const files = import.meta.glob('../../assets/chart.json', { eager: true, import: 'default' });

export function GET() {
  const chart = Object.values(files)[0];
  if (!chart) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify(chart), { headers: { 'content-type': 'application/json' } });
}
