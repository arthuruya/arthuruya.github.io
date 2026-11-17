// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/config/site.ts';

/**
 * Serves src/pages/_design.astro at /_design/ under `astro dev` only. The underscore
 * prefix keeps Astro's router from ever building the file, so release output (and
 * check:html / check:urls) never sees it. RENCANA Phase 1: "dev-only, excluded from
 * the build for release".
 * @returns {import('astro').AstroIntegration}
 */
const designPage = () => ({
  name: 'design-page-dev-only',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command === 'dev') {
        injectRoute({ pattern: '/_design', entrypoint: './src/pages/_design.astro' });
      }
    },
  },
});

// i18n is deliberately NOT used: two explicit route trees (see RENCANA Phase 2).
export default defineConfig({
  output: 'static',
  site: SITE_URL,
  trailingSlash: 'always',
  integrations: [designPage()],
  build: {
    // Strict CSP later forbids inline styles, so every stylesheet is a file.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Astro inlines small processed <script>s into the HTML by default (checked on
      // astro 7.4.12). The Phase 8 CSP (`script-src 'self'`) forbids inline scripts,
      // so every script and asset is emitted as a file.
      assetsInlineLimit: 0,
    },
  },
});
