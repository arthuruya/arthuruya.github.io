/**
 * The shape both dictionaries (en.ts, id.ts) must have. The compiler enforces the keys;
 * `check:i18n` also fails on empty values and on a value identical to the other
 * language's (except the proper-noun keys in scripts/i18n-allow-same.txt).
 *
 * The dictionary holds interface chrome. Page copy (hero, About, contact, headings)
 * lives in the `site` collection; item copy lives in the other collections.
 * Strings marked DRAFT are the agent's wording and wait for Arya's approval.
 */
export interface Dictionary {
  skipLink: string;
  theme: { toNight: string; toDay: string; night: string; day: string };
  /** names the OTHER language, in that language */
  langSwitch: { label: string };
  /** accessible names of landmarks and lists (DRAFT) */
  aria: { mainNav: string };
  /** label of the disclosure button that holds the nav on narrow screens (DRAFT) */
  menu: string;
  /** the static chart in the hero (DRAFT) */
  hero: {
    chartLabel: string;
    markerUntia: string;
    markerStrait: string;
    /** hidden paragraph that describes the animated chart */
    description: string;
    /** one-line captions on the two markers */
    captionUntia: string;
    captionStrait: string;
    /** button label; {place} is replaced */
    dropAt: string;
    /** live-region messages; {place} and {dir} are replaced */
    droppedAt: string;
    droppedHere: string;
    drifts: string;
    onLand: string;
    /** the eight compass points of the drift direction */
    compass: {
      north: string;
      'north-east': string;
      east: string;
      'south-east': string;
      south: string;
      'south-west': string;
      west: string;
      'north-west': string;
    };
  };
  paper: { authors: string; abstract: string; abstractSource: string; doi: string };
  /** labels on Skripsi cards (DRAFT) */
  skripsi: { author: string; advisor: string; pages: string; year: string; library: string };
  /** labels on case-study cards and pages (DRAFT) */
  caseStudy: {
    role: string;
    period: string;
    stack: string;
    facts: string;
    read: string;
    backHome: string;
    next: string;
  };
  backToTop: string;
  /** 404 page (DRAFT) */
  notFound: { title: string; body: string; toHome: string };
}
