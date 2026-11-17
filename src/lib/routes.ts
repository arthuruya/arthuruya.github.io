/**
 * The permanent URL table (RENCANA Phase 2; `check:urls` enforces it).
 * Slugs are identical in both languages; the Indonesian tree is under /id/.
 */
import type { Lang } from '../components/types.ts';

export const CASE_STUDY_SLUGS = [
  'info-bmkg',
  'monitoring-noc',
  'station-vpn',
  'untia-net',
] as const;
export type CaseStudySlug = (typeof CASE_STUDY_SLUGS)[number];

export const homePath = (lang: Lang): string => (lang === 'id' ? '/id/' : '/');

export const workPath = (lang: Lang, slug: CaseStudySlug): string =>
  `${homePath(lang)}work/${slug}/`;

export const otherLang = (lang: Lang): Lang => (lang === 'en' ? 'id' : 'en');

/** Every indexable page, as [en path, id path] pairs of the same page. */
export const pagePairs = (): [string, string][] => [
  [homePath('en'), homePath('id')],
  ...CASE_STUDY_SLUGS.map((s): [string, string] => [workPath('en', s), workPath('id', s)]),
];
