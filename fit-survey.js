/*
 * UNFADED — опрос «Как село?» после покупки (бриф C5, 13.10.2026).
 * Открывается поверх любой страницы сайта по ссылке из письма: ?fit=<id заказа>&t=<подпись>.
 * Загружает его brand-popup-fix.js, только когда в адресе есть fit= — остальным посетителям
 * этот файл не скачивается.
 * На каждую вещь заказа: «оставляю / возвращаю» → три вопроса. Ответы уходят в unfaded-app-api
 * (POST /survey/fit), там один ответ на пару «заказ + артикул», повторная отправка перезаписывает.
 * ?fit=demo — пример без сервера (для проверки вёрстки), ничего не отправляет.
 * Откат: revert PR; без этого файла ссылка просто откроет страницу сайта.
 */
(function () {
  if (window.__ufFitSurvey) return;
  window.__ufFitSurvey = true;

  var API = 'https://unfaded-app-api.onrender.com/survey/fit';
  var params = new URLSearchParams(location.search);
  var orderId = params.get('fit');
  var token = params.get('t') || '';
  var source = params.get('utm_source') || '';
  var demo = orderId === 'demo';
  if (!orderId || (!demo && !/^\d+$/.test(orderId))) return;

  var FIT = [['small', 'Маломерит'], ['true', 'В размер'], ['large', 'Большемерит']];
  var ZONES = [['length', 'Длина'], ['bust', 'Грудь'], ['waist', 'Талия'], ['hips', 'Бёдра'],
               ['shoulders', 'Плечи'], ['sleeve', 'Рукав'], ['ok', 'Всё хорошо']];
  var REASONS = [['size', 'Не подошёл размер'], ['fit', 'Не подошла посадка'],
                 ['fabric', 'Не понравилась ткань или качество'], ['photo', 'Вещь отличается от фото'],
                 ['changed_mind', 'Передумала'], ['other', 'Другое']];
  var SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL'];

  var CSS =
    '.ufs-veil{position:fixed;inset:0;z-index:2147483000;background:rgba(23,9,11,.55);overflow-y:auto;-webkit-overflow-scrolling:touch;}' +
    '.ufs{box-sizing:border-box;position:relative;max-width:560px;margin:24px auto;background:#FAFAFA;color:#17090B;' +
      'font-family:Onest,Arial,sans-serif;padding:32px 28px 28px;border-radius:2px;}' +
    '.ufs *{box-sizing:border-box;font-family:inherit;}' +
    '.ufs-x{position:absolute;top:10px;right:12px;width:36px;height:36px;border:0;background:none;font-size:26px;line-height:1;color:#55575A;cursor:pointer;}' +
    '.ufs-eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#7A1F2A;margin:0 0 8px;}' +
    '.ufs-title{font-size:28px;font-weight:600;line-height:1.15;margin:0 0 10px;}' +
    '.ufs-lead{font-size:15px;line-height:1.45;color:#55575A;margin:0 0 22px;}' +
    '.ufs-item{border-top:1px solid #E3E1E1;padding:20px 0 6px;}' +
    '.ufs-name{font-size:16px;font-weight:600;margin:0 0 2px;}' +
    '.ufs-size{font-size:13px;color:#55575A;margin:0 0 14px;}' +
    '.ufs-tabs{display:flex;gap:0;margin:0 0 16px;border:1px solid #17090B;}' +
    '.ufs-tabs button{flex:1;padding:10px 8px;border:0;background:none;font-size:14px;font-weight:500;color:#17090B;cursor:pointer;}' +
    '.ufs-tabs button.on{background:#17090B;color:#FAFAFA;}' +
    '.ufs-q{font-size:14px;font-weight:600;margin:0 0 8px;}' +
    '.ufs-q small{font-weight:400;color:#55575A;}' +
    '.ufs-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;}' +
    '.ufs-chips button{padding:9px 14px;border:1px solid #C9C6C6;background:#fff;border-radius:999px;font-size:14px;color:#17090B;cursor:pointer;}' +
    '.ufs-chips button.on{border-color:#7A1F2A;background:#7A1F2A;color:#fff;}' +
    '.ufs-sizes{display:flex;gap:12px;margin:-6px 0 18px;}' +
    '.ufs-sizes label{flex:1;font-size:13px;color:#55575A;}' +
    '.ufs-sizes select{display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #C9C6C6;background:#fff;font-size:14px;color:#17090B;border-radius:0;}' +
    '.ufs textarea{display:block;width:100%;min-height:72px;padding:10px 12px;border:1px solid #C9C6C6;background:#fff;font-size:14px;line-height:1.4;color:#17090B;resize:vertical;border-radius:0;margin:0 0 4px;}' +
    '.ufs-count{font-size:12px;color:#9A9D9F;text-align:right;margin:0 0 12px;}' +
    '.ufs-send{display:block;width:100%;margin:18px 0 0;padding:15px;border:0;background:#17090B;color:#FAFAFA;font-size:15px;font-weight:600;letter-spacing:.02em;cursor:pointer;}' +
    '.ufs-send[disabled]{opacity:.5;cursor:default;}' +
    '.ufs-err{color:#7A1F2A;font-size:14px;margin:12px 0 0;}' +
    '.ufs-note{font-size:12px;color:#9A9D9F;margin:14px 0 0;line-height:1.4;}' +
    '.ufs-done{text-align:center;padding:20px 0 8px;}' +
    '.ufs-done .ufs-title{margin-bottom:12px;}' +
    '@media (max-width:639px){.ufs{margin:0;min-height:100%;padding:28px 16px 24px;border-radius:0;}.ufs-title{font-size:24px;}}';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var veil, box;

  function open() {
    var st = el('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    veil = el('div', 'ufs-veil');
    box = el('div', 'ufs');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    var x = el('button', 'ufs-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Закрыть');
    x.addEventListener('click', close);
    veil.appendChild(box);
    box.appendChild(x);
    document.body.appendChild(veil);
    document.documentElement.style.overflow = 'hidden';
    box.appendChild(el('p', 'ufs-lead', 'Загружаем ваш заказ…'));
  }

  function close() {
    if (veil) veil.remove();
    document.documentElement.style.overflow = '';
  }

  function clear() {
    while (box.childNodes.length > 1) box.removeChild(box.lastChild);
  }

  function message(title, text) {
    clear();
    var d = el('div', 'ufs-done');
    d.appendChild(el('p', 'ufs-title', title));
    d.appendChild(el('p', 'ufs-lead', text));
    box.appendChild(d);
  }

  function chips(options, multi, state, key, onChange) {
    var wrap = el('div', 'ufs-chips');
    options.forEach(function (o) {
      var b = el('button', '', o[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (multi) {
          var list = state[key] || [];
          var i = list.indexOf(o[0]);
          if (i >= 0) list.splice(i, 1);
          else {
            if (o[0] === 'ok') list = [];
            else list = list.filter(function (z) { return z !== 'ok'; });
            list.push(o[0]);
          }
          state[key] = list;
        } else {
          state[key] = state[key] === o[0] ? null : o[0];
        }
        paint();
        if (onChange) onChange();
      });
      function paint() {
        var v = state[key];
        Array.prototype.forEach.call(wrap.children, function (c, idx) {
          var code = options[idx][0];
          c.classList.toggle('on', multi ? (v || []).indexOf(code) >= 0 : v === code);
          c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
        });
      }
      wrap.appendChild(b);
      wrap.paint = paint;
    });
    if (wrap.paint) wrap.paint();
    return wrap;
  }

  function sizeSelect(label, state, key, value) {
    var l = el('label', '', label);
    var s = el('select');
    var none = el('option', '', 'не знаю');
    none.value = '';
    s.appendChild(none);
    SIZES.forEach(function (z) {
      var o = el('option', '', z);
      o.value = z;
      s.appendChild(o);
    });
    s.value = value || '';
    state[key] = s.value;
    s.addEventListener('change', function () { state[key] = s.value; });
    l.appendChild(s);
    return l;
  }

  function itemBlock(item, state) {
    var wrap = el('div', 'ufs-item');
    wrap.appendChild(el('p', 'ufs-name', item.name));
    wrap.appendChild(el('p', 'ufs-size', (item.size ? 'Размер ' + item.size + ' · ' : '') + 'арт. ' + item.sku));

    var tabs = el('div', 'ufs-tabs');
    var keep = el('button', '', 'Оставляю себе');
    var back = el('button', '', 'Возвращаю');
    keep.type = back.type = 'button';
    tabs.appendChild(keep);
    tabs.appendChild(back);
    wrap.appendChild(tabs);
    var body = el('div');
    wrap.appendChild(body);

    function render() {
      keep.classList.toggle('on', state.branch === 'kept');
      back.classList.toggle('on', state.branch === 'returned');
      body.innerHTML = '';
      if (state.branch === 'kept') {
        body.appendChild(el('p', 'ufs-q', 'Как село по размеру?'));
        body.appendChild(chips(FIT, false, state, 'fit'));
        var q2 = el('p', 'ufs-q', 'Что не так? ');
        q2.appendChild(el('small', '', 'можно несколько'));
        body.appendChild(q2);
        body.appendChild(chips(ZONES, true, state, 'zones'));
      } else {
        body.appendChild(el('p', 'ufs-q', 'Почему возвращаете?'));
        var sizes = el('div', 'ufs-sizes');
        body.appendChild(chips(REASONS, false, state, 'reason', function () {
          sizes.style.display = state.reason === 'size' ? '' : 'none';
        }));
        sizes.appendChild(sizeSelect('Был размер', state, 'size_had', state.size_had || item.size));
        sizes.appendChild(sizeSelect('Нужен был бы', state, 'size_need', state.size_need));
        sizes.style.display = state.reason === 'size' ? '' : 'none';
        body.appendChild(sizes);
      }
      var q3 = el('p', 'ufs-q', 'Что хочется сказать? ');
      q3.appendChild(el('small', '', 'необязательно'));
      body.appendChild(q3);
      var ta = el('textarea');
      ta.maxLength = 500;
      ta.value = state.comment || '';
      var count = el('p', 'ufs-count', (ta.value.length) + ' / 500');
      ta.addEventListener('input', function () {
        state.comment = ta.value;
        count.textContent = ta.value.length + ' / 500';
      });
      body.appendChild(ta);
      body.appendChild(count);
    }
    keep.addEventListener('click', function () { state.branch = 'kept'; render(); });
    back.addEventListener('click', function () { state.branch = 'returned'; render(); });
    render();
    return wrap;
  }

  function answered(s) {
    return s.branch === 'kept' ? !!s.fit : !!s.reason;
  }

  function form(data) {
    clear();
    box.appendChild(el('p', 'ufs-eyebrow', 'Заказ ' + data.number));
    box.appendChild(el('p', 'ufs-title', 'Как село?'));
    box.appendChild(el('p', 'ufs-lead', 'Три вопроса — это 30 секунд. Ваши ответы помогут нам точнее описывать посадку, ' +
      'чтобы следующая вещь села лучше.'));
    var states = data.items.map(function (item) {
      return { sku: item.sku, branch: item.returned ? 'returned' : 'kept', zones: [] };
    });
    data.items.forEach(function (item, i) { box.appendChild(itemBlock(item, states[i])); });

    var send = el('button', 'ufs-send', 'Отправить');
    send.type = 'button';
    var err = el('p', 'ufs-err');
    err.hidden = true;
    box.appendChild(send);
    box.appendChild(err);
    box.appendChild(el('p', 'ufs-note', 'Сохраняем только номер заказа и ответы — без имени и контактов.'));

    send.addEventListener('click', function () {
      var answers = states.filter(answered).map(function (s) {
        return { sku: s.sku, branch: s.branch, fit: s.fit || null, zones: s.zones || [], reason: s.reason || null,
                 size_had: s.size_had || null, size_need: s.size_need || null, comment: (s.comment || '').trim() || null };
      });
      if (!answers.length) {
        err.textContent = states.length > 1 ? 'Ответьте хотя бы про одну вещь.' :
          (states[0].branch === 'kept' ? 'Отметьте, как село по размеру.' : 'Отметьте, почему возвращаете.');
        err.hidden = false;
        return;
      }
      err.hidden = true;
      send.disabled = true;
      send.textContent = 'Отправляем…';
      if (demo) { thanks(); return; }
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ o: +orderId, t: token, src: source, answers: answers })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.detail || 'Не получилось отправить. Попробуйте ещё раз.');
          thanks();
        });
      }).catch(function (e) {
        err.textContent = e.message || 'Не получилось отправить. Попробуйте ещё раз.';
        err.hidden = false;
        send.disabled = false;
        send.textContent = 'Отправить';
      });
    });
  }

  function thanks() {
    message('Спасибо!', 'Ответы получили. По ним мы уточняем описание посадки и размерную сетку.');
    var b = el('button', 'ufs-send', 'Вернуться на сайт');
    b.type = 'button';
    b.addEventListener('click', close);
    box.lastChild.appendChild(b);
  }

  var DEMO = { number: '990A', items: [
    { sku: 'TP01NY25XS', name: 'Топ с баской, шоколадный', size: 'XS', returned: false },
    { sku: 'DD01FW26S', name: 'Платье-корсет джинсовое «Hourglass»', size: 'S', returned: true }
  ] };

  function start() {
    open();
    if (demo) { form(DEMO); return; }
    var url = API + '?o=' + encodeURIComponent(orderId) + '&t=' + encodeURIComponent(token);
    var tries = 0;
    (function load() {
      fetch(url).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 404) {
            message('Ссылка не открылась', 'Проверьте, что открыли её из письма целиком, или напишите нам — info@unfadedstore.com.');
            return;
          }
          if (!r.ok) throw new Error(j.detail || '');
          form(j);
        });
      }).catch(function (e) {
        // Сервер на Render после простоя просыпается до минуты — пробуем ещё.
        if (++tries < 4 && !(e && e.message)) { setTimeout(load, 8000); return; }
        message('Не получилось загрузить заказ', (e && e.message) || 'Попробуйте открыть ссылку ещё раз чуть позже.');
      });
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
