# Building `src/assets/chart.json`

The hero base map: land and bathymetry from **Natural Earth** (public domain), clipped to the
Snapshot window plus 0.5 degrees, simplified to at most 120 KB. The raw files are not committed
(`*.shp` etc. are not in the repo; unpack them outside it).

**Natural Earth version and download date: TODO(arya): fill in when run.** The download page
(`naturalearthdata.com/downloads/10m-physical-vectors/10m-bathymetry/`, checked 2026-11-17) links
the files below and `?version=4.0.0` on the all-bathymetry bundle; confirm the version on the
file you actually download, and record the date.

Real filenames (read from the page, not assumed):

| Layer  | File                                     | Used as                 |
| ------ | ---------------------------------------- | ----------------------- |
| Land   | `ne_10m_land.zip` (10m physical, "Land") | `land` rings, the coast |
| 200 m  | `ne_10m_bathymetry_K_200.zip`            | `depth["200"]`          |
| 1000 m | `ne_10m_bathymetry_J_1000.zip`           | `depth["1000"]`         |
| 2000 m | `ne_10m_bathymetry_I_2000.zip`           | `depth["2000"]`         |
| 4000 m | `ne_10m_bathymetry_G_4000.zip`           | `depth["4000"]`         |

**Not verified:** the download host below (`naturalearth.s3.amazonaws.com`) is the one Natural
Earth is commonly served from, but it could not be fetched when this was written (no download
was possible in the build session). The page's own links are
`https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/<file>.zip`.
If one host fails, use the other. The land file's name `ne_10m_land` was not on the bathymetry
page; confirm it on the "10m Physical Vectors" page.

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
