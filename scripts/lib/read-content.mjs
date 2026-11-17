import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';

/** Read every `<name>.<lang>.md` under `contentDir/<collection>/`. */
export function readCollections(contentDir) {
  const out = [];
  for (const collection of readdirSync(contentDir).sort()) {
    const dir = join(contentDir, collection);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir).sort()) {
      const m = file.match(/^(.+)\.(en|id)\.md$/);
      if (!m) throw new Error(`${collection}/${file}: expected <name>.en.md or <name>.id.md`);
      const { data } = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
      out.push({ collection, file, name: m[1], lang: m[2], data });
    }
  }
  return out;
}
