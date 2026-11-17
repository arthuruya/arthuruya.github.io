import { describe, expect, it } from 'vitest';
import {
  caseStudyWords,
  checkContentParity,
  checkFacts,
  compareDictionaries,
  extractContextSections,
  findBannedWords,
  findPlaceholders,
  flatten,
  numberTokens,
  parseAllowSame,
  parseBannedWords,
  proseOf,
  wordCount,
} from '../../scripts/lib/content-checks.mjs';
import { parseFrontmatter } from '../../scripts/lib/frontmatter.mjs';

describe('flatten and numberTokens', () => {
  it('flattens objects and arrays to paths', () => {
    expect([...flatten({ a: { b: 'x' }, c: ['y', 'z'] }).keys()]).toEqual(['a.b', 'c[0]', 'c[1]']);
  });
  it('reads numbers out of text', () => {
    expect(numberTokens('12M+')).toEqual(['12']);
    expect(numberTokens('Zabbix 7.0, 3,5')).toEqual(['7.0', '3.5']);
    expect(numberTokens('Android and iOS')).toEqual([]);
  });
});

describe('check:i18n dictionaries', () => {
  const en = { a: 'Hello', b: { c: 'World' }, doi: 'DOI' };
  it('passes matching dictionaries', () => {
    expect(
      compareDictionaries(en, { a: 'Halo', b: { c: 'Dunia' }, doi: 'DOI' }, new Set(['doi'])),
    ).toEqual([]);
  });
  it('flags a missing key in either direction', () => {
    const p = compareDictionaries(en, { a: 'Halo', doi: 'DOI', extra: 'x' }, new Set(['doi']));
    expect(p.join('\n')).toMatch(/"b\.c" is missing in id/);
    expect(p.join('\n')).toMatch(/"extra" is missing in en/);
  });
  it('flags an empty value', () => {
    const p = compareDictionaries(en, { a: ' ', b: { c: 'Dunia' }, doi: 'DOI' }, new Set(['doi']));
    expect(p.join('\n')).toMatch(/id: "a" is empty/);
  });
  it('flags an untranslated value unless allow-listed', () => {
    const id = { a: 'Hello', b: { c: 'Dunia' }, doi: 'DOI' };
    expect(compareDictionaries(en, id, new Set(['doi'])).join('\n')).toMatch(
      /"a" has the same value/,
    );
    expect(compareDictionaries(en, id, new Set(['doi', 'a']))).toEqual([]);
  });
  it('parses the allow-list with comments', () => {
    expect([...parseAllowSame('# c\npaper.doi  # DOI\n\n')]).toEqual(['paper.doi']);
  });
});

describe('check:i18n content', () => {
  const f = (over) => ({
    collection: 'builds',
    file: 'x.en.md',
    name: 'x',
    lang: 'en',
    data: { lang: 'en', order: 1, name: 'X' },
    ...over,
  });
  const idf = (data = {}) =>
    f({ file: 'x.id.md', lang: 'id', data: { lang: 'id', order: 1, name: 'X', ...data } });

  it('passes a complete pair', () => {
    expect(checkContentParity([f(), idf()])).toEqual([]);
  });
  it('flags a missing language, a lang mismatch, a missing key and a differing order', () => {
    expect(checkContentParity([f()]).join('\n')).toMatch(/"id" version is missing/);
    expect(checkContentParity([f(), idf({ lang: 'en' })]).join('\n')).toMatch(
      /does not match the file name/,
    );
    expect(
      checkContentParity([f({ data: { lang: 'en', order: 1, name: 'X', link: 'u' } }), idf()]).join(
        '\n',
      ),
    ).toMatch(/"link" is missing in id/);
    expect(checkContentParity([f(), idf({ order: 2 })]).join('\n')).toMatch(/"order" differs/);
  });
  it('requires a case-study slug to match its file name', () => {
    const cs = f({ collection: 'caseStudies', data: { lang: 'en', slug: 'other' } });
    expect(
      checkContentParity([
        cs,
        { ...cs, file: 'x.id.md', lang: 'id', data: { lang: 'id', slug: 'x' } },
      ]).join('\n'),
    ).toMatch(/slug "other"/);
  });
});

