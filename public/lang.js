// Picks the first language on the home page only. Loaded by `/` and nowhere else, so a
// direct link to /id/ or to a case study is never hijacked. GitHub Pages cannot detect
// the language on the server. Crawlers and no-JS visitors stay on `/` (English).
(function () {
  try {
    if (location.pathname !== '/') return;
    // arrived from another page of this site (e.g. the EN link on /id/): never redirect
    if (document.referrer && new URL(document.referrer).origin === location.origin) return;
    var saved = localStorage.getItem('lang');
    var first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var wantsId = saved === 'id' || (saved !== 'en' && first.toLowerCase().indexOf('id') === 0);
    if (wantsId) location.replace('/id/');
  } catch {
    /* storage or URL unavailable: stay on the page */
  }
})();
