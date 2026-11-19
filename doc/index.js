// Tri des documents par date d'upload (attribut data-date="AAAA-MM-JJ" sur chaque <li>).
// Pour ajouter un document : copier un <li> dans index.html et changer lien, titre et date.
(function () {
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
