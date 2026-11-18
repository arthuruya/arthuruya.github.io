/**
 * Structured data (RENCANA Phase 8, item 2): one Person for the home page and one
 * ScholarlyArticle for the one verified Paper. Nothing else: no Review, no Rating, and no
 * property that CONTEXT-Portfolio-Arya-Bratasena.md does not state.
 */
import { SITE_URL } from '../config/site.ts';
import type { Lang } from '../components/types.ts';

const abs = (path: string) => new URL(path, SITE_URL).href;

export interface PersonInput {
  lang: Lang;
  homePath: string;
  name: string;
  jobTitle: string;
  worksFor: string;
  alumniOf: string;
  sameAs: string[];
}

export function personLd(p: PersonInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: abs(p.homePath),
    jobTitle: p.jobTitle,
    worksFor: { '@type': 'Organization', name: p.worksFor },
    alumniOf: { '@type': 'CollegeOrUniversity', name: p.alumniOf },
    sameAs: p.sameAs,
  };
}

export interface ArticleInput {
  title: string;
  /** in the order of the DOI record */
  authors: string[];
  venue: string;
  published: Date;
  doi: string;
  url: string;
  abstract?: string;
}

export function articleLd(a: ArticleInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: a.title,
    author: a.authors.map((name) => ({ '@type': 'Person', name })),
    datePublished: a.published.toISOString().slice(0, 10),
    isPartOf: { '@type': 'Periodical', name: a.venue },
    identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: a.doi },
    url: a.url,
    // the papers are published in English whichever language the page is in
    inLanguage: 'en',
    ...(a.abstract ? { abstract: a.abstract } : {}),
  };
}
