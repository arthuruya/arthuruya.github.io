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
```

`npm ci` also points git at `.githooks/` (pre-commit runs `check:colours` and
`check:sanitize`).

## Checks

```sh
npm run check          # everything below, plus a build, then the dist/ checks
npm run check:static   # no build needed
```

| Script           | Fails on                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:colours`  | any hex, `rgb()`, `hsl()` or named colour outside `src/styles/tokens.css`                                                                                                  |
| `check:sanitize` | IPv4, `password`/`secret`/`token=`, private hosts, `*.bmkg.go.id` hosts not in `scripts/allowlist.txt`, ports after hostnames (scans `src/ public/ docs/`)                 |
| `check:html`     | wrong `lang`, not exactly one `<h1>`, `<img>` without `alt`, `href="#"`, dead internal links, missing or duplicate title/description, missing `hreflang` pair (on `dist/`) |
| `check:urls`     | a built URL that existed on `main` and is gone; `urls.txt` out of date (`npm run urls:write` regenerates it)                                                               |

Also run by `check`: `astro check`, `eslint`, `prettier --check`, `vitest run`.

## Rules (short)

1. No invented facts. Missing facts are `TODO(arya): ...`.
2. Never overclaim: no code written for Awas Guncang, no tornado paper, the hero is not live data.
3. No secrets, IPs, internal hostnames, user data or raw model files in the repo.
4. One step, one commit, Conventional Commits. No push without Arya.
5. Versions come from the registry and are pinned exactly; lockfile committed.
6. Text is data: visible strings live in content files or the dictionary.
7. No UI framework, icon font, CSS-in-JS, Tailwind, or remote `<script src>`.

Fonts: see `scripts/build-fonts.md`.
