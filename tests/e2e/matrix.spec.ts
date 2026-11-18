import { expect, test } from './fixtures';

// Home page: {EN, ID} x {day, night} x {motion, reduced motion}.
const LANGS = [
  { name: 'EN', path: '/', lang: 'en' },
  { name: 'ID', path: '/id/', lang: 'id' },
];
const THEMES = [
  { name: 'day', scheme: 'light' as const },
  { name: 'night', scheme: 'dark' as const },
];
const MOTIONS = [
  { name: 'motion', value: 'no-preference' as const },
  { name: 'reduced-motion', value: 'reduce' as const },
];

for (const l of LANGS)
  for (const t of THEMES)
    for (const m of MOTIONS) {
      test.describe(`home ${l.name} ${t.name} ${m.name}`, () => {
        test.beforeEach(async ({ page }) => {
          await page.emulateMedia({ colorScheme: t.scheme, reducedMotion: m.value });
          await page.goto(l.path);
        });

        test('renders one h1, the right lang and theme, no horizontal scroll', async ({ page }) => {
          await expect(page.locator('html')).toHaveAttribute('lang', l.lang);
          await expect(page.locator('html')).toHaveAttribute('data-theme', t.name);
          await expect(page.locator('h1')).toHaveCount(1);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
        });

        test('visual baseline (hero canvas masked)', async ({ page }) => {
          await page.waitForLoadState('networkidle');
          await expect(page).toHaveScreenshot(`home-${l.name}-${t.name}-${m.name}.png`, {
            fullPage: true,
            mask: [page.locator('#drift-field')],
            animations: 'disabled',
          });
        });
      });
    }

// Case-study pages: EN day, both widths come from the projects.
test.describe('case studies EN day', () => {
  for (const slug of ['info-bmkg', 'monitoring-noc', 'station-vpn', 'untia-net']) {
    test(`${slug} loads with no horizontal scroll`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(`/work/${slug}/`);
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
