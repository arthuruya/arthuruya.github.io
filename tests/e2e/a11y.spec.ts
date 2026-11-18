import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const SLUGS = ['info-bmkg', 'monitoring-noc', 'station-vpn', 'untia-net'];
const PAGES = ['/', '/id/', ...SLUGS.flatMap((s) => [`/work/${s}/`, `/id/work/${s}/`])];

for (const scheme of ['light', 'dark'] as const) {
  for (const path of PAGES) {
    test(`axe: ${path} (${scheme}) has zero violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        scheme === 'dark' ? 'night' : 'day',
      );
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      ).toEqual([]);
    });
  }
}
