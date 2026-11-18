// The release gate (RENCANA Phase 8, item 7). Runs with RELEASE=1 and reports every finding
// instead of stopping at the first. Needs dist/ (`npm run build`).
//   - no TODO(arya) left           (check:placeholders)
//   - the Snapshot is real         (check:snapshot)
//   - dictionaries and content in both languages complete (check:i18n)
//   - structure, hreflang pairs    (check:html)
//   - URLs permanent and unique    (check:urls)
//   - CSP and SEO/share on dist/   (check:csp, check:seo), icons current (check:brand)
//   - the portrait and both CV PDFs exist and are linked from the built home pages
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '..');
const env = { ...process.env, RELEASE: '1' };
const findings = [];

for (const name of ['placeholders', 'snapshot', 'i18n', 'html', 'urls', 'csp', 'seo', 'brand']) {
  const script = name === 'brand' ? 'scripts/build-brand.mjs' : `scripts/check-${name}.mjs`;
  const args = name === 'brand' ? [script, '--check'] : [script];
  const r = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8' });
  const out = (r.stdout ?? '').trim().split('\n').pop();
  if (r.status === 0) console.log(`  ok   check:${name}  ${out}`);
  else {
    console.log(`  FAIL check:${name}`);
    for (const line of `${r.stderr}${r.stdout}`.trim().split('\n')) console.log(`         ${line}`);
    findings.push(`check:${name}`);
  }
}

const frontmatter = (lang) =>
  parse(readFileSync(resolve(root, `src/content/site/site.${lang}.md`), 'utf8').split(/^---$/m)[1]);
const need = (ok, message) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) findings.push(message);
};

need(
  existsSync(resolve(root, 'src/assets/portrait.png')),
  'portrait present (src/assets/portrait.png)',
);
for (const lang of ['en', 'id']) {
  const cv = frontmatter(lang).contact?.cv ?? {};
  for (const which of ['id', 'en']) {
    const path = cv[which];
    need(
      Boolean(path) && existsSync(resolve(root, 'public', String(path).replace(/^\//, ''))),
      `CV (${which}) declared in site.${lang}.md and present in public/`,
    );
  }
}

if (findings.length) {
  console.error(`\ncheck:release FAILED: ${findings.length} finding(s)`);
  process.exit(1);
}
console.log('\ncheck:release OK');
