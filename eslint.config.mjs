import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'public/fonts/', 'public/data/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.mjs', '*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/**/*.js', 'src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
];
