import { expect, test } from '@playwright/test';

// Counts every requestAnimationFrame call from the first script on the page.
const countRaf = () => {
  const w = window as unknown as { __raf: number };
  w.__raf = 0;
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    w.__raf++;
    return orig(cb);
  };
};

const rafCount = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __raf: number }).__raf);

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('draws the canvas exactly once and never calls requestAnimationFrame', async ({ page }) => {
    await page.addInitScript(countRaf);
    await page.goto('/');
    const canvas = page.locator('#drift-field canvas.drift-canvas');
    await expect(canvas).toHaveAttribute('data-draws', '1');
    await page.waitForTimeout(1500);
    await expect(canvas).toHaveAttribute('data-draws', '1');
    expect(await rafCount(page)).toBe(0);
  });

  test('a buoy drop still works and draws its trace at once', async ({ page }) => {
    await page.addInitScript(countRaf);
    await page.goto('/');
    const canvas = page.locator('#drift-field canvas.drift-canvas');
    await expect(canvas).toHaveAttribute('data-draws', '1');
    await page.getByRole('button', { name: 'Drop a buoy at Untia' }).click();
    await expect(page.getByRole('status')).toContainText('Buoy dropped at Untia.');
    await expect(canvas).toHaveAttribute('data-draws', '2');
    expect(await rafCount(page)).toBe(0);
  });
});

test.describe('normal motion', () => {
  test('animates, and a tap on the hero drops a buoy and updates the live region', async ({
    page,
  }) => {
    await page.addInitScript(countRaf);
    await page.goto('/');
    const canvas = page.locator('#drift-field canvas.drift-canvas');
    await expect(canvas).toBeAttached();
    await expect.poll(() => rafCount(page)).toBeGreaterThan(10);

    const live = page.getByRole('status');
    await expect(live).toBeEmpty();
    const box = (await page.locator('#drift-field').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4);
    await expect(live).toContainText('Buoy dropped.');
    await expect(live).toContainText(/drifts|land/);
  });

  test('the drop button names the place and the direction', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Drop a buoy at Makassar Strait' }).click();
    await expect(page.getByRole('status')).toContainText(
      /Buoy dropped at Makassar Strait\.\s+(It drifts|That spot)/,
    );
  });

  test('keeps the canvas out of the accessibility tree and the markers focusable', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#drift-field canvas')).toHaveAttribute('aria-hidden', 'true');
    const marker = page.getByRole('button', { name: 'Untia', exact: true });
    await marker.focus();
    await expect(page.getByText('Where I work')).toBeVisible();
  });
});

test('falls back to the static chart when the snapshot is missing', async ({ page }) => {
  await page.route('**/data/snapshot.json', (r) => r.fulfill({ status: 404, body: '' }));
  const warnings: string[] = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/');
  await expect.poll(() => warnings.length).toBe(1);
  await expect(page.locator('#drift-field canvas')).toHaveCount(0);
  await expect(page.locator('#drift-field .markers')).toBeVisible();
});
