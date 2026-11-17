import { parse } from 'yaml';

/** Split a Markdown file into YAML frontmatter data and body. Throws when there is none. */
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('no YAML frontmatter');
  return { data: parse(m[1]) ?? {}, body: m[2] };
}
