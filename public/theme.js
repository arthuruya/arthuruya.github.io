// Sync in <head>, before first paint. Max 400 bytes (tests/unit/theme.test.mjs).
(function (d, t) {
  try {
    t = localStorage.getItem('theme');
  } catch {
    // storage can throw
  }
  if (t !== 'day' && t !== 'night')
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  d.dataset.theme = t;
})(document.documentElement);
