// Checks one built page against the Content-Security-Policy (RENCANA Phase 8, item 6).
// A `<script type="application/ld+json">` block is data, not script: the browser never runs
// it and the policy does not govern it, so it is the one inline script body that is allowed.

const attrOf = (tag, name) => {
  const m = tag.match(new RegExp(`(?:^|[\\s"'/])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
};

const ALLOWED_HOSTS = new Set(['gc.zgo.at']);

/** Is this URL one the policy lets the page load? Same-origin paths always are. */
function loadable(url) {
  if (/^(?:data:|mailto:|tel:|#)/i.test(url)) return true;
  if (url.startsWith('//')) return ALLOWED_HOSTS.has(url.slice(2).split('/')[0]);
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.host);
    } catch {
      return false;
    }
  }
  return true;
}

/** @returns {string[]} one message per problem */
export function findCspIssues(html, expected) {
  const issues = [];

  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const policy = metas.find(
    (m) => attrOf(m, 'http-equiv')?.toLowerCase() === 'content-security-policy',
  );
  if (!policy) issues.push('no Content-Security-Policy <meta>');
  else {
    if (attrOf(policy, 'content') !== expected)
      issues.push('CSP <meta> differs from src/config/csp.ts');
    const at = html.indexOf(policy);
    const firstLoader = html.search(/<(?:script|link|img|style)\b/i);
    if (firstLoader !== -1 && firstLoader < at) {
      issues.push(
        'CSP <meta> comes after a script, link, img or style element, so it would not govern it',
      );
    }
  }

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const type = attrOf(m[1], 'type')?.toLowerCase();
    if (type === 'application/ld+json') continue;
    if (m[2].trim() !== '') issues.push(`inline <script> body: ${m[2].trim().slice(0, 60)}`);
  }
  if (/<style\b/i.test(html)) issues.push('inline <style> element');

  for (const tag of html.match(/<[a-z][^>]*>/gi) ?? []) {
    if (attrOf(tag, 'style') !== null) issues.push(`style= attribute: ${tag.slice(0, 70)}`);
    const handler = tag.match(/[\s"'/](on[a-z]+)\s*=/i);
    if (handler) issues.push(`${handler[1]}= handler: ${tag.slice(0, 70)}`);
    const href = attrOf(tag, 'href');
    if (href && /^\s*javascript:/i.test(href)) issues.push(`javascript: URL: ${tag.slice(0, 70)}`);
  }

  const loads = [
    ...(html.match(/<script\b[^>]*>/gi) ?? []).map((t) => ['script src', attrOf(t, 'src')]),
    ...(html.match(/<img\b[^>]*>/gi) ?? []).map((t) => ['img src', attrOf(t, 'src')]),
    ...(html.match(/<link\b[^>]*>/gi) ?? [])
      .filter((t) => !['alternate', 'canonical'].includes(attrOf(t, 'rel')?.toLowerCase() ?? ''))
      .map((t) => ['link href', attrOf(t, 'href')]),
  ];
  for (const [what, url] of loads) {
    if (url && !loadable(url)) issues.push(`${what} outside the policy: ${url}`);
  }
  return issues;
}

/** CSS and JS files must not reach for another origin either. */
export function findAssetIssues(text, kind) {
  const issues = [];
  if (kind === 'css' && /(?:@import|url\()\s*["']?(?:https?:)?\/\//i.test(text)) {
    issues.push('stylesheet loads another origin');
  }
  if (kind === 'js' && /\b(?:eval|new Function)\s*\(/.test(text)) {
    issues.push('uses eval or new Function (the policy has no unsafe-eval)');
  }
  return issues;
}
