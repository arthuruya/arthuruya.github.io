# Building `src/assets/chart.json`

The hero base map: land and bathymetry from **Natural Earth** (public domain), clipped to the
Snapshot window plus 0.5 degrees, simplified to at most 120 KB. The raw files are not committed
(`*.shp` etc. are not in the repo; unpack them outside it).

**Natural Earth version 4.1.0** (from each file's `.VERSION.txt`), **downloaded 2026-11-17**. All five
files came from `naturalearth.s3.amazonaws.com` as listed below. Result: `chart.json` 91 081 bytes
(limit 120 KB), tolerance 0.0040 degrees.

Real filenames (read from the page, not assumed):

| Layer  | File                                     | Used as                 |
| ------ | ---------------------------------------- | ----------------------- |
| Land   | `ne_10m_land.zip` (10m physical, "Land") | `land` rings, the coast |
| 200 m  | `ne_10m_bathymetry_K_200.zip`            | `depth["200"]`          |
| 1000 m | `ne_10m_bathymetry_J_1000.zip`           | `depth["1000"]`         |
| 2000 m | `ne_10m_bathymetry_I_2000.zip`           | `depth["2000"]`         |
| 4000 m | `ne_10m_bathymetry_G_4000.zip`           | `depth["4000"]`         |

Commands (run in a scratch directory outside this repo):

```sh
mkdir ne && cd ne
curl -LO https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip
for f in K_200 J_1000 I_2000 G_4000; do
  curl -LO https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_bathymetry_$f.zip
done
for z in *.zip; do unzip -o "$z"; done
cd ../arthuruya.github.io
node scripts/build-chart.mjs ../ne
```

`build-chart.mjs` has no dependency (it reads the polygon `.shp` itself), clips every ring to the
box, simplifies with Douglas-Peucker (tolerance grows until the file is at most 120 KB) and
rounds to 0.001 degrees. It writes `src/assets/chart.json`, which the static hero chart reads at
build time and which is also served as `/data/chart.json` for the canvas.

Credit Natural Earth in the colophon (Phase 8).
