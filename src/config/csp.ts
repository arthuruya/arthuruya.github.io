/**
 * The Content-Security-Policy (RENCANA Phase 8, item 6), the one place it is written.
 * `Base.astro` renders it into a `<meta http-equiv>`; `check:csp` compares every built
 * page against this string.
 *
 * GoatCounter hosts are the ones its own documentation lists
 * (https://www.goatcounter.com/code/csp, read 2026-11-18): `script-src https://gc.zgo.at`
 * for count.js and a `connect-src` on the counter endpoint for the beacon.
 *
 * `frame-ancestors`, `X-Frame-Options` and HSTS cannot be set from a meta tag or on
 * GitHub Pages; the colophon says so.
 */
export const CSP_DIRECTIVES = [
  `default-src 'none'`,
  `script-src 'self' https://gc.zgo.at`,
  `style-src 'self'`,
  `img-src 'self' data: https://*.goatcounter.com`,
  `font-src 'self'`,
  `connect-src 'self' https://*.goatcounter.com`,
  `base-uri 'none'`,
  `form-action 'none'`,
] as const;

export const CSP = CSP_DIRECTIVES.join('; ');
