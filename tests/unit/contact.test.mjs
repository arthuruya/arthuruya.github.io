import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(import.meta.dirname, '../../public/contact.js'), 'utf8');

/** A fake element with just what contact.js touches. */
function fakeNode(attrs) {
  return {
    attrs,
    children: [],
    getAttribute(name) {
      return this.attrs[name] ?? null;
    },
    replaceChildren(...kids) {
      this.children = kids;
    },
  };
}

function run(nodes, readyState = 'complete') {
  const listeners = {};
  const document = {
    readyState,
    querySelectorAll: () => nodes,
    createElement: () => ({
      attrs: {},
      textContent: '',
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
    }),
    createTextNode: (text) => ({ text }),
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  vm.runInNewContext(source, { document });
  return listeners;
}

describe('public/contact.js', () => {
  it('builds a mailto link from the two data parts', () => {
    const node = fakeNode({
      'data-user': 'someone',
      'data-domain': 'example.org',
      'data-label': 'Email',
    });
    run([node]);
    const [label, link] = node.children;
    expect(label.text).toBe('Email: ');
    expect(link.attrs.href).toBe('mailto:someone@example.org');
    expect(link.textContent).toBe('someone@example.org');
  });

  it('leaves the fallback alone when a part is missing', () => {
    const node = fakeNode({ 'data-user': 'someone' });
    run([node]);
    expect(node.children).toEqual([]);
  });

  it('waits for DOMContentLoaded while the document is loading', () => {
    const node = fakeNode({ 'data-user': 'a', 'data-domain': 'b.test' });
    const listeners = run([node], 'loading');
    expect(node.children).toEqual([]);
    listeners.DOMContentLoaded();
    expect(node.children).toHaveLength(2);
  });
});
