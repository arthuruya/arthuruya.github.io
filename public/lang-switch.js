// Remembers a manual language choice: a click on a language link stores it. The link is a
// normal <a hreflang>, so navigation works without this script.
document.addEventListener('click', function (event) {
  var link = event.target instanceof Element ? event.target.closest('[data-lang-switch]') : null;
  if (!link) return;
  try {
    localStorage.setItem('lang', link.getAttribute('data-lang-switch'));
  } catch {
    /* storage unavailable: the choice is just not remembered */
  }
});
