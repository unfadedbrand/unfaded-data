/* UNFADED 11.11 — approved cart, staged without publication (02.11.2026).
   Presentation only: prices, discounts and checkout remain owned by Tilda. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.UF1111 = api; api.start(root); }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var START = Date.parse('2026-11-08T19:00:00+03:00');
  var END = Date.parse('2026-11-13T00:00:00+03:00');
  var EXCLUDED = '690719490763';
  var ARCHIVE = '491983923473';
  var CAPSULE = /^(?:TB01|DL01|BS01|SG01|LT01|SH01|AS01|AS02|CP01|JP01)FW26(?:XS|S|M|L|XL|XXL)?$/i;
  var OUTFITS = [
    ['JH01FW26', 'SU01FW26', 'SW01NY26'],
    ['JH02FW26', 'SU02FW26', 'TLB01SS26'],
    ['DD01FW26', 'JB01FW26'], ['SD01FW27', 'JLC01SS26'],
    ['SLS01SS26', 'TL01SS26', 'JB01FW26'], ['TL02SS26', 'SV01SS26', 'BV01SS26']
  ];
  var COMPLEMENTS = {
    top: ['bottom', 'jacket', 'outer'], bottom: ['top', 'jacket', 'outer'],
    dress: ['outer', 'jacket', 'corset'], jacket: ['top', 'bottom', 'dress'],
    outer: ['top', 'bottom', 'dress'], corset: ['bottom', 'jacket', 'outer']
  };
  var runtime = null;
  function number(value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    var normalized = String(value == null ? '' : value).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    return /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : 0;
  }
  function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
  function parts(product) {
    var value = product.part_uids || product.partuids || [];
    if (typeof value === 'string') { try { value = JSON.parse(value); } catch (e) { value = []; } }
    return Array.isArray(value) ? value.map(String) : [];
  }
  function excluded(product) {
    return parts(product).indexOf(EXCLUDED) !== -1 || CAPSULE.test(String(product.externalid || product.sku || '').trim());
  }
  function rate(count) { return count >= 3 ? 0.33 : count >= 2 ? 0.22 : count >= 1 ? 0.11 : 0; }
  function inWindow(time) { return time >= START && time < END; }
  function size(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '').replace(/ONE-SIZE|ONESIZE|OS|ЕДИНЫЙ/g, 'ONE');
  }
  function editionSize(edition) { return size(edition['Размер'] || edition['размер'] || edition.size); }
  function cartSize(product) {
    var option = (product.options || []).filter(function (o) { return /^(размер|size)$/i.test(o.option || o.title || ''); })[0];
    return size(option && option.variant || product.size);
  }
  function article(product, known) {
    var raw = String(product.externalid || product.sku || '').trim();
    var match = (known || []).filter(function (sku) {
      return raw === sku || raw.indexOf(sku) === 0 && /^(XS|S|M|L|XL|XXL|ONE)$/i.test(raw.slice(sku.length));
    }).sort(function (a, b) { return b.length - a.length; })[0];
    return match || raw.replace(/(FW\d{2}|SS\d{2}|SP\d{2}|NY\d{2}|SM\d{2})(XS|S|M|L|XL|XXL)$/i, '$1');
  }
  function category(product) {
    var primary = product.primaryCategory || '';
    var text = product.title || product.name || primary;
    if (/^Топы и корсеты$/i.test(primary) && !/корсет/i.test(text)) return 'top';
    if (/корсет/i.test(text) && !/платье/i.test(text)) return 'corset';
    if (/плать|комбинац|dresses/i.test(text)) return 'dress';
    if (/жакет|jacket/i.test(text)) return 'jacket';
    if (/куртк|пальто|бомбер|шуб|тренч|верхняя одежда|outerwear/i.test(text)) return 'outer';
    if (/юбк|шорт|брюк|джинс|деним|капри|trousers|skirts/i.test(text)) return 'bottom';
    if (/топ|блуз|рубаш|боди|лонгслив|футбол|худи|hoodie/i.test(text)) return 'top';
    return '';
  }
  function photo(product) {
    if (product.img) return product.img;
    var gallery = product.gallery || [];
    if (typeof gallery === 'string') { try { gallery = JSON.parse(gallery); } catch (e) { gallery = []; } }
    return gallery[0] && gallery[0].img || '';
  }
  function activeProducts(cart) {
    return (cart.products || []).filter(function (p) { return p && p.deleted !== 'yes' && number(p.quantity) > 0; });
  }
  function campaignDiscount(discounts) {
    return (discounts || []).filter(function (d) {
      return /11\.11/.test(d.name || '') && String(d.typeid) === '2' && Number(d.applicationid) === 3 &&
        d.rules && d.rules.diff && Number(d.rules.diff['1']) === 11 && Number(d.rules.diff['2']) === 22 &&
        Number(d.rules.diff['3']) === 33 && Number(d.rules.type) === 0 &&
        (d.rules.uids || []).map(String).indexOf(EXCLUDED) !== -1;
    })[0];
  }
  function state(cart, discounts, preview) {
    var rows = activeProducts(cart);
    var eligible = rows.filter(function (p) { return !excluded(p); });
    var quantity = eligible.reduce(function (n, p) { return n + number(p.quantity); }, 0);
    var subtotal = rows.reduce(function (n, p) { return n + number(p.price) * number(p.quantity); }, 0);
    var eligibleSum = eligible.reduce(function (n, p) { return n + number(p.price) * number(p.quantity); }, 0);
    var discount = campaignDiscount(discounts);
    var applied = !!discount && eligible.length > 0 && eligible.every(function (p) {
      return String(p.discountid) === String(discount.id) && p.amount_withdiscount != null;
    }) && !cart.promocode && cart.prodamount_withdyndiscount != null;
    var saving = applied ? number(cart.dyndiscount) : preview ? round(eligibleSum * rate(quantity)) : 0;
    var goods = applied ? number(cart.prodamount_withdyndiscount) : preview ? round(subtotal - saving) : subtotal;
    var estimate = quantity ? round((eligibleSum + eligibleSum / quantity) * rate(quantity + 1) - saving) : 0;
    return { rows: rows, eligible: eligible, quantity: quantity, subtotal: round(subtotal), eligibleSum: round(eligibleSum),
      rate: rate(quantity), saving: saving, goods: goods, estimate: Math.max(0, estimate),
      applied: applied, ready: applied || !!preview, promo: !!cart.promocode };
  }
  function compatibleEdition(product, sizes) {
    var editions = product.editions || [];
    return editions.filter(function (ed) {
      return number(ed.quantity) > 0 && number(ed.price || product.price) > 0 &&
        (sizes.indexOf(editionSize(ed)) !== -1 || editionSize(ed) === 'ONE');
    }).sort(function (a, b) { return sizes.indexOf(editionSize(a)) - sizes.indexOf(editionSize(b)); })[0] || null;
  }
  function recommend(cart, products, options) {
    options = options || {};
    var known = Object.keys(products);
    var rows = activeProducts(cart);
    var inCart = rows.map(function (p) { return article(p, known); });
    var sizes = rows.map(cartSize).filter(function (s) { return s && s !== 'ONE'; });
    sizes = sizes.filter(function (s, i, all) { return all.indexOf(s) === i; });
    // Do not assume S when a shopper has not chosen a clothing size.
    if (!sizes.length) return [];
    var categories = rows.map(function (p, i) { return category(products[inCart[i]] || p); }).filter(Boolean);
    var wants = [];
    categories.forEach(function (c) { (COMPLEMENTS[c] || []).forEach(function (v) { if (wants.indexOf(v) === -1) wants.push(v); }); });
    if (!wants.length) return [];
    var sameLook = [];
    OUTFITS.forEach(function (look) {
      if (look.some(function (a) { return inCart.indexOf(a) !== -1; })) sameLook = sameLook.concat(look);
    });
    var fullPrice = options.lamodaFullPriceSkus || [];
    return known.map(function (sku) {
      var p = products[sku];
      if (inCart.indexOf(sku) !== -1 || excluded(p) || parts(p).indexOf(ARCHIVE) !== -1 || p.hidden || p.deleted) return null;
      if (wants.indexOf(category(p)) === -1 && sameLook.indexOf(sku) === -1) return null;
      var ed = compatibleEdition(p, sizes);
      if (!ed || !photo(p) || !/^https:\/\//.test(p.url || '')) return null;
      return { sku: sku, product: p, edition: ed, size: editionSize(ed), price: number(ed.price || p.price),
        priority: sameLook.indexOf(sku) !== -1 ? 0 : /NEW|НОВИНК/i.test(p.mark || '') || options.newSkus && options.newSkus.indexOf(sku) !== -1 ? 1 : fullPrice.indexOf(sku) !== -1 ? 2 : 3 };
    }).filter(Boolean).sort(function (a, b) { return a.priority - b.priority || a.price - b.price || a.sku.localeCompare(b.sku); }).slice(0, 4);
  }
  function cartItem(product, edition) {
    var match = String(product.url || '').match(/tproduct\/(\d+)-/);
    var price = number(edition.price || product.price);
    if (!edition.uid || number(edition.quantity) <= 0 || !(price > 0) || !match) return null;
    var options = [];
    ['Размер', 'Цвет'].forEach(function (key) { if (edition[key]) options.push({ option: key, variant: edition[key] }); });
    return { name: product.title, price: price, amount: price, img: photo(product), recid: match[1],
      lid: String(edition.uid), uid: String(edition.uid), gen_uid: String(product.uid),
      sku: edition.externalid || edition.sku || product.externalid, inv: number(edition.quantity), quantity: 1,
      part_uids: parts(product), options: options, url: product.url,
      pack_label: product.pack_label || 'lwh', pack_m: String(product.pack_m || 0),
      pack_x: String(product.pack_x || 0), pack_y: String(product.pack_y || 0), pack_z: String(product.pack_z || 0) };
  }
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(value) { return round(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' RUB'; }
  function start(win) {
    if (!win || !win.document || runtime) return;
    var doc = win.document;
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(win.location.hostname);
    var settings = win.UF1111_SETTINGS || {};
    var products = {}, index = [], metadata = null, pending = null, lastLoaded = 0;
    var timer = null, rendering = false, busy = false, errorText = '';
    function enabled() { return local && settings.preview === true || settings.enabled === true && inWindow(Date.now()); }
    function currentCart() { return win.tcart && typeof win.tcart === 'object' ? win.tcart : { products: [] }; }
    function request(url) {
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 12000);
      return win.fetch(url, { signal: controller.signal }).then(function (r) {
        if (!r.ok) throw new Error('Catalog unavailable');
        return r.json();
      }).finally(function () { clearTimeout(timeout); });
    }
    function loadPart(route) {
      var all = [], seenSlices = {};
      function page(slice) {
        if (seenSlices[slice] || Object.keys(seenSlices).length >= 30) return Promise.resolve(all);
        seenSlices[slice] = true;
        return request('https://store.tildaapi.com/api/getproductslist/?storepartuid=' + encodeURIComponent(route[0]) +
          '&recid=' + encodeURIComponent(route[1]) + '&c=1&slice=' + slice + '&size=1000&flag_root=withroot').then(function (data) {
          var rows = data.products || [];
          all = all.concat(rows);
          if (rows.length && number(data.nextslice) > slice && all.length < number(data.total)) return page(number(data.nextslice));
          return all;
        });
      }
      return page(1);
    }
    function load(force) {
      if (pending) return pending;
      if (!force && lastLoaded && Date.now() - lastLoaded < 120000) return Promise.resolve(products);
      if (local && settings.products) {
        products = settings.products; metadata = settings.metadata || {}; lastLoaded = Date.now();
        return Promise.resolve(products);
      }
      var root = 'https://unfadedbrand.github.io/unfaded-data/';
      pending = Promise.all([request(root + 'data.json'), request(root + 'search-index.json')]).then(function (data) {
        metadata = data[0]; index = data[1];
        var routes = [['179820859341', '1716988891']];
        Object.keys(metadata.store_map || {}).forEach(function (sku) {
          var route = metadata.store_map[sku];
          if (!routes.some(function (r) { return String(r[0]) === String(route[0]); })) routes.push(route);
        });
        var result = {}, cursor = 0;
        // Bound concurrent catalog requests; pagination is required even with size=1000.
        function worker() {
          if (cursor >= routes.length) return Promise.resolve();
          var route = routes[cursor++];
          return loadPart(route).then(function (rows) {
            rows.forEach(function (p) {
              if (p.externalid && parts(p).indexOf(ARCHIVE) === -1) result[String(p.externalid).trim()] = p;
            });
          }).catch(function () { /* Omit unavailable sections rather than show stale stock. */ }).then(worker);
        }
        return Promise.all([worker(), worker(), worker()]).then(function () {
          index.forEach(function (row) { if (result[row.sku]) result[row.sku].primaryCategory = row.primaryCategory; });
          products = result; lastLoaded = Date.now(); return products;
        });
      }).finally(function () { pending = null; });
      return pending;
    }
    function remove() {
      if (doc.documentElement.classList.contains('uf-1111-active')) doc.documentElement.classList.remove('uf-1111-active');
      doc.querySelectorAll('.uf-1111').forEach(function (box) { box.remove(); });
    }
    function hosts() {
      return Array.prototype.slice.call(doc.querySelectorAll('.t706__sidebar-products, .t706__cartpage-products, .t706__cartwin-products')).filter(function (el) {
        return el.getClientRects().length && win.getComputedStyle(el).visibility !== 'hidden';
      });
    }
    function steps(s) {
      return '<div class="uf-1111-steps" aria-label="Скидка от количества вещей">' + [1, 2, 3].map(function (n) {
        return '<div class="uf-1111-step' + (s.quantity >= n ? ' is-reached' : '') + (Math.min(s.quantity, 3) === n ? ' is-current' : '') + '">' +
          '<span>' + (n === 1 ? '1 вещь' : n === 2 ? '2 вещи' : '3+ вещи') + ' −' + n * 11 + '%</span></div>';
      }).join('') + '</div>';
    }
    function html(s, recommendations) {
      var hint = !s.quantity ? 'Новогодняя капсула не участвует в акции.' : !s.ready ?
        s.promo ? 'Применён промокод. Скидки не суммируются.' : 'Обновляем скидку. Итог заказа рассчитает Тильда.' : s.quantity >= 3 ?
          'Максимальная скидка 33% — экономия ' + money(s.saving) :
          'Добавьте ещё 1 вещь — сэкономите ещё ≈ ' + money(s.estimate) + '. Сейчас экономия ' + money(s.saving);
      var totals = s.ready && s.quantity ? '<div class="uf-1111-totals" aria-label="Стоимость товаров">' +
        '<div><span>Без скидки</span><s>' + money(s.subtotal) + '</s></div>' +
        '<div class="uf-1111-discount"><span>Скидка 11.11 −' + Math.round(s.rate * 100) + '%</span><span>−' + money(s.saving) + '</span></div>' +
        '<div class="uf-1111-total"><span>Итого за товары</span><strong>' + money(s.goods) + '</strong></div></div>' : '';
      // The native final total and delivery remain visible, including in checkout.
      return { intro: steps(s) + '<p class="uf-1111-hint" role="status">' + escape(hint) + '</p>', body: totals +
        (recommendations.length ? '<section class="uf-1111-recs" aria-label="Добавьте к заказу"><h3>Добавьте к заказу</h3>' +
          '<div class="uf-1111-grid">' + recommendations.map(function (r) {
            var gain = round((s.eligibleSum + r.price) * rate(s.quantity + 1) - s.saving);
            return '<article class="uf-1111-product"><img src="' + escape(photo(r.product)) + '" alt="' + escape(r.product.title) + '" loading="lazy">' +
              '<p class="uf-1111-name">' + escape(r.product.title) + '</p><p class="uf-1111-price">' + money(r.price) + '</p>' +
              '<p class="uf-1111-size">В наличии в размере ' + escape(r.size === 'ONE' ? 'one size' : r.size) + '</p>' +
              (s.ready ? '<p class="uf-1111-gain">с ней экономия +' + money(gain) + '</p>' : '') +
              '<button type="button" data-uf1111-add="' + escape(r.sku) + '" data-size="' + escape(r.size) + '"' + (busy ? ' disabled' : '') + '>Добавить</button></article>';
          }).join('') + '</div></section>' : '') +
        '<p class="uf-1111-note">Не суммируется с промокодами и списанием CREDITS. Новогодняя капсула не участвует в акции.</p>' +
        '<p class="uf-1111-error" role="alert">' + escape(errorText) + '</p>' };
    }
    function render() {
      if (rendering) return;
      var visible = hosts();
      if (!enabled() || !activeProducts(currentCart()).length || !visible.length) { remove(); return; }
      rendering = true;
      try {
        if (!doc.documentElement.classList.contains('uf-1111-active')) doc.documentElement.classList.add('uf-1111-active');
        var s = state(currentCart(), win.t_cart__discounts || [], local && settings.preview === true);
        var recs = recommend(currentCart(), products, { lamodaFullPriceSkus: settings.lamodaFullPriceSkus || [] });
        var content = html(s, recs);
        var owners = [];
        visible.forEach(function (host, i) {
          ['intro', 'body'].forEach(function (kind) {
            var owner = 'uf-1111-' + kind + '-' + i;
            owners.push(owner);
            var box = doc.getElementById(owner);
            if (!box || box.parentElement !== host.parentElement) {
              if (box) box.remove();
              box = doc.createElement('section'); box.id = owner; box.className = 'uf-1111 uf-1111-' + kind;
              box.setAttribute('aria-label', kind === 'intro' ? '11.11 — чем больше, тем больше' : 'Скидка и рекомендации');
              host.insertAdjacentElement(kind === 'intro' ? 'beforebegin' : 'afterend', box);
            }
            if (box.__uf1111html !== content[kind]) { box.innerHTML = content[kind]; box.__uf1111html = content[kind]; }
          });
        });
        doc.querySelectorAll('.uf-1111').forEach(function (box) { if (owners.indexOf(box.id) === -1) box.remove(); });
      } finally { rendering = false; }
    }
    function schedule() { if (!timer) timer = setTimeout(function () { timer = null; render(); }, 120); }
    function add(button) {
      if (busy) return;
      var sku = button.getAttribute('data-uf1111-add'), wanted = button.getAttribute('data-size');
      busy = true; errorText = ''; button.disabled = true;
      // Revalidate stock immediately before adding; never trust a preview/index quantity.
      load(true).then(function () {
        var product = products[sku];
        var ed = product && compatibleEdition(product, [wanted]);
        var current = recommend(currentCart(), products, { lamodaFullPriceSkus: settings.lamodaFullPriceSkus || [] });
        if (!enabled() || !product || excluded(product) || !current.some(function (r) { return r.sku === sku; }) || !ed) throw new Error('Размер уже закончился. Обновите подборку.');
        var existing = activeProducts(currentCart()).filter(function (p) { return String(p.uid) === String(ed.uid); }).reduce(function (n, p) { return n + number(p.quantity); }, 0);
        if (existing + 1 > number(ed.quantity)) throw new Error('В выбранном размере больше нет доступных вещей.');
        var item = cartItem(product, ed);
        if (!item || typeof win.tcart__addProduct !== 'function') throw new Error('Не удалось добавить вещь. Попробуйте ещё раз.');
        win.tcart__addProduct(item);
        ['tcart__updateTotalProductsinCartObj', 'tcart__saveLocalObj', 'tcart__reDrawProducts', 'tcart__reDrawTotal', 'tcart__reDrawCartIcon', 'tcart__addEvents__forProducts'].forEach(function (name) {
          if (typeof win[name] === 'function') win[name]();
        });
      }).catch(function (e) { errorText = e.message || 'Не удалось обновить наличие. Попробуйте ещё раз.'; })
        .finally(function () { busy = false; render(); });
    }
    doc.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-uf1111-add]');
      if (button && enabled()) { event.preventDefault(); add(button); }
    });
    new MutationObserver(schedule).observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    win.addEventListener('resize', schedule);
    win.addEventListener('storage', schedule);
    runtime = { enabled: enabled, render: render, load: load };
    // The timer also removes campaign UI at the end boundary in an open tab.
    setInterval(function () {
      if (!enabled()) { remove(); return; }
      if (hosts().length && activeProducts(currentCart()).length) load(false).then(schedule).catch(function () { products = {}; schedule(); });
      schedule();
    }, 1000);
    render();
  }
  return { start: start, isActive: function () { return !!runtime && runtime.enabled(); },
    number: number, parts: parts, excluded: excluded, rate: rate, inWindow: inWindow, size: size, article: article,
    category: category, state: state, recommend: recommend, cartItem: cartItem, compatibleEdition: compatibleEdition };
});
