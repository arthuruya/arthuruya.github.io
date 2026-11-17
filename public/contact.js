// Assembles the contact address from two data- parts so it is never written in the HTML.
// Each [data-email] element holds the no-JS fallback text; here it is replaced by
// "<label>: <mailto link>". Runs once, deferred, on the home pages only.
(function () {
  function assemble() {
    var nodes = document.querySelectorAll('[data-email]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var user = node.getAttribute('data-user');
      var domain = node.getAttribute('data-domain');
      if (!user || !domain) continue;
      var address = user + '@' + domain;
      var link = document.createElement('a');
      link.setAttribute('href', 'mailto:' + address);
      link.textContent = address;
      node.replaceChildren(
        document.createTextNode((node.getAttribute('data-label') || '') + ': '),
        link,
      );
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', assemble);
  } else {
    assemble();
  }
})();
