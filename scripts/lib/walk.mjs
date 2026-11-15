import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const BINARY = new Set([
  '.woff2',
  '.woff',
  '.ttf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.ico',
  '.pdf',
  '.bin',
  '.zip',
]);

/** Recursively list files under `dir`. Missing directories yield nothing. */
export function walk(dir, { skipBinary = true } = {}) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries.sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, { skipBinary }));
    } else if (!skipBinary || !BINARY.has(extname(name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/** 1-based line number of a character index. */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}
