/** Typed, language-filtered, ordered access to the content collections. */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../components/types.ts';

const inLang = <T extends { data: { lang: Lang } }>(entries: T[], lang: Lang): T[] =>
  entries.filter((e) => e.data.lang === lang);

const byOrder = <T extends { data: { order: number } }>(entries: T[]): T[] =>
  [...entries].sort((a, b) => a.data.order - b.data.order);

export async function getSite(lang: Lang): Promise<CollectionEntry<'site'>['data']> {
  const [entry] = inLang(await getCollection('site'), lang);
  if (!entry) throw new Error(`site collection has no entry for "${lang}"`);
  return entry.data;
}

export async function getPapers(lang: Lang) {
  return inLang(await getCollection('papers'), lang).map((e) => e.data);
}

export async function getSkripsi(lang: Lang) {
  return byOrder(inLang(await getCollection('skripsi'), lang)).map((e) => e.data);
}

export async function getCaseStudies(lang: Lang) {
  return byOrder(inLang(await getCollection('caseStudies'), lang)).map((e) => e.data);
}

export async function getBuilds(lang: Lang) {
  return byOrder(inLang(await getCollection('builds'), lang)).map((e) => e.data);
}

export async function getPrinciples(lang: Lang) {
  return byOrder(inLang(await getCollection('principles'), lang)).map((e) => e.data);
}
