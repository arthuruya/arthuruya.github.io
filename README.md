# arthuruya.github.io

Portfolio site of Arya Bratasena Alhaq. Astro static output, plain TypeScript, no UI
framework in the browser, no CDN. Build plan: `RENCANA.md` (kept outside this repo).

## Run

```sh
nvm use            # Node 26 (.nvmrc)
npm ci
npm run dev        # http://localhost:4321
npm run build      # static site to dist/
npm run preview
npm run test:e2e   # Playwright against dist/ (build first)
```

`npm run dev` first writes a **synthetic** current field to `public/data/` (`scripts/dev-field.mjs`;
never overwrites a real one, never runs in production, git-ignored). The Drift Field base map
comes from `scripts/build-chart.md`.

`npm ci` also points git at `.githooks/` (pre-commit runs `check:colours` and
`check:sanitize`).

## Checks

```sh
npm run check          # everything below, plus a build, then the dist/ checks
npm run check:static   # no build needed
```

| Script               | Fails on                                                                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:colours`      | any hex, `rgb()`, `hsl()` or named colour outside `src/styles/tokens.css`                                                                                                                                                                                                                 |
| `check:sanitize`     | IPv4, `password`/`secret`/`token=`, private hosts, `*.bmkg.go.id` hosts not in `scripts/allowlist.txt`, ports after hostnames (scans `src/ public/ docs/`)                                                                                                                                |
| `check:contrast`     | a text/background pair in `src/styles/pairs.json` below its WCAG threshold (4.5 text, 3 UI) in day or night; a day colour with no night value                                                                                                                                             |
| `check:style`        | gradients, `backdrop-filter`, blur/drop-shadow filters, shadows heavier than a 1px rule, radius above 4px, Inter/Space Grotesk, custom cursors                                                                                                                                            |
| `check:html`         | wrong `lang`, not exactly one `<h1>`, `<img>` without `alt`, `href="#"`, dead internal links, missing or duplicate title/description, missing `hreflang` pair (on `dist/`)                                                                                                                |
| `check:i18n`         | the two dictionaries (`src/i18n/`) differ in keys, an empty value, a value identical in both languages (allow-list `scripts/i18n-allow-same.txt`); a content file missing in one language, a `lang` that disagrees with the file name, different keys or `order` between the two versions |
| `check:facts`        | a case-study `facts[]` entry without a `source`, with a section that is not in `scripts/context-sections.json`, or with a number that is not written in that section; the two languages citing different sources                                                                          |
| `check:placeholders` | lists every `TODO(arya)` in `src/` and `public/`; with `RELEASE=1` any hit fails (Phase 8 uses it)                                                                                                                                                                                        |
| `check:snapshot`     | the Drift Field data (`public/data/`) is malformed or out of limits; with `RELEASE=1` also missing or flagged `synthetic` (spec: `docs/snapshot-spec.md`)                                                                                                                                 |
| `check:urls`         | a built URL that existed on `main` and is gone; `urls.txt` out of date (`npm run urls:write` regenerates it)                                                                                                                                                                              |

## Content and languages

Two explicit route trees: `/` and `/id/`; slugs are identical. Content lives in
`src/content/<collection>/<name>.en.md` and `<name>.id.md` (schemas in
`src/content.config.ts`); interface strings in `src/i18n/en.ts` and `id.ts`. Routes:
`src/lib/routes.ts`. Missing facts are `TODO(arya): ...` in the file.

Four case studies, each at `/work/<slug>/` and `/id/work/<slug>/`: `info-bmkg`,
`monitoring-noc`, `station-vpn`, `untia-net`. Adding one means a slug in
`CASE_STUDY_SLUGS` (`src/lib/routes.ts`), the same slug in the `caseStudies` schema, both
language files, and `npm run urls:write`. Other builds (`src/content/builds/`) are cards on
the home page only, with no page of their own.

`public/lang.js` runs only on `/` (Indonesian browser or saved choice goes to `/id/`);
`public/lang-switch.js` runs everywhere and remembers a manual switch.
`scripts/context-sections.json` is generated from the context document that stays
outside this repo (`node scripts/sync-context-sections.mjs <path>`); `check:facts` reads it.

Also run by `check`: `astro check`, `eslint`, `prettier --check`, `vitest run`.

## Rules (short)

1. No invented facts. Missing facts are `TODO(arya): ...`.
2. Never overclaim: no code written for Awas Guncang, no tornado paper, the hero is not live data.
3. No secrets, IPs, internal hostnames, user data or raw model files in the repo.
4. One step, one commit, Conventional Commits. No push without Arya.
5. Versions come from the registry and are pinned exactly; lockfile committed.
6. Text is data: visible strings live in content files or the dictionary.
7. No UI framework, icon font, CSS-in-JS, Tailwind, or remote `<script src>`.

## Design system

Tokens: `src/styles/tokens.css` (day on `:root`, night on `:root[data-theme='night']`).
Components: `src/components/`. Theme bootstrap: `public/theme.js` (sync, max 400 bytes).

`npm run dev`, then open `/_design/`: every component in both languages; the chart
switch shows both themes. The page exists only under `astro dev` (injected in
`astro.config.mjs`) and is never built. Phase 1 screenshots: `docs/design/`.

Fonts: see `scripts/build-fonts.md`.
