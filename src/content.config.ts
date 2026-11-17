/**
 * Content collections (RENCANA Phase 2). One file per item per language:
 * `src/content/<collection>/<name>.en.md` and `<name>.id.md`. Every file repeats
 * `lang` in its frontmatter; `check:i18n` fails when it disagrees with the file
 * suffix, when a language is missing, or when the two languages' keys differ.
 *
 * Missing facts are written as an Arya-to-do marker inside the value (or in a YAML
 * comment); `check:placeholders` lists them and, with RELEASE=1, fails on any.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const lang = z.enum(['en', 'id']);
/**
 * The entry id is the file name without `.md` ("info-bmkg.en"). Without `generateId` the
 * loader takes a frontmatter `slug` as the id, and the en and id files would collide.
 */
const base = (collection: string) =>
  glob({
    pattern: '*.{en,id}.md',
    base: `./src/content/${collection}`,
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  });

/** A numbered fact. `source` is a section number of CONTEXT-Portfolio-Arya-Bratasena.md. */
const fact = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  source: z.string().regex(/^\d+(\.\d+)?$/, 'source must be a section number like "9" or "3.1"'),
});

const papers = defineCollection({
  loader: base('papers'),
  schema: z
    .object({
      lang,
      title: z.string().min(1),
      /** verbatim order from the DOI record */
      authors: z.array(z.string().min(1)).min(1),
      /** zero-based index of Arya in `authors` (the 5th author is 4) */
      selfIndex: z.number().int().min(0),
      venue: z.string().min(1),
      published: z.coerce.date(),
      doi: z.string().regex(/^10\.\d{4,9}\/\S+$/),
      url: z.url(),
      role: z.string().min(1),
      /** verbatim from the publisher page, only when quoted with attribution (F11) */
      abstract: z.string().optional(),
      /** only verified Papers are shown; an `unverified` entry fails the build */
      status: z.literal('verified'),
    })
    .refine((p) => p.selfIndex < p.authors.length, {
      message: 'selfIndex is outside authors',
      path: ['selfIndex'],
    })
    .refine((p) => p.authors[p.selfIndex] === 'Arya Bratasena Alhaq', {
      message: 'authors[selfIndex] must be "Arya Bratasena Alhaq"',
      path: ['selfIndex'],
    }),
});

const skripsi = defineCollection({
  loader: base('skripsi'),
  schema: z.object({
    lang,
    /** display order on the page */
    order: z.number().int(),
    author: z.string().min(1),
    title: z.string().min(1),
    titleEn: z.string().optional(),
    advisor: z.string().min(1),
    institution: z.string().min(1),
    pages: z.number().int().positive(),
    year: z.number().int(),
    /** public library record. There is no `repoUrl` on purpose (F13) */
    libraryUrl: z.url(),
    subjects: z.array(z.string()).default([]),
    summary: z.string().optional(),
    /** set only for a skripsi Arya assisted, never for his own */
    role: z.string().optional(),
  }),
});

const caseStudies = defineCollection({
  loader: base('caseStudies'),
  schema: z.object({
    lang,
    slug: z.enum(['info-bmkg', 'monitoring-noc', 'station-vpn']),
    order: z.number().int(),
    title: z.string().min(1),
    /** one sentence */
    dek: z.string().min(1),
    role: z.string().min(1),
    period: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    /** 3 to 5; every `source` is checked by `check:facts` */
    facts: z.array(fact).min(3).max(5),
    /**
     * Phase 6 writes these (problem, constraints, decision, result, change). Until then
     * the pages show dek, role, period, stack and facts only.
     */
    sections: z
      .object({
        problem: z.string(),
        constraints: z.string(),
        decision: z.string(),
        result: z.string(),
        change: z.string(),
      })
      .partial()
      .default({}),
  }),
});

const builds = defineCollection({
  loader: base('builds'),
  schema: z.object({
    lang,
    order: z.number().int(),
    name: z.string().min(1),
    blurb: z.string().min(1).max(160),
    stack: z.array(z.string().min(1)).min(1),
    /** public links only */
    link: z.url().optional(),
  }),
});

const principles = defineCollection({
  loader: base('principles'),
  schema: z.object({
    lang,
    order: z.number().int(),
    title: z.string().min(1),
    /** at most 30 words */
    body: z
      .string()
      .min(1)
      .refine((s) => s.trim().split(/\s+/).length <= 30, 'body is longer than 30 words'),
  }),
});

const site = defineCollection({
  loader: base('site'),
  schema: z.object({
    lang,
    name: z.string().min(1),
    meta: z.object({
      homeTitle: z.string().min(1),
      homeDescription: z.string().min(1),
      /** page title suffix for case studies, e.g. "Case study" */
      caseStudyTitleSuffix: z.string().min(1),
    }),
    nav: z.object({
      papers: z.string(),
      work: z.string(),
      about: z.string(),
      contact: z.string(),
    }),
    hero: z.object({ tagline: z.string(), next: z.string() }),
    papers: z.object({
      heading: z.string(),
      /** the gap sentence */
      lead: z.string(),
      skripsiHeading: z.string(),
    }),
    work: z.object({
      heading: z.string(),
      otherBuilds: z.string(),
      earlierHeading: z.string(),
      earlier: z.string(),
    }),
    approach: z.object({ heading: z.string() }),
    about: z.object({
      heading: z.string(),
      paragraphs: z.array(z.string()).min(1),
      photoAlt: z.string(),
    }),
    contact: z.object({
      heading: z.string(),
      lead: z.string(),
      labels: z.object({
        email: z.string(),
        linkedin: z.string(),
        github: z.string(),
        orcid: z.string(),
        cvId: z.string(),
        cvEn: z.string(),
      }),
      /** shown before JS runs and under <noscript>; the address is never in the HTML */
      emailFallback: z.string(),
      /** the two parts the address is assembled from (public/contact.js, Phase 3) */
      email: z.object({ user: z.string(), domain: z.string() }),
      links: z.object({ linkedin: z.url(), github: z.url(), orcid: z.url() }),
      /** root-relative paths of CV PDFs; omitted until the files exist (F6) */
      cv: z.object({ id: z.string().optional(), en: z.string().optional() }).default({}),
    }),
    colophon: z.object({ cookies: z.string() }),
  }),
});

export const collections = { papers, skripsi, caseStudies, builds, principles, site };
