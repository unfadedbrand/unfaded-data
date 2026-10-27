/* Хэллоуин 2026 «Найди тёмную сторону» — три пасхалки на unfadedstore.com.
   1) кошка выглядывает из-за карточки образа (/dark-side)  → DARK
   2) паутина с пауком в углу карточки чёрной вещи (каталог) → SIDE
   3) «В корзину» на странице одного чёрного товара: из кнопки вылетают мыши → 31 (+ весь код, когда найдены все три)
   Анимации — LottieFiles (Lottie Simple License): «Black cat green eyes peeping» (Kanika Kalra),
   «Spider swinging» (Ali Azwad), «Bat - Halloween» (Priyanshu Rijhwani). Паутина — своя SVG.

   ВЫКЛЮЧАТЕЛЬ: ON = false (или удалить подключение из «Настройки сайта → HTML-код») — снимает всё разом.
   Кроме того, вне окна START..END скрипт ничего не делает. Превью до старта: добавить к адресу ?ufhw=1 (держится до закрытия вкладки; ?ufhw=0 — выключить) */
(function () {
  var ON = true;
  var START = Date.parse('2026-10-27T00:00:00+03:00');
  var END = Date.parse('2026-11-02T00:00:00+03:00');
  var CFG = window.UF_HW || {};
  var BASE = CFG.base || 'https://unfadedbrand.github.io/unfaded-data/halloween/';
  var LOTTIE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_light.min.js';
  var CODE = 'DARKSIDE31';
  var KEY = 'ufhw26';

  // Где прячем. uid — data-product-uid ИЛИ data-product-gen-uid карточки Тильды (товары даёт основная сессия к 24.10).
  // sel — свой элемент на странице (образы на /dark-side размечены data-ufhw-egg="cat").
  // path — на каких страницах показывать (регулярка по location.pathname).
  var EGGS = [
    // кошка — над образом 01 на /dark-side; паутина — боди «Perfect Heist» TP01NY25 (каталог и «Все тёмные вещи»)
    { id: 'cat', part: 'DARK', sel: '[data-ufhw-egg="cat"]', uid: CFG.catUid || '', path: /^\/dark-side/ },
    { id: 'web', part: 'SIDE', sel: '[data-ufhw-egg="web"]', uid: CFG.webUid || '489195528052', path: /^\/(catalog|dark-side)\/?$/, scope: (CFG.scopes || {}).web },
    // мыши — кнопка «В корзину» куртки «Brat» JB01FW26 (страница товара / окно товара из «Новинок»), не на /dark-side
    { id: 'bat', part: '31', sel: '', uid: CFG.batUid || '129405090853', path: null, cart: true }
  ];
  if (CFG.paths) EGGS.forEach(function (e) { if (CFG.paths[e.id]) e.path = CFG.paths[e.id]; });
  var PARTS = ['DARK', 'SIDE', '31'];

  // ?ufhw=1 — тестовый режим до 27.10 (съёмка СММ 25.10); запоминается до закрытия вкладки, чтобы переходы по сайту
  // (каталог → карточка товара) не сбрасывали его. ?ufhw=0 — выключить.
  var ss = null; try { ss = window.sessionStorage; } catch (e) {}
  if (/[?&]ufhw=1\b/.test(location.search)) { try { ss.setItem('ufhw', '1'); } catch (e) {} }
  if (/[?&]ufhw=0\b/.test(location.search)) { try { ss.removeItem('ufhw'); } catch (e) {} }
  var preview = /[?&]ufhw=1\b/.test(location.search) || CFG.preview || (function () { try { return ss.getItem('ufhw') === '1'; } catch (e) { return false; } })();
  if (!ON || window.__ufhwStarted) return;
  var now = Date.now();
  if (!preview && (now < START || now >= END)) return;
  window.__ufhwStarted = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- найденные части (localStorage, без него тоже работает) ----------
  function loadFound() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveFound(f) { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {} }
  var found = loadFound();
  function countFound() { return PARTS.filter(function (p) { return found[p]; }).length; }

  function goal(name) {
    try {
      var id = CFG.ymId || (Object.keys(window).filter(function (k) { return /^yaCounter\d+$/.test(k); })[0] || '').replace('yaCounter', '');
      if (window.ym && id) window.ym(+id, 'reachGoal', name);
    } catch (e) {}
  }

  // ---------- lottie: библиотека и файлы грузятся только когда пасхалка в зоне видимости ----------
  var libP = null, jsonCache = {};
  function lib() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (libP) return libP;
    libP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = LOTTIE_SRC; s.async = true;
      s.onload = function () { res(window.lottie); }; s.onerror = rej; document.head.appendChild(s);
    });
    return libP;
  }
  function data(name) {
    if (!jsonCache[name]) jsonCache[name] = fetch(BASE + 'lottie/' + name + '.json').then(function (r) { return r.text(); });
    // lottie меняет объект данных — каждой копии свой экземпляр
    return jsonCache[name].then(function (t) { return JSON.parse(t); });
  }
  function anim(el, name, opts) {
    return Promise.all([lib(), data(name)]).then(function (r) {
      return r[0].loadAnimation({ container: el, renderer: 'svg', loop: !!opts.loop, autoplay: !!opts.autoplay, animationData: r[1],
        rendererSettings: { preserveAspectRatio: opts.par || 'xMidYMax meet' } });
    });
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && e.target.__ufhwWake) { io.unobserve(e.target); e.target.__ufhwWake(); } });
  }, { rootMargin: '150px 0px' }) : null;
  function whenVisible(el, fn) { if (io) { el.__ufhwWake = fn; io.observe(el); } else fn(); }

  // ---------- плашка ----------
  var toastEl = null, toastT = 0;
  function toast(part) {
    var n = countFound(), all = n === 3;
    if (toastEl) toastEl.remove();
    clearTimeout(toastT);
    var t = document.createElement('div');
    t.className = 'ufhw-toast'; t.setAttribute('role', 'dialog'); t.setAttribute('aria-live', 'polite');
    t.innerHTML = '<button class="ufhw-toast__x" type="button" aria-label="Закрыть">×</button>' +
      (all
        ? '<p class="ufhw-toast__n">Найдено: 3 из 3</p><p class="ufhw-toast__lead">Ваш код</p>'
        : '<p class="ufhw-toast__n">Найдено: ' + n + ' из 3</p><p class="ufhw-toast__part">' + part + '</p>') +
      '<div class="ufhw-toast__slots">' + PARTS.map(function (p) {
        return '<span class="ufhw-toast__slot' + (found[p] ? ' is-found' : '') + '">' + (found[p] ? p : '····') + '</span>';
      }).join('') + '</div>' +
      (all
        ? '<button class="ufhw-toast__code" type="button">' + CODE + '<small>Скопировать код</small></button>' +
          '<p class="ufhw-toast__terms">−13% на весь заказ до 1 ноября. Введите код в корзине.<br>Не суммируется с CREDITS и другими промокодами.</p>'
        : '<p class="ufhw-toast__hint">Ищите дальше</p>');
    document.body.appendChild(t); toastEl = t;
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('is-in'); }); });
    function close() { t.classList.remove('is-in'); setTimeout(function () { t.remove(); }, 300); if (toastEl === t) toastEl = null; }
    t.querySelector('.ufhw-toast__x').addEventListener('click', close);
    var codeBtn = t.querySelector('.ufhw-toast__code');
    if (codeBtn) codeBtn.addEventListener('click', function () {
      var small = codeBtn.querySelector('small');
      function ok() { small.textContent = 'Скопировано'; goal('hw_code_copy'); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CODE).then(ok, function () { sel(); });
      else sel();
      function sel() { var r = document.createRange(); r.selectNodeContents(codeBtn.firstChild); var s = getSelection(); s.removeAllRanges(); s.addRange(r); small.textContent = 'Код выделен — скопируйте'; }
    });
    if (!all) toastT = setTimeout(close, 6000);
  }
  function reveal(egg) {
    var first = !found[egg.part];
    found[egg.part] = 1; saveFound(found);
    if (first) goal('hw_egg_' + egg.id);
    if (first && countFound() === 3) goal('hw_all_found');
    toast(egg.part);
  }
  function stop(e) { e.preventDefault(); e.stopPropagation(); }

  // ---------- 1. кошка ----------
  function mountCat(host, egg) {
    var w = document.createElement('div'); w.className = 'ufhw-cat';
    w.innerHTML = '<div class="ufhw-cat__body"></div><button class="ufhw-cat__hit" type="button" aria-label="Кошка выглядывает — нажми"></button>';
    host.appendChild(w);
    var body = w.firstChild, hit = w.lastChild, a = null, busy = false;
    whenVisible(w, function () {
      anim(body, 'cat-peeping', { loop: false, autoplay: false }).then(function (an) {
        a = an;
        var svg = an.renderer.svgElement; svg.style.overflow = 'visible';
        [].forEach.call(svg.querySelectorAll('[clip-path]'), function (n) { n.removeAttribute('clip-path'); });
        // выглянуть (кадры 0–30), дальше — моргать/дышать в петле 30–77
        an.playSegments([[0, 77]], true);
        an.addEventListener('complete', function () { an.loop = true; an.playSegments([[30, 77]], true); });
      });
    });
    hit.addEventListener('click', function (e) {
      stop(e); if (busy) return; busy = true;
      var W = w.offsetWidth;
      var k = reduce ? [{ transform: 'none' }, { transform: 'none' }] : [
        { transform: 'translateY(0) rotate(0)', offset: 0 },
        { transform: 'translateY(' + (-W * .95) + 'px) rotate(0)', offset: .22, easing: 'ease-out' },
        { transform: 'translateY(' + (-W * .8) + 'px) rotate(-9deg)', offset: .38 },
        { transform: 'translateY(' + (-W * .8) + 'px) rotate(9deg)', offset: .56 },
        { transform: 'translateY(' + (-W * .8) + 'px) rotate(0)', offset: .7 },
        { transform: 'translateY(' + (-W * .8) + 'px) rotate(0)', offset: .8, easing: 'ease-in' },
        { transform: 'translateY(0) rotate(0)', offset: 1 }
      ];
      var jump = body.animate(k, { duration: reduce ? 10 : 1700 });
      setTimeout(function () { reveal(egg); }, reduce ? 0 : 650);
      jump.onfinish = function () { busy = false; };
    });
  }

  // ---------- 2. паутина ----------
  function webSvg() {
    var R = [0, 18, 36, 54, 72, 90], rings = [22, 40, 60, 82], d = [];
    function pt(r, deg) { var a = deg * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; }
    R.forEach(function (deg) { var p = pt(104, deg); d.push('M0 0L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)); });
    rings.forEach(function (r, ri) {
      for (var i = 0; i < R.length - 1; i++) {
        var j = (i + ri) % 3 ? 0 : 1.5; // лёгкая неровность — рисовано «от руки»
        var p1 = pt(r + j, R[i]), p2 = pt(r - j, R[i + 1]), m = pt(r * .82, (R[i] + R[i + 1]) / 2);
        d.push('M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'Q' + m[0].toFixed(1) + ' ' + m[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1));
      }
    });
    return '<svg class="ufhw-web__net" viewBox="0 0 100 100" aria-hidden="true">' + d.map(function (s, i) {
      var dx = ((i * 37) % 13 - 6), r = ((i * 53) % 17 - 8);
      return '<path d="' + s + '" style="--d:' + ((i * 29) % 260) + 'ms;--dx:' + dx + 'px;--r:' + r + 'deg"/>';
    }).join('') + '</svg>';
  }
  function mountWeb(host, egg) {
    if (found.SIDE) return; // уже сметена на этом устройстве — после перерисовки каталога не возвращаем
    var w = document.createElement('div'); w.className = 'ufhw-web';
    w.setAttribute('role', 'button'); w.setAttribute('tabindex', '0'); w.setAttribute('aria-label', 'Паутина — смахни');
    w.innerHTML = webSvg() + '<div class="ufhw-web__spider"></div>';
    host.appendChild(w);
    var sp = w.lastChild, a = null, done = false;
    whenVisible(w, function () {
      anim(sp, 'spider-swinging', { loop: false, autoplay: false, par: 'xMidYMin meet' }).then(function (an) {
        a = an;
        if (reduce) { an.goToAndStop(63, true); return; }
        // спуск на нити (0–42), дальше качается туда-обратно между кадрами 42 и 98
        an.playSegments([0, 98], true);
        an.addEventListener('complete', function () {
          if (done) return;
          var fwd = an.playDirection !== 1;
          an.playSegments(fwd ? [42, 98] : [98, 42], true);
        });
      });
    });
    function tear(e) {
      if (e) stop(e); if (done) return; done = true;
      // паук уползает вверх: та же анимация назад, быстро — нить сматывается
      if (a && !reduce) { var f = Math.round(a.currentFrame + (a.firstFrame || 0)); a.setSpeed(3); a.playSegments([Math.max(f, 1), 0], true); }
      w.classList.add('is-torn');
      setTimeout(function () { reveal(egg); }, reduce ? 0 : 750);
      setTimeout(function () { w.remove(); host.__ufhwWebGone = true; }, 1600);
    }
    w.addEventListener('click', tear);
    w.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') tear(e); });
    // свайп по паутине (телефон): сдвиг пальца > 24px в любую сторону
    var sx = 0, sy = 0;
    w.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    w.addEventListener('touchmove', function (e) {
      var t = e.touches[0]; if (Math.abs(t.clientX - sx) > 24 || Math.abs(t.clientY - sy) > 24) tear();
    }, { passive: true });
    // Тильда открывает товар по клику на ссылку карточки — гасим и «призрачный» клик после свайпа
    w.addEventListener('touchend', function (e) { if (done) e.preventDefault(); });
  }

  // ---------- 3. мыши ----------
  function flock(r) {
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var layer = document.createElement('div'); layer.className = 'ufhw-flock'; document.body.appendChild(layer);
    var vw = innerWidth, vh = innerHeight, N = vw < 640 ? 12 : 14, longest = 0;
    for (var i = 0; i < N; i++) (function (i) {
      var el = document.createElement('div'); el.className = 'ufhw-flock__bat';
      el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.style.opacity = '0';
      layer.appendChild(el);
      // веер вверх и в стороны: углы от −165° до −15°, дальние — крупнее, как будто летят на нас
      var ang = (-165 + 150 * (i + Math.random() * .7) / N) * Math.PI / 180;
      var dist = Math.min(vw, vh) * (.38 + Math.random() * .42);
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - vh * .08;
      var s1 = 1 + Math.random() * .6, tilt = (dx > 0 ? 1 : -1) * (8 + Math.random() * 18);
      var dur = 1100 + Math.random() * 500, delay = Math.random() * 400;
      longest = Math.max(longest, dur + delay);
      anim(el, 'bat', { loop: true, autoplay: true, par: 'xMidYMid meet' }).then(function (an) { an.setSpeed(1 + Math.random() * .7); el.__a = an; });
      el.animate([
        { transform: 'translate(0,0) scale(.15) rotate(0)', opacity: 0 },
        { transform: 'translate(' + dx * .12 + 'px,' + (dy * .1 - 14) + 'px) scale(.35) rotate(' + -tilt * .4 + 'deg)', opacity: 1, offset: .14 },
        { transform: 'translate(' + dx * .55 + 'px,' + dy * .5 + 'px) scale(' + s1 * .75 + ') rotate(' + tilt * .6 + 'deg)', opacity: 1, offset: .55 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s1 * 1.2 + ') rotate(' + tilt + 'deg)', opacity: 0 }
      ], { duration: dur, delay: delay, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'forwards' });
    })(i);
    setTimeout(function () {
      [].forEach.call(layer.children, function (el) { if (el.__a) el.__a.destroy(); });
      layer.remove();
    }, longest + 200);
  }
  // Срабатывает, только если вещь правда легла в корзину (не выбран размер — Тильда не добавит, мышей нет).
  // Товар добавляется как обычно: клик не перехватываем. Мыши — один раз на устройстве.
  var BAT = EGGS.filter(function (e) { return e.cart; })[0];
  function cartQty() {
    try { return (window.tcart && window.tcart.products || []).reduce(function (n, p) { return n + (+p.quantity || 1); }, 0); } catch (e) { return 0; }
  }
  function isBatProduct(btn) {
    if (btn.hasAttribute('data-ufhw-egg')) return true; // превью
    // липкая полоса «В корзину» внизу страницы товара на телефоне (brand-popup-fix.js) — относится к товару страницы
    var p = btn.classList.contains('uf-sticky-buy__btn') ? document.querySelector('.t-store__product-snippet')
      : btn.closest('.t-store__product-snippet, .js-store-product, .js-product, [data-product-gen-uid]');
    return !!(p && BAT.uid && (p.getAttribute('data-product-gen-uid') === BAT.uid || p.getAttribute('data-product-uid') === BAT.uid));
  }
  // на «Тёмной стороне» «Brat» тоже есть (образы 01 и 12) — там мыши не вылетают, третья часть прячется среди новинок
  var batWhere = CFG.batWhere || function () { return !/^\/dark-side/.test(location.pathname); };
  var batBusy = false;
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.t-store__prod-popup__btn, .t-store__card__btn, [data-ufhw-egg="bat"]');
    if (!btn || batBusy || found['31'] || !isBatProduct(btn) || !batWhere(btn)) return;
    lib(); data('bat'); // прогреть, пока Тильда кладёт вещь в корзину
    var before = cartQty(), r = btn.getBoundingClientRect();
    // нажали липкую полосу — она сама жмёт основную кнопку, которая сейчас за экраном: стая летит из полосы
    var sticky = document.querySelector('.uf-sticky-buy_on .uf-sticky-buy__btn');
    if (sticky && (r.bottom < 0 || r.top > innerHeight)) r = sticky.getBoundingClientRect();
    batBusy = true;
    setTimeout(function () {
      batBusy = false;
      if (window.tcart && cartQty() <= before) return; // вещь не добавилась (например, не выбран размер)
      if (!reduce) flock(r);
      setTimeout(function () { reveal(BAT); }, reduce ? 0 : 1000);
    }, 450);
  }, true);

  // ---------- привязка к карточкам; Тильда перерисовывает каталог — проверяем после каждой перерисовки ----------
  var MOUNT = { cat: mountCat, web: mountWeb };
  function hostFor(egg) {
    var el = egg.sel && document.querySelector(egg.sel);
    var root = (egg.scope && document.querySelector(egg.scope)) || document;
    if (!el && egg.uid) el = root.querySelector('.t-store__card[data-product-uid="' + egg.uid + '"],.t-store__card[data-product-gen-uid="' + egg.uid + '"]');
    if (!el) return null;
    if (egg.id === 'cat') {
      // кошка — над карточкой, но НЕ внутри ссылки: иначе нажатие на неё открывает товар
      while (el.closest('a') && el.closest('a').parentElement) el = el.closest('a').parentElement;
      return el;
    }
    return el.querySelector('.t-store__card__imgwrapper, [data-ufhw-photo]') || el;
  }
  // «чёрная кнопка»: у куртки «Brat» (кроме /dark-side) «Добавить в корзину» чёрная с золотой точкой — у остальных товаров обычная
  function paintCart() {
    [].forEach.call(document.querySelectorAll('.t-store__prod-popup__btn, .uf-sticky-buy__btn, [data-ufhw-egg="bat"]'), function (b) {
      var on = isBatProduct(b) && batWhere(b);
      if (b.classList.contains('ufhw-cartbtn') !== on) b.classList.toggle('ufhw-cartbtn', on);
    });
  }
  // баннер на главной и бордовая полоса под шапкой — тоже только в окне акции (Лера 27.10, вариант 1)
  var STRIP = '#rec1604078031', HERO_BEFORE = '#rec4561751401';
  function promo() {
    var r = document.querySelector(STRIP), atom = r && r.querySelector('.tn-atom');
    if (atom && !/NOT A COSTUME/.test(atom.textContent)) {
      r.classList.add('ufhw-strip');
      atom.innerHTML = '<a class="ufhw-strip__a" href="/dark-side">NOT A COSTUME · −13% на всё, если найдёте код' +
        '<span class="ufhw-strip__go"> · На тёмную сторону →</span></a>';
    }
    var club = /^\/?$/.test(location.pathname) && document.querySelector(HERO_BEFORE);
    if (club && !document.querySelector('.ufhw-hero')) {
      var a = document.createElement('a');
      a.className = 'ufhw-hero'; a.href = '/dark-side';
      a.innerHTML = '<picture><source media="(max-width: 760px)" srcset="' + BASE + 'banner_mobile.jpg">' +
        '<img src="' + BASE + 'banner_desktop.jpg" width="2400" height="1339" alt="Хэллоуин до 1 ноября. NOT A COSTUME. ' +
        '−13% на всё — найдите код на сайте. Тёмная сторона"></picture>';
      club.parentNode.insertBefore(a, club);
    }
  }
  function scan() {
    promo();
    paintCart();
    var p = location.pathname;
    EGGS.forEach(function (egg) {
      if (egg.cart) return;
      if (egg.path && !egg.path.test(p) && !CFG.ignorePaths) return;
      var h = hostFor(egg);
      if (!h || h.__ufhw || h.__ufhwWebGone) return;
      h.__ufhw = true; h.classList.add('ufhw-host');
      MOUNT[egg.id](h, egg);
    });
  }
  var pend = false;
  function later() { if (pend) return; pend = true; setTimeout(function () { pend = false; scan(); }, 120); }
  function start() {
    scan();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.UF_HW_RESET = function () { found = {}; saveFound(found); };
})();
