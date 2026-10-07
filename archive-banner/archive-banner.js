/* Баннер закрытого архива: лайн-ап образов в стиле Hostem.
   Центральный образ крупный и резкий, соседние мелкие и бледные; смена каждые 3 с, стрелки и свайп.
   Список образов и цены — в массиве LOOKS (цены из раздела «Архив клуба» в Тильде). */
(function () {
  if (window.__ufabStarted) return; window.__ufabStarted = true;
  var BASE = 'https://unfadedbrand.github.io/unfaded-data/archive-banner/';
  var LOOKS = [
    { img: 'l1.webp', nm: 'Куртка косуха «Britney», эко-кожа', o: 36000, n: 18000 },
    { img: 'l2.webp', nm: 'Брюки-юбка «Walk of Fame»', o: 22000, n: 11000 },
    { img: 'l3.webp', nm: 'Брюки карго «Exit Plan»', o: 13000, n: 5600 },
    { img: 'l4.webp', nm: 'Юбка миди «Office Iconic»', o: 15700, n: 6300 },
    { img: 'l5.webp', nm: 'Бомбер «Weightless», ванильный', o: 35000, n: 14000 },
    { img: 'l6.webp', nm: 'Платье макси «Eva», винное', o: 21000, n: 8400 },
    { img: 'l7.webp', nm: 'Блузка «Zero gravity», голубая', o: 13800, n: 4100 },
    { img: 'l8.webp', nm: 'Юбка баллон «Cloud dreamer»', o: 12500, n: 3800 }
  ];
  var N = LOOKS.length;
  function rub(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' RUB'; }
  function off(o, n) { return '−' + Math.round(100 - n / o * 100) + '%'; }
  function wrapD(d) { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function geom(root, stage) {
    var W = root.clientWidth, H = stage.clientHeight, desk = W >= 960;
    return desk ? { cx: W / 2, H: H, step0: 250, step: 150, s: .5, show: 3 }
                : { cx: W / 2, H: H, step0: H * .306, step: H * .17, s: .46, show: 2 };
  }

  function init(root) {
    if (root.__ufab) return; root.__ufab = true;
    var stage = root.querySelector('.ufab__stage'), info = root.querySelector('.ufab__info');
    if (!stage || !info) return;
    stage.innerHTML = LOOKS.map(function (l) { return '<div class="ufab__fig"><img src="' + BASE + l.img + '" alt="" loading="eager"></div>'; }).join('');
    var figs = [].slice.call(stage.children), aspects = LOOKS.map(function () { return .3; });
    var k = 0, timer, lastK = -1;
    function layout() {
      var c = geom(root, stage);
      figs.forEach(function (f, i) {
        var d = wrapD(i - k), a = Math.abs(d), w = c.H * aspects[i], x = c.cx, s = 1, o = 1, blur = 0;
        if (d !== 0) { x = c.cx + (d > 0 ? 1 : -1) * (c.step0 + (a - 1) * c.step); s = c.s; o = a > c.show ? 0 : Math.max(.12, .3 - (a - 1) * .08); blur = 1.2; }
        f.style.transform = 'translateX(' + (x - w / 2).toFixed(1) + 'px) scale(' + s + ')';
        f.style.opacity = o; f.style.filter = blur ? 'blur(' + blur + 'px) grayscale(.2)' : 'none'; f.style.zIndex = 10 - a;
      });
      if (k === lastK) return; lastK = k;
      var L = LOOKS[k];
      info.style.opacity = 0; clearTimeout(info.__t);
      info.__t = setTimeout(function () {
        info.innerHTML = '<span class="ufab__lbl">В архиве из образа:</span><div class="ufab__piece"><span class="ufab__nm">' + L.nm +
          '</span><span class="ufab__pr"><s>' + rub(L.o) + '</s><b>' + rub(L.n) + '</b>&nbsp;&nbsp;' + off(L.o, L.n) + '</span></div>';
        info.style.opacity = 1;
      }, 300);
    }
    figs.forEach(function (f, i) {
      var im = f.querySelector('img');
      function set() { aspects[i] = im.naturalWidth / im.naturalHeight; f.style.transition = 'none'; lastK = -1; layout(); requestAnimationFrame(function () { f.style.transition = ''; }); }
      if (im.complete && im.naturalWidth) set(); else im.addEventListener('load', set);
    });
    function go(dir) { k = (k + dir + N) % N; layout(); restart(); }
    function restart() { clearInterval(timer); if (!reduce) timer = setInterval(function () { go(1); }, 3000); }
    var nx = root.querySelector('.ufab__arrow--r'), pv = root.querySelector('.ufab__arrow--l');
    if (nx) nx.addEventListener('click', function () { go(1); });
    if (pv) pv.addEventListener('click', function () { go(-1); });
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); x0 = null; });
    window.addEventListener('resize', function () { lastK = k; layout(); });
    // первая раскладка без анимации, чтобы фигуры не «прилетали» с края
    figs.forEach(function (f) { f.style.transition = 'none'; });
    layout();
    requestAnimationFrame(function () { requestAnimationFrame(function () { figs.forEach(function (f) { f.style.transition = ''; }); }); });
    restart();
  }
  function start() { var r = document.querySelectorAll('.ufab'); if (!r.length) return setTimeout(start, 500); [].forEach.call(r, init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
