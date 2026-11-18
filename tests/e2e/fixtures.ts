import { expect, test as base } from '@playwright/test';

/**
 * Every spec imports `test` from here. The page loads GoatCounter's count.js from
 * gc.zgo.at in production; in tests that would hit the real network (and print a console
 * warning of its own on a local address). Answer it with an empty script instead, so runs
 * are the same offline and never reach the counter. The policy still has to allow the request.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('https://gc.zgo.at/**', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: '' }),
    );
    await use(context);
  },
});

export { expect };
