# Snapshot spec: the files the Drift Field reads

For Arya, who extracts the Snapshot privately. The extraction script, credentials and any raw
model file never enter this repo (ADR 0001, RENCANA section 0 rule 4). This page is the whole
contract; if something here is unclear, `npm run check:snapshot` is the authority.

Two files go in `public/data/`:

- `snapshot.json`: the header.
- `snapshot.bin`: the numbers.

## 1. What to take from BMKG InaCAWO Flows

- **Surface layer** of the current (the shallowest depth level), `u` (eastward) and `v`
  (northward).
- **Window** 116°E to 123°E and 8°S to 2°N, grid spacing 0.1°. That is 71 by 101 cells.
- **24 to 48 hourly steps** in one run (48 is the current file). `steps` must be at least 24.
- Units **cm/s**.

Conventions (also in ADR 0001):

1. Select dimensions **by name** (`time`, `lat`, `lon`, depth), never by position: the axis order
   differs between model eras.
2. Take the **land mask from `u` and `v`** themselves (the model's own missing values), not from a
   separate coastline file.
3. Direction is the oceanographic **flow-toward** vector, `atan2(u, v)`, with no +180° flip. The
   site never converts; it reads `u` and `v` as "toward".
4. Surface layer only.

## 2. `snapshot.json`

```json
{
  "version": 1,
  "synthetic": false,
  "source": "BMKG InaCAWO Flows, surface layer",
  "bbox": { "lon0": 116.0, "lon1": 123.0, "lat0": -8.0, "lat1": 2.0 },
  "dlon": 0.1,
  "dlat": 0.1,
  "nx": 71,
  "ny": 101,
  "steps": 48,
  "dtSeconds": 3600,
  "t0": "2026-10-29T00:00:00Z",
  "units": "cm/s",
  "convention": "toward",
  "scale": 1,
  "fill": -32768
}
```

| Field                  | Rule                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `version`              | `1`                                                                                     |
| `synthetic`            | **`false`** for real data. `true` is only for the development field and fails a release |
| `source`               | non-empty text                                                                          |
| `bbox`, `dlon`, `dlat` | as above; `lon1 > lon0`, `lat1 > lat0`                                                  |
| `nx`, `ny`             | `nx = round((lon1 - lon0) / dlon) + 1`, `ny` likewise (71 and 101)                      |
| `steps`, `dtSeconds`   | number of time steps (at least 24) and seconds between them (3600)                      |
| `t0`                   | time of step 0 in **UTC**, ISO form `YYYY-MM-DDTHH:MM:SSZ`                              |
| `units`                | `"cm/s"`                                                                                |
| `convention`           | `"toward"`                                                                              |
| `scale`                | integer multiplier stored with the values; 1 stores whole cm/s. Use 10 to keep 0.1 cm/s |
| `fill`                 | the Int16 value that means land or missing (-32768)                                     |

## 3. `snapshot.bin`

Little-endian **Int16**, order `[step][j][i][component]`:

- `step` from 0 (time `t0`) upward in time.
- `j` from `lat0` **northward** (row 0 is 8°S), `i` from `lon0` **eastward** (column 0 is 116°E).
- `component` 0 is `u` (eastward), 1 is `v` (northward), in cm/s **times `scale`**, rounded.
- Land and missing: `fill` in **both** components of that cell and step.

Length in values is `nx * ny * steps * 2`, so in bytes `nx * ny * steps * 4`. For 71 by 101 by 48
that is 1 376 832 bytes. It must be at most **2 MB**.

## 4. What `check:snapshot` fails on

`npm run check:snapshot` (also part of `check:static`) reports every one of these:

- the header is missing a field, has a wrong type, or `nx` / `ny` disagree with `bbox` and spacing;
- `t0` is not a UTC ISO time; `units` or `convention` is wrong;
- `snapshot.bin` is not exactly `nx * ny * steps * 2` Int16 values, or is over 2 MB;
- any non-fill cell has speed above **400 cm/s**;
- more than **70 %** of the cells are `fill`;
- `steps` is below 24.

With `RELEASE=1` it also fails when the files are missing or `synthetic` is `true`.

## 5. Putting it in place

1. Write the two files to `public/data/`.
2. Delete the two `public/data/snapshot.*` lines at the end of `.gitignore` (they exist so the
   synthetic development field is never committed).
3. `RELEASE=1 npm run check:snapshot` must print OK.
4. `scripts/dev-field.mjs` never overwrites a real file (`synthetic: false`) and does nothing
   under `NODE_ENV=production`.

The hero carries no data label. Credit (BMKG InaCAWO Flows, Natural Earth) goes in the
colophon in Phase 8.

## 6. The last extraction, checked on 2026-11-17

The file staged in `myself/docs/` (not in this repo) matched this contract: `synthetic: false`,
bbox 116 to 123°E and 8°S to 2°N, 0.1°, 71 by 101, 48 steps, `t0` 2026-10-29T00:00:00Z, 1 376 832
bytes, 27.7 % fill, maximum speed 198.6 cm/s.
