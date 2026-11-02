/* UNFADED 11.11 — homepage and shoppable looks. Disabled until release approval. */
(function (root, factory) {
  var api = factory(typeof module === 'object' && module.exports ? require('./cart-1111.js') : root.UF1111);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.UF1111Campaign = api; api.start(root); }
})(typeof window !== 'undefined' ? window : this, function (core) {
  'use strict';
  var BASE = 'https://unfadedbrand.github.io/unfaded-data/';
  var CATALOG = '/catalog';
  var LOOKS_URL = '/?uf-page=looks-1111';
  var OUTFITS = [
    { name: 'Графит и характер', tag: 'PAPARAZZI / ГРАФИТ', text: 'Строгая шерсть, выразительные пряжки и белая рубашка. Три вещи для цельного силуэта.', skus: ['JH01FW26', 'SU01FW26', 'SW01NY26'] },
    { name: 'Тёплый акцент', tag: 'PAPARAZZI / КОРИЧНЕВЫЙ', text: 'Костюм Paparazzi в коричневом оттенке и топ цвета шампань. Мягкий контраст фактур.', skus: ['JH02FW26', 'SU02FW26', 'TLB01SS26'] },
    { name: 'Деним с характером', tag: 'HOURGLASS + BRAT', text: 'Платье-корсет Hourglass и куртка Brat. Выразительная талия и скульптурные линии.', skus: ['DD01FW26', 'JB01FW26'] },
    { name: 'Комбинация и кружево', tag: 'TRIPTYCH', text: 'Платье-комбинация и жакет с кружевной спинкой. Игра открытых и закрытых линий.', skus: ['SD01FW27', 'JLC01SS26'] },
    { name: 'Текстуры в чёрном', tag: 'SIREN + BRAT', text: 'Кружевной топ, юбка Siren и куртка Brat. Один цвет — три разных настроения.', skus: ['SLS01SS26', 'TL01SS26', 'JB01FW26'] },
    { name: 'Шоколадный вельвет', tag: 'REBEL GRACE', text: 'Бомбер и шорты Rebel Grace со сливочным кружевным топом. Расслабленный объём и тонкие детали.', skus: ['BV01SS26', 'SV01SS26', 'TL02SS26'] }
  ];
  var SKUS = [].concat.apply([], OUTFITS.map(function (l) { return l.skus; }));
  function reviewAllowed(settings, location) {
    return settings.reviewEnabled === true && location.hostname === 'unfadedstore.com' && location.pathname === '/' &&
      new URLSearchParams(location.search).get('uf-review') === '1111-2026';
  }
  function escape(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function parse(value, fallback) { if (typeof value !== 'string') return value || fallback; try { return JSON.parse(value); } catch (e) { return fallback; } }
  function safeUrl(value, image) {
    try { var u = new URL(value, 'https://unfadedstore.com'); return u.protocol === 'https:' && (image ? /(^|\.)tildacdn\.(com|net)$/.test(u.hostname) : u.hostname === 'unfadedstore.com') ? u.href : ''; }
    catch (e) { return ''; }
  }
  function photo(p) { var g = parse(p && p.gallery, []); return safeUrl(p && p.img || g[0] && g[0].img || '', true); }
  function available(p) { return !!p && !p.hidden && !p.deleted && !core.excluded(p) && core.parts(p).indexOf('491983923473') === -1 && !!safeUrl(p.url, false); }
  function editions(p) {
    return available(p) ? parse(p.editions, []).filter(function (e) { return e.uid && core.number(e.quantity) > 0 && core.number(e.price || p.price) > 0; }) : [];
  }
  function variant(p, uid) { return editions(p).filter(function (e) { return String(e.uid) === String(uid); })[0] || null; }
  function amount(p, ed) { return core.number(ed && ed.price || p && p.price); }
  function round(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function money(n) { return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' RUB'; }
  function cartQuantity(cart, uid) { return (cart.products || []).filter(function (p) { return p.deleted !== 'yes' && String(p.uid || p.lid) === String(uid); }).reduce(function (n, p) { return n + core.number(p.quantity); }, 0); }
  function estimate(rows, cart) {
    cart = cart || {}; var n = rows.length; var existing = (cart.products || []).filter(function (p) { return p.deleted !== 'yes' && !core.excluded(p); }).reduce(function (v, p) { return v + core.number(p.quantity); }, 0);
    var promo = !!cart.promocode; var subtotal = round(rows.reduce(function (v, r) { return v + amount(r.product, r.edition); }, 0));
    var rate = promo || !n ? 0 : core.rate(existing + n); var saving = round(subtotal * rate);
    return { count: n, subtotal: subtotal, rate: rate, saving: saving, total: round(subtotal - saving), promo: promo };
  }
  function validate(rows, products, cart) {
    if (!rows.length) throw new Error('Выберите хотя бы одну вещь.');
    return rows.map(function (r) {
      var p = products[r.sku], ed = variant(p, r.uid);
      if (!ed) throw new Error('Выбранный размер закончился или недоступен. Выберите другой.');
      if (cartQuantity(cart, ed.uid) + 1 > core.number(ed.quantity)) throw new Error('В этом размере больше нет доступных вещей.');
      if (amount(p, ed) !== r.price) throw new Error('Цена обновилась. Проверьте сумму и подтвердите добавление ещё раз.');
      var item = core.cartItem(p, ed); if (!item) throw new Error('Не удалось подготовить вещь. Откройте её карточку.');
      return item;
    });
  }
  function createCatalog(win, routes) {
    var cached = {}, stamp = 0, pending = null;
    function request(url) {
      var controller = new win.AbortController(); var timer = win.setTimeout(function () { controller.abort(); }, 12000);
      return win.fetch(url, { signal: controller.signal }).then(function (r) { if (!r.ok) throw new Error('Каталог недоступен. Попробуйте ещё раз.'); return r.json(); }).finally(function () { win.clearTimeout(timer); });
    }
    function loadPart(route) {
      var all = [], seen = {};
      function page(slice) {
        if (seen[slice] || Object.keys(seen).length >= 30) throw new Error('Не удалось полностью загрузить каталог.');
        seen[slice] = true;
        return request('https://store.tildaapi.com/api/getproductslist/?storepartuid=' + encodeURIComponent(route[0]) + '&recid=' + encodeURIComponent(route[1]) + '&c=1&slice=' + slice + '&size=1000&flag_root=withroot').then(function (data) {
          all = all.concat(data.products || []);
          if (core.number(data.nextslice) > slice && all.length < core.number(data.total)) return page(core.number(data.nextslice));
          if (all.length < core.number(data.total)) throw new Error('Неполный ответ каталога.');
          return all;
        });
      }
      return page(1);
    }
    return function load(force) {
      if (pending) return pending;
      if (!force && stamp && Date.now() - stamp < 120000) return Promise.resolve(cached);
      pending = (routes ? Promise.resolve(routes) : request(BASE + 'data.json').then(function (data) {
        // New Paparazzi items can appear in Tilda before the static store_map syncs.
        var found = [['179820859341', '1716988891']];
        SKUS.forEach(function (sku) { var r = data.store_map && data.store_map[sku]; if (r && !found.some(function (v) { return String(v[0]) === String(r[0]); })) found.push(r); });
        if (!found.length) throw new Error('Не найдены разделы каталога.'); return found;
      })).then(function (allRoutes) {
        var cursor = 0, result = {}, errors = 0;
        function worker() {
          if (cursor >= allRoutes.length) return Promise.resolve();
          return loadPart(allRoutes[cursor++]).then(function (rows) {
            rows.forEach(function (p) {
              p.editions = parse(p.editions, []);
              var sku = core.article({ externalid: p.externalid || p.sku || p.editions[0] && p.editions[0].sku }, SKUS);
              if (SKUS.indexOf(sku) !== -1 && available(p)) result[sku] = p;
            });
          }).catch(function () { errors++; }).then(worker);
        }
        return Promise.all([worker(), worker(), worker()]).then(function () {
        if (errors) throw new Error('Не удалось обновить все разделы. Добавление временно недоступно.');
          cached = result; stamp = Date.now(); return result;
        });
      }).finally(function () { pending = null; });
      return pending;
    };
  }
  function tiers() { return '<div class="ufc-tiers" aria-label="Скидка по количеству вещей"><div><span>1 ВЕЩЬ</span><b>−11%</b></div><div><span>2 ВЕЩИ</span><b>−22%</b></div><div><span>3 И БОЛЬШЕ</span><b>−33%</b></div></div>'; }
  function banner(assetBase) {
    return '<div class="ufc-photo"><img src="' + (assetBase || BASE) + 'campaign-1111/assets/paparazzi-15.jpg" width="1400" height="2021" alt="UNFADED: костюм цвета хаки, съёмка в бордовом кресле" fetchpriority="high"><div class="ufc-photo-copy"><p class="ufc-kicker"><span>UNFADED DAYS</span><span>ДО 12 НОЯБРЯ</span></p><p class="ufc-date">11.11</p><h1>Чем больше,<br>тем больше.</h1><p>Соберите образ. Скидка растёт<br>с каждой вещью в корзине.</p></div></div><div class="ufc-banner-offer">' + tiers() + '<a class="ufc-primary" href="' + CATALOG + '">ВЫБРАТЬ ВЕЩИ <span aria-hidden="true">↗</span></a><a class="ufc-secondary" href="' + LOOKS_URL + '">Готовые образы ↗</a><p class="ufc-note">Скидка применится автоматически.<br>Не суммируется с промокодами и UNFADED CREDITS.</p></div>';
  }
  function start(win) {
    if (!core || !win.document || win.__uf1111CampaignStarted) return;
    var settings = win.UF1111_CAMPAIGN_SETTINGS || {};
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(win.location.hostname);
    var preview = local && settings.preview === true;
    var review = reviewAllowed(settings, win.location);
    if (!settings.enabled && !preview && !review) return;
    win.__uf1111CampaignStarted = true;
    var doc = win.document, isLooks = new URLSearchParams(win.location.search).get('uf-page') === 'looks-1111';
    var active = function () { return preview || review || settings.enabled === true && core.inWindow(Date.now()); };
    var pageId = doc.getElementById('allrecords') && doc.getElementById('allrecords').getAttribute('data-tilda-page-id');
    if (!preview && (win.location.pathname !== '/' || pageId !== '31004708')) return;
    var anchor = doc.getElementById('t-main-content');
    if (!anchor) {
      var records = doc.getElementById('allrecords'); if (!records) return;
      anchor = doc.createElement('div'); anchor.id = 't-main-content';
      var first = doc.getElementById('rec4561751401');
      if (first && first.parentElement === records) records.insertBefore(anchor, first);
      else { var header = doc.getElementById('t-header'); if (header && header.parentElement === records) header.insertAdjacentElement('afterend', anchor); else records.insertBefore(anchor, records.firstChild); }
    }
    var host = doc.createElement(isLooks ? 'main' : 'section'); host.className = 'uf-campaign ' + (isLooks ? 'ufc-looks' : 'ufc-banner');
    host.setAttribute('aria-label', isLooks ? 'Собрать образ к 11.11' : 'Акция UNFADED 11.11'); anchor.insertAdjacentElement('afterend', host);
    var club = doc.getElementById('rec4561751401');
    if (review) {
      var reviewMeta = doc.createElement('meta'); reviewMeta.name = 'robots'; reviewMeta.content = 'noindex,follow'; doc.head.appendChild(reviewMeta);
    }
    if (isLooks) {
      Array.prototype.forEach.call(doc.querySelectorAll('#allrecords > .t-rec'), function (el) {
        if (!el.querySelector('.t706')) el.classList.add('ufc-route-hidden');
      });
      doc.title = 'Собрать образ к 11.11 — UNFADED';
      var robots = doc.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex,follow'; doc.head.appendChild(robots);
    }
    var products = {}, choice = {}, look = 0, busy = false, mounted = false, outside = false;
    var loadCatalog = preview && settings.products ? function () { return Promise.resolve(JSON.parse(JSON.stringify(settings.products))); } : createCatalog(win);
    function currentCart() { return win.tcart || { products: [] }; }
    function chosen() { return OUTFITS[look].skus.filter(function (sku) { return choice[sku] && choice[sku].on && editions(products[sku]).length; }).map(function (sku) { var p = products[sku]; return { sku: sku, product: p, edition: variant(p, choice[sku].uid), uid: choice[sku].uid }; }); }
    function totals() {
      var s = estimate(chosen(), currentCart());
      host.querySelector('[data-ufc-total]').innerHTML = '<div><span>За выбранные вещи' + (s.rate ? ' / −' + Math.round(s.rate * 100) + '%' : '') + '</span><div><s>' + money(s.subtotal) + '</s><strong>' + money(s.total) + '</strong></div></div><p>Предварительная выгода ' + money(s.saving) + '</p>';
      host.querySelector('[data-ufc-add]').textContent = 'ДОБАВИТЬ В КОРЗИНУ · ' + s.count + (s.count === 1 ? ' ВЕЩЬ' : ' ВЕЩИ');
      host.querySelector('[data-ufc-price-note]').textContent = s.promo ? 'В корзине применён промокод. Скидки не суммируются; итог рассчитает Тильда.' : 'Предварительный расчёт с учётом количества вещей в корзине. Итог, промокоды и CREDITS проверяются в корзине.';
    }
    function image(p, alt, cls) { var url = photo(p); return url ? '<img class="' + (cls || '') + '" src="' + escape(url) + '" alt="' + escape(alt) + '" loading="lazy">' : '<div class="ufc-no-photo">Фото временно недоступно</div>'; }
    function renderLook() {
      var l = OUTFITS[look];
      host.querySelector('[data-ufc-detail]').innerHTML = '<div class="ufc-editorial">' + image(products[l.skus[0]], l.name, 'ufc-main-photo') + '<p class="ufc-caption">' + escape(l.tag) + '</p></div><div class="ufc-compose"><p class="ufc-eyebrow">ОБРАЗ ' + String(look + 1).padStart(2, '0') + ' / 06</p><h2>' + escape(l.name) + '</h2><p class="ufc-description">' + escape(l.text) + '</p><div>' + l.skus.map(function (sku) {
        var p = products[sku], opts = editions(p), c = choice[sku];
        if (!opts.length) return '<div class="ufc-product ufc-unavailable"><div></div>' + image(p, p && p.title || sku) + '<div><p>' + escape(p && p.title || sku) + '</p><p>Сейчас недоступно</p></div></div>';
        return '<div class="ufc-product"><input type="checkbox" data-ufc-check="' + sku + '" aria-label="Включить в образ: ' + escape(p.title) + '"' + (c.on ? ' checked' : '') + '>' + image(p, p.title) + '<div><a href="' + escape(safeUrl(p.url, false)) + '">' + escape(p.title) + '</a><p data-ufc-price="' + sku + '">' + money(amount(p, variant(p, c.uid))) + '</p><select data-ufc-size="' + sku + '" aria-label="Размер: ' + escape(p.title) + '"><option value="">Выберите размер</option>' + opts.map(function (ed) { return '<option value="' + escape(ed.uid) + '"' + (String(c.uid) === String(ed.uid) ? ' selected' : '') + '>' + escape(ed['Размер'] || ed.size || 'Единый') + (ed['Цвет'] ? ' / ' + escape(ed['Цвет']) : '') + '</option>'; }).join('') + '</select></div></div>';
      }).join('') + '</div><div class="ufc-total" data-ufc-total></div><button type="button" class="ufc-primary" data-ufc-add></button><p class="ufc-status" data-ufc-status role="status"></p><p class="ufc-note" data-ufc-price-note></p><p class="ufc-note">Можно взять весь образ или отдельные вещи.<br>Не суммируется с промокодами и UNFADED CREDITS.</p><a class="ufc-secondary" href="' + CATALOG + '">Смотреть весь каталог ↗</a></div>';
      host.querySelectorAll('[data-ufc-look]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.ufcLook) === look)); }); totals();
    }
    function mountLooks() {
      host.innerHTML = '<div class="ufc-container"><p class="ufc-crumb"><a href="/">ГЛАВНАЯ</a> / 11.11</p><section class="ufc-intro"><div><p class="ufc-eyebrow">ГОТОВЫЕ СОЧЕТАНИЯ UNFADED</p><h1>Собрать образ</h1><p>Вещи, которые работают вместе.<br>Выберите свой образ — и сделайте его своим.</p><a class="ufc-text-link" href="' + CATALOG + '">Или выберите вещи из всего каталога ↗</a></div><div><p class="ufc-eyebrow">ЧЕМ БОЛЬШЕ, ТЕМ БОЛЬШЕ</p>' + tiers() + '<p class="ufc-note">Скидка зависит от количества вещей в корзине.</p></div></section><div class="ufc-look-picker" aria-label="Выберите готовый образ">' + OUTFITS.map(function (l, i) { return '<button type="button" data-ufc-look="' + i + '" aria-pressed="' + (i === look) + '">' + image(products[l.skus[0]], l.name) + '<span>' + escape(l.name) + '</span><small>' + l.skus.length + ' ВЕЩИ · −' + (l.skus.length >= 3 ? 33 : 22) + '%</small></button>'; }).join('') + '</div><section class="ufc-detail" data-ufc-detail aria-label="Состав выбранного образа"></section></div>';
      SKUS.forEach(function (sku) { if (!choice[sku]) choice[sku] = { on: editions(products[sku]).length > 0, uid: '' }; }); renderLook(); mounted = true;
    }
    function status(text) { var el = host.querySelector('[data-ufc-status]'); if (el) el.textContent = text; }
    function setBusy(value) { busy = value; host.querySelectorAll('button,input,select').forEach(function (el) { el.disabled = value; }); }
    function add() {
      if (busy || !active()) return;
      var rows = chosen();
      if (!rows.length || rows.some(function (r) { return !r.edition; })) { status(rows.length ? 'Выберите размер для каждой отмеченной вещи.' : 'Выберите хотя бы одну вещь.'); return; }
      if (typeof win.tcart__addProduct !== 'function') { status('Корзина загружается. Попробуйте ещё раз через несколько секунд.'); return; }
      var snapshot = rows.map(function (r) { return { sku: r.sku, uid: r.uid, price: amount(r.product, r.edition) }; }); var added = 0;
      setBusy(true); status('Проверяем наличие и цены…');
      loadCatalog(true).then(function (fresh) {
        products = fresh; if (!active()) throw new Error('Акция завершилась. Выберите вещи в каталоге.');
        var items = validate(snapshot, products, currentCart());
        items.forEach(function (item) { win.tcart__addProduct(item); added++; });
        ['tcart__updateTotalProductsinCartObj', 'tcart__saveLocalObj', 'tcart__reDrawProducts', 'tcart__reDrawTotal', 'tcart__reDrawCartIcon', 'tcart__addEvents__forProducts'].forEach(function (name) { if (typeof win[name] === 'function') win[name](); });
        renderLook(); status('Добавлено вещей: ' + added + '. Откройте корзину для проверки итоговой суммы.');
      }).catch(function (error) { renderLook(); status((added ? 'Добавлено вещей: ' + added + '. ' : '') + (error.message || 'Не удалось добавить образ. Попробуйте ещё раз.')); })
        .finally(function () { setBusy(false); });
    }
    function reconcile() {
      if (!active()) {
        if (outside) return; outside = true;
        if (!isLooks) { host.remove(); if (club) club.classList.remove('ufc-banner-replaced'); }
        else { host.innerHTML = '<div class="ufc-container ufc-ended"><h1>UNFADED DAYS</h1><p>Акция проходит с 8 ноября, 19:00 до 12 ноября включительно, по Москве.</p><a class="ufc-primary" href="' + CATALOG + '">ВЫБРАТЬ ВЕЩИ ↗</a></div>'; }
        mounted = false; return;
      }
      outside = false;
      if (!host.isConnected) anchor.insertAdjacentElement('afterend', host);
      if (mounted) return;
      if (!isLooks) { host.innerHTML = banner(preview && settings.assetBase); if (club) club.classList.add('ufc-banner-replaced'); mounted = true; return; }
      host.innerHTML = '<div class="ufc-container ufc-loading" role="status">Загружаем образы…</div>';
      mounted = true;
      loadCatalog(false).then(function (data) { products = data; if (active()) mountLooks(); }).catch(function (e) {
        host.innerHTML = '<div class="ufc-container ufc-ended"><h1>Собрать образ</h1><p role="status">' + escape(e.message) + '</p><button type="button" class="ufc-primary" data-ufc-retry>ПОПРОБОВАТЬ ЕЩЁ РАЗ</button><a class="ufc-secondary" href="' + CATALOG + '">Смотреть каталог ↗</a></div>';
      });
    }
    host.addEventListener('click', function (event) {
      var b = event.target.closest('button'); if (!b || busy) return;
      if (b.hasAttribute('data-ufc-look')) { look = Number(b.dataset.ufcLook); renderLook(); }
      if (b.hasAttribute('data-ufc-add')) add();
      if (b.hasAttribute('data-ufc-retry')) { mounted = false; reconcile(); }
    });
    host.addEventListener('change', function (event) {
      if (busy) return; var t = event.target, sku = t.dataset.ufcCheck || t.dataset.ufcSize; if (!sku) return;
      if (t.hasAttribute('data-ufc-check')) choice[sku].on = t.checked;
      else { choice[sku].uid = t.value; host.querySelector('[data-ufc-price="' + sku + '"]').textContent = money(amount(products[sku], variant(products[sku], t.value))); }
      totals(); status('');
    });
    reconcile();
    if (review) {
      var badge = doc.createElement('p'); badge.className = 'ufc-review-notice'; badge.textContent = 'ТЕСТ 11.11 · скидка в обычной корзине включится по расписанию акции';
      host.insertAdjacentElement('beforebegin', badge);
      // Keep only the campaign navigation on the explicitly enabled review address.
      host.addEventListener('click', function (event) {
        var a = event.target.closest('a');
        if (a && a.getAttribute('href') === LOOKS_URL) { event.preventDefault(); win.location.href = LOOKS_URL + '&uf-review=1111-2026'; }
      });
    }
    // Browsers freeze this timer with the page in BFCache and resume it on Back.
    win.setInterval(function () { reconcile(); if (isLooks && active() && host.querySelector('[data-ufc-total]') && !busy) totals(); }, 1000);
  }
  return { start: start, reviewAllowed: reviewAllowed, outfits: OUTFITS, catalogUrl: CATALOG, looksUrl: LOOKS_URL, estimate: estimate, validate: validate, editions: editions, variant: variant, safeUrl: safeUrl, createCatalog: createCatalog, banner: banner };
});
