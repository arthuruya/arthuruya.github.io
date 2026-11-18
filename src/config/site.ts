/**
 * The one place the public origin is set. Changing the custom domain later
 * means changing this constant and `public/CNAME`, nothing else (RENCANA F7).
 */
export const SITE_URL = 'https://arthuruya.github.io';

/** Public source repository (hosting decision, RENCANA section 1). */
export const SOURCE_URL = 'https://github.com/arthuruya/arthuruya.github.io';

/**
 * GoatCounter site code (RENCANA F8). Empty means no counter script at all. The script is
 * also left out of `astro dev`, and GoatCounter itself skips local pageviews.
 */
export const GOATCOUNTER_CODE: string = 'arya-bratasena';
