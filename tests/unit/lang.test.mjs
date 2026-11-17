import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const read = (f) => readFileSync(resolve(import.meta.dirname, '../../public', f), 'utf8');

/** Run public/lang.js against fake browser globals and report where it navigated. */
function runLang({ pathname = '/', referrer = '', saved = null, languages = ['en-US'] } = {}) {
  let replaced = null;
  const sandbox = {
    location: { pathname, origin: 'https://site.test', replace: (u) => (replaced = u) },
    document: { referrer },
    localStorage: { getItem: (k) => (k === 'lang' ? saved : null) },
    navigator: { languages },
    URL,
  };
  vm.runInNewContext(read('lang.js'), sandbox);
  return replaced;
}

describe('public/lang.js', () => {
  it('sends an Indonesian browser to /id/', () => {
    expect(runLang({ languages: ['id-ID', 'en'] })).toBe('/id/');
  });
  it('keeps other browsers on /', () => {
    expect(runLang({ languages: ['en-US'] })).toBeNull();
  });
  it('obeys a saved choice over the browser language', () => {
    expect(runLang({ saved: 'en', languages: ['id'] })).toBeNull();
    expect(runLang({ saved: 'id', languages: ['en'] })).toBe('/id/');
  });
  it('never runs off the home page', () => {
    expect(runLang({ pathname: '/id/', languages: ['id'] })).toBeNull();
    expect(runLang({ pathname: '/work/info-bmkg/', saved: 'id' })).toBeNull();
  });
  it('does not redirect a visitor who came from this site', () => {
    expect(runLang({ referrer: 'https://site.test/id/', languages: ['id'] })).toBeNull();
  });
  it('still redirects a visitor who came from elsewhere', () => {
    expect(runLang({ referrer: 'https://other.test/', languages: ['id'] })).toBe('/id/');
  });
  it('survives storage that throws', () => {
    const sandbox = {
      location: { pathname: '/', origin: 'o', replace: () => {} },
      document: { referrer: '' },
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      navigator: { languages: ['id'] },
      URL,
    };
    expect(() => vm.runInNewContext(read('lang.js'), sandbox)).not.toThrow();
  });
});

describe('public/lang-switch.js', () => {
  it('stores the language of a clicked switch link', () => {
    const store = {};
    let handler;
    class El {}
    const link = { getAttribute: () => 'id' };
    const target = Object.assign(new El(), {
      closest: (sel) => (sel === '[data-lang-switch]' ? link : null),
    });
    vm.runInNewContext(read('lang-switch.js'), {
      Element: El,
      document: { addEventListener: (_e, h) => (handler = h) },
      localStorage: { setItem: (k, v) => (store[k] = v) },
    });
    handler({ target });
    expect(store.lang).toBe('id');
  });
});
