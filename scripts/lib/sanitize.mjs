import { lineOf } from './walk.mjs';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const WORDS = /passw(?:or)?d|secret/gi;
const TOKEN_ASSIGN = /token\s*=/gi;
const PRIVATE_HOST =
  /\b(?:localhost|[\w-]+\.(?:local|internal|lan|corp|intranet|home|localdomain))\b/gi;
const BMKG_HOST = /\b(?:[a-z0-9-]+\.)*bmkg\.go\.id\b/gi;
const HOST_PORT =
  /\b(?:[a-z0-9-]+\.)+[a-z]{2,}:\d{2,5}\b|\blocalhost:\d{2,5}\b|:\/\/[^/\s]+:\d{2,5}\b/gi;

/** Parse `scripts/allowlist.txt`: one literal per line, `#` starts a comment. */
export function parseAllowlist(text) {
  return new Set(
    text
      .split('\n')
      .map((l) => l.replace(/#.*/, '').trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Find strings that must never appear in the public repo.
 * Returns [{ line, message }]. A match whose exact text is in `allow` is skipped.
 */
export function findSanitizeViolations(text, allow = new Set()) {
  const hits = [];
  const scan = (re, label, test = () => true) => {
    for (const m of text.matchAll(re)) {
      const value = m[0].toLowerCase();
      if (allow.has(value) || !test(m)) continue;
      hits.push({ line: lineOf(text, m.index), message: `${label}: ${m[0]}` });
    }
  };

  scan(IPV4, 'IPv4 address');
  scan(WORDS, 'forbidden word');
  scan(TOKEN_ASSIGN, 'token assignment');
  scan(PRIVATE_HOST, 'private or local host');
  scan(BMKG_HOST, 'bmkg.go.id host not in allowlist');
  scan(HOST_PORT, 'port number after hostname');
  return hits;
}
