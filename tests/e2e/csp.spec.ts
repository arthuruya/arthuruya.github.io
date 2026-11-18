import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// The built pages carry a strict Content-Security-Policy <meta>. A violation is silent for the
// visitor (the feature just stops working), so these tests listen for every violation while the
// scripted parts of the site are used: hero and theme toggle, NOC diagram.

const SLUGS = ['info-bmkg', 'monitoring-noc', 'station-vpn', 'untia-net'];
const PAGES = ['/', '/id/', ...SLUGS.flatMap((s) => [`/work/${s}/`, `/id/work/${s}/`])];

/** Collects securitypolicyviolation events and CSP console errors. */
async function watch(page: Page) {
  const seen: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} blocked ${e.blockedURI}`,
      );
    });
  });
  page.on('console', (m) => {
    if (/content security policy/i.test(m.text())) seen.push(m.text());
  });
  page.on('pageerror', (e) => seen.push(`pageerror: ${e.message}`));
  return async () => [
    ...seen,
    ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])),
  ];
}

for (const path of PAGES) {
  test(`no CSP violation while loading ${path}`, async ({ page }) => {
    const violations = await watch(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await violations()).toEqual([]);
  });
}

test('the home page works under the policy: hero and theme toggle', async ({ page }) => {
  const violations = await watch(page);
  await page.goto('/');
  const canvas = page.locator('#drift-field canvas.drift-canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Drop a buoy at Untia' }).click();
  await expect(page.getByRole('status')).toContainText('Buoy dropped at Untia.');
  await page.getByRole('button', { name: /Switch to night chart|Switch to day chart/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(day|night)$/);
  await page.waitForTimeout(500);
  expect(await violations()).toEqual([]);
});

test('the NOC diagram works under the policy', async ({ page }) => {
  const violations = await watch(page);
  await page.goto('/work/monitoring-noc/');
  await page.locator('[data-naive]').first().click();
  await page.locator('[data-reset]').first().click();
  await page.waitForTimeout(300);
  expect(await violations()).toEqual([]);
});

test('the counter script is requested from the one host the policy allows', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => {
    if (/gc\.zgo\.at|goatcounter/.test(r.url())) asked.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(asked).toEqual(['https://gc.zgo.at/count.js']);
});

test('a policy violation is detected (control)', async ({ page }) => {
  const violations = await watch(page);
  await page.goto('/');
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = 'window.__ran = true';
    document.head.appendChild(s);
  });
  expect(
    await page.evaluate(() => (window as unknown as { __ran?: boolean }).__ran),
  ).toBeUndefined();
  expect((await violations()).join('\n')).toMatch(/script-src/);
});
