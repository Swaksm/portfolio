
(function () {
  var s = Array.prototype.slice.call(document.querySelectorAll('#stage section'));
  var stage = document.getElementById('stage'), bar = document.getElementById('bar');
  var i = Math.max(0, Math.min(s.length - 1, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  s.forEach(function (el, n) { el.style.counterReset = 'page ' + n; });
  function fit() {
    var k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
  }
  function show(n) {
    i = Math.max(0, Math.min(s.length - 1, n));
    s.forEach(function (el, k) { el.classList.toggle('on', k === i); });
    bar.style.width = ((i + 1) / s.length * 100) + '%';
    history.replaceState(null, '', '#' + (i + 1));
  }
  addEventListener('resize', fit);
  addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(e.key) > -1) { e.preventDefault(); show(i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(e.key) > -1) { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(s.length - 1);
    else if (e.key === 'f') document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  });
  addEventListener('click', function (e) { show(e.clientX < innerWidth / 3 ? i - 1 : i + 1); });
  var tx = null;
  addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; });
  addEventListener('touchend', function (e) {
    if (tx === null) return;
    var d = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(d) > 40) show(i + (d < 0 ? 1 : -1));
  });
  fit(); show(i);
})();
