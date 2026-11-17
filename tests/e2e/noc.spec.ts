import { expect, test, type Page } from '@playwright/test';

const EN = '/work/monitoring-noc/';
const ID = '/id/work/monitoring-noc/';
const ORDER = [
  'uplink',
  'router',
  'core-switch',
  'access-switch',
  'access-point',
  'cellular-modem',
  'datalogger',
  'station-data',
];

const state = (page: Page, id: string) =>
  page.locator(`[data-node="${id}"]`).getAttribute('data-state');

/** What has focus: a node id, "switch", "reset" or "other". */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return 'none';
    if (el.dataset.node) return el.dataset.node;
    if (el.hasAttribute('data-naive')) return 'switch';
    if (el.hasAttribute('data-reset')) return 'reset';
    return 'other';
  });

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('renders the static figure with the example failure and a caption', async ({ page }) => {
    await page.goto(EN);
    await expect(page.locator('[data-graph]')).toBeVisible();
    expect(await state(page, 'cellular-modem')).toBe('alarm');
    expect(await state(page, 'datalogger')).toBe('suppressed');
    expect(await state(page, 'station-data')).toBe('suppressed');
    expect(await state(page, 'router')).toBe('ok');
    await expect(page.locator('[data-status]').first()).toHaveText('OK');
    await expect(page.locator('[data-caption]')).toBeVisible();
    await expect(page.locator('[data-caption]')).toContainText('Cellular modem');
    await expect(page.locator('[data-caption]')).toContainText('suppressed: 2');
    await expect(page.locator('[data-controls]')).toBeHidden();
    // honest semantics: nothing claims to be a button when it cannot act as one
    await expect(page.locator('[data-node][role="button"]')).toHaveCount(0);
    await expect(page.locator('[data-graph]')).toHaveAttribute('role', 'img');
  });
});

test.describe('with JavaScript', () => {
  test('nodes become buttons and the figure starts on the same state as the static one', async ({
    page,
  }) => {
    await page.goto(EN);
    await expect(page.locator('[data-node][role="button"]')).toHaveCount(8);
    await expect(page.locator('[data-controls]')).toBeVisible();
    await expect(page.locator('[data-caption]')).toBeHidden();
    expect(await state(page, 'cellular-modem')).toBe('alarm');
    await expect(page.locator('[data-count]')).toHaveText('1');
    // the first render does not announce anything
    await expect(page.locator('[data-summary]')).toHaveText('');
  });

  test('keyboard only: Tab order, Enter and Space toggle, switch, reset', async ({ page }) => {
    await page.goto(EN);
    await expect(page.locator('[data-controls]')).toBeVisible();

    // Tab from the top of the page until the first node has focus, then record the order.
    let guard = 0;
    while ((await focused(page)) !== 'uplink' && guard++ < 60) await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('uplink');
    const seen = ['uplink'];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      seen.push(await focused(page));
    }
    expect(seen).toEqual([...ORDER, 'switch', 'reset']);
    // the sequence is printed so a run records it in the phase status block
    console.log('NOC Tab sequence:', seen.join(' > '));

    // Enter on the router: a second, independent failure -> two alarms
    await page.locator('[data-node="router"]').focus();
    await page.keyboard.press('Enter');
    expect(await state(page, 'router')).toBe('alarm');
    await expect(page.locator('[data-node="router"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-count]')).toHaveText('2');
    await expect(page.locator('[data-summary]')).toHaveText(
      '2 alarms: Router, Cellular modem. 5 checks suppressed.',
    );

    // Space on the uplink: it becomes the one root cause, everything else is suppressed
    await page.locator('[data-node="uplink"]').focus();
    await page.keyboard.press('Space');
    expect(await state(page, 'uplink')).toBe('alarm');
    expect(await state(page, 'router')).toBe('suppressed');
    expect(await state(page, 'cellular-modem')).toBe('suppressed');
    await expect(page.locator('[data-count]')).toHaveText('1');
    await expect(page.locator('[data-summary]')).toHaveText(
      '1 alarm: Uplink. 7 checks suppressed.',
    );

    // the switch shows what monitoring without dependencies would do
    await page.locator('[data-naive]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-naive]')).toBeChecked();
    await expect(page.locator('[data-count]')).toHaveText('8');
    expect(await state(page, 'access-point')).toBe('alarm');
    await expect(page.locator('[data-summary]')).toContainText('8 alarms without dependencies');

    // reset clears the failures and the switch
    await page.locator('[data-reset]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-naive]')).not.toBeChecked();
    await expect(page.locator('[data-count]')).toHaveText('0');
    await expect(page.locator('[data-summary]')).toHaveText('No alarms. Everything is OK.');
    for (const id of ORDER) expect(await state(page, id)).toBe('ok');
  });

  test('Space on a node does not scroll the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto(EN);
    const node = page.locator('[data-node="router"]');
    await node.scrollIntoViewIfNeeded();
    await node.focus();
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('each node has a name that includes its state', async ({ page }) => {
    await page.goto(EN);
    await expect(page.locator('[data-node="cellular-modem"]')).toHaveAttribute(
      'aria-label',
      'Cellular modem: ALARM',
    );
    await expect(page.locator('[data-node="datalogger"]')).toHaveAttribute(
      'aria-label',
      'Datalogger: suppressed',
    );
  });

  test('has no transitions or animations on the diagram', async ({ page }) => {
    await page.goto(EN);
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('[data-noc] *')]
        .map((el) => {
          const s = getComputedStyle(el);
          return [s.transitionDuration, s.animationName];
        })
        .flat(),
    );
    for (const d of durations) expect(['0s', 'none']).toContain(d);
  });

  test('reduced motion: same behaviour, no motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(EN);
    await page.locator('[data-node="router"]').click();
    expect(await state(page, 'router')).toBe('alarm');
  });

  test('the Indonesian page is in Indonesian', async ({ page }) => {
    await page.goto(ID);
    await expect(page.locator('[data-node="core-switch"]')).toHaveAttribute(
      'aria-label',
      'Switch inti: OK',
    );
    await page.locator('[data-node="datalogger"]').click();
    await expect(page.locator('[data-summary]')).toHaveText(
      'Satu alarm: Modem seluler. 2 pemeriksaan ditekan.',
    );
  });

  test('on a phone the figure scrolls sideways and the page does not', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(EN);
    const { pageOverflow, figureScrolls } = await page.evaluate(() => {
      const root = document.documentElement;
      const scroller = document.querySelector('[data-scroll]') as HTMLElement;
      return {
        pageOverflow: root.scrollWidth > root.clientWidth,
        figureScrolls: scroller.scrollWidth > scroller.clientWidth,
      };
    });
    expect(pageOverflow).toBe(false);
    expect(figureScrolls).toBe(true);
  });
});
