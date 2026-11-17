// Pure logic behind check:i18n, check:facts and check:placeholders (no file access).

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Flatten nested objects and arrays to a Map of "a.b[0].c" -> leaf value. */
export function flatten(value, prefix = '', out = new Map()) {
  if (Array.isArray(value)) {
    if (value.length === 0) out.set(prefix, value);
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, value);
  }
  return out;
}

/** Parse the allow-same file: one dictionary key path per line, `#` comments. */
export const parseAllowSame = (text) =>
  new Set(
    text
      .split('\n')
      .map((l) => l.replace(/#.*/, '').trim())
      .filter(Boolean),
  );

/** Compare the two dictionaries. Returns a list of problem strings. */
export function compareDictionaries(en, id, allowSame = new Set()) {
  const a = flatten(en);
  const b = flatten(id);
  const problems = [];
  for (const k of a.keys()) if (!b.has(k)) problems.push(`dictionary key "${k}" is missing in id`);
  for (const k of b.keys()) if (!a.has(k)) problems.push(`dictionary key "${k}" is missing in en`);
  for (const [lang, map] of [
    ['en', a],
    ['id', b],
  ]) {
    for (const [k, v] of map) {
      if (typeof v !== 'string' || v.trim() === '') problems.push(`${lang}: "${k}" is empty`);
    }
  }
  for (const [k, v] of a) {
    if (b.has(k) && v === b.get(k) && v !== '' && !allowSame.has(k)) {
      problems.push(
        `"${k}" has the same value in en and id ("${v}"); translate it or add it to scripts/i18n-allow-same.txt`,
      );
    }
  }
  return problems;
}

/**
 * Check content files. `files` is [{ collection, file, name, lang, data }] where `lang` and
 * `name` come from the file name (`<name>.<lang>.md`).
 */
export function checkContentParity(files) {
  const problems = [];
  const groups = new Map();
  for (const f of files) {
    const key = `${f.collection}/${f.name}`;
    groups.set(key, { ...groups.get(key), [f.lang]: f });
    if (f.data.lang !== f.lang) {
      problems.push(
        `${f.collection}/${f.file}: frontmatter lang "${f.data.lang}" does not match the file name "${f.lang}"`,
      );
    }
    if (f.collection === 'caseStudies' && f.data.slug !== f.name) {
      problems.push(
        `${f.collection}/${f.file}: slug "${f.data.slug}" does not match the file name`,
      );
    }
  }
  for (const [key, pair] of groups) {
    for (const l of ['en', 'id']) {
      if (!pair[l]) problems.push(`${key}: the "${l}" version is missing`);
    }
    if (!pair.en || !pair.id) continue;
    const a = flatten(pair.en.data);
    const b = flatten(pair.id.data);
    for (const k of a.keys())
      if (k !== 'lang' && !b.has(k)) problems.push(`${key}: "${k}" is missing in id`);
    for (const k of b.keys())
      if (k !== 'lang' && !a.has(k)) problems.push(`${key}: "${k}" is missing in en`);
    for (const k of ['order', 'selfIndex', 'pages', 'year']) {
      if (a.has(k) && b.has(k) && a.get(k) !== b.get(k)) {
        problems.push(`${key}: "${k}" differs between en (${a.get(k)}) and id (${b.get(k)})`);
      }
    }
  }
  return problems;
}

/** Numbers in a string: "12M+" -> ["12"], "Zabbix 7.0" -> ["7.0"]. */
export const numberTokens = (text) =>
  (String(text).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.'));

/**
 * check:facts. `sections` is the generated scripts/context-sections.json:
 * { "9": { title, numbers: [...] }, ... }. Every fact needs a real section, and every
 * number in its value must appear in that section. The two languages must carry the
 * same sources in the same order.
 */
export function checkFacts(caseStudies, sections) {
  const problems = [];
  for (const cs of caseStudies) {
    const where = `caseStudies/${cs.file}`;
    const facts = cs.data.facts;
    if (!Array.isArray(facts) || facts.length === 0) {
      problems.push(`${where}: no facts[]`);
      continue;
    }
    facts.forEach((f, i) => {
      const at = `${where} facts[${i}] (${f?.label})`;
      if (!f || typeof f.source !== 'string' || f.source === '') {
        problems.push(`${at}: source is missing`);
        return;
      }
      const section = sections[f.source];
      if (!section) {
        problems.push(`${at}: source "${f.source}" is not a section of the context document`);
        return;
      }
      for (const n of numberTokens(f.value)) {
        if (!section.numbers.includes(n)) {
          problems.push(`${at}: the number ${n} does not appear in section ${f.source}`);
        }
      }
    });
  }
  const bySlug = new Map();
  for (const cs of caseStudies) {
    bySlug.set(cs.name, { ...bySlug.get(cs.name), [cs.lang]: cs });
  }
  for (const [slug, pair] of bySlug) {
    if (!pair.en || !pair.id) continue;
    const a = (pair.en.data.facts ?? []).map((f) => f.source).join(',');
    const b = (pair.id.data.facts ?? []).map((f) => f.source).join(',');
    if (a !== b)
      problems.push(`caseStudies/${slug}: facts sources differ between en (${a}) and id (${b})`);
  }
  return problems;
}

/** check:placeholders. Returns [{ line, text }] for each TODO(arya). */
export function findPlaceholders(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (/TODO\(arya\)/.test(line)) out.push({ line: i + 1, text: line.trim() });
  });
  return out;
}

/**
 * Build the context-sections table from CONTEXT-Portfolio-Arya-Bratasena.md headings
 * ("## 9. Angka ...", "### 3.1 Network ..."). Each section keeps its title and the numbers
 * written in its own text (up to the next heading).
 */
export function extractContextSections(markdown) {
  const sections = {};
  let current = null;
  for (const line of markdown.split('\n')) {
    const h = line.match(/^#{2,3}\s+(\d+(?:\.\d+)?)\.?\s+(.*)$/);
    if (h) {
      current = h[1];
      sections[current] = { title: h[2].trim(), numbers: new Set(numberTokens(h[2])) };
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      current = null;
      continue;
    }
    if (current) for (const n of numberTokens(line)) sections[current].numbers.add(n);
  }
  return Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k, { title: v.title, numbers: [...v.numbers] }]),
  );
}
