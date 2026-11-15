// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/config/site.ts';

// i18n is deliberately NOT used: two explicit route trees (see RENCANA Phase 2).
export default defineConfig({
  output: 'static',
  site: SITE_URL,
  trailingSlash: 'always',
  build: {
    // Strict CSP later forbids inline styles, so every stylesheet is a file.
    inlineStylesheets: 'never',
  },
});
