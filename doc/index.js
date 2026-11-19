// Page /doc/ : thème mémorisé + tri des documents par date d'upload.
// Pour ajouter un document : copier un <li> dans index.html, changer lien, titre et data-date (AAAA-MM-JJ).
(function () {
  try {
    var theme = localStorage.getItem('swaks-theme');
    if (theme) document.documentElement.dataset.theme = theme;
  } catch (e) {}

  var list = document.getElementById('docs');
  var buttons = document.querySelectorAll('.sort button');
  function sort(order) {
    var items = Array.prototype.slice.call(list.children);
    items.sort(function (a, b) {
      var d = a.getAttribute('data-date').localeCompare(b.getAttribute('data-date'));
      return order === 'asc' ? d : -d;
    });
    items.forEach(function (li) { list.appendChild(li); });
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-order') === order ? 'true' : 'false');
    });
  }
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () { sort(b.getAttribute('data-order')); });
  });
  sort('desc');
})();
