import { expect, test } from './fixtures';

test.use({ javaScriptEnabled: false });

test('JS off: home content is readable and the hero shows its static chart', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main')).not.toBeEmpty();
  await expect(page.locator('#drift-field')).toBeVisible();
});