describe('check:facts', () => {
  const sections = {
    9: { title: 'Angka', numbers: ['12', '35'] },
    3.1: { title: 'NOC', numbers: ['7.0'] },
  };
  const study = (facts, lang = 'en') => ({
    collection: 'caseStudies',
    file: `a.${lang}.md`,
    name: 'a',
    lang,
    data: { facts },
  });

  it('passes a sourced fact whose numbers are in the section', () => {
    expect(checkFacts([study([{ label: 'L', value: '12M+', source: '9' }])], sections)).toEqual([]);
  });
  it('fails a missing or unknown source', () => {
    expect(checkFacts([study([{ label: 'L', value: 'x' }])], sections).join('\n')).toMatch(
      /source is missing/,
    );
    expect(
      checkFacts([study([{ label: 'L', value: 'x', source: '99' }])], sections).join('\n'),
    ).toMatch(/not a section/);
  });
  it('fails an invented number', () => {
    expect(
      checkFacts([study([{ label: 'L', value: '13M+', source: '9' }])], sections).join('\n'),
    ).toMatch(/number 13 does not appear in section 9/);
  });
  it('fails when the two languages cite different sources', () => {
    const p = checkFacts(
      [
        study([{ label: 'L', value: '12', source: '9' }]),
        study([{ label: 'L', value: '12', source: '3.1' }], 'id'),
      ],
      sections,
    );
    expect(p.join('\n')).toMatch(/facts sources differ/);
  });
});

describe('check:facts on prose', () => {
  const sections = {
    9: { title: 'Angka', numbers: ['12', '35'] },
    3.1: { title: 'NOC', numbers: ['7.0', '6.0'] },
  };
  const study = (body) => ({
    collection: 'caseStudies',
    file: 'a.en.md',
    name: 'a',
    lang: 'en',
    data: { facts: [{ label: 'L', value: '35', source: '9' }], ...body },
  });

  it('passes prose whose numbers are in a cited section', () => {
    expect(
      checkFacts(
        [study({ sections: { result: ['About 35 devices, 12M+ downloads.'] } })],
        sections,
      ),
    ).toEqual([]);
  });
  it('fails a number in prose that no cited section has', () => {
    const p = checkFacts([study({ sections: { decision: ['From 6.0 to 7.0 LTS.'] } })], sections);
    expect(p.join('\n')).toMatch(/sections\.decision\[0\]: the number 6\.0 is in no section/);
  });
  it('checks the dek and link labels too', () => {
    expect(checkFacts([study({ dek: 'Over 40 sites' })], sections).join('\n')).toMatch(
      /dek: the number 40/,
    );
    expect(
      checkFacts([study({ links: [{ label: 'Version 9', href: '/' }] })], sections).join('\n'),
    ).toMatch(/links\[0\]: the number 9/);
  });
  it('lists the prose of a study in order', () => {
    expect(
      proseOf({ dek: 'd', sections: { problem: ['a', 'b'] }, links: [{ label: 'l' }] }).map(
        (p) => p.path,
      ),
    ).toEqual(['dek', 'sections.problem[0]', 'sections.problem[1]', 'links[0]']);
  });
});

describe('check:copy', () => {
  const banned = parseBannedWords('# c\nleverag*\nrobust\ncutting-edge\nkelas dunia\n');

  it('finds banned words as whole words, any case, with stems', () => {
    const hits = findBannedWords(
      'We Leveraged it.\nA robust,\nrobustness ok\nKelas  dunia',
      banned,
    );
    expect(hits.map((h) => [h.line, h.match])).toEqual([
      [1, 'Leveraged'],
      [2, 'robust'],
      [4, 'Kelas  dunia'],
    ]);
  });
  it('does not match inside a longer word', () => {
    expect(findBannedWords('unrobust cutting-edged', banned)).toEqual([]);
  });
  it('counts the words a reader sees on a case study', () => {
    expect(wordCount('  one two\nthree ')).toBe(3);
    expect(
      caseStudyWords({
        title: 'Info BMKG',
        role: 'Lead',
        period: '2022',
        dek: 'One two.',
        sections: { problem: ['a b c'] },
        links: [{ label: 'x y', href: '/' }],
        stack: ['not', 'counted'],
      }),
    ).toBe(11);
  });
});

describe('check:placeholders, context sections and frontmatter', () => {
  it('finds TODO(arya) with its line', () => {
    expect(findPlaceholders('a\nperiod: TODO(arya): x\nb')).toEqual([
      { line: 2, text: 'period: TODO(arya): x' },
    ]);
    expect(findPlaceholders('nothing here')).toEqual([]);
  });
  it('extracts sections with their numbers', () => {
    const md =
      '# T\n## 9. Angka\n- **12M+** unduhan\n### 2.1 Info\n- v3.5.x\n## 10. Catatan\nno digits';
    expect(extractContextSections(md)).toEqual({
      9: { title: 'Angka', numbers: ['12'] },
      2.1: { title: 'Info', numbers: ['3.5'] },
      10: { title: 'Catatan', numbers: [] },
    });
  });
  it('parses frontmatter and rejects a file without it', () => {
    expect(parseFrontmatter('---\na: 1\n---\nbody').data).toEqual({ a: 1 });
    expect(() => parseFrontmatter('no matter')).toThrow(/no YAML frontmatter/);
  });
});
