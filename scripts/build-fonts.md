# Fonts: provenance and rebuild

Self-hosted under `public/fonts/`, woff2 only, variable, subsetted to Latin + Latin-1
supplement + the punctuation the site uses. Total 123,236 bytes (budget 180 KB).
All three are SIL OFL 1.1; the licence text shipped with each upstream source is in
`public/fonts/LICENSES/` (checked in the downloaded files, not assumed).

| File                                   | Upstream (downloaded 2026-11-15)                                                                                                                                                                                  | Axes kept                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `atkinson-hyperlegible-next-var.woff2` | `googlefonts/atkinson-hyperlegible-next` @ `7925f50`, `fonts/variable/AtkinsonHyperlegibleNext[wght].ttf` (the Braille Institute's typeface; upstream copyright "The Atkinson Hyperlegible Next Project Authors") | wght 400-700             |
| `newsreader-var.woff2`                 | `productiontype/Newsreader` @ `cfcb4f7`, `fonts/variable/ttf/Newsreader[opsz,wght].ttf`                                                                                                                           | wght 400-700, opsz 12-72 |
| `ibm-plex-mono-var.woff2`              | `IBM/plex` release `@ibm/plex-mono-variable@1.0.0` (published 2026-07-30), `IBM Plex Mono Var-Roman.ttf`                                                                                                          | wght 400-600             |

Upright styles only. No italics are shipped; add one only if a page needs it and the
budget allows.

## Commands

fonttools 4.68.0 and brotli 1.2.1 in a throwaway virtualenv (not part of the repo).

```sh
U="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+2190,U+2192,U+2032,U+2033,U+2264,U+00B7,U+00D7,U+00B0"
F="kern,liga,calt,ccmp,locl,mark,mkmk,tnum,pnum,lnum,onum,zero,case,frac,ordn,sups,subs"

fonttools varLib.instancer Newsreader[opsz,wght].ttf wght=400:700 opsz=12:72 -o nr.ttf
fonttools varLib.instancer AtkinsonHyperlegibleNext[wght].ttf wght=400:700 -o ahn.ttf
fonttools varLib.instancer "IBM Plex Mono Var-Roman.ttf" wght=400:600 -o plex.ttf

pyftsubset X.ttf --unicodes="$U" --layout-features="$F" --flavor=woff2 \
  --no-hinting --desubroutinize --output-file=X.woff2
```

## Known gaps

- Atkinson Hyperlegible Next and Newsreader have no glyph for `→ ←` (both do have `≤`).
  IBM Plex Mono has all of them. Set arrows inside `IBM Plex Mono` spans; anywhere else
  they fall back to a system font.
- IBM Plex declares the Reserved Font Name "Plex". The subset keeps the upstream family
  name internally, as Google Fonts subsets do. If that is a concern, rename before
  public release.

## Metric-matched fallbacks (`src/styles/fonts.css`)

Computed from hhea metrics and a letter-frequency weighted average advance width:

| Web font                   | Local fallback  | size-adjust | ascent  | descent | line-gap |
| -------------------------- | --------------- | ----------- | ------- | ------- | -------- |
| Atkinson Hyperlegible Next | Arial           | 99.97%      | 98.43%  | 31.61%  | 0%       |
| Newsreader (opsz 18)       | Times New Roman | 100.72%     | 72.98%  | 26.31%  | 0%       |
| IBM Plex Mono              | Courier New     | 99.98%      | 102.52% | 27.5%   | 0%       |
