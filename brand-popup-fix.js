/*
 * UNFADED — фикс попапа подписки (rec1542845921).
 * CSS-приём с ::before/::after content оказался ненадёжным именно в этом
 * Zero Block блоке (текст не рисовался в реальном браузере, хотя
 * getComputedStyle сообщал корректные значения — причину воспроизвести
 * не удалось). Поэтому текст, эйбрау и ссылку "Нет, спасибо" ставим
 * настоящим DOM-текстом/элементами — так же надёжно, как весь остальной
 * текст на сайте.
 * Подключается отдельным <script> в HEAD, рядом с brand-style.css.
 */
(function () {
  var HEADING_SEL = '.tn-elem__15428459211762791192110 .tn-atom';
  var SUB_SEL = '.tn-elem__15428459211762791328198 .tn-atom';
  var FORM_SEL = '.tn-elem__15428459211762791428253';
  var FORM_TAG_SEL = '#rec1542845921 form';
  var HEADING_TEXT = 'Ранний доступ к новым дропам и −10% на первый заказ';
  var SUB_TEXT = 'Подпишитесь на письма UNFADED — без спама, только новые коллекции и закрытые продажи.';
  var EYEBROW_TEXT = 'Будьте первыми';
  var DISMISS_TEXT = 'Нет, спасибо';
  var FOOTER_SEL = '#t-footer';
  var POPUP_WRAP_SEL = '#rec1542842021';
  var CONTAINER_SEL = '.t-popup[data-popup-rec-ids="rec1542845921"] .t-popup__container';
  var MOBILE_BREAKPOINT = 639;

  // Поле "Имя" скрыто через CSS (в макете попапа его нет — только email и
  // согласие), но само ПОЛЕ УДАЛЕНО НЕ БЫЛО. Оно required с ДВУХ независимых
  // сторон:
  // 1) на клиенте — у input остаётся атрибут data-tilda-req="1", который
  //    Тильда проверяет прямо в момент клика по "Подписаться", ДО отправки
  //    формы: если поле пустое, форма даже не пытается уйти в сеть
  //    (ошибка "Пожалуйста, заполните все обязательные поля", без запроса
  //    к forms.tildaapi.com вообще);
  // 2) на сервере — бэкенд forms.tildaapi.com/procces/ независимо от
  //    клиентской проверки тоже требует непустое "Имя" и, если каким-то
  //    образом запрос всё же ушёл пустым, отвечает отдельной ошибкой
  //    "Заполните обязательные поля: name".
  // Поэтому подставляем в скрытое поле значение (часть email до @, или
  // заглушку) СРАЗУ, как только оно появляется в DOM, и держим его
  // актуальным по мере ввода email — так обе проверки проходят.
  function fillNameFallback(nameInput, emailInput) {
    // 26.09: раньше сюда шла часть e-mail до «@», и она становилась именем
    // клиентки в RetailCRM («ivanova88, здравствуйте!» в приветственном
    // письме). Теперь всегда одна заглушка — сервер delivery-calc
    // (/create/user) её не записывает, а письмо без имени здоровается просто
    // «Здравствуйте!».
    var fallback = 'Подписчик';
    if (!nameInput.value.trim() || nameInput.value === nameInput.__ufAutoValue) {
      nameInput.value = fallback;
      nameInput.__ufAutoValue = fallback;
    }
  }

  function ensureNameFallback(form) {
    if (!form) return;
    var nameInput = form.querySelector('input[name="name"]');
    var emailInput = form.querySelector('input[name="email"]');
    if (!nameInput) return;

    fillNameFallback(nameInput, emailInput);

    if (!form.__ufNameFallbackBound) {
      form.__ufNameFallbackBound = true;
      if (emailInput) {
        emailInput.addEventListener('input', function () {
          fillNameFallback(nameInput, emailInput);
        });
      }
      // Финальная подстраховка на случай, если 500-мс тик apply() уже
      // остановился к моменту реальной отправки формы.
      form.addEventListener(
        'submit',
        function () {
          fillNameFallback(nameInput, emailInput);
        },
        true
      );
    }
  }

  // Попап подписки (rec1542845921) живёт внутри своей обёртки rec1542842021
  // (T1093, popup-модуль) — она подключена как один из глобальных блоков
  // сайта и физически лежит внутри <footer id="t-footer">, вместе с
  // остальными глобальными записями (боковая корзина, чекаут-панель и т.д.).
  // На мобильном (≤639px) попап превращается в статичный блок в потоке
  // документа (position:static — см. brand-style.css), поэтому его порядок
  // в DOM определяет, где он визуально появится. По умолчанию Тильда ставит
  // его ПОСЛЕ настоящего футера (rec1777413841 — логотип, колонки, копирайт),
  // из-за чего блок подписки оказывается в самом низу страницы, после всего
  // остального, а не над футером, как задумано в макете. Переставляем
  // обёртку попапа на первое место внутри <footer>, чтобы на мобильном она
  // рисовалась НАД настоящим футером. На десктопе попап — position:fixed
  // модалка поверх всего экрана, её порядок в DOM визуально ни на что не
  // влияет, поэтому переставлять безопасно независимо от ширины экрана.
  function ensureFooterPosition() {
    var footer = document.querySelector(FOOTER_SEL);
    var popupWrap = document.querySelector(POPUP_WRAP_SEL);
    if (!footer || !popupWrap) return;
    if (footer.firstElementChild !== popupWrap) {
      footer.insertBefore(popupWrap, footer.firstElementChild);
    }
  }

  // НАЙДЕНО живой проверкой 28.08 (ночь): на мобильном блок занимал место в
  // layout (правильная высота), но был полностью невидим — просто белое
  // пустое пространство. Причина: класс "t-popup-anim-fadein" у Тильды
  // навешивает на .t-popup__container CSS-transition для opacity, и элемент
  // стартует с opacity:0 — в норме JS Тильды при РЕАЛЬНОМ триггере попапа
  // меняет значение, и transition плавно доводит opacity до 1. На мобильном
  // блок никогда не триггерится штатным образом (мы просто форсируем
  // display:block через CSS), поэтому transition остаётся "подвешенным" на
  // opacity:0 навсегда. Важный нюанс: пока CSS-transition в таком состоянии
  // активен, он перебивает ЛЮБОЕ правило author-стилей на opacity — даже
  // с !important и даже если добавить его позже по каскаду (проверено:
  // добавление <style>opacity:1!important</style> эффекта не дало). Реально
  // помогает только отменить сам transition через Web Animations API
  // (element.getAnimations()[0].cancel()) — после этого браузер берёт
  // значение из обычных CSS-правил, и opacity:1 из brand-style.css
  // применяется. Строго ограничено мобильной шириной — на десктопе этот
  // же transition отвечает за штатную плавную анимацию появления попапа
  // по реальному триггеру (скролл), трогать его там нельзя.
  function ensureMobileVisible() {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;
    var container = document.querySelector(CONTAINER_SEL);
    if (!container) return;
    if (getComputedStyle(container).opacity !== '1') {
      // ВАЖНО: порядок операций имеет значение. Установка inline opacity САМА
      // ПО СЕБЕ запускает новый CSS-transition (т.к. на элементе есть
      // transition-property: opacity от класса Тильды), поэтому если сначала
      // отменить старый transition, а потом установить style — созданный этим
      // же вызовом НОВЫЙ transition остаётся активным и снова держит opacity
      // на 0 до следующего тика (проверено вживую — с порядком
      // cancel()-затем-set() opacity бесконечно "подвисает" на 0, тик за
      // тиком). Правильный порядок — сначала установить style (что создаёт
      // transition), затем сразу отменить именно его — тогда browser
      // мгновенно берёт значение из style-каскада (opacity:1) без анимации.
      container.style.setProperty('opacity', '1', 'important');
      if (container.getAnimations) {
        container.getAnimations().forEach(function (a) {
          try {
            a.cancel();
          } catch (e) {
            /* noop */
          }
        });
      }
    }
  }

  // ==========================================================================
  // UNFADED — карточка товара (PDP), перенос мобильного макета ProductMobile
  // (28.08.2026, ночь #4). У Тильды/виджета нет готовых полей для хлебной
  // крошки, счётчика фото в галерее и переключателя таблицы размеров —
  // вставляем их явным DOM, стили — в brand-style.css (секция "PDP мобильная
  // версия"). Работает на любой карточке товара сайта (общие классы, без
  // привязки к конкретному товару/rec-id).
  // ==========================================================================

  var PDP_CONTAINER_SEL = '.t-store__prod-snippet__container';

  // Слаг категории берём из самого URL страницы товара
  // (/catalog/<slug>/tproduct/...), а человекочитаемое название категории —
  // из первой же ссылки на эту категорию, которая уже есть где-то на
  // странице (меню/футер) — так брейдкрамб не нужно вручную прописывать на
  // каждый товар и он не разъезжается с реальным названием раздела в меню.
  function getCategorySlugFromUrl() {
    var m = location.pathname.match(/\/catalog\/([^\/]+)\/tproduct\//);
    return m ? m[1] : null;
  }

  function ensureBreadcrumb() {
    // ВАЖНО: .t-container с галереей+инфо — ПОТОМОК .t-store__prod-snippet__container
    // (не предок), поэтому .closest('.t-container') от prodContainer ничего не
    // находит (closest ищет вверх по дереву). Вставляем крошку прямо первым
    // ребёнком самого prodContainer — он оборачивает всю строку "галерея + инфо",
    // так что крошка встаёт над ней, как в макете.
    var prodContainer = document.querySelector(PDP_CONTAINER_SEL);
    if (!prodContainer) return; // не страница товара — ничего не делаем
    var wrap = prodContainer;
    if (wrap.querySelector('.uf-breadcrumb')) return;
    var slug = getCategorySlugFromUrl();
    if (!slug) return;
    var catLink = document.querySelector('a[href="/catalog/' + slug + '"]');
    var catName = catLink ? catLink.textContent.trim() : null;
    if (!catName) return;

    var bc = document.createElement('div');
    bc.className = 'uf-breadcrumb';
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M15 18l-6-6 6-6');
    svg.appendChild(path);
    var a = document.createElement('a');
    a.href = '/catalog/' + slug;
    a.textContent = catName;
    bc.appendChild(svg);
    bc.appendChild(a);
    wrap.insertBefore(bc, wrap.firstElementChild);
  }

  // --- Хлебные крошки на десктопе (.uf-crumbs) — полная цепочка "Главная /
  // Категория / Название" по мокапу "Финал на согласование — десктоп"
  // (29.08.2026). Отдельный элемент от мобильной крошки .uf-breadcrumb выше
  // (та — стрелка назад + категория, из более раннего мокапа ProductMobile,
  // мобильная и остаётся мобильной). Видимость по ширине экрана — в CSS
  // (brand-style.css), здесь только сборка DOM и вставка.
  function buildCrumbs(items) {
    var bc = document.createElement('div');
    bc.className = 'uf-crumbs';
    items.forEach(function (item, i) {
      if (i > 0) {
        var sep = document.createElement('span');
        sep.className = 'uf-crumbs-sep';
        sep.textContent = '/';
        bc.appendChild(sep);
      }
      if (item.href) {
        var a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.text;
        bc.appendChild(a);
      } else {
        var span = document.createElement('span');
        span.className = 'uf-crumbs-current';
        span.textContent = item.text;
        bc.appendChild(span);
      }
    });
    return bc;
  }

  function ensureDesktopCrumbsPDP() {
    var prodContainer = document.querySelector(PDP_CONTAINER_SEL);
    if (!prodContainer) return;
    if (prodContainer.querySelector('.uf-crumbs')) return;
    var titleEl = document.querySelector('h1');
    var productName = titleEl ? titleEl.textContent.trim() : null;
    if (!productName) return;
    // Категорию удаётся определить только когда в URL есть /catalog/<slug>/tproduct/ —
    // у части товаров канонический URL просто /tproduct/... (без категории в пути),
    // тогда раньше крошка не показывалась вообще. Теперь в этом случае рендерим
    // крошку без среднего уровня категории, а не прячем её совсем.
    var slug = getCategorySlugFromUrl();
    var catLink = slug ? document.querySelector('a[href="/catalog/' + slug + '"]') : null;
    var catName = catLink ? catLink.textContent.trim() : null;
    var items = [{ text: 'Главная', href: '/' }];
    if (catName) {
      items.push({ text: catName, href: '/catalog/' + slug });
    }
    items.push({ text: productName });
    var bc = buildCrumbs(items);
    prodContainer.insertBefore(bc, prodContainer.firstElementChild);
  }

  function ensureDesktopCrumbsCategory() {
    var m = location.pathname.match(/^\/catalog\/([^\/]+)\/?$/);
    if (!m) return;
    var slug = m[1];
    var t951 = document.querySelector('.t951');
    if (!t951) return;
    if (t951.querySelector('.uf-crumbs')) return;
    var navLink = document.querySelector('a[href="/catalog/' + slug + '"]');
    var catName = navLink ? navLink.textContent.trim() : null;
    if (!catName) return;
    var bc = buildCrumbs([
      { text: 'Главная', href: '/' },
      { text: catName }
    ]);
    t951.insertBefore(bc, t951.firstElementChild);
  }

  var UF_SPECIAL_SECTIONS = {
    '/new': 'Новинки',
    '/last': 'Last Chance',
    '/page87274436.html': 'Bestseller'
  };

  function ensureDesktopCrumbsSpecial() {
    var label = UF_SPECIAL_SECTIONS[location.pathname];
    if (!label) return;
    var t951 = document.querySelector('.t951');
    if (!t951) return;
    if (t951.querySelector('.uf-crumbs')) return;
    var bc = buildCrumbs([
      { text: 'Главная', href: '/' },
      { text: label }
    ]);
    t951.insertBefore(bc, t951.firstElementChild);
  }

  // Счётчик фото "N / M · смахните →" + полоски-индикаторы поверх галереи
  // (.t-slds). Свайп у Тильды в этом компоненте уже штатно работает — сам
  // слайдер не трогаем, только читаем его состояние. Активный слайд Тильда
  // помечает классом .t-slds__bullet_active на соответствующем .t-slds__bullet
  // — вешаем MutationObserver на class каждого bullet, чтобы держать счётчик
  // и полоски синхронными с реальным положением слайдера без опроса по таймеру.
  function ensureGalleryOverlay() {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;
    var sliders = document.querySelectorAll('.t-slds');
    sliders.forEach(function (slider) {
      if (slider.__ufGalleryDone) return;
      var bullets = slider.querySelectorAll('.t-slds__bullet');
      if (!bullets.length) return;
      slider.__ufGalleryDone = true;

      var progress = document.createElement('div');
      progress.className = 'uf-gallery-progress';
      var segs = [];
      bullets.forEach(function () {
        var seg = document.createElement('span');
        progress.appendChild(seg);
        segs.push(seg);
      });

      var hint = document.createElement('div');
      hint.className = 'uf-gallery-hint';

      function render() {
        var activeIdx = 0;
        bullets.forEach(function (b, i) {
          var active = b.classList.contains('t-slds__bullet_active');
          segs[i].classList.toggle('uf-active', active);
          if (active) activeIdx = i;
        });
        hint.textContent =
          (activeIdx + 1) + ' / ' + bullets.length + ' · смахните →';
      }

      slider.appendChild(progress);
      slider.appendChild(hint);
      render();

      var observer = new MutationObserver(render);
      bullets.forEach(function (b) {
        observer.observe(b, { attributes: true, attributeFilter: ['class'] });
      });
    });
  }

  // Таблица размеров (.uf-sizebox) — сворачиваема по умолчанию (см.
  // brand-style.css: .uf-sizebox{display:none}), раскрывается по клику на
  // "Таблица размеров ▾" — точно как указано в собственном примечании
  // макета ("на сайте — сворачивается по клику"). Строка-переключатель
  // вставляется перед самой панелью.
  function ensureSizeTableToggle() {
    var boxes = document.querySelectorAll('.uf-sizebox');
    boxes.forEach(function (box) {
      if (box.__ufToggleDone) return;
      box.__ufToggleDone = true;

      var row = document.createElement('div');
      row.className = 'uf-size-toggle-row';
      var label = document.createElement('span');
      label.textContent = 'Размер';
      var link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Таблица размеров ▾';
      row.appendChild(label);
      row.appendChild(link);
      box.parentElement.insertBefore(row, box);

      link.addEventListener('click', function (e) {
        e.preventDefault();
        var open = box.classList.toggle('uf-open');
        link.textContent = open ? 'Таблица размеров ▴' : 'Таблица размеров ▾';
      });
    });
  }

  // --- Текст главной кнопки "Добавить в корзину" на странице товара —
  // по мокапу вместо родного текста Тильды "В корзину". Тильда сама
  // переключает текст этого узла в другие состояния ("Добавлено!",
  // "Нет в наличии" и т.п.) — трогаем только когда видим ровно "В
  // корзину", остальные состояния не перезаписываем.
  function ensureCartButtonText() {
    var el = document.querySelector('.t-store__prod-popup__btn .js-store-prod-popup-buy-btn-txt');
    if (el && el.textContent.trim() === 'В корзину') {
      el.textContent = 'Добавить в корзину';
    }
  }

  function ensureWaBelowSizeNote() {
    var wa = document.querySelector('.uf-wa');
    var note = document.getElementById('uf-size-stock-note');
    if (!wa) return;
    // 27.09.2026: строки остатка («Осталось 1 шт…») нет у товара, которого нет
    // ни в одном размере, — раньше тогда выходили здесь, и рядом с WhatsApp
    // не появлялся Telegram. Строка остатка нужна только для места ссылки.
    if (note && wa.previousElementSibling !== note) {
      note.parentElement.appendChild(wa);
    }
    ensureTgNextToWa(wa);
    if (wa.querySelector('.uf-wa-text')) return;
    var dot = wa.querySelector('.uf-wdot');
    var fullText = wa.textContent.replace(/\s+/g, ' ').trim();
    var marker = 'Написать в WhatsApp';
    var idx = fullText.indexOf(marker);
    if (idx === -1) return;
    var leadText = fullText.slice(0, idx).trim();
    wa.textContent = '';
    if (dot) wa.appendChild(dot);
    var textWrap = document.createElement('span');
    textWrap.className = 'uf-wa-text';
    var lead = document.createElement('span');
    lead.className = 'uf-wa-lead';
    lead.textContent = leadText + ' ';
    textWrap.appendChild(lead);
    var link = document.createElement('span');
    link.className = 'uf-wa-link-text';
    link.textContent = marker;
    textWrap.appendChild(link);
    wa.appendChild(textWrap);
  }

  // Рядом с «Написать в WhatsApp» — ссылка на Telegram службы заботы
  // (@unfaded_notify_bot, чаты RetailCRM). Отдельный <a>, а не внутри .uf-wa:
  // .uf-wa сам является ссылкой, вложенные ссылки недопустимы.
  var TG_SUPPORT_URL = 'https://t.me/unfaded_notify_bot';
  function ensureTgNextToWa(wa) {
    // Ссылка всегда одна и стоит сразу за WhatsApp: если WhatsApp переехал
    // под строку остатка, существующая ссылка едет за ним, лишние удаляются
    // (27.09: после переезда оставалась вторая «или в Telegram» над «Размер»).
    var all = Array.prototype.slice.call(document.querySelectorAll('.uf-tg'));
    var next = wa.nextElementSibling;
    var keep = (next && next.classList.contains('uf-tg')) ? next : all[0];
    all.forEach(function (x) { if (x !== keep) x.remove(); });
    if (keep) {
      if (wa.nextElementSibling !== keep) wa.insertAdjacentElement('afterend', keep);
      return;
    }
    var tg = document.createElement('a');
    tg.className = 'uf-tg';
    tg.href = TG_SUPPORT_URL;
    tg.target = '_blank';
    tg.rel = 'noopener';
    var lead = document.createElement('span');
    lead.className = 'uf-wa-lead';
    lead.textContent = 'или ';
    var link = document.createElement('span');
    link.className = 'uf-wa-link-text';
    link.textContent = 'в Telegram';
    tg.appendChild(lead);
    tg.appendChild(link);
    wa.insertAdjacentElement('afterend', tg);
  }

  function ensureNoteNoBulb() {
    var notes = document.querySelectorAll('.uf-note');
    notes.forEach(function (note) {
      if (note.dataset.ufBulbStripped) return;
      var text = note.textContent;
      var stripped = text.replace(/^\uD83D\uDCA1\s*/, '').trim();
      if (stripped !== text) {
        note.textContent = stripped;
      }
      note.dataset.ufBulbStripped = '1';
    });
  }

  function apply() {
    // PDP-фиксы (хлебная крошка / галерея / таблица размеров) не зависят от
    // попапа подписки и элементов ниже — запускаем их до возможного раннего
    // return, иначе на странице без загруженного попапа подписки (или до
    // его загрузки) PDP-функции вообще не выполнились бы.
    ensureBreadcrumb();
    ensureDesktopCrumbsPDP();
    ensureDesktopCrumbsCategory();
    ensureDesktopCrumbsSpecial();
    ensureCartButtonText();
    ensureWaBelowSizeNote();
    ensureNoteNoBulb();
    ensureGalleryOverlay();
    ensureSizeTableToggle();

    var heading = document.querySelector(HEADING_SEL);
    var sub = document.querySelector(SUB_SEL);
    if (!heading || !sub) return false;

    if (heading.textContent.trim() !== HEADING_TEXT) {
      heading.textContent = HEADING_TEXT;
    }
    if (sub.textContent.trim() !== SUB_TEXT) {
      sub.textContent = SUB_TEXT;
    }

    var headingElem = heading.closest('.tn-elem');
    var artboard = headingElem ? headingElem.parentElement : null;
    if (artboard && !artboard.querySelector('.uf-popup-eyebrow')) {
      var eyebrow = document.createElement('div');
      eyebrow.className = 'uf-popup-eyebrow';
      eyebrow.textContent = EYEBROW_TEXT;
      artboard.insertBefore(eyebrow, headingElem);
    }

    var formElem = document.querySelector(FORM_SEL);
    if (formElem && !formElem.querySelector('.uf-popup-dismiss')) {
      var popup = formElem.closest('.t-popup');
      var link = document.createElement('a');
      link.href = '#';
      link.className = 'uf-popup-dismiss';
      link.textContent = DISMISS_TEXT;
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var closeBtn = popup && popup.querySelector('.t-popup__close');
        if (closeBtn) closeBtn.click();
      });
      formElem.appendChild(link);
    }

    ensureNameFallback(document.querySelector(FORM_TAG_SEL));
    ensureFooterPosition();
    ensureMobileVisible();

    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  var tries = 0;
  var iv = setInterval(function () {
    apply();
    tries += 1;
    if (tries > 40) clearInterval(iv);
  }, 500);

  // Окно товара (на /archive карточка открывается окном, а не страницей) открывают и через
  // минуты после загрузки, когда цикл выше уже остановился: без этого в окне нет
  // «Таблица размеров ▾» (таблица собрана, но свёрнута), «или в Telegram», «Добавить в корзину».
  // Пока окно товара открыто — повторяем правки страницы товара (04.10.2026).
  setInterval(function () {
    if (!document.querySelector('.t-popup_show .t-store__product-popup')) return;
    ensureCartButtonText();
    ensureWaBelowSizeNote();
    ensureNoteNoBulb();
    ensureGalleryOverlay();
    ensureSizeTableToggle();
  }, 500);

  // Подстраховка на смену ориентации/ресайз уже после того, как основной
  // интервал выше остановился (40 тиков ~20с) — на случай, если другой
  // скрипт Тильды переставит DOM обратно.
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      ensureFooterPosition();
      ensureMobileVisible();
      ensureGalleryOverlay();
    }, 300);
  });
})();

/*
 * UNFADED — cookie-баннер (rec510048518, Tilda T886): текст (вариант 2 из
 * дизайн-ревью "Плашки и cookie-баннер") и ссылка "Подробнее" на страницу
 * "Политика конфиденциальности" (/service#!/tab/533990617-4) — блок сам по
 * себе такой ссылки не предусматривает, поэтому вставляем настоящим
 * DOM-элементом, тем же приёмом, что и остальной текст/ссылки в этом файле.
 * Отдельный (независимый от основного apply()/interval выше) самозапуск —
 * ничего в существующей логике попапа подписки не трогает.
 * Цвета — brand-style.css (29.08.2026).
 */
(function () {
  var COOKIE_TEXT = 'Cookie помогают нам показывать точные размеры и историю просмотров. Продолжая — вы соглашаетесь с их использованием.';
  var COOKIE_MORE_TEXT = 'Подробнее';
  var COOKIE_MORE_HREF = 'https://unfadedstore.com/service#!/tab/533990617-4';

  function ensureCookieBanner() {
    var textEl = document.querySelector('#rec510048518 .t886__text');
    if (!textEl) return false;
    if (textEl.textContent.trim() !== COOKIE_TEXT) {
      textEl.textContent = COOKIE_TEXT;
    }
    var wrapper = textEl.closest('.t886__wrapper');
    if (!wrapper || wrapper.querySelector('.uf-cookie-more')) return true;
    var btn = wrapper.querySelector('.t886__btn');
    var actions = document.createElement('div');
    actions.className = 'uf-cookie-actions';
    if (btn) {
      wrapper.insertBefore(actions, btn);
      actions.appendChild(btn);
    } else {
      wrapper.appendChild(actions);
    }
    var link = document.createElement('a');
    link.href = COOKIE_MORE_HREF;
    link.className = 'uf-cookie-more';
    link.textContent = COOKIE_MORE_TEXT;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    actions.appendChild(link);
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureCookieBanner);
  } else {
    ensureCookieBanner();
  }
  var cookieTries = 0;
  var cookieIv = setInterval(function () {
    ensureCookieBanner();
    cookieTries += 1;
    if (cookieTries > 40) clearInterval(cookieIv);
  }, 500);
})();

/*
 * UNFADED — фикс "скролл кидает вниз к подвалу" на мобильном (29.08.2026).
 * После того как попап подписки стал статичным блоком в потоке страницы
 * (см. выше), настоящий Tilda-триггер по-прежнему при срабатывании вызывает
 * popupEl.focus() на самом попапе (role="dialog" tabindex="-1") — обычная
 * a11y-практика для модалок (переносить фокус в диалог при открытии).
 * Раньше это было безопасно: попап был position:fixed поверх экрана, focus()
 * никуда не скроллил. Теперь попап физически лежит внутри <footer>, и
 * .focus() без опций сам скроллит страницу к элементу — ровно тот самый
 * нежелательный прыжок вниз к подвалу при первом скролле по сайту.
 * Фикс: подменяем focus() именно на этом элементе так, чтобы он всегда
 * вызывался с {preventScroll:true} — фокус по-прежнему переходит в диалог
 * (a11y не ломается), но браузер перестаёт скроллить страницу к нему.
 */
(function () {
  var FOCUS_TARGET_SEL = '.t-popup[data-popup-rec-ids="rec1542845921"]';

  function ensurePreventFocusScroll() {
    if (window.innerWidth > 639) return false;
    var el = document.querySelector(FOCUS_TARGET_SEL);
    if (!el || el.__ufFocusPatched) return false;
    el.__ufFocusPatched = true;
    var nativeFocus = HTMLElement.prototype.focus;
    el.focus = function (opts) {
      nativeFocus.call(this, Object.assign({}, opts, {preventScroll: true}));
    };
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePreventFocusScroll);
  } else {
    ensurePreventFocusScroll();
  }
  var focusTries = 0;
  var focusIv = setInterval(function () {
    ensurePreventFocusScroll();
    focusTries += 1;
    if (focusTries > 40) clearInterval(focusIv);
  }, 500);
})();

/*
 * UNFADED — цена в блоке «Дополните образ» (uf-outfit, кросс-селл на странице
 * товара). Виджет отдаёт цену одним текстовым узлом «18 000 ₽» без разметки,
 * поэтому не может унаследовать стиль карточек каталога (там число и подпись
 * «RUB» — раздельные элементы, см. .t-store__card__price-currency в
 * brand-style.css). Разбиваем текст на два span'а те же по смыслу
 * (.uf-outfit-price-value/.uf-outfit-price-currency), чтобы CSS мог
 * оформить их так же, как в остальных карточках сайта.
 */
(function () {
  function ensureOutfitPriceFormat() {
    var els = document.querySelectorAll('.uf-outfit-price:not([data-uf-formatted])');
    if (!els.length) return false;
    var found = false;
    els.forEach(function (el) {
      var text = (el.textContent || '').trim();
      var m = text.match(/^([\d\s\u00A0]+)\s*₽\s*$/);
      if (!m) { el.setAttribute('data-uf-formatted', '1'); return; }
      var value = m[1].replace(/\s+$/, '');
      el.innerHTML = '';
      var valueSpan = document.createElement('span');
      valueSpan.className = 'uf-outfit-price-value';
      valueSpan.textContent = value;
      var curSpan = document.createElement('span');
      curSpan.className = 'uf-outfit-price-currency';
      curSpan.textContent = 'RUB';
      el.appendChild(valueSpan);
      el.appendChild(curSpan);
      el.setAttribute('data-uf-formatted', '1');
      found = true;
    });
    return found;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureOutfitPriceFormat);
  } else {
    ensureOutfitPriceFormat();
  }
  var outfitTries = 0;
  var outfitIv = setInterval(function () {
    ensureOutfitPriceFormat();
    outfitTries += 1;
    if (outfitTries > 40) clearInterval(outfitIv);
  }, 500);
})();

(function () {
  // Десктопная боковая корзина (.t706__sidebar) структурно не содержит
  // кнопки "назад" — в отличие от мобильной полноэкранной (.t706__cartpage),
  // где она есть в разметке Тильды (.t706__cartpage-back). Клонируем иконку
  // оттуда, чтобы стрелка была визуально той же, что и на мобильном.
  // На боковой панели "назад" некуда — по клику просто закрываем корзину.
  function ensureSidebarBackArrow() {
    var top = document.querySelector('.t706__sidebar-top');
    if (!top) return false;
    if (top.querySelector('.uf-sidebar-back-btn')) return false;
    var srcIcon = document.querySelector('.t706__cartpage-back-icon');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'uf-sidebar-back-btn';
    btn.setAttribute('aria-label', 'Закрыть корзину');
    if (srcIcon) {
      btn.appendChild(srcIcon.cloneNode(true));
    } else {
      btn.textContent = '←';
    }
    btn.addEventListener('click', function () {
      var closeBtn = document.querySelector('.t706__sidebar-close-btn');
      if (closeBtn) closeBtn.click();
    });
    top.insertBefore(btn, top.firstChild);
    return true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureSidebarBackArrow);
  } else {
    ensureSidebarBackArrow();
  }
  var backTries = 0;
  var backIv = setInterval(function () {
    ensureSidebarBackArrow();
    backTries += 1;
    if (backTries > 40) clearInterval(backIv);
  }, 500);
})();

// Раунд 11 (2026-08-30): блок "Новинки" на главной (rec503881643) — счётчик
// "Показано X из Y товаров" над родной кнопкой "Загрузить ещё" (перестилизована в
// brand-style.css в текстовую ссылку), плюс отдельная ссылка "Перейти в каталог"
// рядом с ней. Y берётся напрямую из API Tilda, X — фактическое число уже
// отрисованных карточек, обновляется после каждой догрузки.
(function () {
  var RECORD_ID = 'rec503881643';
  var CATALOG_HREF = '/catalog';
  var STORE_PART_UID = '179820859341';
  var STORE_RECID = '503881643';
  var initialized = false;

  function currentShown(rec) {
    return rec.querySelectorAll('.t-store__card').length;
  }

  function setCaptionText(caption, shown, total) {
    caption.textContent = shown >= total
      ? 'Показаны все ' + total + ' товаров'
      : 'Показано ' + shown + ' из ' + total + ' товаров';
  }

  function fetchTotal() {
    var url = 'https://store.tildaapi.com/api/getproductslist/?storepartuid=' + STORE_PART_UID +
      '&recid=' + STORE_RECID + '&c=1&slice=1&getparts=true&size=1&flag_root=withroot';
    return fetch(url).then(function (res) { return res.json(); }).then(function (json) {
      return json.total;
    }).catch(function () { return null; });
  }

  function ensureLoadMoreCounter() {
    if (initialized) return;
    var rec = document.getElementById(RECORD_ID);
    if (!rec) return;
    var wrap = rec.querySelector('.t-store__load-more-btn-wrap');
    if (!wrap) return;
    initialized = true;

    fetchTotal().then(function (total) {
      if (!total) { initialized = false; return; }

      var caption = document.createElement('div');
      caption.className = 'uf-loadmore-caption';
      setCaptionText(caption, currentShown(rec), total);
      wrap.insertBefore(caption, wrap.firstChild);

      var gotoLink = document.createElement('a');
      gotoLink.href = CATALOG_HREF;
      gotoLink.className = 'uf-goto-catalog-link';
      gotoLink.textContent = 'Перейти в каталог →';
      wrap.appendChild(gotoLink);

      var storeRoot = rec.querySelector('.t-store');
      if (storeRoot && window.MutationObserver) {
        var scheduled = false;
        var mo = new MutationObserver(function () {
          if (scheduled) return;
          scheduled = true;
          setTimeout(function () {
            scheduled = false;
            setCaptionText(caption, currentShown(rec), total);
          }, 150);
        });
        mo.observe(storeRoot, { childList: true, subtree: false });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', ensureLoadMoreCounter);
  var ufR11Tries = 0;
  var ufR11Interval = setInterval(function () {
    ufR11Tries++;
    ensureLoadMoreCounter();
    if (initialized || ufR11Tries > 40) clearInterval(ufR11Interval);
  }, 500);
})();

// Главная: заголовок блока "Новинки" -- вставляет рубрику + заголовок + ссылку
// "Смотреть все" перед сеткой товаров (#rec503881643). Нативный текстовый Zero-блок
// (#rec504664503, просто "НОВИНКИ") скрыт через CSS -- см. brand-style.css.
(function () {
  var GRID_REC_ID = 'rec503881643';
  var initialized = false;

  function ensureNovinkiHeader() {
    if (initialized) return;
    var grid = document.getElementById(GRID_REC_ID);
    if (!grid || !grid.parentNode) return;
    if (document.querySelector('.uf-nov-header')) { initialized = true; return; }
    initialized = true;

    var header = document.createElement('div');
    header.className = 'uf-nov-header';
    header.innerHTML =
      '<div class="uf-nov-header__inner">' +
        '<p class="uf-nov-header__eyebrow">Новая коллекция</p>' +
        '<div class="uf-nov-header__row">' +
          '<h2 class="uf-nov-header__title">Новинки</h2>' +
          '<a class="uf-nov-header__link" href="/new">Смотреть все →</a>' +
        '</div>' +
      '</div>';
    grid.parentNode.insertBefore(header, grid);
  }

  document.addEventListener('DOMContentLoaded', ensureNovinkiHeader);
  var ufNovTries = 0;
  var ufNovInterval = setInterval(function () {
    ufNovTries++;
    ensureNovinkiHeader();
    if (initialized || ufNovTries > 40) clearInterval(ufNovInterval);
  }, 500);
})();

// ============================================================
// UNFADED — Checkout step wizard
// Non-destructive: tags Tilda's native checkout field-groups with
// data-uf-step (1..4) and toggles visibility via data-active-step
// on .t-form__inputsbox. Native inputs/names, Dolyame's widget and
// the paymentsystem (RetailCRM/Яндекс) block are left untouched —
// the latter pending separate review with the tech specialist.
// ============================================================
(function () {
  var STEP_LABELS = ['Контакты', 'Доставка', 'Оплата', 'Проверка', 'Готово'];

  function q(root, sel) { return root.querySelector(sel); }
  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function findForm() {
    var pm = document.querySelector('.t-input-group_pm');
    if (!pm) return null;
    return pm.closest('form.js-form-proccess');
  }

  function tagFields(box) {
    var children = qa(box, ':scope > *');
    children.forEach(function (el) {
      if (el.matches('.t-input-group_nm, .t-input-group_em, .t-input-group_ph, .t-input-group_in, .t-input-group_pc')) {
        if (!el.dataset.ufAssigned) {
          el.setAttribute('data-uf-step', '1');
          el.dataset.ufAssigned = '1';
        }
      } else if (el.matches('.t-input-group_cb') && el.querySelector('input[name="subscribe_news"]')) {
        // «Получать новости…» (поле subscribe_news, 26.09) — на шаг «Оплата»,
        // под способами оплаты; в RetailCRM уходит через модуль imb.
        el.setAttribute('data-uf-step', '3');
        el.classList.add('uf-subscribe-cb');
        el.dataset.ufAssigned = '1';
      } else if (el.matches('.t-input-group_cb, .t-input-group_dl')) {
        el.setAttribute('data-uf-step', '2');
        el.dataset.ufAssigned = '1';
      } else if (el.matches('.t-input-group_rd, .t-input-group_pm')) {
        el.setAttribute('data-uf-step', '3');
        el.dataset.ufAssigned = '1';
      }
    });
    // Put the newsletter checkbox under the last payment group (the visible
    // list of payment methods is .t-input-group_pm, after .t-input-group_rd).
    var subCb = q(box, '.uf-subscribe-cb');
    var payGroups = qa(box, '.t-input-group_rd, .t-input-group_pm');
    var lastPay = payGroups[payGroups.length - 1];
    if (subCb && lastPay && subCb.previousElementSibling !== lastPay) {
      lastPay.parentNode.insertBefore(subCb, lastPay.nextSibling);
    }
    // Second promo-code field: confirmed 2026-08-30 (real RetailCRM order
    // data checked by the site owner) that only the FIRST "Промокод" field
    // reaches CRM — this one ("Промокод_2", after pay_method) is dead.
    // Hide it permanently instead of showing a field that does nothing.
    var rd = q(box, '.t-input-group_rd');
    if (rd) {
      qa(box, '.t-input-group_pc').forEach(function (el) {
        if (el.compareDocumentPosition(rd) & Node.DOCUMENT_POSITION_PRECEDING) {
          el.classList.add('uf-checkout-hidden-field');
          el.removeAttribute('data-uf-step');
        }
      });
    }
  }

    // Delivery-method radios (tildadelivery-type) render their price as a
  // literal "0" text node when delivery is free — hide that rather than
  // show a confusing zero. Re-run on every DOM change inside the delivery
  // block, since Tilda re-renders the option list when the city changes
  // (different cities can offer a different number/kind of options, e.g.
  // an extra priced "Экспресс доставка" option for Moscow addresses).
  function markZeroDeliveryPrices(box) {
    qa(box, '.t-input-group_dl .delivery-minimum-price').forEach(function (el) {
      var v = el.textContent.trim();
      el.classList.toggle('uf-checkout-hidden-price', v === '' || v === '0' || v === '0 р.' || v === '0 ₽');
    });
  }
function buildStepper(active) {
    var wrap = document.createElement('div');
    wrap.className = 'uf-checkout-stepper';
    STEP_LABELS.forEach(function (label, i) {
      var n = i + 1;
      if (i > 0) {
        var sep = document.createElement('div');
        sep.className = 'uf-checkout-stepper__sep';
        wrap.appendChild(sep);
      }
      var item = document.createElement('div');
      item.className = 'uf-checkout-stepper__item';
      item.setAttribute('data-uf-step-btn', String(n));
      if (n < active) item.classList.add('is-done', 'is-clickable');
      else if (n === active) item.classList.add('is-active');
      item.innerHTML =
        '<span class="uf-checkout-stepper__num"><span class="uf-checkout-stepper__num-text">' + n + '</span></span>' +
        '<span class="uf-checkout-stepper__label">' + label + '</span>';
      wrap.appendChild(item);
    });
    return wrap;
  }

  function fieldVal(box, selector) {
    var el = q(box, selector);
    return el ? el.value.trim() : '';
  }

  function checkedLabel(box, groupSel) {
    var group = q(box, groupSel);
    if (!group) return '';
    var checked = q(group, 'input:checked');
    if (!checked) return '';
    var label = checked.closest('label');
    if (!label) return checked.value || '';
    var span = label.querySelector('span');
    return (span ? span.textContent : label.textContent).trim();
  }

  function buildReview(box) {
    var name = fieldVal(box, '.t-input-group_nm input');
    var email = fieldVal(box, '.t-input-group_em input');
    var phone = fieldVal(box, '.t-input-group_ph input[type="tel"]') || fieldVal(box, '.t-input-group_ph input');
    var tg = fieldVal(box, '.t-input-group_in input');
    var city = fieldVal(box, 'input[name="tildadelivery-city"]');
    var street = fieldVal(box, 'input[name="tildadelivery-street"]');
    var house = fieldVal(box, 'input[name="tildadelivery-house"]');
    var deliveryTypeEl = q(box, 'input[name="tildadelivery-type"]:checked');
    var deliveryType = deliveryTypeEl ? deliveryTypeEl.value : '';
    var payMethod = checkedLabel(box, '.t-input-group_rd');

    var deliveryParts = [];
    deliveryParts.push(city || 'Город не указан');
    if (deliveryType) deliveryParts.push(deliveryType);
    if (street) deliveryParts.push(street + (house ? ', д. ' + house : ''));

    var review = box.querySelector('.uf-checkout-review');
    if (!review) return;
    review.innerHTML =
      '<div class="uf-checkout-review__block">' +
        '<div class="uf-checkout-review__row">' +
          '<div><div class="uf-checkout-review__label">Контакты</div>' +
            '<div class="uf-checkout-review__value">' +
              (name || '—') + '<br>' + (email || '—') + '<br>' + (phone || '—') +
              (tg ? '<br>@' + tg.replace(/^@/, '') : '') +
            '</div>' +
          '</div>' +
          '<button type="button" class="uf-checkout-review__edit" data-uf-goto="1">Изменить</button>' +
        '</div>' +
      '</div>' +
      '<div class="uf-checkout-review__block">' +
        '<div class="uf-checkout-review__row">' +
          '<div><div class="uf-checkout-review__label">Доставка</div>' +
            '<div class="uf-checkout-review__value">' + deliveryParts.join(' — ') + '</div>' +
          '</div>' +
          '<button type="button" class="uf-checkout-review__edit" data-uf-goto="2">Изменить</button>' +
        '</div>' +
      '</div>' +
      '<div class="uf-checkout-review__block">' +
        '<div class="uf-checkout-review__row">' +
          '<div><div class="uf-checkout-review__label">Оплата</div>' +
            '<div class="uf-checkout-review__value">' + (payMethod || '—') + '</div>' +
          '</div>' +
          '<button type="button" class="uf-checkout-review__edit" data-uf-goto="3">Изменить</button>' +
        '</div>' +
      '</div>';
  }

  // Delivery address must be picked from Tilda's suggestion lists. Tilda
  // marks these fields with data-tilda-req (not the HTML `required`
  // attribute), so checkValidity() lets empty/hand-typed values through,
  // and its own state (streetGuid) is not reset when the text is retyped.
  // We track it ourselves: a trusted keystroke marks the field "typed",
  // a click on a .searchbox-list-item of that field marks it "picked".
  // Values Tilda restores itself (saved address) are never "typed".
  var ADDR_FIELDS = {
    'tildadelivery-city': 'Выберите город из выпадающего списка',
    'tildadelivery-street': 'Выберите улицу из выпадающего списка',
    'tildadelivery-pickup-name': 'Выберите пункт выдачи из списка или на карте'
  };

  function trackAddressPicks(form) {
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (!e.isTrusted || !t.name) return;
      if (ADDR_FIELDS[t.name] || t.name === 'tildadelivery-house') {
        t.dataset.ufTyped = '1';
        clearFieldError(t);
      }
      // B18: убираем подсказку об ошибке, как только поле начали заполнять.
      if (t.getAttribute('data-tilda-req') === '1' || t.name === 'tildaspec-phone-part[]') {
        clearFieldError(t);
      }
    }, true);
    // Tilda picks the suggestion on mousedown and removes the list before
    // `click` fires, so listen for the press itself.
    function onPick(e) {
      var item = e.target.closest && e.target.closest('.searchbox-list-item');
      if (!item) return;
      var wrap = item.closest('.searchbox-inner-wrapper');
      var input = wrap && q(wrap, 'input.searchbox-input');
      if (!input) return;
      // Tilda fills the value in its own handler; mark after it runs.
      setTimeout(function () {
        input.dataset.ufTyped = '0';
        clearFieldError(input);
      }, 300);
    }
    form.addEventListener('mousedown', onPick, true);
    form.addEventListener('touchstart', onPick, true);
  }

  function clearFieldError(input) {
    var block = input.closest('.t-input-block') || input.parentElement;
    var err = block && q(block, '.uf-field-error');
    if (err) err.remove();
    input.classList.remove('uf-input-invalid');
  }

  function showFieldError(input, text) {
    clearFieldError(input);
    var block = input.closest('.t-input-block') || input.parentElement;
    // Tilda sometimes shows its own message for the same field — don't double it.
    var own = block && q(block, '.t-input-error');
    if (!(own && own.textContent.trim() && isShown(own, block))) {
      var err = document.createElement('div');
      err.className = 'uf-field-error';
      err.textContent = text;
      block.appendChild(err);
    }
    input.classList.add('uf-input-invalid');
    if (input.scrollIntoView) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // Shown inside `root`: ignores the wizard hiding the whole step, so the
  // check also works from the review step (before the final submit).
  function isShown(el, root) {
    if (!el) return false;
    for (var n = el; n && n !== root; n = n.parentElement) {
      if (window.getComputedStyle(n).display === 'none') return false;
    }
    return true;
  }

  function deliveryState() {
    return (window.tcart_newDelivery && window.tcart_newDelivery.deliveryState) || {};
  }

  // Returns the first delivery input that blocks moving on, with a message.
  function findDeliveryProblem(box) {
    var dl = q(box, '.t-input-group_dl');
    if (!dl) return null;
    var state = deliveryState();
    var delivery = (window.tcart && window.tcart.delivery) || {};

    var city = q(dl, 'input[name="tildadelivery-city"]');
    if (isShown(city, dl)) {
      var guid = q(dl, 'input[name="tildadelivery-guid"]');
      if (!city.value.trim() || city.dataset.ufTyped === '1' || !(guid && guid.value)) {
        return { input: city, text: ADDR_FIELDS['tildadelivery-city'] };
      }
    }

    var types = qa(dl, 'input[name="tildadelivery-type"]');
    if (types.length && !types.some(function (r) { return r.checked; })) {
      return { input: types[0], text: 'Выберите способ доставки' };
    }

    var street = q(dl, 'input[name="tildadelivery-street"]');
    if (isShown(street, dl) && street.getAttribute('data-tilda-req') === '1') {
      if (!street.value.trim() || street.dataset.ufTyped === '1' || !state.streetGuid) {
        return { input: street, text: ADDR_FIELDS['tildadelivery-street'] };
      }
    }

    var pickup = q(dl, 'input[name="tildadelivery-pickup-name"]');
    if (isShown(pickup, dl)) {
      if (!pickup.value.trim() || pickup.dataset.ufTyped === '1' || !delivery['pickup-id']) {
        return { input: pickup, text: ADDR_FIELDS['tildadelivery-pickup-name'] };
      }
    }

    var missing = null;
    qa(dl, 'input[data-tilda-req="1"]').forEach(function (input) {
      if (missing || !isShown(input, dl) || input.type === 'radio') return;
      if (!input.value.trim()) missing = input;
    });
    if (missing) {
      var label = missing.name === 'tildadelivery-house' ? 'Укажите номер дома' : 'Заполните это поле';
      return { input: missing, text: label };
    }
    return null;
  }

  // B18: обязательные поля Тильда помечает своим data-tilda-req="1", а не
  // HTML-атрибутом required — checkValidity() пропускал пустые ФИО, e-mail и
  // телефон, и «Далее» уводил на следующий шаг. Проверяем признак Тильды сами.
  // Телефон особый: значение лежит в скрытом input[name="Phone"], а вводит
  // покупательница в соседнее видимое поле — ошибку показываем у видимого.
  var REQUIRED_LABELS = {
    Name: 'Укажите имя и фамилию',
    Email: 'Укажите адрес e-mail',
    Phone: 'Укажите номер телефона'
  };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function visibleTwin(input) {
    if (input.type !== 'hidden') return input;
    var block = input.closest('.t-input-block') || input.parentElement;
    var twin = block && q(block, 'input:not([type="hidden"])');
    return twin || input;
  }

  function findRequiredProblem(box, step) {
    var problem = null;
    qa(box, '[data-uf-step="' + step + '"] input, [data-uf-step="' + step + '"] textarea').forEach(function (input) {
      if (problem) return;
      if (input.getAttribute('data-tilda-req') !== '1') return;
      if (input.type === 'radio' || input.type === 'checkbox') return;
      var target = visibleTwin(input);
      if (target.offsetParent === null) return;
      if (!input.value.trim()) {
        problem = { input: target, text: REQUIRED_LABELS[input.name] || 'Заполните это поле' };
        return;
      }
      if (input.name === 'Email' && !EMAIL_RE.test(input.value.trim())) {
        problem = { input: target, text: 'Проверьте адрес e-mail' };
      }
    });
    return problem;
  }

  function validateStep(box, step) {
    var invalid = null;
    qa(box, '[data-uf-step="' + step + '"] input, [data-uf-step="' + step + '"] textarea').forEach(function (input) {
      if (invalid) return;
      if (input.type === 'hidden' || input.offsetParent === null) return;
      if (!input.checkValidity()) invalid = input;
    });
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    if (step === 2) {
      var problem = findDeliveryProblem(box);
      if (problem) {
        showFieldError(problem.input, problem.text);
        return false;
      }
    }
    var required = findRequiredProblem(box, step);
    if (required) {
      showFieldError(required.input, required.text);
      return false;
    }
    return true;
  }

  function setStep(box, stepper, step) {
    box.setAttribute('data-active-step', String(step));
    var newStepper = buildStepper(step);
    stepper.replaceWith(newStepper);
    qa(newStepper, '[data-uf-step-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = parseInt(btn.getAttribute('data-uf-step-btn'), 10);
        if (target < step) setStep(box, newStepper, target);
      });
    });
    var backBtn = q(box.parentElement, '.uf-checkout-nav__back');
    var nextBtn = q(box.parentElement, '.uf-checkout-nav__next');
    if (backBtn) backBtn.style.display = step === 1 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = step === 4 ? 'none' : '';
    if (step === 4) buildReview(box);
    box.scrollIntoView && box.closest('.t706__cartpage') && box.closest('.t706__cartpage').scrollTo && box.closest('.t706__cartpage').scrollTo({ top: 0, behavior: 'auto' });
  }

  function initWizard() {
    var form = findForm();
    if (!form || form.dataset.ufWizardInit) return;
    var box = q(form, '.t-form__inputsbox');
    if (!box) return;
    form.dataset.ufWizardInit = '1';
    box.setAttribute('data-uf-wizard', '1');

    tagFields(box);

    // Delivery option list: mark zero-price entries once now, and keep
    // re-marking whenever Tilda swaps the option list for a new city.
    var dl = q(box, '.t-input-group_dl');
    if (dl) {
      markZeroDeliveryPrices(box);
      var dlObs = new MutationObserver(function () { markZeroDeliveryPrices(box); });
      dlObs.observe(dl, { childList: true, subtree: true });
    }

    var review = document.createElement('div');
    review.className = 'uf-checkout-review';
    review.setAttribute('data-uf-step', '4');
    var submitWrap = q(form, '.t-form__submit');
    if (submitWrap) box.insertBefore(review, submitWrap);
    else box.appendChild(review);

    var stepper = buildStepper(1);
    box.parentElement.insertBefore(stepper, box);

    var nav = document.createElement('div');
    nav.className = 'uf-checkout-nav';
    nav.innerHTML =
      '<button type="button" class="uf-checkout-nav__back" style="display:none">← Назад</button>' +
      '<button type="button" class="uf-checkout-nav__next">Далее</button>';
    box.parentElement.insertBefore(nav, box.nextSibling);

    box.setAttribute('data-active-step', '1');

    qa(stepper, '[data-uf-step-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var current = parseInt(box.getAttribute('data-active-step'), 10);
        var target = parseInt(btn.getAttribute('data-uf-step-btn'), 10);
        if (target < current) setStep(box, q(box.parentElement, '.uf-checkout-stepper'), target);
      });
    });

    nav.querySelector('.uf-checkout-nav__back').addEventListener('click', function () {
      var current = parseInt(box.getAttribute('data-active-step'), 10);
      if (current > 1) setStep(box, q(box.parentElement, '.uf-checkout-stepper'), current - 1);
    });
    nav.querySelector('.uf-checkout-nav__next').addEventListener('click', function () {
      var current = parseInt(box.getAttribute('data-active-step'), 10);
      if (!validateStep(box, current)) return;
      if (current < 4) setStep(box, q(box.parentElement, '.uf-checkout-stepper'), current + 1);
    });

    trackAddressPicks(form);

    // Last line of defence: never let Tilda submit with an unconfirmed
    // address (capture phase runs before Tilda's own submit handler).
    form.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.t-submit')) return;
      if (!findDeliveryProblem(box)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setStep(box, q(box.parentElement, '.uf-checkout-stepper'), 2);
      validateStep(box, 2);
    }, true);

    review.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-uf-goto]');
      if (!btn) return;
      var target = parseInt(btn.getAttribute('data-uf-goto'), 10);
      setStep(box, q(box.parentElement, '.uf-checkout-stepper'), target);
    });

    // On successful order submission Tilda populates .js-successbox — collapse
    // the wizard chrome so only the success message shows.
    var successBox = form.parentElement.querySelector('.js-successbox');
    if (successBox) {
      var obs = new MutationObserver(function () {
        if (successBox.textContent.trim()) {
          box.style.display = 'none';
          stepper.style.display = 'none';
          nav.style.display = 'none';
        }
      });
      obs.observe(successBox, { childList: true, characterData: true, subtree: true });
    }
  }

  document.addEventListener('DOMContentLoaded', initWizard);
  var ufWizTries = 0;
  var ufWizInterval = setInterval(function () {
    ufWizTries++;
    initWizard();
    if (ufWizTries > 200) clearInterval(ufWizInterval);
  }, 400);
})();

// ============================================================
// UNFADED — "Спасибо за заказ" (/thanks) redesign: header card
// The T123 block's own markup (#rec3375631701 .unf-thanks) has a bare
// <h2> + <p class="unf-sub"> as its first two children, with no eyebrow
// label and no wrapping element for the dark header-card background —
// this wraps them at runtime so brand-style.css can style the card.
// Copy is untouched: only moves the existing h2/p.unf-sub nodes into a
// new wrapper and adds one new eyebrow label. Same pattern as the
// homepage "Новинки" header (ensureNovinkiHeader above).
// ============================================================
(function () {
  var initialized = false;

  function ensureThanksHeaderCard() {
    if (initialized) return;
    var root = document.querySelector('#rec3375631701 .unf-thanks');
    if (!root) return;
    var h2 = root.querySelector(':scope > h2');
    var sub = root.querySelector(':scope > p.unf-sub');
    if (!h2 || !sub) return;
    initialized = true;

    var card = document.createElement('div');
    card.className = 'uf-thanks-card';

    var eyebrow = document.createElement('p');
    eyebrow.className = 'uf-thanks-eyebrow';
    eyebrow.textContent = 'Заказ оформлен';

    root.insertBefore(card, h2);
    card.appendChild(eyebrow);
    card.appendChild(h2);
    card.appendChild(sub);
  }

  // Клуб UNFADED ACCESS SYSTEM — отдельный блок под строкой с почтой
  // (кнопка бота заказов уже есть выше). Макет утверждён Лерой 29.09.2026, текст на «вы».
  var clubAdded = false;
  function ensureThanksClub() {
    if (clubAdded) return;
    var root = document.querySelector('#rec3375631701 .unf-thanks');
    var support = root && root.querySelector('.unf-support');
    if (!support) return;
    clubAdded = true;
    var box = document.createElement('div');
    box.className = 'uf-thanks-club';
    box.innerHTML =
      '<p class="uf-thanks-club__eb">UNFADED ACCESS SYSTEM</p>' +
      '<p class="uf-thanks-club__txt">Ваш уровень уже посчитан по прошлым покупкам. Войдите в клуб — и с этого заказа начнут копиться CREDITS.</p>' +
      '<a class="uf-thanks-club__btn" href="https://t.me/unfaded_club_bot?start=thanks" target="_blank" rel="noopener">Получить допуск</a>';
    support.parentNode.insertBefore(box, support.nextSibling);
  }

  document.addEventListener('DOMContentLoaded', ensureThanksHeaderCard);
  document.addEventListener('DOMContentLoaded', ensureThanksClub);
  var ufThanksTries = 0;
  var ufThanksInterval = setInterval(function () {
    ufThanksTries++;
    ensureThanksHeaderCard();
    ensureThanksClub();
    if ((initialized && clubAdded) || ufThanksTries > 40) clearInterval(ufThanksInterval);
  }, 500);
})();

/* ================================================================
   UNFADED — «Клиентский сервис»: разделение Возврат/Обмен, онлайн-
   заявка без бумажного бланка, кастомный навигатор (2 колонки на
   десктопе — как в макете, аккордеон на мобильном) — заменяет
   T395 tabs + нативный mobile <select>.
   ================================================================ */
(function () {
  'use strict';
  var TG_SUPPORT_URL = 'https://t.me/unfaded_notify_bot'; // Telegram службы заботы (чаты RetailCRM)

  var WA_NUMBER = '79938955008';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Оферта / Политика конфиденциальности: живой текст из
     Tilda (клон исходного T395-рекорда — см. build()), но с нашей
     типографикой юридического документа. Текст руками не перепечатан
     (слишком велик и слишком легально значим, чтобы рисковать
     расхождением с оригиналом) — вместо этого распознаём структуру
     самого текста: у Tilda здесь просто сплошной поток без какой-либо
     разметки заголовков (даже bold нет), но сами номера пунктов
     («1.», «1.1.», «3.2.6») и термины («Термин – определение.») —
     это надёжный текстовый паттерн, по которому и режем. ---------- */

  /* Возвращает список найденных «пунктов» { marker, start, contentStart }
     по номерам вида «N», «N.M», «N.M.K» и т.д. Стоп-правило —
     предыдущий символ не цифра (иначе это середина большего числа,
     например «437» ошибочно читается как «4» + «37»): пункты с
     подноме­ром (есть точка внутри, «1.1», «3.2.6») принимаем всегда —
     такой паттерн в юридическом тексте не встречается ни для чего,
     кроме номера пункта; «голый» верхнеуровневый номer («1», «12») —
     только если стоит после точки/двоеточия/переноса строки (обычный
     конец предложения) или после буквы, но сразу перед словом с
     заглавной буквы (типичный вид заголовка раздела, когда Tilda
     склеила его с предыдущим текстом без разделителя вообще). */
  function splitLegalClauses(text) {
    var re = /(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+/g;
    var m, marks = [];
    while ((m = re.exec(text))) {
      var idx = m.index;
      var marker = m[1];
      var isMultiPart = marker.indexOf('.') !== -1;
      var contentStart = idx + m[0].length;
      var nextChar = text.charAt(contentStart);
      var before = text.slice(0, idx).replace(/[ \t]+$/, '');
      var prevChar = before.slice(-1);
      if (/\d/.test(prevChar)) continue; /* середина числа — не пункт */
      var ok = false;
      if (isMultiPart) {
        ok = true;
      } else if (idx === 0 || prevChar === '.' || prevChar === ':' || prevChar === '\n') {
        ok = true;
      } else if (/[А-ЯЁA-Z]/.test(nextChar)) {
        ok = true;
      }
      if (ok) marks.push({ marker: marker, start: idx, contentStart: contentStart });
    }
    return marks;
  }

  /* Находит внутри куска текста определения вида «Термин – текст.» —
     тоже по паттерну (тире после короткого слова/фразы с заглавной
     буквы), а не по разметке (у Tilda её и здесь нет). Используется и
     для преамбулы документа («Термины. Клиент – …»), и — см. ниже —
     для пунктов первого уровня без вложенной нумерации, где Tilda
     точно так же склеивает список терминов с заголовком без единого
     разделителя (раздел «2. Термины и понятия» в Политике конфиден­
     циальности: «…СоглашенииКомпания «UNFADED» – юридическое лицо…») */
  function findTerms(str) {
    var termRe = /([А-ЯЁ][а-яёA-Za-z\s]{2,45}?)\s*[–—]\s*/g;
    var tm, terms = [];
    while ((tm = termRe.exec(str))) {
      var tidx = tm.index;
      var tbefore = str.slice(0, tidx).replace(/\s+$/, '');
      if (tidx === 0 || tbefore.slice(-1) === '.') {
        terms.push({ term: tm[1].trim(), start: tidx, contentStart: tidx + tm[0].length });
      }
    }
    return terms;
  }

  /* Разбирает кусок текста «заголовок + (опционально) список терминов»
     и дописывает в frag: короткий .uf-legal-title (если перед первым
     термином что-то есть) и .uf-legal-body с определениями; если
     терминов не нашлось — просто один абзац. */
  function appendTermSection(frag, str) {
    if (!str) return;
    var terms = findTerms(str);
    if (terms.length && terms[0].start > 0) {
      var lead = str.slice(0, terms[0].start).trim();
      if (lead) {
        var lh = document.createElement('div');
        lh.className = 'uf-legal-title';
        lh.textContent = lead;
        frag.appendChild(lh);
      }
    }
    var body = document.createElement('div');
    body.className = 'uf-legal-body';
    if (terms.length) {
      terms.forEach(function (t, i) {
        var end = (i + 1 < terms.length) ? terms[i + 1].start : str.length;
        var p = document.createElement('p');
        var b = document.createElement('b');
        b.textContent = t.term;
        p.appendChild(b);
        p.appendChild(document.createTextNode(' – ' + str.slice(t.contentStart, end).trim()));
        body.appendChild(p);
      });
    } else {
      var p0 = document.createElement('p');
      p0.textContent = str;
      body.appendChild(p0);
    }
    if (body.children.length) frag.appendChild(body);
  }

  function richifyLegal(cloneNode, label) {
    var textSrc = cloneNode.cloneNode(true);
    qsa('br', textSrc).forEach(function (br) { br.replaceWith('\n'); });
    qsa('style', textSrc).forEach(function (s) { s.remove(); });
    var text = (textSrc.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    if (label) {
      var esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp('^' + esc + '\\s*'), '').trim();
    }

    var marks = splitLegalClauses(text);
    var preambleEnd = marks.length ? marks[0].start : text.length;
    var preamble = text.slice(0, preambleEnd).trim();

    var frag = document.createDocumentFragment();

    appendTermSection(frag, preamble);

    /* Заголовок пункта первого уровня («N. Название раздела.») обычно
       короткий — просто название. Но встречаются разделы, где Tilda тем
       же приёмом (без всякого разделителя) приклеивает к заголовку сразу
       список терминов (см. комментарий в findTerms) — тогда «шапка»
       пункта длиннее заранее не заданного предела, и мы прогоняем её
       через тот же разбор терминов вместо того, чтобы засунуть весь
       список одной жирной строкой в .uf-clause-num. */
    var CLAUSE_HEAD_LIMIT = 90;
    marks.forEach(function (mk, i) {
      var end = (i + 1 < marks.length) ? marks[i + 1].start : text.length;
      var clauseText = text.slice(mk.contentStart, end).trim();
      var depth = (mk.marker.match(/\./g) || []).length + 1;
      if (depth === 1) {
        if (clauseText.length > CLAUSE_HEAD_LIMIT) {
          var terms = findTerms(clauseText);
          var headText = terms.length ? clauseText.slice(0, terms[0].start).trim() : clauseText.slice(0, CLAUSE_HEAD_LIMIT).trim();
          var h1 = document.createElement('div');
          h1.className = 'uf-clause-num';
          h1.textContent = mk.marker + '. ' + headText;
          frag.appendChild(h1);
          appendTermSection(frag, clauseText.slice(headText.length).trim());
        } else {
          var h = document.createElement('div');
          h.className = 'uf-clause-num';
          h.textContent = mk.marker + '. ' + clauseText;
          frag.appendChild(h);
        }
      } else {
        var lastEl = frag.lastElementChild;
        var body2 = (lastEl && lastEl.className === 'uf-legal-body')
          ? lastEl
          : (function () { var d = document.createElement('div'); d.className = 'uf-legal-body'; frag.appendChild(d); return d; })();
        var p = document.createElement('p');
        p.textContent = mk.marker + '. ' + clauseText;
        body2.appendChild(p);
      }
    });

    var head = document.createElement('div');
    head.className = 'uf-svc-head';
    var title = document.createElement('div');
    title.className = 'uf-svc-title';
    title.textContent = label;
    head.appendChild(title);

    var doc = document.createElement('div');
    doc.className = 'uf-svc-legal-doc';
    doc.appendChild(frag);

    cloneNode.removeAttribute('style');
    cloneNode.className = '';
    cloneNode.innerHTML = '';
    cloneNode.appendChild(head);
    cloneNode.appendChild(doc);
  }

  /* Правила программы лояльности: в отличие от Оферты/Политики, текст в
     Tilda уже размечен (абзацы <p>, названия разделов — абзац целиком в
     <strong>), поэтому структуру не угадываем по номерам пунктов, а берём
     как есть. Угадывание здесь ломалось бы на ссылках вида «п. 3.1» и
     «1 CR = 1 рубль» внутри текста. */
  function richifyStructured(cloneNode, docTitle) {
    var descr = qs('[field="descr"]', cloneNode) || cloneNode;
    var doc = document.createElement('div');
    doc.className = 'uf-svc-legal-doc';
    var body = null;
    qsa('p', descr).forEach(function (p) {
      var text = p.textContent.replace(/ /g, ' ').trim();
      if (!text) return;
      var strong = qs('strong, b', p);
      if (strong && strong.textContent.trim() === text) {
        var h = document.createElement('div');
        h.className = 'uf-clause-num';
        h.textContent = text;
        doc.appendChild(h);
        body = null;
        return;
      }
      if (!body) {
        body = document.createElement('div');
        body.className = 'uf-legal-body';
        doc.appendChild(body);
      }
      var np = document.createElement('p');
      np.innerHTML = p.innerHTML;
      body.appendChild(np);
    });

    var head = document.createElement('div');
    head.className = 'uf-svc-head';
    var title = document.createElement('div');
    title.className = 'uf-svc-title';
    title.textContent = docTitle;
    head.appendChild(title);

    cloneNode.removeAttribute('style');
    cloneNode.className = '';
    cloneNode.innerHTML = '';
    cloneNode.appendChild(head);
    cloneNode.appendChild(doc);
  }

  /* ---------- контент кастомных панелей ---------- */

  // 27.09.2026: возврат — 14 дней после получения (решение Леры; закон для
  // дистанционной продажи требует не меньше 7 дней — ст. 26.1 ЗоЗПП, ПП РФ
  // № 2463, — 14 дней лучше для покупательницы и допустимо). Деньги — не
  // позднее 10 дней с даты требования. С 29.09 на странице — «в течение 7 дней после
  // получения посылки» (решение Леры). Ссылка на отменённое ПП № 612 убрана.
  var RETURN_HTML =
    '<div class="uf-svc-head">' +
      '<div class="uf-svc-title">Возврат товара</div>' +
      '<div class="uf-svc-pill">14 дней на возврат</div>' +
    '</div>' +
    '<div class="uf-steps">' +
      '<div class="uf-step"><div class="uf-step-num">1</div><div><div class="uf-step-title">Оставьте заявку</div>' +
        '<div class="uf-step-text"><a href="#" class="uf-jump" data-uf-jump-type="Возврат">Заполнить онлайн, 2 минуты &rarr;</a></div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">2</div><div><div class="uf-step-title">Отправка СДЭК</div>' +
        '<div class="uf-step-text">Сдайте товар в ближайший ПВЗ — печатать и вкладывать ничего не нужно, обратную пересылку оплачиваем мы.</div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">3</div><div><div class="uf-step-title">Проверка</div>' +
        '<div class="uf-step-text">Проверяем товарный вид и бирки на складе.</div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">4</div><div><div class="uf-step-title">Возврат денег</div>' +
        '<div class="uf-step-text">В течение 7 дней после того, как посылка придёт к нам.</div></div></div>' +
    '</div>' +
    '<div class="uf-callout"><b>Заказывали с примеркой?</b> Платите при получении только за то, что подошло, — остальное можно сразу оставить в пункте выдачи или отдать курьеру.</div>' +
    '<details class="uf-legal"><summary>Условия возврата товара — полный текст</summary>' +
      '<p>Покупатель вправе отказаться от товара в любое время до его получения, а после получения — в течение 14 дней (Закон РФ «О защите прав потребителей»; Правила продажи товаров по договору розничной купли-продажи, утв. Постановлением Правительства РФ от 31.12.2020 №&nbsp;2463).</p>' +
      '<p>Возврат товара надлежащего качества возможен, если сохранены его товарный вид (нет следов носки, сохранены фабричные ярлыки и бирки) и потребительские свойства, а также документ, подтверждающий факт и условия покупки. Отсутствие документа не лишает возможности подтвердить покупку другими доказательствами. Обратную пересылку оплачиваем мы — в пункте выдачи платить не нужно.</p>' +
      '<p><b>Оформление возврата (через ПВЗ).</b> Оставьте заявку онлайн — бумажный бланк вкладывать в посылку не нужно. Проверьте наличие бирок и ярлыков, упакуйте посылку. Обратитесь в ближайший пункт выдачи СДЭК, сообщите менеджеру номер накладной, по которой получали заказ, и что оформляете клиентский возврат. Номер накладной — в личном кабинете СДЭК или в трек-номере из письма (11 цифр).</p>' +
      '<p><b>Оформление возврата (через личный кабинет СДЭК).</b> Оставьте заявку онлайн — бланк не нужен. Перейдите в личный кабинет СДЭК → «Возврат товара» → укажите UNFADED или нужный заказ → заполните ФИО, город отправления, размер посылки, пункт СДЭК для сдачи, характер груза «Одежда» → «ОФОРМИТЬ ВОЗВРАТ». Номер созданной накладной сообщите менеджеру СДЭК в пункте выдачи.</p>' +
      '<p><b>Срок и способ возврата денег.</b> Деньги возвращаем в течение 7 дней после того, как посылка придёт к нам. Оплата картой или СБП — на ту же карту или счёт; «Долями» и «Яндекс Сплит» — через сервис, график платежей пересчитается; оплата при получении — по реквизитам карты из заявки. Срок зачисления зависит от банка.</p>' +
      '<p><b>Когда в возврате могут отказать.</b> Если товар утратил товарный вид или потребительские свойства (следы носки, нет бирок) либо возврат заявлен позже 14 дней после получения.</p>' +
      '<p><b>Брак или наша ошибка.</b> Если в товаре обнаружен дефект или мы прислали не тот размер или модель — напишите нам и приложите фото. Пересылку в этом случае оплачивает UNFADED; вы можете выбрать замену, устранение недостатка или возврат денег.</p>' +
    '</details>';

  var EXCHANGE_HTML =
    '<div class="uf-svc-head">' +
      '<div class="uf-svc-title">Обмен товара</div>' +
      '<div class="uf-svc-pill">14 дней на обмен</div>' +
    '</div>' +
    '<div class="uf-svc-lead">Не подошёл размер или пришла не та модель? Меняем без лишних вопросов — это отдельный процесс от возврата.</div>' +
    '<div class="uf-steps">' +
      '<div class="uf-step"><div class="uf-step-num">1</div><div><div class="uf-step-title">Оставьте заявку</div>' +
        '<div class="uf-step-text"><a href="#" class="uf-jump" data-uf-jump-type="Обмен">Заполнить онлайн, 2 минуты &rarr;</a></div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">2</div><div><div class="uf-step-title">Отправка</div>' +
        '<div class="uf-step-text">Сдайте товар в ПВЗ СДЭК — печатать и вкладывать ничего не нужно.</div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">3</div><div><div class="uf-step-title">Новый товар едет к вам</div>' +
        '<div class="uf-step-text">После проверки отправляем нужный размер или модель.</div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">4</div><div><div class="uf-step-title">Готово</div>' +
        '<div class="uf-step-text">Обмен завершён, доплачивать за услугу не нужно.</div></div></div>' +
    '</div>' +
    '<div class="uf-callout"><b>Кто оплачивает пересылку.</b> Обмен для вас бесплатный: и отправку обратно, и новую посылку оплачиваем мы — в пункте выдачи платить не нужно.</div>' +
    '<div class="uf-svc-contact">Можно и напрямую: WhatsApp <a href="https://wa.me/' + WA_NUMBER + '">+7&nbsp;993&nbsp;895&nbsp;50&nbsp;08</a>, <a href="' + TG_SUPPORT_URL + '" target="_blank" rel="noopener">Telegram</a> или <a href="mailto:unfadedwork@gmail.com">unfadedwork@gmail.com</a>.</div>';

  var CLAIM_HTML =
    '<div class="uf-svc-head"><div class="uf-svc-title">Заявка на возврат или обмен</div><span class="uf-badge">Заявление за 2 минуты</span></div>' +
    '<div data-uf-step="form">' +
    '<div class="uf-svc-lead uf-return-only">Заполните форму — мы соберём из неё готовое заявление. Останется распечатать, подписать и прислать фото.</div>' +
    '<div class="uf-svc-lead uf-exchange-only">Заполните здесь — не нужно писать менеджеру, скачивать и распечатывать бланк.</div>' +
    '<div class="uf-steps3 uf-return-only"><span class="on">1. Данные</span><span>2. Заявление</span><span>3. Фото подписи</span></div>' +
    '<div class="uf-toggle" data-uf-field="type">' +
      '<button type="button" class="active" data-value="Возврат">Возврат</button>' +
      '<button type="button" data-value="Обмен">Обмен</button>' +
    '</div>' +
    '<label class="uf-field-block uf-return-only">ФИО полностью<input type="text" data-uf-field="fio" placeholder="Фамилия Имя Отчество" autocomplete="name"></label>' +
    '<div class="uf-field-row">' +
      '<label>Номер заказа<input type="text" data-uf-field="order" placeholder="Например, 934C"></label>' +
      '<label>Телефон / WhatsApp<input type="tel" data-uf-field="phone" placeholder="+7 ___ ___ __ __" autocomplete="tel"></label>' +
    '</div>' +
    '<div class="uf-field-row">' +
      '<label>Какой товар<input type="text" data-uf-field="item" placeholder="Название или артикул"></label>' +
      '<label class="uf-return-only">Стоимость товара, RUB<input type="text" inputmode="numeric" data-uf-field="price" placeholder="Как в заказе"><span class="uf-hint">Как в заказе. Доставка не возвращается.</span></label>' +
    '</div>' +
    '<div class="uf-field-block"><div class="uf-label">Причина</div>' +
      '<div class="uf-chips" data-uf-field="reason">' +
        '<button type="button" class="uf-chip" data-value="Не подошёл размер">Не подошёл размер</button>' +
        '<button type="button" class="uf-chip" data-value="Не подошёл цвет/модель">Не подошёл цвет/модель</button>' +
        '<button type="button" class="uf-chip" data-value="Брак/дефект">Брак/дефект</button>' +
        '<button type="button" class="uf-chip uf-chip-return-only" data-value="Передумал(а)">Передумал(а)</button>' +
      '</div>' +
    '</div>' +
    '<label class="uf-field-block uf-conditional" data-uf-show-if="reason=Брак/дефект" hidden>Опишите, в чём брак<textarea data-uf-field="defect" rows="2" placeholder="Например: разошёлся шов на левом рукаве"></textarea></label>' +
    '<div class="uf-field-block uf-return-only"><div class="uf-label">Как был оплачен заказ</div>' +
      '<div class="uf-chips" data-uf-field="payment">' +
        '<button type="button" class="uf-chip" data-value="Картой на сайте">Картой на сайте</button>' +
        '<button type="button" class="uf-chip" data-value="Наложенным платежом">Наличными/картой курьеру при получении</button>' +
      '</div>' +
    '</div>' +
    '<div class="uf-field-block uf-conditional uf-return-only" data-uf-show-if="payment=Наложенным платежом" hidden>' +
      '<div class="uf-label" style="margin-bottom:2px;">Куда вернуть деньги — перевод по СБП</div>' +
      '<div class="uf-hint" style="margin:0 0 10px;">Переведём со счёта ИП на ваш номер телефона.</div>' +
      '<div class="uf-field-row" style="margin-bottom:0;">' +
        '<label>Телефон для СБП<input type="tel" data-uf-field="sbp_phone" placeholder="+7 ___ ___ __ __"></label>' +
        '<label>Банк<input type="text" data-uf-field="bank" placeholder="Например, Т-Банк"></label>' +
      '</div>' +
    '</div>' +
    '<button type="button" class="uf-submit" data-uf-submit><span class="uf-return-only">Сформировать заявление</span><span class="uf-exchange-only">Отправить заявку</span></button>' +
    '<div class="uf-svc-note uf-return-only">Возврат — в течение 14 дней после получения. Обратную пересылку оплачиваем мы.</div>' +
    '<div class="uf-svc-note uf-exchange-only">После отправки откроется WhatsApp с готовым сообщением — печатать и вкладывать в посылку ничего не нужно.</div>' +
    '<div class="uf-svc-error" data-uf-error hidden></div>' +
    '</div>' +
    '<div data-uf-step="doc" hidden></div>';

  /* Доставка/Оплата/Контакты — короткий, редко меняющийся справочный
     контент; текст сверен построчно с живым сайтом (вкладки «Доставка»/
     «Оплата»/«Контакты» в T395) на момент вёрстки макета. Если цены или
     условия поменяются в Tilda, эти три блока надо будет поправить
     руками — в отличие от Оферты/Политики (см. richifyLegal выше), они
     достаточно короткие и стабильные, чтобы это было безопаснее, чем
     алгоритмический разбор совсем не размеченного текста. */
  // 27.09.2026: условия сверены с тем, что реально работает в оформлении
  // заказа (решения Леры): экспресс — только в рабочее время, не бесплатный;
  // международной доставки нет; примерка — 15 минут, до 7 вещей, ПВЗ и курьер.
  var DELIVERY_HTML =
    '<div class="uf-svc-head">' +
      '<div class="uf-svc-title">Способы доставки</div>' +
      '<div class="uf-svc-pill">Бесплатно от 30 000\u00A0RUB</div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">СДЭК — в пункт выдачи</div>' +
      '<div class="uf-legal-body"><p>По всей России. Пункт выдачи выбирается на карте при оформлении заказа, там же рассчитываются стоимость и срок. Бесплатно при оплате на сайте от 30 000\u00A0RUB. Посылка хранится в пункте выдачи 7 дней.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">СДЭК — курьером до двери</div>' +
      '<div class="uf-legal-body"><p>По всей России. Стоимость и срок рассчитываются при оформлении заказа; бесплатно при оплате на сайте от 30 000\u00A0RUB. Курьер связывается с получателем в день доставки, дату и интервал можно изменить в личном кабинете СДЭК.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">Доставка с примеркой</div>' +
      '<div class="uf-legal-body"><p>СДЭК в пункт выдачи или курьером до двери, по всей России. При оформлении отметьте «Я хочу примерить товар». На примерку — 15 минут и до 7 позиций; оплачиваете при получении, картой или наличными, только то, что подошло. Стоимость доставки — по тарифу СДЭК, оплачивается при получении; бесплатная доставка от 30 000\u00A0RUB на заказы с примеркой не распространяется.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method" style="border-bottom:none;">' +
      '<div class="uf-legal-title">Экспресс-доставка по Москве</div>' +
      '<div class="uf-legal-body" style="margin-bottom:0;"><p>Курьером за 3 часа в пределах МКАД. Доступна для заказов, оформленных в рабочее время — ежедневно с 9:00 до 21:00. Стоимость — 1 000\u00A0RUB, бесплатная доставка на экспресс не распространяется. С примеркой экспресс-доставка недоступна.</p></div>' +
    '</div>' +
    '<div class="uf-callout"><b>Бесплатная доставка СДЭК по России — при оплате на сайте от 30 000\u00A0RUB.</b> Когда посылка передана в СДЭК, на e-mail из заказа приходит трек-номер; следить за заказом можно и в Telegram — кнопка в письме о заказе. Международной доставки сейчас нет.</div>';

  var PAYMENT_HTML =
    '<div class="uf-svc-title" style="margin-bottom:8px;">Способы оплаты</div>' +
    '<div class="uf-svc-lead" style="margin-bottom:8px;">Оплатить заказ в интернет-магазине можно несколькими способами:</div>' +
    '<div style="margin-bottom:22px;">' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Банковской картой на сайте или через СБП</span></div>' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Через сервис «Долями»</span></div>' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Яндекс Пэй и «Яндекс Сплит»</span></div>' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>При получении — картой или наличными (только при доставке с примеркой)</span></div>' +
    '</div>' +
    '<div class="uf-callout" style="margin-bottom:8px;">Оформить и оплатить заказ можно на официальном сайте либо через менеджера — в WhatsApp или Telegram.</div>' +
    '<div class="uf-svc-method" style="border-top:1px solid #EDEEEE; margin-top:22px;">' +
      '<div class="uf-legal-title">Оплата при получении</div>' +
      '<div class="uf-legal-body" style="margin-bottom:0;"><p>Наличными или картой — в пункте выдачи СДЭК или курьеру; доступно только при оформлении доставки с примеркой. Возврат денег при оплате при получении — по реквизитам банковской карты, указанным в заявке на возврат.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">Оплата через сервис «Долями»</div>' +
      '<div class="uf-legal-body" style="margin-bottom:0;"><p>Сегодня оплачивается только 25% стоимости покупки, остальное — тремя платежами раз в две недели. Сервис может взять с клиента сервисный сбор, который устанавливается индивидуально. Оплатить можно картами любых платёжных систем.</p></div>' +
      '<ol class="uf-svc-mini-steps">' +
        '<li>Сформируйте корзину с покупками на сайте</li>' +
        '<li>Выберите «Долями» в способах оплаты</li>' +
        '<li>Укажите телефон, ФИО, дату рождения и e-mail</li>' +
        '<li>Оплатите 25% онлайн — остальное спишется автоматически, по графику в приложении «Долями»</li>' +
      '</ol>' +
    '</div>' +
    '<div class="uf-svc-method" style="border-bottom:none;">' +
      '<div class="uf-legal-title">Оплата через сервис «Яндекс Сплит»</div>' +
      '<div class="uf-legal-body" style="margin-bottom:0;"><p>Сплит делит оплату на части, которые списываются в течение 2, 4 или 6 месяцев. Это не кредит и не рассрочка — нет длинных анкет, проверки кредитной истории и скрытых условий.</p></div>' +
      '<ol class="uf-svc-mini-steps">' +
        '<li>Выберите «Яндекс Сплит» в способах оплаты в корзине</li>' +
        '<li>Выберите комфортный срок и оплатите первую часть</li>' +
        '<li>Остальные платежи спишутся по графику — он придёт в письме и виден в приложении Яндекс Пэй</li>' +
      '</ol>' +
    '</div>';

  // 27.09.2026: с 01.09.2025 согласие на обработку ПД оформляется отдельно
  // от других документов (152-ФЗ, ст. 9 в ред. 156-ФЗ). Здесь — сам текст
  // согласия; ссылки «обработку персональных данных» в формах сайта
  // переводятся сюда блоком «consent links» ниже.
  // 02.10.2026: смена фамилии ИП — Петрова (ЕГРИП, запись от 01.10.2026).
  var CONSENT_HTML =
    '<div class="uf-svc-title" style="margin-bottom:8px;">Согласие на обработку персональных данных</div>' +
    '<div class="uf-svc-lead">Редакция от 02.10.2026</div>' +
    '<div class="uf-legal-body"><p>Отмечая согласие в форме на сайте unfadedstore.com (оформление заказа, подписка, заявка на возврат или обмен, «сообщить о поступлении») или вступая в программу UNFADED ACCESS SYSTEM, я свободно, своей волей и в своём интересе даю согласие индивидуальному предпринимателю Петровой Светлане Юрьевне (ИНН 143407255768, ОГРНИП 319774600301099, адрес регистрации: 119415, г. Москва, ул. Удальцова, д. 5, корп. 1, кв. 38; далее — Оператор) на обработку моих персональных данных на следующих условиях.</p></div>' +
    '<div class="uf-legal-title">1. Какие данные</div>' +
    '<div class="uf-legal-body"><p>Фамилия, имя, отчество; номер телефона; адрес электронной почты; адрес доставки или пункта выдачи; состав, сумма и история заказов, способ оплаты (без реквизитов банковской карты — их обрабатывают банк и платёжные сервисы); переписка со службой заботы; для участниц программы лояльности — имя пользователя и идентификатор в Telegram, дата рождения (если указана), история начислений и списаний баллов; технические данные: cookie, IP-адрес, сведения о браузере и устройстве, действия на сайте.</p></div>' +
    '<div class="uf-legal-title">2. Цели</div>' +
    '<div class="uf-legal-body"><p>Оформление, оплата, доставка и выдача заказа; возврат и обмен товара, возврат денег; оформление кассовых чеков; ответы на обращения; уведомления о статусе заказа (e-mail, SMS, Telegram, WhatsApp); ведение участия в программе лояльности; анализ работы сайта и улучшение сервиса; рекламные рассылки — только при отдельном согласии (раздел 6).</p></div>' +
    '<div class="uf-legal-title">3. Действия с данными</div>' +
    '<div class="uf-legal-body"><p>Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (предоставление, доступ), обезличивание, блокирование, удаление и уничтожение — с использованием средств автоматизации и без них.</p></div>' +
    '<div class="uf-legal-title">4. Кому могут передаваться данные</div>' +
    '<div class="uf-legal-body"><p>В объёме, необходимом для целей из раздела 2: платформе сайта «Тильда»; CRM-системе RetailCRM и сервису интеграции заказов; службе доставки СДЭК; банку и платёжным сервисам (оплата картой и СБП, «Долями», Яндекс Пэй и «Яндекс Сплит»); сервису онлайн-касс и оператору фискальных данных; сервисам рассылок и уведомлений; сервису Яндекс Метрика. Я согласна(-ен) также на трансграничную передачу данных: хостинг серверных сервисов сайта (Render Services, Inc., США), Google Tag Manager и Google Analytics (Google, США), мессенджеры Telegram и WhatsApp — при обращении через них.</p></div>' +
    '<div class="uf-legal-title">5. Срок и отзыв согласия</div>' +
    '<div class="uf-legal-body"><p>Согласие действует до достижения целей обработки, но не более 5 лет с даты последнего заказа или обращения, либо до его отзыва. Отозвать согласие можно, написав на unfadedwork@gmail.com. После отзыва Оператор прекращает обработку и уничтожает данные в течение 30 дней, кроме данных, которые обязан хранить по закону (например, сведения о расчётах для налогового учёта). Подробнее — в Политике конфиденциальности.</p></div>' +
    '<div class="uf-legal-title">6. Согласие на рекламные рассылки</div>' +
    '<div class="uf-legal-body" style="margin-bottom:0;"><p>Подписываясь на рассылку (форма подписки, галочка «Получать новости» при заказе, согласие в боте программы лояльности), я отдельно соглашаюсь получать от UNFADED сообщения о новинках, акциях и закрытых продажах по e-mail, SMS, в Telegram и WhatsApp (ст. 18 Федерального закона «О рекламе»). Отказаться можно в любой момент: по ссылке «Отписаться» в письме, в боте или написав на unfadedwork@gmail.com. Отказ от рассылки не влияет на оформление и доставку заказов.</p></div>';

  var CONTACTS_HTML =
    '<div class="uf-svc-title" style="margin-bottom:24px;">Контакты</div>' +
    '<div style="border:1px solid #EDEEEE;">' +
      '<div class="uf-svc-contact-row">' +
        '<div class="uf-label" style="margin-bottom:6px;">Интернет-магазин</div>' +
        '<div class="uf-svc-contact-value">unfadedstore.com</div>' +
      '</div>' +
      '<div class="uf-svc-contact-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">' +
        '<div><div class="uf-label" style="margin-bottom:6px;">Телефон / WhatsApp</div><div class="uf-svc-contact-value">+7 993 895-50-08</div></div>' +
        '<a href="https://wa.me/' + WA_NUMBER + '" class="uf-svc-contact-btn">Написать в WhatsApp</a>' +
        '<a href="' + TG_SUPPORT_URL + '" target="_blank" rel="noopener" class="uf-svc-contact-btn">Написать в Telegram</a>' +
      '</div>' +
      '<div class="uf-svc-contact-row">' +
        '<div class="uf-label" style="margin-bottom:6px;">Email</div>' +
        '<div class="uf-svc-contact-value"><a href="mailto:unfadedwork@gmail.com" style="color:inherit; text-decoration:none;">unfadedwork@gmail.com</a></div>' +
      '</div>' +
      '<div class="uf-svc-contact-row">' +
        '<div class="uf-label" style="margin-bottom:6px;">Время работы</div>' +
        '<div class="uf-svc-contact-value">Ежедневно, 9:00 — 21:00</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:28px;">' +
      '<div class="uf-label" style="margin-bottom:10px;">Сотрудничество</div>' +
      '<div class="uf-callout">Если у вас есть предложение о сотрудничестве с брендом — отправьте сообщение на почту <b>unfadedwork@gmail.com</b> или напишите нам в WhatsApp или Telegram.</div>' +
    '</div>';

  /* ---------- «Клуб: вопрос — ответ» (/service#club-faq) ----------
     Бриф Коворка 29.09, обращение на «вы» (на «ты» — только бот). Каждый ответ
     сверен с правилами на сайте (редакция 28.09) и app/loyalty/rules.py;
     четыре ответа поправлены по сверке и утверждены Лерой 29.09.
     Меняя ответ — сверять снова: правила на сайте главнее. */
  var CLUB_BOT_FAQ_URL = 'https://t.me/unfaded_club_bot?start=faq';
  var CLUB_RULES_URL = '/service#!/tab/533990617-8';

  var CLUB_FAQ = [
    ['Вступление', [
      ['Что такое UNFADED ACCESS SYSTEM?',
        '<p>Система допуска для тех, кто носит UNFADED. Чем больше вы покупаете на сайте, тем выше уровень и тем больше возвращается CREDITS — внутренней валюты клуба: 1 CR = 1\u00A0RUB.</p>'],
      ['Как вступить?',
        '<p>Откройте <b>@unfaded_club_bot</b> в Telegram, нажмите «Получить допуск» и поделитесь номером — тем, что указываете в заказах. Уровень и карта появятся сразу.</p>' +
        '<a class="uf-faq-cta" href="' + CLUB_BOT_FAQ_URL + '" target="_blank" rel="noopener">Получить допуск</a>'],
      ['У меня нет Telegram. Можно без него?',
        '<p>Пока нет — клуб работает через Telegram-бот.</p>'],
      ['Я уже покупала на сайте. Это засчитается?',
        '<p>Да. Уровень считается по сумме всех ваших покупок на сайте и через нашего менеджера — за всё время. CREDITS начисляются за заказы, выполненные после вступления, даже если вы оформили заказ раньше. Поэтому лучше войти до следующей покупки.</p>'],
      ['Покупки на Lamoda считаются?',
        '<p>Нет. Клуб работает для заказов на unfadedstore.com и заказов, которые оформил наш менеджер по телефону или в мессенджере. Покупки на Lamoda, Ozon и в других магазинах не считаются.</p>']
    ]],
    ['Уровни', [
      ['Какие есть уровни?',
        '<table class="uf-faq-table">' +
          '<tr><th>Уровень</th><th>Сумма покупок</th><th>CREDITS с покупки</th></tr>' +
          '<tr><td>ENTRY PASS</td><td>до 29 999\u00A0RUB</td><td>5 %</td></tr>' +
          '<tr><td>INSIDER PASS</td><td>от 30 000\u00A0RUB</td><td>7 %</td></tr>' +
          '<tr><td>ARCHIVE PASS</td><td>от 50 000\u00A0RUB</td><td>10 %</td></tr>' +
          '<tr><td>PRIVATE PASS</td><td>от 100 000\u00A0RUB</td><td>12 %</td></tr>' +
        '</table>'],
      ['Что даёт каждый уровень?',
        '<ul><li>Бесплатная доставка при оплате на сайте: ENTRY — от 30 000\u00A0RUB, INSIDER — от 20 000\u00A0RUB, ARCHIVE — от 15 000\u00A0RUB, PRIVATE — всегда и при любом способе оплаты.</li>' +
        '<li>ARCHIVE и PRIVATE видят новые дропы за 24 часа до всех.</li>' +
        '<li>PRIVATE оплачивает CREDITS до 50 % заказа и получает подарок в посылке ко дню рождения.</li></ul>'],
      ['Когда я перейду на следующий уровень?',
        '<p>Когда сумма ваших покупок дойдёт до порога. Сколько осталось, видно на карте в разделе «Мой допуск». Новый процент CREDITS действует сразу, остальные привилегии уровня — через 14 дней после выполнения заказа, который поднял уровень, если его не вернули.</p>']
    ]],
    ['CREDITS', [
      ['За что начисляются CREDITS?',
        '<ul><li>за покупки на сайте — процент по уровню;</li><li>1 000 при вступлении;</li>' +
        '<li>2 000 ко дню рождения — укажите дату в боте;</li>' +
        '<li>500 за отзыв с фото купленной вещи, присланный в бот;</li>' +
        '<li>по 1 000 вам и подруге, когда её первый заказ выполнен.</li></ul>'],
      ['Когда приходят CREDITS за покупку?',
        '<p>Когда заказ выполнен — то есть получен и не возвращён.</p>'],
      ['Как долго действуют CREDITS?',
        '<p>CREDITS за покупки — 12 месяцев. Приветственные 1 000 — 90 дней. Бот напомнит заранее.</p>'],
      ['Как потратить CREDITS?',
        '<p>В корзине на сайте, в блоке CREDITS: введите телефон, подтвердите кодом из Telegram и выберите, сколько списать. Скидка применится к заказу.</p>'],
      ['Сколько можно списать?',
        '<p>От 300 CR и не больше 30 % стоимости товаров в заказе, на PRIVATE PASS — до 50 %.</p>'],
      ['Почему приветственные CREDITS не списываются?',
        '<p>Их можно потратить со второй покупки на сайте.</p>'],
      ['Можно списать CREDITS на товар со скидкой или вместе с промокодом?',
        '<p>Нет — CREDITS не списываются на товары со скидкой и не суммируются с промокодами.</p>'],
      ['Что будет с CREDITS, если я верну вещь?',
        '<p>CREDITS, начисленные за возвращённую вещь, спишутся обратно. Если вы оплачивали заказ CREDITS, они вернутся на баланс в доле возвращённого.</p>']
    ]],
    ['Прочее', [
      ['Как пригласить подругу?',
        '<p>В боте, в разделе «Мой допуск» — ссылка-приглашение. Когда её первый заказ будет выполнен, вы обе получите по 1 000 CREDITS.</p>'],
      ['Как оставить отзыв за CREDITS?',
        '<p>Пришлите в бот фото купленной вещи и пару слов. После проверки начислим 500 CREDITS — один раз за заказ.</p>'],
      ['Бот не отвечает или что-то не так с балансом',
        '<p>Напишите нам в <a href="https://wa.me/' + WA_NUMBER + '" target="_blank" rel="noopener">WhatsApp</a> или <a href="' + TG_SUPPORT_URL + '" target="_blank" rel="noopener">Telegram</a> — ежедневно с 9:00 до 21:00 по МСК.</p>'],
      ['Где полные правила?',
        '<p>Во вкладке <a href="' + CLUB_RULES_URL + '">«Программа лояльности»</a> на этой странице.</p>']
    ]]
  ];

  var CLUB_FAQ_CHEVRON = '<svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var CLUB_FAQ_HTML =
    '<div class="uf-svc-head"><div class="uf-svc-title">Клуб: вопрос — ответ</div><div class="uf-svc-pill">UNFADED ACCESS SYSTEM</div></div>' +
    '<div class="uf-svc-lead">Коротко о том, как работает клуб. Полные условия — в <a class="uf-faq-inline" href="' + CLUB_RULES_URL + '">правилах программы</a>.</div>' +
    '<div class="uf-faq">' +
    CLUB_FAQ.map(function (group) {
      return '<div class="uf-faq-group"><div class="uf-legal-title">' + group[0] + '</div>' +
        group[1].map(function (qa) {
          return '<button type="button" class="uf-faq-q" aria-expanded="false"><span>' + qa[0] + '</span>' + CLUB_FAQ_CHEVRON + '</button>' +
            '<div class="uf-faq-a uf-legal-body">' + qa[1] + '</div>';
        }).join('') + '</div>';
    }).join('') +
    '</div>';

  /* ---------- инициализация ---------- */

  function build(root, wrapper) {
    root.dataset.ufSvcInit = '1';

    /* сопоставляем по видимому тексту вкладки, а не по data-tab-number —
       у Tilda он не всегда идёт подряд (бывают пропуски после правок в редакторе) */
    var recByLabel = {};
    var labelByTabNum = {}; /* для ссылок вида /service#!/tab/533990617-8 */
    qsa('.t395__tab', wrapper).forEach(function (li) {
      var btn = qs('.t395__title', li);
      if (!btn) return;
      var text = btn.textContent.replace(/\s+/g, ' ').trim();
      var recId = btn.getAttribute('aria-controls');
      if (recId) recByLabel[text] = document.getElementById(recId);
      var num = li.getAttribute('data-tab-number');
      if (num) labelByTabNum[num] = text;
    });

    var ITEMS = [
      { key: 'delivery', label: 'Доставка', html: DELIVERY_HTML },
      { key: 'payment', label: 'Оплата', html: PAYMENT_HTML },
      { key: 'return', label: 'Возврат', html: RETURN_HTML },
      { key: 'exchange', label: 'Обмен', html: EXCHANGE_HTML },
      { key: 'claim', label: 'Оформить заявку', html: CLAIM_HTML },
      { key: 'contacts', label: 'Контакты', html: CONTACTS_HTML },
      { key: 'consent', label: 'Согласие на обработку данных', html: CONSENT_HTML },
      { key: 'offer', label: 'Оферта', passthrough: 'Оферта' },
      { key: 'privacy', label: 'Политика конфиденциальности', passthrough: 'Политика конфиденциальности' },
      { key: 'loyalty', label: 'Программа лояльности', passthrough: 'Программа лояльности',
        structured: true, docTitle: 'Правила программы UNFADED ACCESS SYSTEM' },
      { key: 'clubfaq', label: 'Клуб: вопрос — ответ', html: CLUB_FAQ_HTML }
    ];

    /* Вкладки Tilda, у которых в навигаторе другое имя */
    var TAB_ALIASES = { 'Обмен и возврат': 'return' };

    /* Какой раздел открыть по ссылке /service#!/tab/<id блока вкладок>-<номер>.
       Раньше навигатор всегда открывал «Доставку», и ссылки из подвала,
       cookie-баннера и окна «сообщить о поступлении» вели не туда. */
    function keyFromHash() {
      // /service#consent — отдельный документ «Согласие на обработку
      // персональных данных» (его нет среди вкладок Тильды, он только здесь)
      if (/^#!?\/?consent/.test(window.location.hash)) return 'consent';
      // /service#club-faq — «Клуб: вопрос — ответ», на этот адрес ссылаются SMM и письма
      if (/^#!?\/?club-faq/.test(window.location.hash)) return 'clubfaq';
      var m = /#!\/tab\/(\d+)-(\d+)/.exec(window.location.hash);
      if (!m || root.id !== 'rec' + m[1]) return null;
      var label = labelByTabNum[m[2]];
      if (!label) return null;
      if (TAB_ALIASES[label]) return TAB_ALIASES[label];
      for (var i = 0; i < ITEMS.length; i++) {
        if (ITEMS[i].label === label || ITEMS[i].passthrough === label) return ITEMS[i].key;
      }
      return null;
    }

    /* Раскладка решается один раз на момент построения (по ширине окна
       в этот момент), а не переигрывается на resize — так проще и
       надёжнее, реальные пользователи почти никогда не тянут окно
       браузера через границу 640px посреди чтения этой страницы. */
    var isDesktop = window.matchMedia('(min-width: 640px)').matches;

    var nav = document.createElement('div');
    nav.className = 'uf-svc-nav' + (isDesktop ? ' uf-svc-nav--desktop' : '');

    var navList = null;
    var panelsWrap = null;
    if (isDesktop) {
      navList = document.createElement('div');
      navList.className = 'uf-svc-navlist';
      panelsWrap = document.createElement('div');
      panelsWrap.className = 'uf-svc-panels';
      nav.appendChild(navList);
      nav.appendChild(panelsWrap);
    }

    var itemEls = {};

    ITEMS.forEach(function (item) {
      var headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'uf-svc-navitem';
      headerBtn.setAttribute('data-key', item.key);
      if (isDesktop) {
        headerBtn.textContent = item.label;
      } else {
        headerBtn.innerHTML = '<span>' + item.label + '</span><svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }

      var panel = document.createElement('div');
      panel.className = 'uf-svc-panel';
      panel.setAttribute('data-key', item.key);
      if (item.html) panel.innerHTML = item.html;
      if (item.passthrough && recByLabel[item.passthrough]) {
        var inner = document.createElement('div');
        inner.className = 'uf-svc-original';
        var origNode = recByLabel[item.passthrough];
        /* КЛОНИРУЕМ узел, а не переносим живой. При физическом переносе
           (appendChild) собственный движок T395 у Tilda позже (уже после
           нашей сборки — на инициализации самого виджета) заново находит
           узел по исходному id и повторно вешает на него «выключенное»
           состояние (t395__off / aria-hidden), независимо от того, где он
           теперь лежит в DOM — воспроизводится именно на «холодной»
           загрузке, когда наш скрипт успевает собрать навигатор раньше,
           чем Tilda доинициализирует сам виджет. Клон полностью
           разрывает эту связь: оригинал остаётся нетронутым внутри
           скрытого T395, Tilda может делать с ним что угодно — на нашу
           копию это больше не влияет. */
        var cloneNode = origNode.cloneNode(true);
        cloneNode.removeAttribute('id');
        qsa('[id]', cloneNode).forEach(function (n) { n.removeAttribute('id'); });
        cloneNode.classList.remove('t395__off');
        cloneNode.removeAttribute('aria-hidden');
        cloneNode.style.removeProperty('display');
        if (item.structured) richifyStructured(cloneNode, item.docTitle || item.label);
        else richifyLegal(cloneNode, item.label);
        inner.appendChild(cloneNode);
        panel.appendChild(inner);
      }

      if (isDesktop) {
        navList.appendChild(headerBtn);
        panelsWrap.appendChild(panel);
      } else {
        var row = document.createElement('div');
        row.className = 'uf-svc-item';
        row.appendChild(headerBtn);
        row.appendChild(panel);
        nav.appendChild(row);
      }

      itemEls[item.key] = { btn: headerBtn, panel: panel };

      headerBtn.addEventListener('click', function () {
        /* На мобильном повторное нажатие на открытый пункт аккордеона его сворачивает */
        if (!isDesktop && headerBtn.classList.contains('active')) {
          headerBtn.classList.remove('active');
          panel.classList.remove('active');
          return;
        }
        selectItem(item.key);
        if (!isDesktop) {
          setTimeout(function () { headerBtn.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
        }
      });
    });

    root.parentNode.insertBefore(nav, root);
    root.style.display = 'none';

    function selectItem(key, opts) {
      opts = opts || {};
      Object.keys(itemEls).forEach(function (k) {
        var active = k === key;
        itemEls[k].btn.classList.toggle('active', active);
        itemEls[k].panel.classList.toggle('active', active);
      });

      if (key === 'claim' && opts.claimType) {
        setClaimType(itemEls.claim.panel, opts.claimType);
      }
    }

    /* переход "Оставьте заявку →" из Возврат/Обмен на форму */
    nav.addEventListener('click', function (e) {
      var jump = e.target.closest && e.target.closest('.uf-jump');
      if (jump) {
        e.preventDefault();
        selectItem('claim', { claimType: jump.getAttribute('data-uf-jump-type') });
      }
    });

    function setClaimType(panel, value) {
      var toggle = qs('[data-uf-field="type"]', panel);
      if (!toggle) return;
      qsa('button', toggle).forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-value') === value);
      });
      updateReasonChipsForType(panel, value);
    }

    function updateReasonChipsForType(panel, value) {
      panel.classList.toggle('uf-claim--exchange', value === 'Обмен');
      var formStep = qs('[data-uf-step="form"]', panel), docStep = qs('[data-uf-step="doc"]', panel);
      if (formStep && docStep) { docStep.hidden = true; formStep.hidden = false; }
      qsa('.uf-chip-return-only', panel).forEach(function (chip) {
        chip.hidden = value === 'Обмен';
        if (value === 'Обмен' && chip.classList.contains('active')) {
          chip.classList.remove('active');
        }
      });
    }

    /* «Клуб: вопрос — ответ»: вопрос раскрывает и сворачивает свой ответ */
    nav.addEventListener('click', function (e) {
      var q = e.target.closest && e.target.closest('.uf-faq-q');
      if (!q) return;
      q.setAttribute('aria-expanded', q.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });

    /* ---------- логика внутри формы заявки ---------- */
    var claimPanel = itemEls.claim && itemEls.claim.panel;
    if (claimPanel) {
      var typeToggle = qs('[data-uf-field="type"]', claimPanel);
      qsa('button', typeToggle).forEach(function (b) {
        b.addEventListener('click', function () {
          qsa('button', typeToggle).forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          updateReasonChipsForType(claimPanel, b.getAttribute('data-value'));
        });
      });

      qsa('.uf-chips', claimPanel).forEach(function (group) {
        qsa('.uf-chip', group).forEach(function (chip) {
          chip.addEventListener('click', function () {
            qsa('.uf-chip', group).forEach(function (c) { c.classList.remove('active'); });
            chip.classList.add('active');
            var field = group.getAttribute('data-uf-field');
            qsa('[data-uf-show-if]', claimPanel).forEach(function (cond) {
              var rule = cond.getAttribute('data-uf-show-if').split('=');
              if (rule[0] === field) {
                cond.hidden = chip.getAttribute('data-value') !== rule[1];
              }
            });
          });
        });
      });

      /* Возврат: из формы собираем заявление на имя ИП (бухгалтер, 30.09: нужна подпись от руки,
         фото подписанного бланка в мессенджер подходит, паспорт при переводе не нужен).
         Сайт ничего не отправляет сам: клиентка скачивает/печатает заявление, подписывает и шлёт
         фото в WhatsApp или Telegram службы заботы. Обмен — как раньше, сразу в WhatsApp. */
      var CLAIM_PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      var claimForm = qs('[data-uf-step="form"]', claimPanel);
      var claimDoc = qs('[data-uf-step="doc"]', claimPanel);
      var claimData = null;

      function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      }
      function rub(v) { return String(v).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
      function initials(fio) {
        var p = fio.split(/\s+/).filter(Boolean);
        return p[0] + (p[1] ? ' ' + p[1].charAt(0) + '.' : '') + (p[2] ? ' ' + p[2].charAt(0) + '.' : '');
      }
      function today() {
        var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
        return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear();
      }
      function lower1(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

      function statementHTML(d) {
        var f = function (s) { return '<span class="fill">' + esc(s) + '</span>'; };
        var defect = d.reason === 'Брак/дефект';
        var money = d.payment === 'Наложенным платежом'
          ? '<p>Способ оплаты заказа: ' + f('при получении (наложенный платёж)') + '. Денежные средства в сумме ' +
            f(rub(d.price) + ' ₽') + ' прошу перечислить по СБП на номер телефона ' + f(d.sbpPhone) +
            ', банк получателя — ' + f(d.bank) + '.</p>'
          : '<p>Способ оплаты заказа: ' + f('картой на сайте') + '. Денежные средства в сумме ' +
            f(rub(d.price) + ' ₽') + ' прошу вернуть на карту, с которой был оплачен заказ.</p>';
        return '<div class="uf-paper">' +
          '<div class="to">Индивидуальному предпринимателю<br>Петровой Светлане Юрьевне<br>' +
            'ИНН 143407255768, ОГРНИП 319774600301099<br><br>' +
            'от: ' + f(d.fio) + '<br>телефон: ' + f(d.phone) + '</div>' +
          '<h3>Заявление на возврат товара</h3>' +
          '<p>Прошу принять возврат товара ' + (defect ? 'ненадлежащего' : 'надлежащего') + ' качества по заказу № ' +
            f(d.order) + ', оформленному в интернет-магазине unfadedstore.com, и вернуть уплаченные за него денежные средства.</p>' +
          '<table><tr><th>Товар</th><th class="sum">Стоимость, ₽</th></tr>' +
            '<tr><td>' + f(d.item) + '</td><td class="sum">' + f(rub(d.price)) + '</td></tr></table>' +
          '<p>Причина возврата: ' + f(defect ? 'брак' + (d.defect ? ' — ' + d.defect : '') : lower1(d.reason || 'другое')) + '.</p>' +
          money +
          (defect ? '' : '<p>Товар не был в употреблении, сохранены его товарный вид, потребительские свойства и фабричные ярлыки.</p>') +
          '<div class="sig"><div>Дата: ' + f(d.date) + '</div><div class="line"><i>подпись</i></div>' +
            '<div>/ ' + f(initials(d.fio)) + ' /</div></div>' +
        '</div>';
      }

      var PAPER_CSS =
        '.uf-paper{font-family:Arial,sans-serif;font-size:12.5px;line-height:1.65;color:#17090B;background:#fff}' +
        '.uf-paper .to{margin-left:auto;max-width:300px;margin-bottom:22px}' +
        '.uf-paper h3{text-align:center;font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 16px}' +
        '.uf-paper p{margin:0 0 10px}' +
        '.uf-paper table{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:12px}' +
        '.uf-paper td,.uf-paper th{border:1px solid #999;padding:6px 8px;text-align:left;vertical-align:top}' +
        '.uf-paper th{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em}' +
        '.uf-paper .sum{width:110px}' +
        '.uf-paper .sig{display:flex;justify-content:space-between;gap:16px;margin-top:34px;align-items:flex-end}' +
        '.uf-paper .sig .line{flex:1;border-bottom:1px solid #17090B;height:22px;position:relative}' +
        '.uf-paper .sig .line i{position:absolute;left:0;top:26px;font-size:10px;color:#777;font-style:normal}';

      function printStatement() {
        var w = window.open('', '_blank');
        if (!w) { window.print(); return; }
        w.document.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Заявление на возврат — заказ ' +
          esc(claimData.order) + '</title><style>@page{size:A4;margin:20mm}body{margin:0}' + PAPER_CSS +
          '.fill{background:none}</style></head><body>' + statementHTML(claimData) + '</body></html>');
        w.document.close();
        w.focus();
        setTimeout(function () { w.print(); }, 300);
      }

      function downloadStatement(btn) {
        var label = btn.textContent;
        var busy = function (on) { btn.disabled = on; btn.textContent = on ? 'Готовим PDF…' : label; };
        var run = function () {
          /* Прячем за экраном обёртку, а в html2pdf отдаём обычный вложенный блок: html2pdf копирует
             элемент со всеми стилями, и position:fixed у самого листа давал копию нулевой высоты —
             пустой PDF (Лера, 30.09). html2canvas снимает с учётом прокрутки страницы: в Chrome
             хватает scrollX/scrollY: 0, а в Safari на iPhone лист всё равно съезжал вниз и терял
             строку с подписью — поэтому на время снимка прокручиваем страницу к началу и возвращаем.
             windowWidth: 794 — лист собирается по компьютерной раскладке и на телефоне.
             Рамка и подсветка полей нужны на экране, в документе их нет. */
          var holder = document.createElement('div');
          holder.style.cssText = 'position:fixed;left:-10000px;top:0;';
          var sheet = document.createElement('div');
          sheet.style.cssText = 'width:794px;padding:56px 64px;box-sizing:border-box;background:#fff';
          sheet.innerHTML = '<style>' + PAPER_CSS +
            '.uf-paper{border:none;box-shadow:none;padding:0;margin:0}.uf-paper .fill{background:none;padding:0}</style>' +
            statementHTML(claimData);
          holder.appendChild(sheet);
          document.body.appendChild(holder);
          var sx = window.scrollX, sy = window.scrollY;
          var done = function (ok) {
            holder.remove();
            window.scrollTo(sx, sy);
            busy(false);
            if (!ok) printStatement();
          };
          busy(true);
          window.scrollTo(0, 0);
          setTimeout(function () { /* дать странице перерисоваться после прокрутки */
            window.html2pdf().set({
              margin: 0, filename: 'Заявление_на_возврат_' + claimData.order.replace(/[^\wА-Яа-яЁё-]/g, '') + '.pdf',
              image: { type: 'jpeg', quality: 0.95 },
              html2canvas: { scale: 2, scrollX: 0, scrollY: 0, windowWidth: 794 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(sheet).save().then(function () { done(true); }, function () { done(false); });
          }, 60);
        };
        if (window.html2pdf) { run(); return; }
        busy(true);
        var s = document.createElement('script');
        s.src = CLAIM_PDF_LIB;
        s.onload = function () { busy(false); run(); };
        s.onerror = function () { busy(false); printStatement(); }; /* нет PDF — сохранит через печать */
        document.head.appendChild(s);
      }

      function waLink(d) {
        var lines = [
          'Здравствуйте! Заявление на возврат по заказу ' + d.order + ' — отправляю фото подписанного заявления.',
          'ФИО: ' + d.fio,
          'Телефон: ' + d.phone,
          'Товар: ' + d.item + ', ' + rub(d.price) + ' ₽'
        ];
        if (d.reason) lines.push('Причина: ' + d.reason + (d.reason === 'Брак/дефект' && d.defect ? ' — ' + d.defect : ''));
        lines.push(d.payment === 'Наложенным платежом'
          ? 'Вернуть по СБП: ' + d.sbpPhone + ', ' + d.bank
          : 'Оплата картой на сайте — вернуть на ту же карту');
        return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      }

      function showStatement() {
        claimDoc.innerHTML =
          '<div class="uf-steps3"><span class="done">1. Данные</span><span class="on">2. Заявление</span><span>3. Фото подписи</span></div>' +
          '<button type="button" class="uf-edit" data-uf-edit>← Изменить данные</button>' +
          statementHTML(claimData) +
          '<div class="uf-actions">' +
            '<button type="button" class="uf-submit" data-uf-pdf>Скачать PDF</button>' +
            '<button type="button" class="uf-submit uf-submit--ghost" data-uf-print>Распечатать</button>' +
          '</div>' +
          '<div class="uf-send">' +
            '<div class="uf-send-title">3. Подпишите и пришлите фото</div>' +
            '<div class="uf-send-text">Распишитесь от руки и сфотографируйте заявление целиком. Отправьте фото в WhatsApp или Telegram — ' +
              'в WhatsApp сообщение с номером заказа уже будет готово. В посылку вкладывать ничего не нужно.</div>' +
            '<div class="uf-actions">' +
              '<a class="uf-submit" href="' + esc(waLink(claimData)) + '" target="_blank" rel="noopener">Отправить в WhatsApp</a>' +
              '<a class="uf-submit uf-submit--ghost" href="' + TG_SUPPORT_URL + '" target="_blank" rel="noopener">Отправить в Telegram</a>' +
            '</div>' +
          '</div>';
        claimForm.hidden = true;
        claimDoc.hidden = false;
        qs('[data-uf-edit]', claimDoc).addEventListener('click', function () {
          claimDoc.hidden = true;
          claimForm.hidden = false;
          claimPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
        qs('[data-uf-pdf]', claimDoc).addEventListener('click', function () { downloadStatement(this); });
        qs('[data-uf-print]', claimDoc).addEventListener('click', printStatement);
        claimPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      qs('[data-uf-submit]', claimPanel).addEventListener('click', function () {
        var val = function (sel) { var el = qs(sel, claimPanel); return el ? el.value.trim() : ''; };
        var activeChip = function (field) {
          var el = qs('.uf-chips[data-uf-field="' + field + '"] .uf-chip.active', claimPanel);
          return el ? el.getAttribute('data-value') : '';
        };
        var type = qs('[data-uf-field="type"] .active', claimPanel);
        type = type ? type.getAttribute('data-value') : 'Возврат';
        var d = {
          fio: val('[data-uf-field="fio"]').replace(/\s+/g, ' '),
          order: val('[data-uf-field="order"]'),
          phone: val('[data-uf-field="phone"]'),
          item: val('[data-uf-field="item"]'),
          price: val('[data-uf-field="price"]'),
          reason: activeChip('reason'),
          defect: val('[data-uf-field="defect"]'),
          payment: activeChip('payment'),
          sbpPhone: val('[data-uf-field="sbp_phone"]'),
          bank: val('[data-uf-field="bank"]'),
          date: today()
        };

        var missing = [];
        if (type === 'Возврат' && !d.fio) missing.push('ФИО');
        if (!d.order) missing.push('номер заказа');
        if (!d.phone) missing.push('телефон');
        if (type === 'Возврат') {
          if (!d.item) missing.push('товар');
          if (!rub(d.price)) missing.push('стоимость товара');
          if (!d.payment) missing.push('как был оплачен заказ');
          if (d.payment === 'Наложенным платежом') {
            if (!d.sbpPhone) missing.push('телефон для СБП');
            if (!d.bank) missing.push('банк');
          }
        }
        var errEl = qs('[data-uf-error]', claimPanel);
        if (missing.length) {
          if (errEl) { errEl.textContent = 'Заполните: ' + missing.join(', ') + '.'; errEl.hidden = false; }
          return;
        }
        if (errEl) errEl.hidden = true;

        if (type === 'Возврат') {
          claimData = d;
          showStatement();
          return;
        }

        var lines = [
          'Здравствуйте! Заявка на обмен с сайта UNFADED.',
          'Номер заказа: ' + d.order,
          'Телефон: ' + d.phone
        ];
        if (d.item) lines.push('Товар: ' + d.item);
        if (d.reason) lines.push('Причина: ' + d.reason);
        if (d.reason === 'Брак/дефект' && d.defect) lines.push('В чём брак: ' + d.defect);
        window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
      });
    }

    var initialKey = keyFromHash();
    selectItem(initialKey || 'delivery');
    if (initialKey) {
      setTimeout(function () { nav.scrollIntoView({ block: 'start' }); }, 150);
    }
    window.addEventListener('hashchange', function () {
      var key = keyFromHash();
      if (!key) return;
      selectItem(key);
      nav.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  /* Tilda монтирует T395-виджет асинхронно, и на «холодной» загрузке это
     может занять больше времени, чем разумный фиксированный тайм-аут —
     поэтому вместо однократных попыток с отказом по таймеру используем
     MutationObserver (реагирует, когда виджет реально появится в DOM,
     сколько бы времени это ни заняло) плюс редкий поллинг как страховку.
     init() идемпотентен и самовосстанавливается, если Tilda когда-нибудь
     заново перерисует контейнер виджета (тогда root.dataset.ufSvcInit
     у нового узла будет пуст, и мы соберём навигатор заново). */
  function init() {
    try {
      var wrapper = qs('.t395__wrapper[data-tab-current]');
      var root = wrapper && wrapper.closest('[id^="rec"]');
      if (!root || root.dataset.ufSvcInit) return;
      build(root, wrapper);
    } catch (e) {
      window.__ufSvcErr = window.__ufSvcErr || [];
      window.__ufSvcErr.push(String((e && e.stack) || e));
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

  try {
    var mo = new MutationObserver(function () { init(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  var pollTries = 0;
  var pollIv = setInterval(function () {
    pollTries++;
    init();
    if (pollTries > 240) clearInterval(pollIv); /* ~2 минуты подстраховки */
  }, 500);

  /* ================================================================
     UNFADED — «Клиентский сервис»: доработка по фидбэку с прод-теста
     (заголовок, крошки, немжирное меню, шаги в столбец, 2 плашки) —
     31.08.2026
     ================================================================ */
  (function () {
    function ensureSvcPageHead() {
      var nav = document.querySelector('.uf-svc-nav');
      if (!nav || document.querySelector('.uf-svc-pagehead')) return;
      var head = document.createElement('div');
      head.className = 'uf-svc-pagehead';
      head.innerHTML =
        '<div class="uf-crumbs"><a href="/">Главная</a><span class="uf-crumbs-sep">/</span><span class="uf-crumbs-current">Клиентский сервис</span></div>' +
        '<h1 class="uf-svc-h1">Клиентский сервис</h1>';
      nav.parentNode.insertBefore(head, nav);
    }

    function ensureSvcFaqCard() {
      var nav = document.querySelector('.uf-svc-nav');
      if (!nav || document.querySelector('.uf-svc-faqcard')) return;
      var card = document.createElement('div');
      card.className = 'uf-svc-faqcard';
      card.innerHTML =
        '<div><div class="uf-svc-faqcard-title">Не нашли ответ?</div>' +
        '<div class="uf-svc-faqcard-sub">Служба поддержки: WhatsApp и Telegram с 09:00 до 21:00 по МСК · unfadedwork@gmail.com</div></div>' +
        '<a class="uf-svc-faqcard-btn" href="https://wa.me/' + WA_NUMBER + '" target="_blank" rel="noopener">Написать в WhatsApp</a>' +
        '<a class="uf-svc-faqcard-btn" href="' + TG_SUPPORT_URL + '" target="_blank" rel="noopener">Написать в Telegram</a>';
      nav.parentNode.insertBefore(card, nav.nextSibling);
    }

    function ensureSvcHowCard() {
      var titles = document.querySelectorAll('.uf-svc-title');
      var claimHead = null;
      for (var i = 0; i < titles.length; i++) {
        if (titles[i].textContent.indexOf('Заявка на возврат или обмен') === 0) {
          claimHead = titles[i].closest('.uf-svc-head');
          break;
        }
      }
      if (!claimHead || claimHead.parentNode.querySelector('.uf-svc-howcard')) return;
      var card = document.createElement('div');
      card.className = 'uf-svc-howcard';
      card.innerHTML =
        '<div class="uf-svc-howcard-title">Как это работает</div>' +
        '<div class="uf-svc-howsteps">' +
        '<div class="uf-svc-howstep"><b>1</b>Заполните форму — номер заказа и что случилось</div>' +
        '<div class="uf-svc-howstep"><b>2</b>Нажмите «Отправить заявку» — откроется WhatsApp с готовым сообщением</div>' +
        '<div class="uf-svc-howstep"><b>3</b>Менеджер обработает заявку и подтвердит детали</div>' +
        '<div class="uf-svc-howstep"><b>4</b>Отнесите вещь в ПВЗ СДЭК как клиентский возврат — номер для оператора пришлём отдельным сообщением, печатать и вкладывать ничего не нужно</div>' +
        '</div>';
      claimHead.parentNode.insertBefore(card, claimHead.nextSibling);
    }

    function ensureSvcExtras() {
      ensureSvcPageHead();
      ensureSvcFaqCard();
      ensureSvcHowCard();
    }

    if (document.querySelector('.uf-svc-nav')) {
      ensureSvcExtras();
    } else {
      var svcMo = new MutationObserver(function () {
        if (document.querySelector('.uf-svc-nav')) ensureSvcExtras();
      });
      svcMo.observe(document.body, { childList: true, subtree: true });
    }
    var svcExtrasTries = 0;
    var svcExtrasIv = setInterval(function () {
      svcExtrasTries++;
      ensureSvcExtras();
      if (document.querySelector('.uf-svc-faqcard') || svcExtrasTries > 240) clearInterval(svcExtrasIv);
    }, 500);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.uf-svc-navitem')) {
        setTimeout(ensureSvcExtras, 60);
      }
    });
  })();

  /* ================================================================
     UNFADED — «Клиентский сервис»: раунд 2 фидбэка с мобильного теста
     (эксцерпт + «читать полностью →» для юридического текста внутри
     Возврата/Обмена — details.uf-legal). Текст юр. документа не
     меняется ни на символ: эксцерпт — это verbatim-обрезка первого
     параграфа, вычисленная кодом, а не набранная вручную.
     31.08.2026
     ================================================================ */
  (function () {
    function ensureLegalExcerpt() {
      var detailsEls = document.querySelectorAll('details.uf-legal:not([data-uf-excerpt-done])');
      for (var i = 0; i < detailsEls.length; i++) {
        var d = detailsEls[i];
        var summary = d.querySelector('summary');
        if (!summary) continue;
        var headingText = summary.textContent;
        var firstP = d.querySelector('p');
        var fullText = firstP ? firstP.textContent : '';
        var excerpt = fullText;
        if (fullText.length > 170) {
          excerpt = fullText.slice(0, 170).replace(/\s+\S*$/, '') + '…';
        }
        var wrap = document.createElement('div');
        wrap.className = 'uf-legal-wrap';
        var heading = document.createElement('div');
        heading.className = 'uf-legal-heading';
        heading.textContent = headingText;
        var excerptEl = document.createElement('p');
        excerptEl.className = 'uf-legal-excerpt';
        excerptEl.textContent = excerpt;
        d.parentNode.insertBefore(wrap, d);
        wrap.appendChild(heading);
        wrap.appendChild(excerptEl);
        wrap.appendChild(d);
        summary.textContent = 'Читать полностью →';
        d.addEventListener('toggle', function (ev) {
          var el = ev.target;
          var sum = el.querySelector('summary');
          if (sum) sum.textContent = el.open ? 'Свернуть ↑' : 'Читать полностью →';
        });
        d.setAttribute('data-uf-excerpt-done', '1');
      }
    }

    if (document.querySelector('.uf-svc-nav')) {
      ensureLegalExcerpt();
    }
    var legalMo = new MutationObserver(function () {
      if (document.querySelector('.uf-svc-nav')) ensureLegalExcerpt();
    });
    legalMo.observe(document.body, { childList: true, subtree: true });
    var legalTries = 0;
    var legalIv = setInterval(function () {
      legalTries++;
      ensureLegalExcerpt();
      if (document.querySelector('details.uf-legal[data-uf-excerpt-done]') || legalTries > 240) clearInterval(legalIv);
    }, 500);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.uf-svc-navitem')) {
        setTimeout(ensureLegalExcerpt, 60);
      }
    });
  })();
})();
// UNFADED: один блок «Способ оплаты» в чекауте.
// Прячем декоративный блок pay_method, оставляем родной блок Тильды
// (paymentsystem) — он реально решает, куда уйдёт заказ — и переписываем
// его подписи на человеческие. В скрытое поле pay_method подставляем текст,
// соответствующий выбранному шлюзу, чтобы в RetailCRM приезжал верный способ.
// По элементам Тильды НЕ кликаем: маршрутизацию делает сама Тильда.
// Долями временно не показываются — платёжной системы Долями сейчас нет.
// Откат: удалить этот блок и закоммитить.
;(function () {
  'use strict';

  var LABELS = {
    tinkoff: 'Оплата банковской картой / СБП (онлайн)',
    custom:  'Оплата наличными / картой при получении'
  };

  // строки должны совпадать с вариантами поля pay_method символ в символ —
  // по ним imb-service определяет тип оплаты в RetailCRM
  var PAY_METHOD_TEXT = {
    tinkoff:          'Оплата банковской картой / СБП (оплата онлайн)',
    custom:           'Оплата наличными / картой при получении',
    'custom.dolyame': 'Оплата Долями',
    // B19 (26.09.2026): варианта для Яндекс Пэй / Сплита в поле pay_method Тильды нет —
    // при выборе Сплита оставалось «при получении». Добавляем вариант на лету (ниже).
    'custom.yandexsplit': 'Оплата Яндекс Пэй / Сплит'
  };

  var HIDE_CSS =
    'position:absolute;width:1px;height:1px;overflow:hidden;' +
    'clip:rect(0 0 0 0);white-space:nowrap';

  function hideOldBlock() {
    var box = document.querySelector('.t-input-group_rd');
    if (!box || box.getAttribute('data-uf-pay-hidden') === '1') return;
    box.setAttribute('data-uf-pay-hidden', '1');
    box.style.cssText = HIDE_CSS;
  }

  function relabel(radio, text) {
    var lbl = radio.closest('label');
    if (!lbl || lbl.getAttribute('data-uf-label') === text) return;

    var node = null;
    for (var i = 0; i < lbl.childNodes.length; i++) {
      var n = lbl.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) { node = n; break; }
    }
    if (node) {
      node.nodeValue = ' ' + text;
      lbl.setAttribute('data-uf-label', text);
      return;
    }

    var els = lbl.querySelectorAll('span,div');
    for (var j = 0; j < els.length; j++) {
      if (els[j].children.length === 0 && (els[j].textContent || '').trim()) {
        els[j].textContent = text;
        lbl.setAttribute('data-uf-label', text);
        return;
      }
    }
  }

  function relabelAll() {
    var radios = document.querySelectorAll('input[name="paymentsystem"]');
    for (var i = 0; i < radios.length; i++) {
      var text = LABELS[radios[i].value];
      if (text) relabel(radios[i], text);
    }
  }

  function syncPayMethod() {
    var ps = document.querySelector('input[name="paymentsystem"]:checked');
    if (!ps) return;
    var text = PAY_METHOD_TEXT[ps.value];
    if (!text) return;

    var pms = document.querySelectorAll('input[name="pay_method"]');
    var found = false;
    for (var i = 0; i < pms.length; i++) {
      if (pms[i].value === text) found = true;
    }
    // Нужного варианта нет в поле Тильды — добавляем скрытую радиокнопку с тем же
    // name: Тильда отправляет выбранное значение pay_method из формы как есть,
    // в RetailCRM это обычное строковое поле.
    if (!found && pms.length) {
      var extra = document.createElement('input');
      extra.type = 'radio';
      extra.name = 'pay_method';
      extra.value = text;
      extra.className = pms[0].className;
      extra.setAttribute('data-uf-extra', '1');
      extra.style.cssText = HIDE_CSS;
      pms[0].parentNode.parentNode.appendChild(extra);
      pms = document.querySelectorAll('input[name="pay_method"]');
    }
    for (var j = 0; j < pms.length; j++) {
      pms[j].checked = (pms[j].value === text);
    }
  }

  function apply() {
    if (!document.querySelector('input[name="paymentsystem"]')) return;
    hideOldBlock();
    relabelAll();
    syncPayMethod();
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'paymentsystem') syncPayMethod();
  }, true);

  new MutationObserver(apply).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  apply();
})();


// UNFADED: правило примерки на чекауте.
// При галочке «Доставка с примеркой» предоплата невозможна — покупатель
// выкупает только то, что подошло, и итоговая сумма заранее неизвестна.
// Прячем экспресс-доставку и все предоплатные способы, оставляя
// «Оплата наличными / картой при получении» (paymentsystem = custom).
// С 26.09.2026 (B13) есть и обратное правило для СДЭК: без галочки службы
// «… с примеркой» скрыты, а оплату при получении Тильда у обычных служб СДЭК
// не предлагает (настройки доставки в Тильде).
// По элементам Тильды не кликаем, скрываем тем же clip-hiding, что и v4 —
// поля остаются в форме. Откат: удалить этот блок и закоммитить.
;(function () {
  'use strict';

  var HIDE_CSS =
    'position:absolute;width:1px;height:1px;overflow:hidden;' +
    'clip:rect(0 0 0 0);white-space:nowrap';

  var ALLOWED = 'custom';
  var EXPRESS_RE = /экспресс/i;
  var switching = false;

  function isFitting() {
    var cb = document.querySelector('input[name="primerka"]');
    return !!(cb && cb.checked);
  }

  function rowOf(input) {
    return input.closest('label') || input.parentElement;
  }

  function setHidden(el, hide) {
    if (!el) return;
    if (hide) {
      if (el.getAttribute('data-uf-fit-hidden') === '1') return;
      el.setAttribute('data-uf-fit-hidden', '1');
      el.setAttribute('data-uf-fit-css', el.style.cssText || '');
      el.style.cssText = HIDE_CSS;
    } else {
      if (el.getAttribute('data-uf-fit-hidden') !== '1') return;
      el.style.cssText = el.getAttribute('data-uf-fit-css') || '';
      el.removeAttribute('data-uf-fit-hidden');
      el.removeAttribute('data-uf-fit-css');
    }
  }

  function applyPayments(fitting) {
    var radios = document.querySelectorAll('input[name="paymentsystem"]');
    if (!radios.length) return;
    var needSwitch = false;
    for (var i = 0; i < radios.length; i++) {
      var r = radios[i];
      var hide = fitting && r.value !== ALLOWED;
      setHidden(rowOf(r), hide);
      if (hide && r.checked) needSwitch = true;
    }
    if (needSwitch && !switching) {
      switching = true;
      var t = document.querySelector('input[name="paymentsystem"][value="' + ALLOWED + '"]');
      if (t && !t.checked) {
        t.checked = true;
        t.dispatchEvent(new Event('change', { bubbles: true }));
      }
      switching = false;
    }
  }

  // B13 (26.09.2026): у СДЭК две пары служб в Тильде — обычные («СДЭК: до двери»,
  // «СДЭК: до ПВЗ»: порог 30 000, только предоплата) и «… с примеркой» (без порога,
  // только оплата при получении). С галочкой показываем только «с примеркой»,
  // без галочки — только обычные. Пока служб «с примеркой» в Тильде нет,
  // обычные СДЭК не прячем, чтобы примерку можно было оформить.
  var CDEK_RE = /сдэк/i;
  var FIT_SVC_RE = /с\s+примеркой/i;

  function cdekKind(text) {
    return /двер/i.test(text) ? 'door' : (/пвз/i.test(text) ? 'pvz' : '');
  }

  // B12 (27.09.2026): «Экспресс доставка за 3 часа по Москве» показывалась всем,
  // в том числе до выбора города — Тильда предвыбирала её первой (в аудите:
  // «Экспресс… 1 000 ₽, United States» первым, что видела покупательница).
  // Показываем экспресс только когда город подтверждён и это Москва.
  var MOSCOW_RE = /москв/i;
  // B25 (27.09.2026): «Доставка по всему Миру» — международный тариф, для
  // российских адресов его быть не должно. Логика переехала сюда из
  // инлайнового скрипта подрядчика в подвале Тильды (блок rec800157782):
  // тот жил только в интерфейсе Тильды, не версионировался и опрашивал DOM
  // каждые 300 мс. Здесь она работает в общем цикле с правилом примерки.
  var WORLD_RE = /по\s*всему\s*миру/i;

  function isRussia() {
    var delivery = (window.tcart && window.tcart.delivery) || {};
    if (delivery.country) return String(delivery.country).toLowerCase() === 'ru';
    // Пока Тильда не посчитала доставку — смотрим подпись под полем города,
    // как это делал прежний скрипт: «Россия, г Москва».
    var city = document.querySelector('input[name="tildadelivery-city"]');
    var block = city && city.closest('.t-input-block');
    var descr = block && block.querySelector('.t-input-description');
    return !!(descr && /росси/i.test(descr.textContent || ''));
  }

  function isMoscow() {
    var city = document.querySelector('input[name="tildadelivery-city"]');
    if (!city || !city.value.trim()) return false;
    if (city.dataset.ufTyped === '1') return false; // город набран руками, не выбран из подсказки
    var delivery = (window.tcart && window.tcart.delivery) || {};
    return MOSCOW_RE.test(city.value) || MOSCOW_RE.test(delivery.city || '');
  }

  function applyDelivery(fitting) {
    var moscow = isMoscow();
    var russia = isRussia();
    var radios = document.querySelectorAll('.t-input-group_dl input[name="tildadelivery-type"]');
    var items = [];
    var hasFitCdek = false;
    for (var i = 0; i < radios.length; i++) {
      var r = radios[i];
      var row = rowOf(r);
      var text = ((row && row.textContent) || '') + ' ' + (r.value || '');
      var cdek = CDEK_RE.test(text);
      var fitSvc = cdek && FIT_SVC_RE.test(text);
      if (fitSvc) hasFitCdek = true;
      items.push({ r: r, row: row, cdek: cdek, fitSvc: fitSvc, kind: cdekKind(text), express: EXPRESS_RE.test(text), world: WORLD_RE.test(text) });
    }

    var switchFrom = null;
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var hide = false;
      if (it.express && (fitting || !moscow)) hide = true;
      // 27.09.2026: международной доставки пока нет (решение Леры) — скрываем
      // «Доставку по всему Миру» для всех адресов, не только российских.
      if (it.world) hide = true;
      if (it.cdek) {
        if (fitting && hasFitCdek && !it.fitSvc) hide = true;
        if (!fitting && it.fitSvc) hide = true;
      }
      setHidden(it.row, hide);
      it.hidden = hide;
      if (hide && it.r.checked) switchFrom = it;
    }

    if (!switchFrom || switching) return;
    switching = true;
    // Выбранная служба спряталась: для СДЭК переключаем на парную (дверь ↔ дверь,
    // ПВЗ ↔ ПВЗ) кликом, чтобы Тильда пересчитала доставку; иначе просто снимаем выбор.
    var target = null;
    if (switchFrom.cdek) {
      for (var k = 0; k < items.length; k++) {
        if (!items[k].hidden && items[k].cdek && items[k].kind === switchFrom.kind) { target = items[k]; break; }
      }
    }
    if (target) {
      target.r.click();
    } else {
      switchFrom.r.checked = false;
      switchFrom.r.dispatchEvent(new Event('change', { bubbles: true }));
    }
    switching = false;
  }

  function apply() {
    if (!document.querySelector('input[name="primerka"]')) return;
    var fitting = isFitting();
    applyPayments(fitting);
    applyDelivery(fitting);
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'primerka') apply();
  }, true);

  new MutationObserver(apply).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  apply();
})();

// ============================================================
// UNFADED — first-screen background photos without the blur
// Tilda's lazy loader shows a 20px placeholder (the "blur") and only
// requests the real photo after all its scripts run plus a 200–500 ms
// timer — seconds on mobile. This script runs right after the HTML is
// parsed (defer), loads the photos visible on the first screen at the
// size they're shown, and takes them out of Tilda's lazy queue so
// they aren't downloaded twice. On a load error Tilda's loader is
// given the element back.
// ============================================================
(function () {
  var RASTER = /\.(jpe?g|png|webp)$/i;

  function optimUrl(original, box) {
    var m = /^https:\/\/static\.tildacdn\.com\/(tild[\w-]+)\/([^?#]+)$/.exec(original || '');
    if (!m || !RASTER.test(m[2])) return null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.ceil(box.width * dpr / 100) * 100;
    var h = Math.ceil(box.height * dpr / 100) * 100;
    return 'https://optim.tildacdn.com/' + m[1] + '/-/resize/' + w + 'x' + h + '/-/format/webp/' + m[2] + '.webp';
  }

  function run() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var els = document.querySelectorAll('.t-bgimg[data-original]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var box = el.getBoundingClientRect();
        if (!box.width || !box.height || box.top >= vh || box.bottom <= 0) return;
        var url = optimUrl(el.getAttribute('data-original'), box);
        if (!url) return;
        el.classList.remove('t-bgimg');
        var img = new Image();
        img.onload = function () { el.style.backgroundImage = 'url("' + url + '")'; };
        img.onerror = function () {
          el.classList.add('t-bgimg');
          if (typeof window.t_lazyload_update === 'function') window.t_lazyload_update();
        };
        img.src = url;
      })(els[i]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

// ============================================================
// UNFADED — Try-on strip (catalog pages)
// Each catalog section page has its own copy of a big Zero Block banner
// «Доставка с примеркой по всей России» that pushed the products below
// the first screen. Hide it (known copies are also hidden in CSS) and put
// a one-line strip in its place, linking to the delivery tab of /service.
// ============================================================
(function () {
  var RE = /доставка\s*с\s*примеркой\s*по\s*всей\s*росси/i;
  var MORE_URL = '/service#!/tab/533990617-1';

  function run() {
    if (document.querySelector('.uf-tryon-strip')) return;
    var recs = Array.prototype.filter.call(
      document.querySelectorAll('.t-rec[data-record-type="396"]'),
      function (r) { return !r.closest('#t-header, #t-footer') && RE.test(r.textContent); }
    );
    if (!recs.length) return;
    recs.forEach(function (r) { r.classList.add('uf-tryon-hidden'); });
    var strip = document.createElement('div');
    strip.className = 'uf-tryon-strip';
    strip.innerHTML =
      '<span class="uf-tryon-strip__title">Доставка с примеркой по всей России</span>' +
      '<span class="uf-tryon-strip__text">— оплачиваете только то, что подошло</span>' +
      '<a class="uf-tryon-strip__link" href="' + MORE_URL + '">Подробнее →</a>';
    recs[0].parentNode.insertBefore(strip, recs[0]);
    // The catalog block below has a 135px top padding set in Tilda —
    // meant to clear the big banner, just empty space under a thin strip.
    var next = recs[0].nextElementSibling;
    while (next && (next.classList.contains('uf-tryon-hidden') || !next.offsetHeight)) next = next.nextElementSibling;
    if (next && next.classList.contains('t-rec')) next.classList.add('uf-after-tryon');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();


// ============================================================
// UNFADED — Бесплатная доставка СДЭК от 30 000 ₽ (задача от 26.09.2026)
// 1) Корзина: полоска «Добавьте ещё N RUB до бесплатной доставки СДЭК» /
//    «✓ У вас бесплатная доставка СДЭК…» / при примерке — пояснение, что
//    доставка оплачивается при получении. В боковой корзине под «Сумма»
//    и в итогах на шаге оформления.
// 2) Страница товара: строка о доставке под кнопкой «Добавить в корзину».
// Сам порог живёт в настройках служб доставки Тильды («СДЭК: до двери»,
// «СДЭК: до ПВЗ») — при смене порога поменять и FREE_FROM здесь.
// Откат: удалить этот блок и стили .uf-fs / .uf-pdp-ship в brand-style.css.
// ============================================================
(function () {
  'use strict';

  // Общий порог. У участницы клуба он свой — после подтверждения телефона
  // на чекауте её порог лежит в window.UF_ACCESS (см. блок E1.6 ниже).
  var FREE_FROM_DEFAULT = 30000;
  var MORE_URL = '/service#!/tab/533990617-1';

  function freeFrom() {
    var a = window.UF_ACCESS;
    return a && typeof a.freeFrom === 'number' ? a.freeFrom : FREE_FROM_DEFAULT;
  }

  function rub(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' RUB';
  }

  // Сумма товаров с учётом скидок: итог минус доставка.
  function cartSum() {
    var c = window.tcart;
    if (!c || !c.products || !c.products.length) return null;
    var amount = parseFloat(c.amount) || 0;
    var dlv = c.delivery && parseFloat(c.delivery.price) || 0;
    var sum = amount - dlv;
    if (!(sum > 0)) sum = parseFloat(c.prodamount) || 0;
    return sum;
  }

  function isFitting() {
    var cb = document.querySelector('input[name="primerka"]');
    return !!(cb && cb.checked);
  }

  function fsState() {
    var sum = cartSum();
    if (sum === null) return null;
    if (isFitting()) {
      return { key: 'fit', html: 'С примеркой доставка СДЭК оплачивается при получении — вы платите только за то, что подошло.', bar: -1 };
    }
    var limit = freeFrom();
    if (limit <= 0) {
      return { key: 'always', html: '<b>✓ У вас бесплатная доставка СДЭК</b> — по вашему уровню в клубе', bar: 100 };
    }
    if (sum >= limit) {
      return { key: 'free', html: '<b>✓ У вас бесплатная доставка СДЭК</b> при оплате на сайте', bar: 100 };
    }
    var left = limit - sum;
    return { key: 'left' + Math.round(left), html: 'Добавьте ещё <b>' + rub(left) + '</b> до бесплатной доставки СДЭК', bar: Math.max(3, Math.round(sum / limit * 100)) };
  }

  function renderFs(anchor, where, st) {
    var box = where === 'after' ? anchor.nextElementSibling : anchor.lastElementChild;
    if (!box || !box.classList || !box.classList.contains('uf-fs')) {
      box = document.createElement('div');
      box.className = 'uf-fs';
      box.innerHTML = '<div class="uf-fs__text"></div><div class="uf-fs__bar"><i></i></div>';
      if (where === 'after') anchor.insertAdjacentElement('afterend', box);
      else anchor.appendChild(box);
    }
    if (!st) { box.style.display = 'none'; return; }
    box.style.display = '';
    if (box.getAttribute('data-key') === st.key) return;
    box.setAttribute('data-key', st.key);
    box.querySelector('.uf-fs__text').innerHTML = st.html;
    var bar = box.querySelector('.uf-fs__bar');
    bar.style.display = st.bar < 0 ? 'none' : '';
    if (st.bar >= 0) bar.firstChild.style.width = st.bar + '%';
    box.classList.toggle('uf-fs_free', st.key === 'free');
  }

  function applyCart() {
    var st = fsState();
    var side = document.querySelector('.t706__sidebar-totalamount-info');
    if (side) renderFs(side, 'after', st);
    var page = document.querySelector('.t706__cartpage-totals');
    if (page) renderFs(page, 'append', st);
  }

  function applyPdp() {
    var infos = document.querySelectorAll('.t-store__prod-popup__info');
    for (var i = 0; i < infos.length; i++) {
      var info = infos[i];
      var priceWrap = info.querySelector('.js-store-price-wrapper');
      var priceEl = info.querySelector('.js-product-price');
      if (!priceWrap || !priceEl) continue;
      // Кнопка Долями — сразу под ценой: виджет грузится позже соседних
      // вставок (плашка примерки, «Таблица размеров») и оказывался под ними.
      var dolyame = info.querySelector('.digi-dolyame-button--wrapper');
      if (dolyame && priceWrap.nextElementSibling !== dolyame) {
        priceWrap.insertAdjacentElement('afterend', dolyame);
      }
      var price = parseFloat(String(priceEl.textContent).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      var html = price >= FREE_FROM_DEFAULT
        ? '<b>Для этого товара доставка СДЭК бесплатная</b> при оплате на сайте. С примеркой — оплата при получении. '
        : 'Доставка СДЭК по России — от 250\u00A0RUB, <b>бесплатно от ' + rub(FREE_FROM_DEFAULT) + '</b> при оплате на сайте. С примеркой — оплата при получении. ';
      html += '<a href="' + MORE_URL + '">Подробнее →</a>';
      var line = info.querySelector('.uf-pdp-ship');
      if (!line) {
        line = document.createElement('div');
        line.className = 'uf-pdp-ship';
        // Под кнопкой «Добавить в корзину»: выше, под ценой, соседние вставки
        // (плашка примерки, «Таблица размеров») сдвигали строку в блок размеров.
        var btnWrap = info.querySelector('.t-store__prod-popup__btn-wrapper');
        (btnWrap || priceWrap).insertAdjacentElement('afterend', line);
      }
      if (line.getAttribute('data-price') !== String(price)) {
        line.setAttribute('data-price', String(price));
        line.innerHTML = html;
      }
    }
  }

  function tick() {
    try { applyCart(); } catch (e) {}
    try { applyPdp(); } catch (e) {}
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'primerka') setTimeout(tick, 50);
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
  else tick();
  setInterval(tick, 700);
})();

// ============================================================
// UNFADED — subscribe popup timing + desktop footer row
// The popup (rec1542845921 inside T1093 wrapper rec1542842021) used to be
// opened by Tilda's T354 trigger in the header, i.e. the moment the page
// loaded. T354 is now hidden in Tilda; here the popup opens after 25 s on
// desktop, at most once per 30 days (same cookie `popup_shown` T354 used,
// so people who already saw it aren't shown it again). On mobile the same
// form is rendered inline above the footer (see the popup fix at the top of
// this file), so no timer there.
// Because a closed popup never comes back, desktop also gets a permanent
// one-line form above the footer. It fills in and submits the popup's own
// Tilda form, so subscriptions go to the same services (RetailCRM via
// delivery-calc, Tilda CRM, Telegram) and the success message is Tilda's.
// ============================================================
(function () {
  var MOBILE_MAX = 639;
  var DELAY_MS = 25000;
  var COOKIE = 'popup_shown';
  var HOOK = '#subscribe-popup';
  var FOOTER_REC = 'rec1777413841';

  function isDesktop() { return window.innerWidth > MOBILE_MAX; }
  function hasCookie() {
    return document.cookie.split(';').some(function (c) { return c.trim().indexOf(COOKIE + '=') === 0; });
  }
  function setCookie() {
    var d = new Date();
    d.setTime(d.getTime() + 30 * 24 * 3600 * 1000);
    document.cookie = COOKIE + '=yes; expires=' + d.toGMTString() + '; path=/';
  }
  function busy() {
    return /cartwinshowed|cartsidebarshowed|popupshowed/.test(document.body.className) ||
      !!document.querySelector('.t-popup_show');
  }
  function openPopup() {
    var a = document.createElement('a');
    a.href = HOOK;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function schedule() {
    if (!isDesktop() || hasCookie()) return;
    setTimeout(function tryOpen() {
      if (hasCookie()) return;
      if (busy()) { setTimeout(tryOpen, 10000); return; }
      setCookie();
      openPopup();
    }, DELAY_MS);
  }

  function footerRow() {
    if (!isDesktop() || document.querySelector('.uf-sub-row')) return;
    var footer = document.getElementById(FOOTER_REC);
    var popupForm = document.querySelector('#rec1542845921 form');
    if (!footer || !popupForm) return;
    var row = document.createElement('div');
    row.className = 'uf-sub-row';
    row.innerHTML =
      '<div class="uf-sub-row__text"><div class="uf-sub-row__title">Ранний доступ к новым дропам и −10% на первый заказ</div>' +
      '<div class="uf-sub-row__sub">Письма UNFADED — без спама, только новые коллекции и закрытые продажи.</div></div>' +
      '<form class="uf-sub-row__form" novalidate>' +
        '<div class="uf-sub-row__line"><input type="email" class="uf-sub-row__input" placeholder="Ваш e-mail" autocomplete="email" required>' +
        '<button type="submit" class="uf-sub-row__btn">Подписаться</button></div>' +
        '<label class="uf-sub-row__consent"><input type="checkbox" required> <span>Я согласна(-ен) на <a href="/service#consent" target="_blank">обработку персональных данных</a> и получение рассылки</span></label>' +
        '<div class="uf-sub-row__msg" aria-live="polite"></div>' +
      '</form>';
    footer.parentNode.insertBefore(row, footer);

    var form = row.querySelector('form');
    var email = row.querySelector('input[type=email]');
    var consent = row.querySelector('input[type=checkbox]');
    var msg = row.querySelector('.uf-sub-row__msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = '';
      if (!email.value.trim() || !email.checkValidity()) { msg.textContent = 'Проверьте e-mail'; email.focus(); return; }
      if (!consent.checked) { msg.textContent = 'Отметьте согласие на обработку данных'; return; }
      var pEmail = popupForm.querySelector('input[name="email"]');
      var pPolicy = popupForm.querySelector('input[name="policy"]');
      var pSubmit = popupForm.querySelector('.t-submit, [type="submit"]');
      if (!pEmail || !pSubmit) { msg.textContent = 'Не получилось, попробуйте ещё раз'; return; }
      setCookie();
      openPopup();
      setTimeout(function () {
        pEmail.value = email.value.trim();
        pEmail.dispatchEvent(new Event('input', { bubbles: true }));
        if (pPolicy && !pPolicy.checked) pPolicy.click();
        pSubmit.click();
        form.reset();
      }, 400);
    });
  }

  // Tilda builds Zero Block form inputs with JS after the page is parsed,
  // so wait for the popup form to appear before adding the footer row.
  function run() {
    schedule();
    var tries = 0;
    (function waitForm() {
      footerRow();
      if (!document.querySelector('.uf-sub-row') && ++tries < 40) setTimeout(waitForm, 500);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

// ============================================================
// UNFADED — Checkout v2 layer (approved mockup 26.09.2026,
// https://claude.ai/artifact/7ztkiLh2czJDnnAeEAq6hq)
// Sits on top of the step wizard above without changing it: step
// headings, the promo code moved into the order summary (it proxies the
// real Tilda promo field, which stays inside the form so the code is
// still sent with the order), "Ваш заказ" heading, totals that hide the
// delivery/total rows until a city is picked (before that Tilda shows the
// first service — express, 1 000 ₽ — and a "United States, ," hint), and
// button captions «Далее: …» / «Оформить заказ · сумма».
// Styles: brand-style.css, section "Checkout v2" (html.uf-co2 …).
// On for everyone; ?co2=0 / ?co2=1 override it per browser (remembered).
// ============================================================
(function () {
  var ENABLED_BY_DEFAULT = true; // включено для всех 26.09.2026; откат — false

  function enabled() {
    try {
      if (/[?&]co2=1\b/.test(location.search)) localStorage.setItem('uf-co2', '1');
      if (/[?&]co2=0\b/.test(location.search)) localStorage.setItem('uf-co2', '0');
      var v = localStorage.getItem('uf-co2');
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (e) { /* storage blocked: fall back to the default */ }
    return ENABLED_BY_DEFAULT;
  }
  if (!enabled()) return;
  document.documentElement.classList.add('uf-co2');

  var HEADS = {
    1: ['Контакты', 'Пришлём подтверждение и трек-номер.'],
    2: ['Доставка', ''],
    3: ['Оплата', ''],
    4: ['Проверьте заказ', '']
  };
  var NEXT = { 1: 'Далее: доставка', 2: 'Далее: оплата', 3: 'Далее: проверка' };
  var BACK = { 2: '← Контакты', 3: '← Доставка', 4: '← Оплата' };

  function q(root, sel) { return root ? root.querySelector(sel) : null; }
  function qa(root, sel) { return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }

  function addHeads(box) {
    [1, 2, 3, 4].forEach(function (n) {
      if (q(box, '.uf-co2-head[data-uf-step="' + n + '"]')) return;
      var first = n === 4 ? q(box, '.uf-checkout-review')
        : qa(box, '[data-uf-step="' + n + '"]').filter(function (el) {
          return !el.classList.contains('uf-checkout-hidden-field');
        })[0];
      if (!first) return;
      var head = document.createElement('div');
      head.className = 'uf-co2-head';
      head.setAttribute('data-uf-step', String(n));
      head.innerHTML = '<div class="uf-co2-head__title">' + HEADS[n][0] + '</div>' +
        (HEADS[n][1] ? '<div class="uf-co2-head__sub">' + HEADS[n][1] + '</div>' : '');
      first.parentNode.insertBefore(head, first);
    });
  }

  // The Telegram nickname field is being removed from the Tilda form; until
  // then (and on cached pages) just hide it.
  function hideNick(box) {
    var nick = q(box, 'input[name="tg_username"]');
    var g = nick && nick.closest('.t-input-group');
    if (g && !g.classList.contains('uf-checkout-hidden-field')) {
      g.classList.add('uf-checkout-hidden-field');
      g.removeAttribute('data-uf-step');
    }
  }

  function tildaPromoGroup(box) {
    return qa(box, '.t-input-group_pc').filter(function (g) {
      return q(g, 'input.t-inputpromocode');
    })[0];
  }

  function addPromo(box) {
    var info = document.querySelector('.t706__cartpage-info-wrapper');
    var totals = q(info, '.t706__cartpage-totals');
    var tg = tildaPromoGroup(box);
    if (!info || !totals || !tg || q(info, '.uf-co2-promo')) return;
    var tInput = q(tg, 'input.t-inputpromocode');
    var tBtn = q(tg, '.t-inputpromocode__btn');
    if (!tInput || !tBtn) return;

    tg.classList.add('uf-co2-promo-src');
    if (tg.getAttribute('data-uf-step') === '1') tg.removeAttribute('data-uf-step');

    var row = document.createElement('div');
    row.className = 'uf-co2-promo';
    row.innerHTML =
      '<label class="uf-co2-promo__label" for="uf-co2-promo-input">Промокод</label>' +
      '<div class="uf-co2-promo__line">' +
        '<input id="uf-co2-promo-input" class="uf-co2-promo__input" type="text" placeholder="Введите промокод" autocomplete="off">' +
        '<button type="button" class="uf-co2-promo__btn">Применить</button>' +
      '</div>' +
      '<div class="uf-co2-promo__msg" aria-live="polite"></div>';
    info.insertBefore(row, totals);

    var input = q(row, 'input');
    var btn = q(row, 'button');
    var msg = q(row, '.uf-co2-promo__msg');
    if (tInput.value) input.value = tInput.value;

    function apply() {
      var code = input.value.trim();
      msg.textContent = '';
      if (!code) { input.focus(); return; }
      tInput.value = code;
      tInput.dispatchEvent(new Event('input', { bubbles: true }));
      tBtn.click();
      // Tilda answers a wrong code with its own alert; a right one lands in
      // tcart.promocode and the totals update by themselves.
      setTimeout(function () {
        var p = window.tcart && window.tcart.promocode;
        if (p && String(p.promocode || '').toUpperCase() === code.toUpperCase()) {
          msg.textContent = 'Промокод применён';
        }
      }, 2000);
    }
    btn.addEventListener('click', apply);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
    });
  }

  function addSummaryTitle() {
    var info = document.querySelector('.t706__cartpage-info-wrapper');
    if (!info || q(info, '.uf-co2-sumtitle')) return;
    var h = document.createElement('div');
    h.className = 'uf-co2-sumtitle';
    h.textContent = 'Ваш заказ';
    info.insertBefore(h, info.firstChild);
  }

  function markTotals(box) {
    var page = document.querySelector('.t706__cartpage');
    if (!page) return;
    qa(page, '.t706__cartpage-totals .t706__cartwin-totalamount-row').forEach(function (row, i) {
      // first row is the goods subtotal (we relabel it «Товары» below, so
      // it can't be recognised by its text), the one with the big label is
      // the total, everything in between is delivery
      var text = row.textContent.replace(/\s+/g, ' ').trim();
      var kind = q(row, '.t706__cartwin-totalamount-label') ? 'total'
        : i === 0 ? 'sum'
        : /^(Промокод|Скидка|CREDITS|Сумма со скидкой)/.test(text) ? 'discount'
        : 'delivery';
      row.setAttribute('data-uf-row', kind);
      if (kind === 'sum') {
        var lt = q(row, '.t706__cartwin-totalamount-info_label-text');
        if (lt && lt.textContent !== 'Товары') lt.textContent = 'Товары';
      }
    });
    var guid = q(box, 'input[name="tildadelivery-guid"]');
    page.classList.toggle('uf-co2-nodl', !(guid && guid.value));
  }

  function totalText() {
    var t = document.querySelector('.t706__cartpage .t706__cartwin-totalamount');
    var s = t ? t.textContent.replace(/\s+/g, ' ').replace(/р\.?$/, '').trim() : '';
    return s ? s + '\u00A0RUB' : '';
  }

  function updateButtons(box) {
    var step = parseInt(box.getAttribute('data-active-step'), 10) || 1;
    var nav = q(box.parentElement, '.uf-checkout-nav');
    var next = q(nav, '.uf-checkout-nav__next');
    var back = q(nav, '.uf-checkout-nav__back');
    if (next && NEXT[step] && next.textContent !== NEXT[step]) next.textContent = NEXT[step];
    if (back && BACK[step] && back.textContent !== BACK[step]) back.textContent = BACK[step];
    var sub = q(box, '.t-form__submit .t-submit');
    if (sub) {
      var label = q(sub, '.t-btnflex__text') || sub;
      var txt = 'Оформить заказ' + (totalText() ? ' · ' + totalText() : '');
      if (label.textContent !== txt) label.textContent = txt;
    }
  }

  // On phones Tilda hides the form behind its own «Оформить заказ» button
  // above the summary; the approved layout shows the form straight away
  // (summary below it), so press that button for the customer.
  function openMobileForm() {
    var wrap = document.querySelector('.t706__cartpage-open-form-wrap');
    if (!wrap || wrap.offsetParent === null) return;
    var b = wrap.querySelector('a, button, .t-btn, .t-submit');
    if (!b) return;
    b.click();
    // Tilda then scrolls down to the form, past the name field; the form
    // is at the top now anyway, so bring the page back up
    var page = document.querySelector('.t706__cartpage');
    [60, 400, 900].forEach(function (t) {
      setTimeout(function () { if (page) page.scrollTop = 0; }, t);
    });
  }

  function init() {
    var box = document.querySelector('.t-form__inputsbox[data-uf-wizard]');
    if (!box || box.dataset.ufCo2) return !!box;
    box.dataset.ufCo2 = '1';
    hideNick(box);
    addHeads(box);
    addPromo(box);
    addSummaryTitle();
    markTotals(box);
    updateButtons(box);

    new MutationObserver(function () { updateButtons(box); })
      .observe(box, { attributes: true, attributeFilter: ['data-active-step'] });
    var totals = document.querySelector('.t706__cartpage-totals');
    if (totals) {
      new MutationObserver(function () { markTotals(box); updateButtons(box); })
        .observe(totals, { childList: true, subtree: true, characterData: true });
    }
    box.addEventListener('change', function () { setTimeout(function () { markTotals(box); }, 300); });
    // Tilda fills the city guid without events we can rely on; a light poll
    // keeps the totals state honest while the checkout is open.
    setInterval(function () {
      if (!document.body.classList.contains('t706__body_cartpageshowed')) return;
      markTotals(box);
      openMobileForm();
    }, 1000);
    openMobileForm();
    return true;
  }

  var tries = 0;
  (function wait() {
    if (init()) {
      // the promo row / summary title need the info column, which Tilda
      // renders a bit later than the form
      var box = document.querySelector('.t-form__inputsbox[data-uf-wizard]');
      addPromo(box); addSummaryTitle(); markTotals(box);
    }
    if (++tries < 150) setTimeout(wait, 400);
  })();
})();

// ============================================================
// UNFADED — search overlay: start screen (27.09.2026)
// The search window (#ufs-overlay, built by the site-wide HEAD code) showed
// nothing until something was typed, while the page behind it is locked —
// so on open there was nothing to scroll ("поиск не скролится"). Now an
// empty query shows category chips and a scrollable product grid from the
// same search index; typing hides it and the normal results take over.
// Styles: brand-style.css, ".ufs-start".
// ============================================================
(function () {
  var INDEX_URL = 'https://unfadedbrand.github.io/unfaded-data/search-index.json';
  var SHOW = 24;
  var index = null, loading = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // same currency label as the catalog cards («RUB», see .t-store__card__price-currency)
  function price(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' RUB'; }

  // Results rendered by the HEAD search code print «₽»; switch them to «RUB»
  // so search cards read like the catalog ones.
  function fixCurrency(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeValue.indexOf('₽') !== -1 && n.parentNode.closest('.ufs-card__price')) {
        n.nodeValue = n.nodeValue.replace(/\s*₽/g, ' RUB');
      }
    }
  }

  function load(cb) {
    if (index) return cb();
    if (loading) return;
    loading = true;
    fetch(INDEX_URL).then(function (r) { return r.json(); })
      .then(function (d) { index = Array.isArray(d) ? d : []; cb(); })
      .catch(function () { index = []; })
      .then(function () { loading = false; });
  }

  function cards(list) {
    return list.slice(0, SHOW).map(function (p) {
      return '<a class="ufs-card" href="' + esc(p.url) + '">' +
        '<div class="ufs-card__img" style="background-image:url(\'' + esc(p.img) + '\')"></div>' +
        '<div class="ufs-card__title">' + esc(p.title) + '</div>' +
        '<div class="ufs-card__price">' + price(p.price) +
        (p.oldPrice ? '<span class="ufs-card__old">' + price(p.oldPrice) + '</span>' : '') +
        '</div></a>';
    }).join('');
  }

  function render(start, cat) {
    var counts = {}, order = [];
    index.forEach(function (p) {
      var c = p.primaryCategory;
      if (!c) return;
      if (!counts[c]) { counts[c] = 0; order.push(c); }
      counts[c]++;
    });
    order.sort(function (a, b) { return counts[b] - counts[a]; });
    var chips = '<button type="button" class="ufs-chip' + (cat ? '' : ' uf-active') + '" data-cat="">Все</button>' +
      order.map(function (c) {
        return '<button type="button" class="ufs-chip' + (c === cat ? ' uf-active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('');
    var list = cat ? index.filter(function (p) { return p.primaryCategory === cat; }) : index;
    start.innerHTML =
      '<div class="ufs-start__label">Категории</div><div class="ufs-chips ufs-start__chips">' + chips + '</div>' +
      '<div class="ufs-start__label">' + (cat ? esc(cat) : 'Смотрите также') + '</div>' +
      '<div class="ufs-grid">' + cards(list) + '</div>';
  }

  function sync(ov) {
    var body = ov.querySelector('.ufs-overlay__body');
    var input = ov.querySelector('.ufs-overlay__input');
    if (!body || !input) return;
    var start = body.querySelector('.ufs-start');
    if (!start) {
      start = document.createElement('div');
      start.className = 'ufs-start';
      body.appendChild(start);
      start.addEventListener('click', function (e) {
        var chip = e.target.closest('.ufs-chip');
        if (!chip) return;
        render(start, chip.getAttribute('data-cat'));
      });
    }
    var empty = !input.value.trim();
    ov.classList.toggle('ufs-is-start', empty);
    if (empty && !start.firstChild) load(function () { if (index.length) render(start, ''); });
  }

  function wire(ov) {
    if (ov.dataset.ufStart) return;
    ov.dataset.ufStart = '1';
    var input = ov.querySelector('.ufs-overlay__input');
    if (input) input.addEventListener('input', function () { sync(ov); });
    var results = ov.querySelector('.ufs-overlay__results');
    if (results) {
      fixCurrency(results);
      new MutationObserver(function () { fixCurrency(results); })
        .observe(results, { childList: true, subtree: true });
    }
    new MutationObserver(function () {
      if (ov.classList.contains('uf-open')) {
        sync(ov);
        var b = ov.querySelector('.ufs-overlay__body');
        if (b) b.scrollTop = 0;
      }
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
    if (ov.classList.contains('uf-open')) sync(ov);
  }

  var ov0 = document.getElementById('ufs-overlay');
  if (ov0) wire(ov0);
  new MutationObserver(function () {
    var ov = document.getElementById('ufs-overlay');
    if (ov) wire(ov);
  }).observe(document.body, { childList: true });
})();

// ============================================================
// UNFADED — product card: «Доставка и оплата» tab (27.09.2026)
// The tab text lived in every product separately: in 11 products it was
// empty, the rest had 5 outdated versions («Доставка СДЕК», courier fitting
// for 450 ₽ in Moscow/SPb only, «free exchange in 7 days», nothing about
// payment). One text for all products now lives here; when delivery or
// payment terms change, edit TEXT below (and the service page texts above).
// ============================================================
(function () {
  var SVC = '/service#!/tab/533990617-';
  var TEXT =
    '<p><b>Доставка СДЭК по России</b> — в пункт выдачи или курьером до двери. Стоимость и срок рассчитываются при оформлении заказа. <b>Бесплатно от 30 000\u00A0RUB</b> при оплате на сайте.</p>' +
    '<p><b>С примеркой</b> — отметьте «Я хочу примерить товар»: 15 минут на примерку, до 7 позиций, оплачиваете при получении только то, что подошло.</p>' +
    '<p><b>Экспресс по Москве</b> — за 3 часа в пределах МКАД, 1 000\u00A0RUB, для заказов в рабочее время (9:00–21:00).</p>' +
    '<p><b>Оплата</b> — картой или СБП на сайте, «Долями», Яндекс Пэй и «Яндекс Сплит»; при получении — только с примеркой.</p>' +
    '<p><b>Возврат и обмен</b> — 14 дней после получения, если сохранены товарный вид и бирки.</p>' +
    '<p><a href="' + SVC + '1">Доставка</a> · <a href="' + SVC + '2">Оплата</a> · <a href="' + SVC + '3">Обмен и возврат</a></p>';

  function apply() {
    var items = document.querySelectorAll('.t-store__tabs__item');
    for (var i = 0; i < items.length; i++) {
      var title = items[i].querySelector('.t-store__tabs__item-title');
      var content = items[i].querySelector('.t-store__tabs__content');
      if (!title || !content || content.dataset.ufShip) continue;
      if (!/доставка\s+и\s+оплата/i.test(title.textContent)) continue;
      content.innerHTML = TEXT;
      content.dataset.ufShip = '1';
      content.classList.add('uf-ship-tab');
    }
  }
  apply();
  // product pages open as popups / render the tabs late — keep checking
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
})();

// ============================================================
// UNFADED — consent links (27.09.2026)
// Forms on the site (checkout checkbox, subscribe popup, «notify me» form)
// link «обработку персональных данных» to the Privacy Policy or even to the
// Offer tab. Since 01.09.2025 the consent is a separate document — it lives
// on /service#consent (service navigator, CONSENT_HTML). Links whose text
// is about personal data processing are pointed there; the cookie banner
// keeps linking to the Policy.
// ============================================================
(function () {
  var TARGET = '/service#consent';
  var TEXT_RE = /(обработк|персональн)/i;
  var HREF_RE = /533990617-\d+/;
  function fix() {
    var links = document.querySelectorAll('a[href*="533990617-"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.dataset.ufConsent || !HREF_RE.test(a.getAttribute('href') || '')) continue;
      if (!TEXT_RE.test(a.textContent || '')) continue;
      if (a.closest('.uf-cookie, [class*="cookie"]')) continue;
      a.setAttribute('href', TARGET);
      a.dataset.ufConsent = '1';
    }
  }
  fix();
  new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ============================================================
   UNFADED — «Дополните образ»: макет «Сплит» и зачёркнутая старая цена
   (27.09.2026).

   ПОЧЕМУ ЭТО ЗДЕСЬ, А НЕ В HEAD-КОДЕ ТИЛЬДЫ.
   Блок строит функция buildOutfitHtml в HEAD-коде сайта. Переписать её там
   не получается: HEAD-код занимает ~50 КБ, а страницы товара внутри папки
   «Каталог» (/catalog/<раздел>/tproduct/...) отдаются с потолком около
   64 КБ на документ. Прибавка всего в 1 КБ вытолкнула их за предел — Тильда
   стала резать HTML на середине, и такие страницы открывались пустыми
   (проверено 27.09: 65 158 байт и ноль блоков вместо 246 352 и семнадцати).
   Поэтому HEAD-код оставлен нетронутым, а разметку блока пересобирает этот
   модуль — он грузится с GitHub и размер документа не увеличивает.

   ЧТО ДЕЛАЕТ.
   1. Заворачивает заголовок и ряд в .uf-outfit-split — колонка с заголовком
      слева, карточки справа. Без этого блок разваливался, когда кандидат
      один: в трёхколоночной сетке одна карточка занимала треть полосы,
      а такой случай у 28 товаров из 30.
   2. Проставляет ряду data-uf-count — по нему brand-style.css («Раунд 12»)
      выбирает число колонок.
   3. Дорисовывает зачёркнутую старую цену: в HEAD-коде её нет, поле oldPrice
      берём из data.json по ссылке карточки.

   Стили: brand-style.css, раздел «Раунд 12 (27.09.2026)».
   ============================================================ */
(function () {
  var DATA_URL = 'https://unfadedbrand.github.io/unfaded-data/data.json';
  var oldPriceByUrl = null;

  // Цена в data.json лежит строкой «27 000 ₽». Карточки каталога пишут число
  // и подпись «RUB» раздельно (см. .t-store__card__price-currency в
  // brand-style.css) — разбираем так же, чтобы блок не отличался от сайта.
  function priceParts(raw) {
    var text = String(raw == null ? '' : raw);
    var m = text.match(/^\s*([\d\s ]+?)\s*₽\s*$/);
    return m ? { value: m[1], currency: 'RUB' } : { value: text, currency: '' };
  }

  function loadOldPrices() {
    if (oldPriceByUrl) return Promise.resolve(oldPriceByUrl);
    return fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var map = {};
        var outfits = (d && d.outfits) || {};
        Object.keys(outfits).forEach(function (sku) {
          (outfits[sku] || []).forEach(function (it) {
            if (it && it.url && it.oldPrice) map[it.url] = it.oldPrice;
          });
        });
        oldPriceByUrl = map;
        return map;
      })
      .catch(function () { oldPriceByUrl = {}; return oldPriceByUrl; });
  }

  function addOldPrice(card, map) {
    var price = card.querySelector('.uf-outfit-price');
    if (!price || card.querySelector('.uf-outfit-price-old')) return;
    var old = map[card.getAttribute('href')];
    if (!old) return;

    // Цену и зачёркнутую старую держим в одной строке: .uf-outfit-price
    // оставляем как есть, чтобы ensureOutfitPriceFormat ниже по файлу
    // по-прежнему разбирал её сам.
    var wrap = document.createElement('div');
    wrap.className = 'uf-outfit-prices';
    price.parentNode.insertBefore(wrap, price);
    wrap.appendChild(price);

    var parts = priceParts(old);
    var el = document.createElement('div');
    el.className = 'uf-outfit-price-old';
    var value = document.createElement('span');
    value.className = 'uf-outfit-price-value';
    value.textContent = parts.value;
    el.appendChild(value);
    if (parts.currency) {
      var cur = document.createElement('span');
      cur.className = 'uf-outfit-price-currency';
      cur.textContent = parts.currency;
      el.appendChild(cur);
    }
    wrap.appendChild(el);
  }

  function restyle(root, map) {
    var title = root.querySelector('.uf-outfit-title');
    var row = root.querySelector('.uf-outfit-row');
    if (!title || !row) return;

    if (!root.querySelector('.uf-outfit-split')) {
      var split = document.createElement('div');
      split.className = 'uf-outfit-split';
      var head = document.createElement('div');
      head.className = 'uf-outfit-head';
      root.insertBefore(split, title);
      split.appendChild(head);
      head.appendChild(title);
      split.appendChild(row);
    }

    var cards = row.querySelectorAll('.uf-outfit-card');
    row.setAttribute('data-uf-count', String(Math.min(cards.length, 4)));
    [].forEach.call(cards, function (card) { addOldPrice(card, map); });
  }

  function apply() {
    var blocks = document.querySelectorAll('.uf-outfit');
    if (!blocks.length) return;
    var pending = [];
    [].forEach.call(blocks, function (b) {
      if (b.getAttribute('data-uf-split') !== '1') pending.push(b);
    });
    if (!pending.length) return;
    loadOldPrices().then(function (map) {
      pending.forEach(function (b) {
        // HEAD-код перерисовывает блок при смене товара — тогда атрибут
        // пропадает вместе со старой разметкой и мы соберём его заново.
        if (b.getAttribute('data-uf-split') === '1') return;
        restyle(b, map);
        b.setAttribute('data-uf-split', '1');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  // Блок появляется после того, как Тильда отрисует карточку товара, и
  // пересобирается при переходе между товарами — следим за деревом.
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
})();

// ============================================================
// UNFADED — notify button guard (27.09.2026)
// Out-of-stock product: the HEAD code hides Tilda's grey «Нет в наличии»
// button and adds «Узнать о поступлении». On slow loads Tilda re-renders the
// grey button afterwards and both end up side by side. CSS (:has) handles it
// in modern browsers; this marks the wrapper for the rest.
// ============================================================
(function () {
  function mark() {
    var btns = document.querySelectorAll('.uf-notify-btn');
    for (var i = 0; i < btns.length; i++) {
      var w = btns[i].closest('.t-store__prod-popup__btn-wrapper');
      if (w && !w.classList.contains('uf-has-notify')) w.classList.add('uf-has-notify');
    }
  }
  mark();
  new MutationObserver(mark).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ============================================================
   UNFADED — «Добавить к заказу»: кросс-сейл в чекауте (27.09.2026)

   Блок в сводке заказа, между списком товаров и итогами. Рекомендации берём
   из того же ключа outfits в data.json, что и «Дополните образ» на карточке
   товара: корзина хранит позицию вместе с артикулом и размером
   (sku «TLB02SS26S»), отрезаем размер — получаем ключ подборки.

   Размер выбирается прямо в строке, поэтому чекаут не закрывается и
   введённые данные не теряются. Чтобы чипсы размеров были честными, живые
   остатки берём у API магазина Тильды; адрес раздела для каждого артикула
   лежит в data.json (store_map: артикул -> [storepartuid, recid]).

   Объект для корзины собираем ровно той же формы, что делает сама Тильда
   при добавлении со страницы товара: uid и inv — у выбранного размера,
   gen_uid — у товара, recid — из адреса страницы. Проверено сверкой поля
   в поле с позицией, добавленной через интерфейс.

   Стили: brand-style.css, раздел «Раунд 14».
   ============================================================ */
(function () {
  var DATA_URL  = 'https://unfadedbrand.github.io/unfaded-data/data.json';
  var INDEX_URL = 'https://unfadedbrand.github.io/unfaded-data/search-index.json';
  var API = 'https://store.tildaapi.com/api/getproductslist/';
  var MAX = 3;                  // больше в узкой колонке превращается в список
  var FREE_SHIPPING_DEFAULT = 30000;  // порог бесплатной доставки без клуба, ₽

  // У участницы клуба порог свой: после подтверждения телефона на чекауте он
  // лежит в window.UF_ACCESS.freeFrom (0 — бесплатно всегда), как в полоске
  // корзины. С примеркой бесплатной доставки нет — подсказку не показываем.
  function freeShipping() {
    var fit = document.querySelector('input[name="primerka"]');
    if (fit && fit.checked) return 0;
    var a = window.UF_ACCESS;
    return a && typeof a.freeFrom === 'number' ? a.freeFrom : FREE_SHIPPING_DEFAULT;
  }

  var data = null, urlToArticle = null, editionsCache = {}, inFlight = {}, busy = false, lastKey = '';

  function money(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' RUB';
  }
  function num(raw) {
    var m = String(raw == null ? '' : raw).match(/[\d\s ]+/);
    return m ? parseInt(m[0].replace(/\s| /g, ''), 10) : 0;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cart() {
    try { return JSON.parse(localStorage.getItem('tcart') || '{}'); } catch (e) { return {}; }
  }

  // «TLB02SS26S» -> «TLB02SS26». Размеры — суффиксы, поэтому ищем самый
  // длинный артикул из подборки, которым начинается sku позиции.
  function articleOf(sku, known) {
    sku = String(sku || '').trim();
    var best = null;
    for (var i = 0; i < known.length; i++) {
      if (sku.indexOf(known[i]) === 0 && (!best || known[i].length > best.length)) best = known[i];
    }
    return best;
  }

  function loadData() {
    if (data && urlToArticle) return Promise.resolve(data);
    return Promise.all([
      fetch(DATA_URL).then(function (r) { return r.json(); }),
      fetch(INDEX_URL).then(function (r) { return r.json(); })
    ]).then(function (res) {
      data = res[0];
      urlToArticle = {};
      (res[1] || []).forEach(function (i) { urlToArticle[i.url] = String(i.sku || '').trim(); });
      return data;
    }).catch(function () {
      data = { outfits: {}, store_map: {} }; urlToArticle = {}; return data;
    });
  }

  // Живые размеры товара: у API спрашиваем раздел целиком и запоминаем.
  function loadEditions(article) {
    var place = (data.store_map || {})[article];
    if (!place) return Promise.resolve(null);
    var part = place[0], recid = place[1];
    if (editionsCache[part]) return Promise.resolve(editionsCache[part][article] || null);
    // Несколько кандидатов часто лежат в одном разделе и запрашиваются
    // параллельно — держим один запрос на раздел, иначе гонка оставляла
    // часть строк без размеров и блок не отрисовывался.
    if (inFlight[part]) {
      return inFlight[part].then(function (by) { return by[article] || null; });
    }
    var url = API + '?storepartuid=' + part + '&recid=' + recid +
      '&c=1&slice=1&getparts=true&size=1000&flag_root=withroot';
    inFlight[part] = fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var by = {};
      (j.products || []).forEach(function (p) {
        var a = (p.externalid || '').trim();
        if (a) by[a] = p;
      });
      editionsCache[part] = by;
      return by;
    }).catch(function () { editionsCache[part] = {}; return {}; });
    return inFlight[part].then(function (by) { return by[article] || null; });
  }

  function sizeOf(edition) {
    return edition['Размер'] || edition['размер'] || edition.size || '';
  }

  // Форма позиции — как у Тильды: uid и inv берём у выбранного размера.
  function addToCart(product, edition) {
    var m = String(product.url || '').match(/tproduct\/(\d+)-/);
    var options = [];
    ['Размер', 'Цвет'].forEach(function (k) {
      if (edition[k]) options.push({ option: k, variant: edition[k] });
    });
    var price = num(edition.price) || num(product.price);
    var item = {
      name: product.title,
      price: price,
      img: (product.gallery && JSON.parse(product.gallery)[0] || {}).img || '',
      recid: m ? m[1] : '',
      lid: String(edition.uid),
      pack_label: product.pack_label || 'lwh',
      pack_m: String(product.pack_m || '0'),
      pack_x: String(product.pack_x || '0'),
      pack_y: String(product.pack_y || '0'),
      pack_z: String(product.pack_z || '0'),
      part_uids: (function () {
        try { return JSON.parse(product.partuids).map(String); } catch (e) { return []; }
      })(),
      gen_uid: String(product.uid),
      url: product.url,
      options: options,
      sku: edition.sku,
      uid: String(edition.uid),
      inv: parseInt(edition.quantity, 10) || 0,
      quantity: 1,
      amount: price
    };
    if (typeof window.tcart__addProduct !== 'function') return;
    window.tcart__addProduct(item);

    // tcart__addProduct кладёт позицию в объект корзины, но открытую страницу
    // заказа не перерисовывает: сумма и полоса доставки менялись, а список
    // «Ваш заказ» оставался прежним. Дёргаем ту же цепочку, что Тильда зовёт
    // при изменении количества.
    ['tcart__updateTotalProductsinCartObj', 'tcart__saveLocalObj',
     'tcart__reDrawProducts', 'tcart__reDrawTotal', 'tcart__reDrawCartIcon',
     'tcart__addEvents__forProducts'].forEach(function (fn) {
      try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
    });
    lastKey = '';   // состав корзины изменился — пересобрать подборку
  }

  function rowHtml(cand, product, editions, gap) {
    var sizes = editions.map(function (e) {
      var q = parseInt(e.quantity, 10) || 0;
      return '<button type="button" class="uf-xs-sz" data-sku="' + esc(e.sku) + '"' +
        (q > 0 ? '' : ' disabled') + '>' + esc(sizeOf(e)) + '</button>';
    }).join('');
    var price = num(cand.price);
    var hint = (gap > 0 && price >= gap) ? '<span class="uf-xs-free">доставка станет бесплатной</span>' : '';
    return '<div class="uf-xs-row" data-article="' + esc(product.externalid) + '">' +
      '<img class="uf-xs-img" src="' + esc(cand.image) + '" alt="">' +
      '<div class="uf-xs-body">' +
        '<p class="uf-xs-nm">' + esc(cand.name) + '</p>' +
        '<p class="uf-xs-pr">' + money(price) +
          (cand.oldPrice ? '<s>' + money(num(cand.oldPrice)) + '</s>' : '') + hint + '</p>' +
        '<div class="uf-xs-sizes">' + sizes + '</div>' +
      '</div></div>';
  }

  function build() {
    if (busy) return;
    var host = document.querySelector('.t706__cartpage_showed .t706__cartpage-products') ||
               document.querySelector('.t706__cartpage-products');
    if (!host) return;
    // На шаге оплаты блок не показываем — ничего не должно мелькать у платежа.
    // Шаг берём у самого шагомера: искать слово «оплата» в тексте колонки
    // нельзя, там есть строка «бесплатная доставка при оплате на сайте».
    var step = document.querySelector('.uf-checkout-stepper__item.is-active');
    var payStep = !!step && /оплат/i.test(step.textContent || '');
    var existing = document.getElementById('uf-xs');
    var c = cart();
    var products = c.products || [];
    if (!products.length || payStep) { if (existing) existing.remove(); lastKey = ''; return; }

    // порог в ключе: после входа в клуб или галочки «примерка» блок перерисуется
    var key = products.map(function (p) { return p.sku + 'x' + p.quantity; }).join('|') + '#' + freeShipping();
    if (key === lastKey && existing) return;

    busy = true;
    loadData().then(function (d) {
      var outfits = d.outfits || {};
      var known = Object.keys(outfits);
      var inCartArticles = {};
      products.forEach(function (p) {
        var a = articleOf(p.sku, known);
        if (a) inCartArticles[a] = 1;
        Object.keys(d.store_map || {}).forEach(function (k) {
          if (String(p.sku || '').indexOf(k) === 0) inCartArticles[k] = 1;
        });
      });

      // кандидаты всех позиций корзины, без того, что уже в корзине
      var picked = [], seen = {};
      products.forEach(function (p) {
        var art = articleOf(p.sku, known);
        if (!art || !outfits[art]) return;
        outfits[art].forEach(function (cand) {
          if (seen[cand.url]) return;
          seen[cand.url] = 1;
          // уже лежащее в корзине предлагать незачем
          var a = urlToArticle[cand.url];
          if (a && inCartArticles[a]) return;
          picked.push(cand);
        });
      });
      if (!picked.length) { if (existing) existing.remove(); lastKey = key; busy = false; return; }

      var total = num(c.prodamount || c.amount || 0);
      var limit = freeShipping();
      var gap = limit > 0 ? limit - total : 0;

      // если до бесплатной доставки немного — вперёд идут те, кто её закрывает
      if (gap > 0) {
        picked.sort(function (a, b) {
          var ca = num(a.price) >= gap ? 0 : 1, cb = num(b.price) >= gap ? 0 : 1;
          return ca - cb || num(a.price) - num(b.price);
        });
      }
      picked = picked.slice(0, MAX);

      Promise.all(picked.map(function (cand) {
        var art = urlToArticle[cand.url] || null;
        return (art ? loadEditions(art) : Promise.resolve(null)).then(function (prod) {
          return { cand: cand, product: prod };
        });
      })).then(function (rows) {
        rows = rows.filter(function (r) {
          return r.product && (r.product.editions || []).some(function (e) {
            return (parseInt(e.quantity, 10) || 0) > 0;
          });
        });
        if (!rows.length) { if (existing) existing.remove(); lastKey = key; busy = false; return; }

        var head = (gap > 0 && rows.some(function (r) { return num(r.cand.price) >= gap; }))
          ? '<p class="uf-xs-t">До бесплатной доставки — ' + money(gap) + '</p>'
          : '<p class="uf-xs-t">Добавить к заказу</p>';

        var html = '<div id="uf-xs" class="uf-xs">' + head +
          rows.map(function (r) {
            return rowHtml(r.cand, r.product, r.product.editions || [], gap);
          }).join('') + '</div>';

        if (existing) existing.remove();
        host.insertAdjacentHTML('afterend', html);
        lastKey = key;

        document.querySelectorAll('#uf-xs .uf-xs-sz').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var art = btn.closest('.uf-xs-row').getAttribute('data-article');
            var row = rows.filter(function (r) { return r.product.externalid === art; })[0];
            if (!row) return;
            var ed = (row.product.editions || []).filter(function (e) {
              return e.sku === btn.getAttribute('data-sku');
            })[0];
            if (ed) addToCart(row.product, ed);
          });
        });
        busy = false;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
  // корзина открывается и пересобирается динамически — следим за деревом
  var t = null;
  new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(build, 350);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

// ============================================================
// UNFADED ACCESS SYSTEM — списание CREDITS в корзине (задача E1.6, 27.09.2026)
//
// Как это выглядит для покупательницы:
// 1) в корзине она открывает «Списать CREDITS» и вводит свой телефон;
// 2) если номер в клубе, бот @unfaded_club_bot присылает код. Ответ сервиса
//    одинаковый для всех — по номеру нельзя узнать, состоит ли человек в клубе;
// 3) после кода видно баланс и сколько можно списать в этом заказе;
// 4) «Списать» — сервис бронирует баллы на 30 минут и выдаёт промокод
//    CREDITS-XXXXXX, мы применяем его в поле промокода Тильды: так скидка
//    доходит до RetailCRM вместе с заказом.
//
// Заодно у участницы свой порог бесплатной доставки: сервис выдаёт подписанный
// пропуск, мы подкладываем его в запрос расчёта доставки, а delivery-calc
// проверяет подпись сам.
//
// Откат: удалить этот блок и стили .uf-cr в brand-style.css.
// ============================================================
(function () {
  'use strict';

  var API = 'https://unfaded-app-api.onrender.com';
  var DEFAULT_FREE_FROM = 30000;

  // Состояние живёт только в этой вкладке: ничего не храним в localStorage,
  // чтобы чужой человек за тем же компьютером не увидел чужой баланс.
  var state = { token: null, pass: null, freeFrom: DEFAULT_FREE_FROM, applied: 0, promo: null };
  window.UF_ACCESS = state;

  function rub(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '\u00A0RUB';
  }
  function cr(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function post(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.detail || 'Сервис недоступен, попробуйте позже');
        return data;
      });
    });
  }

  function cartItems() {
    var c = window.tcart;
    if (!c || !c.products) return [];
    return c.products.map(function (p) {
      // Цена нужна сервису клуба: у вещи из архива тот же артикул, что у основной карточки
      return { sku: String(p.sku || p.externalid || ''), quantity: parseInt(p.quantity, 10) || 1,
               price: parseFloat(p.price) || null };
    });
  }

  // --- пропуск на бесплатную доставку подкладываем в запрос расчёта ---

  function withPass(url) {
    if (!state.pass || !/delivery-calc/.test(String(url))) return url;
    if (String(url).indexOf('loyalty_pass=') !== -1) return url;
    return url + (String(url).indexOf('?') === -1 ? '?' : '&') + 'loyalty_pass=' + encodeURIComponent(state.pass);
  }

  var xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = withPass(url);
    return xhrOpen.apply(this, args);
  };
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string') input = withPass(input);
      return origFetch.call(this, input, init);
    };
  }

  // --- вёрстка блока ---

  // Один блок на корзину, содержимое меняется по шагам:
  // intro → phone → code → amount → done. Макет утверждён 29.09.
  function build(info, totals) {
    var box = document.createElement('div');
    box.className = 'uf-cr';
    box.innerHTML =
      '<div class="uf-cr__title">CREDITS · клуб UNFADED</div>' +
      '<div class="uf-cr__step uf-cr__step_intro">' +
        '<p class="uf-cr__text">Спишите баллы в счёт заказа <span>— до&nbsp;30% стоимости товаров.</span></p>' +
        '<button type="button" class="uf-cr__link uf-cr__open">Списать CREDITS</button>' +
        '<p class="uf-cr__join">Ещё не в клубе? Вступите в <a href="https://t.me/unfaded_club_bot?start=checkout" target="_blank" rel="noopener">@unfaded_club_bot</a> — 1&nbsp;000&nbsp;CREDITS на следующую покупку.</p>' +
      '</div>' +
      '<div class="uf-cr__step uf-cr__step_phone" hidden>' +
        '<label class="uf-cr__label" for="uf-cr-phone">Телефон, который вы указали в клубе</label>' +
        '<div class="uf-cr__line">' +
          '<input id="uf-cr-phone" class="uf-cr__input" type="tel" inputmode="tel" placeholder="+7 999 000-00-00" autocomplete="tel">' +
          '<button type="button" class="uf-cr__btn uf-cr__btn_code">Получить код</button>' +
        '</div>' +
        '<div class="uf-cr__note">Код придёт в бот @unfaded_club_bot.</div>' +
      '</div>' +
      '<div class="uf-cr__step uf-cr__step_code" hidden>' +
        '<label class="uf-cr__label" for="uf-cr-code">Код из Telegram</label>' +
        '<div class="uf-cr__line">' +
          '<input id="uf-cr-code" class="uf-cr__input uf-cr__input_code" type="text" inputmode="numeric" maxlength="4" placeholder="0000" autocomplete="one-time-code">' +
          '<button type="button" class="uf-cr__btn uf-cr__btn_verify">Подтвердить</button>' +
        '</div>' +
        '<div class="uf-cr__note">Действует 5 минут. <button type="button" class="uf-cr__link uf-cr__link_small uf-cr__back">Другой номер</button></div>' +
      '</div>' +
      '<div class="uf-cr__step uf-cr__step_amount" hidden>' +
        '<div class="uf-cr__balance"><span>На балансе</span><b></b></div>' +
        '<div class="uf-cr__line">' +
          '<input id="uf-cr-amount" class="uf-cr__input" type="number" inputmode="numeric" min="0" step="1" aria-label="Сколько CREDITS списать">' +
          '<button type="button" class="uf-cr__btn uf-cr__btn_apply">Списать</button>' +
        '</div>' +
        '<div class="uf-cr__note uf-cr__limit"></div>' +
      '</div>' +
      '<div class="uf-cr__step uf-cr__step_done" hidden>' +
        '<div class="uf-cr__done"></div>' +
        '<button type="button" class="uf-cr__link uf-cr__link_small uf-cr__cancel">Отменить</button>' +
      '</div>' +
      '<div class="uf-cr__msg" aria-live="polite"></div>';
    info.insertBefore(box, totals);
    return box;
  }

  function show(box, step) {
    ['intro', 'phone', 'code', 'amount', 'done'].forEach(function (name) {
      var el = box.querySelector('.uf-cr__step_' + name);
      if (el) el.hidden = name !== step;
    });
  }

  function say(box, text, kind) {
    var msg = box.querySelector('.uf-cr__msg');
    msg.textContent = text || '';
    msg.className = 'uf-cr__msg' + (kind ? ' uf-cr__msg_' + kind : '');
  }

  function busy(btn, on) {
    btn.disabled = !!on;
    btn.classList.toggle('uf-cr__btn_busy', !!on);
  }

  // Промокод списания применяем через поле Тильды — так он доходит до RetailCRM.
  function applyPromo(code) {
    var input = document.querySelector('.t-input-group_pc input.t-inputpromocode');
    var btn = document.querySelector('.t-input-group_pc .t-inputpromocode__btn');
    var mine = document.querySelector('.uf-co2-promo__input');
    if (mine) mine.value = code;
    if (!input || !btn) return false;
    input.value = code;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    btn.click();
    return true;
  }

  // Снимаем промокод списания из корзины Тильды — у неё нет своей функции
  // для этого, поэтому убираем его из объекта корзины и перерисовываем итог.
  function removePromo() {
    var c = window.tcart;
    if (c && c.promocode) delete c.promocode;
    ['.t-input-group_pc input.t-inputpromocode', '.uf-co2-promo__input'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.value = '';
    });
    try {
      if (typeof window.tcart__updateTotalProductsinCartObj === 'function') window.tcart__updateTotalProductsinCartObj();
      if (typeof window.tcart__reDrawTotal === 'function') window.tcart__reDrawTotal();
      if (typeof window.tcart__saveLocalObj === 'function') window.tcart__saveLocalObj();
    } catch (e) {}
  }

  function wire(box) {
    var phone = box.querySelector('#uf-cr-phone');
    var code = box.querySelector('#uf-cr-code');
    var amount = box.querySelector('#uf-cr-amount');

    box.querySelector('.uf-cr__open').addEventListener('click', function () {
      say(box, '');
      show(box, 'phone');
      phone.focus();
    });

    box.querySelector('.uf-cr__back').addEventListener('click', function () {
      state.token = null;
      code.value = '';
      say(box, '');
      show(box, 'phone');
      phone.focus();
    });

    box.querySelector('.uf-cr__btn_code').addEventListener('click', function () {
      var btn = this;
      var digits = (phone.value || '').replace(/\D/g, '');
      if (digits.length < 10) { say(box, 'Проверьте номер телефона', 'err'); phone.focus(); return; }
      busy(btn, true);
      say(box, '');
      post('/club/checkout/code', { phone: digits, cart: cartItems() }).then(function (data) {
        state.token = data.token;
        show(box, 'code');
        code.focus();
      }).catch(function (e) {
        say(box, e.message, 'err');
      }).then(function () { busy(btn, false); });
    });

    box.querySelector('.uf-cr__btn_verify').addEventListener('click', function () {
      var btn = this;
      var value = (code.value || '').trim();
      if (!value) { code.focus(); return; }
      busy(btn, true);
      say(box, '');
      post('/club/checkout/verify', { token: state.token, code: value }).then(function (data) {
        state.pass = data.shipping_pass || null;
        state.freeFrom = typeof data.free_shipping_from === 'number' ? data.free_shipping_from : DEFAULT_FREE_FROM;
        document.dispatchEvent(new CustomEvent('uf:access-verified'));
        box.querySelector('.uf-cr__balance b').textContent = cr(data.balance) + ' CR';
        var line = box.querySelector('.uf-cr__step_amount .uf-cr__line');
        var limit = box.querySelector('.uf-cr__limit');
        show(box, 'amount');
        if (data.reason) {
          line.hidden = true;
          limit.textContent = data.reason;
          return;
        }
        line.hidden = false;
        limit.textContent = 'Лимит для этого заказа — ' + cr(data.max) + ' CR (' + data.cap_percent + '% товаров без скидки).';
        amount.max = data.max;
        amount.min = data.min;
        amount.value = data.max;
        amount.focus();
      }).catch(function (e) {
        say(box, e.message, 'err');
      }).then(function () { busy(btn, false); });
    });

    box.querySelector('.uf-cr__btn_apply').addEventListener('click', function () {
      var btn = this;
      var value = parseInt(amount.value, 10);
      if (!(value > 0)) { amount.focus(); return; }
      busy(btn, true);
      say(box, '');
      post('/club/checkout/apply', { token: state.token, amount: value }).then(function (data) {
        state.applied = data.discountsum;
        state.promo = data.promocode;
        var done = box.querySelector('.uf-cr__done');
        if (applyPromo(data.promocode)) {
          done.textContent = 'Списано ' + cr(data.discountsum) + ' CR — скидка уже в сумме.';
        } else {
          done.textContent = 'Списано ' + cr(data.discountsum) + ' CR. Введите код ' + data.promocode + ' в поле «Промокод».';
        }
        show(box, 'done');
      }).catch(function (e) {
        say(box, e.message, 'err');
      }).then(function () { busy(btn, false); });
    });

    box.querySelector('.uf-cr__cancel').addEventListener('click', function () {
      var btn = this;
      busy(btn, true);
      post('/club/checkout/cancel', { token: state.token }).catch(function () {
        // бронь всё равно снимется сама по сроку — корзину освобождаем в любом случае
      }).then(function () {
        removePromo();
        state.applied = 0;
        state.promo = null;
        amount.value = amount.max || '';
        say(box, '');
        show(box, 'amount');
        busy(btn, false);
      });
    });
  }

  // В итогах корзины строку скидки по нашему промокоду подписываем «CREDITS»,
  // а строки «Промокод: CREDITS-…» и «Сумма со скидкой» прячем — как в макете.
  function markCreditsRows() {
    var rows = document.querySelectorAll('.t706__cartpage .t706__cartpage-totals .t706__cartwin-totalamount-row');
    Array.prototype.forEach.call(rows, function (row) {
      var text = row.textContent.replace(/\s+/g, ' ').trim();
      var mine = !!state.promo;
      var kind = /^Промокод/.test(text) ? 'code'
        : /^Сумма со скидкой/.test(text) ? 'subtotal'
        : /^(Скидка|CREDITS)/.test(text) ? 'discount'
        : '';
      if (!kind) { row.removeAttribute('data-uf-cr'); return; }
      row.setAttribute('data-uf-cr', mine ? kind : 'promo');
      if (kind === 'discount') {
        var walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          var n = walker.currentNode;
          if (mine && /Скидка/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace('Скидка', 'CREDITS');
          else if (!mine && /CREDITS/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace('CREDITS', 'Скидка');
        }
      }
    });
  }

  // --- вещи из закрытого архива клуба: CREDITS на них не списываются ---
  // Сервис и так не даст списать на архив, но говорить об этом надо сразу, а не после кода.
  // Вещь из архива = артикул есть в разделе «Архив» и цена в корзине — цена архива
  // (у основной карточки тот же артикул, но другая цена).
  var ARCHIVE_URL = 'https://store.tildaapi.com/api/getproductslist/?storepartuid=491983923473' +
    '&recid=504309825&c=1&slice=1&getparts=false&size=500';
  var archivePrices = null, archiveLoading = false;

  function loadArchive() {
    if (archivePrices || archiveLoading) return;
    archiveLoading = true;
    fetch(ARCHIVE_URL).then(function (r) { return r.json(); }).then(function (d) {
      var map = {};
      (d.products || []).forEach(function (p) {
        var eds = p.editions;
        if (typeof eds === 'string') { try { eds = JSON.parse(eds); } catch (e) { eds = []; } }
        (eds && eds.length ? eds : [p]).forEach(function (e) {
          if (e.sku) map[e.sku] = parseFloat(String(e.price).replace(/\s/g, '')) || 0;
        });
      });
      archivePrices = map;
    }).catch(function () { archivePrices = {}; });
  }

  function archiveShare() {
    var items = cartItems();
    if (!items.length) return 'none';
    loadArchive();
    if (!archivePrices) return 'none';
    var n = items.filter(function (i) {
      return i.sku in archivePrices && Math.abs(archivePrices[i.sku] - (i.price || 0)) <= 1;
    }).length;
    return !n ? 'none' : n === items.length ? 'all' : 'some';
  }

  function markArchive(box) {
    var share = archiveShare();
    if (box.getAttribute('data-archive') === share) return;
    box.setAttribute('data-archive', share);
    var intro = box.querySelector('.uf-cr__step_intro');
    var note = intro.querySelector('.uf-cr__archive');
    if (!note) {
      note = document.createElement('p');
      note.className = 'uf-cr__text uf-cr__archive';
      intro.insertBefore(note, intro.firstChild);
    }
    var all = share === 'all';
    note.textContent = all ? 'CREDITS на вещи из архива не списываются.'
      : 'На вещи из архива CREDITS не списываются — лимит считается по остальным товарам.';
    note.hidden = share === 'none';
    Array.prototype.forEach.call(intro.querySelectorAll('.uf-cr__text:not(.uf-cr__archive), .uf-cr__open, .uf-cr__join'),
      function (el) { el.hidden = all; });
  }

  function mount() {
    var info = document.querySelector('.t706__cartpage-info-wrapper');
    var totals = info && info.querySelector('.t706__cartpage-totals');
    markCreditsRows();
    if (!info || !totals) return;
    var box = info.querySelector('.uf-cr');
    if (!box) { box = build(info, totals); wire(box); }
    markArchive(box);
  }

  document.addEventListener('DOMContentLoaded', mount);
  setInterval(mount, 1000);
})();

/*
 * «Скоро» + «Оформить предзаказ» (03.10.2026).
 * Список артикулов — ключ coming_soon в data.json: { "TC01FW26": { "date": "до 20 октября" } }.
 * Режим включается, только пока у товара НОЛЬ по всем размерам. Как только остаток из МойСклада
 * дошёл до Тильды — карточка сама становится обычной (плашка «Скоро» и предзаказ пропадают).
 * Работает поверх виджета из настроек сайта: меняет плашку «Нет в наличии» на «Скоро»,
 * кнопку «Узнать о поступлении» — на «Оформить предзаказ», а в RetailCRM уходит
 * «Предзаказ: АРТИКУЛ, размер …» через ту же форму. Оплаты нет — ссылку на оплату
 * отправляем, когда партия поступит.
 *
 * Дроп (03.10.2026, бэкенд клуба — unfaded-app-api, GET /drops/public): когда партия пришла и Лера
 * запустила ранний доступ, на сутки товар остаётся «скоро» для всех, а купить можно только по закрытой
 * ссылке ?early=код (её получают предзаказы и ARCHIVE/PRIVATE PASS). Код сверяем по хэшу и запоминаем
 * в браузере. Состояние «open» — карточка обычная. Бэкенд недоступен — работает как раньше (по остатку).
 */
(function () {
  var DATA_URL = 'https://raw.githubusercontent.com/unfadedbrand/unfaded-data/main/data.json';
  var DROPS_URL = 'https://unfaded-app-api.onrender.com/drops/public';
  var CLUB_URL = 'https://t.me/unfaded_club_bot?start=drop';
  var DEFAULT_TITLE = 'Мы оповестим вас, когда данный товар появится в наличии';
  var soon = null;
  var drops = {};
  var earlyOk = {};

  function loadDrops() {
    if (window.UF_DROPS_OVERRIDE) { drops = window.UF_DROPS_OVERRIDE; checkEarly(); return; }
    fetch(DROPS_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { drops = (d && d.items) || {}; checkEarly(); })
      .catch(function () { drops = {}; });
  }

  function sha256(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  // Закрытая ссылка ?early=код: сверяем с хэшем дропа и запоминаем, чтобы доступ не терялся при переходах.
  function checkEarly() {
    var code = null;
    try { code = new URLSearchParams(location.search).get('early'); } catch (e) {}
    Object.keys(drops).forEach(function (sku) {
      var d = drops[sku];
      if (!d || d.state !== 'early' || !d.early || !window.crypto || !crypto.subtle) return;
      var saved = null;
      try { saved = localStorage.getItem('uf_early_' + sku); } catch (e) {}
      [code, saved].filter(Boolean).forEach(function (c) {
        sha256(c).then(function (h) {
          if (h !== d.early) return;
          earlyOk[sku] = true;
          try { localStorage.setItem('uf_early_' + sku, c); } catch (e) {}
        });
      });
    });
  }

  function fmtOpen(iso) {
    try {
      var d = new Date(iso);
      var dd = ('0' + d.getDate()).slice(-2), mm = ('0' + (d.getMonth() + 1)).slice(-2);
      var hh = ('0' + d.getHours()).slice(-2), mi = ('0' + d.getMinutes()).slice(-2);
      return dd + '.' + mm + ' в ' + hh + ':' + mi;
    } catch (e) { return 'скоро'; }
  }

  function dropState(sku) { return (drops[sku] && drops[sku].state) || null; }

  function loadSoon() {
    if (window.UF_SOON_OVERRIDE) { soon = window.UF_SOON_OVERRIDE; return; }
    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { soon = (d && d.coming_soon) || {}; })
      .catch(function () { soon = {}; });
  }

  function getProduct() {
    var scripts = document.querySelectorAll('script:not([src])');
    for (var i = 0; i < scripts.length; i++) {
      var txt = scripts[i].textContent;
      if (txt.indexOf('t_store_productInit') === -1) continue;
      var m = txt.match(/var product\s*=\s*(\{[\s\S]*?\});/);
      if (m) { try { return JSON.parse(m[1]); } catch (e) {} }
    }
    return null;
  }

  function allZero(product) {
    var eds = product.editions || [];
    if (!eds.length) return false;
    return eds.every(function (e) { var q = parseInt(e.quantity, 10); return !(q > 0); });
  }

  function selectedSize() {
    var r = document.querySelector('.js-product-edition-option input[type="radio"]:checked');
    return r ? r.value : '';
  }

  function swapOutBadge(stack) {
    if (!stack) return;
    var out = stack.querySelector('.uf-badge_out');
    if (out) { out.className = 'uf-badge uf-badge_soon'; out.textContent = 'Скоро'; }
  }

  function ensureSoonBadge(stack) {
    if (!stack || stack.querySelector('.uf-badge_soon')) return;
    swapOutBadge(stack);
    if (stack.querySelector('.uf-badge_soon')) return;
    var low = stack.querySelector('.uf-badge_low');
    if (low) low.remove();
    var b = document.createElement('div');
    b.className = 'uf-badge uf-badge_soon';
    b.textContent = 'Скоро';
    stack.appendChild(b);
  }

  // Ранний доступ без закрытой ссылки: вместо «В корзину» — когда откроется для всех
  function applyEarlyLock(on, sku) {
    var wrap = document.querySelector('.t-store__prod-popup__btn-wrapper');
    var nativeBtn = wrap && wrap.querySelector('.t-store__prod-popup__btn');
    var lock = document.getElementById('uf-early-lock');
    if (!on) {
      if (lock) {
        lock.remove();
        if (nativeBtn) nativeBtn.style.display = '';
      }
      return;
    }
    ensureSoonBadge(document.getElementById('uf-badge-stack-prod'));
    var notify = document.getElementById('uf-notify');
    if (notify) notify.style.display = 'none';
    var oldNote = document.getElementById('uf-soon-note');
    if (oldNote) oldNote.remove();
    if (nativeBtn) nativeBtn.style.display = 'none';
    if (!wrap) return;
    var when = fmtOpen(drops[sku].open_at);
    if (!lock) {
      lock = document.createElement('div');
      lock.id = 'uf-early-lock';
      lock.className = 'uf-early-lock';
      wrap.appendChild(lock);
    }
    var html = '<div class="uf-early-lock__btn">Для всех — ' + when + '</div>' +
      '<div class="uf-soon-note">Сейчас ранний доступ: купить могут те, кто оформил предзаказ, и участницы ' +
      'ARCHIVE и PRIVATE PASS. <a href="' + CLUB_URL + '" target="_blank" rel="noopener">Клуб UNFADED</a></div>';
    if (lock.getAttribute('data-when') !== when) { lock.innerHTML = html; lock.setAttribute('data-when', when); }
  }

  // Карточка товара
  function applyPdp() {
    var product = getProduct();
    var sku = product && product.externalid;
    var entry = sku && soon[sku];
    var state = sku && dropState(sku);
    var locked = state === 'early' && !earlyOk[sku];
    applyEarlyLock(locked, sku);
    if (locked) { document.body.classList.add('uf-soon'); return; }
    var on = !!(entry && state !== 'open' && state !== 'early' && allZero(product));
    document.body.classList.toggle('uf-soon', on);
    var btn = document.getElementById('uf-notify');
    var note = document.getElementById('uf-soon-note');
    if (!on) {
      if (btn && btn.getAttribute('data-uf-soon')) { btn.textContent = 'Узнать о поступлении'; btn.removeAttribute('data-uf-soon'); }
      if (note) note.remove();
      return;
    }
    swapOutBadge(document.getElementById('uf-badge-stack-prod'));
    if (!btn) return;
    if (btn.textContent !== 'Оформить предзаказ') btn.textContent = 'Оформить предзаказ';
    btn.setAttribute('data-uf-soon', sku);
    var text = 'Старт продаж ' + (entry.date || 'скоро') + '. Напишем вам первой и отложим ваш размер на 24 часа — без предоплаты.';
    if (!note) {
      note = document.createElement('div');
      note.id = 'uf-soon-note';
      note.className = 'uf-soon-note';
    }
    if (note.textContent !== text) note.textContent = text;
    if (note.previousElementSibling !== btn) btn.insertAdjacentElement('afterend', note);
  }

  // Каталог: «Нет в наличии» → «Скоро» у артикулов из списка с нулевым остатком; в раннем доступе — «Скоро» всегда
  function applyCatalog() {
    var cards = document.querySelectorAll('.t-store__card');
    Array.prototype.forEach.call(cards, function (card) {
      var skuEl = card.querySelector('.t-store__card__sku');
      if (!skuEl) return;
      var text = skuEl.textContent.replace(/^\s*Артикул:\s*/i, '').trim();
      var inv = parseInt(card.getAttribute('data-product-inv'), 10);
      for (var sku in soon) {
        if (text.indexOf(sku) !== 0) continue;
        var state = dropState(sku);
        var stack = card.querySelector('.uf-badge-stack_cat');
        if (state === 'early' && !earlyOk[sku]) ensureSoonBadge(stack);
        else if (state !== 'open' && inv === 0) swapOutBadge(stack);
        return;
      }
    });
  }

  // Окно формы: заголовок, комментарий для RetailCRM и текст «спасибо»
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('#uf-notify');
    if (!btn) return;
    setTimeout(function () {
      var modal = document.getElementById('uf-notify-modal');
      if (!modal) return;
      var title = modal.querySelector('.uf-notify-modal__title');
      var sku = btn.getAttribute('data-uf-soon');
      if (sku) {
        var size = selectedSize();
        var product = getProduct();
        if (title) title.textContent = 'Предзаказ: оставьте контакты — напишем, как только партия поступит, и отложим ваш размер';
        modal.setAttribute('data-product', 'Предзаказ: ' + sku + (size ? ', размер ' + size : '') +
          (product && product.title ? ' — ' + product.title : ''));
        modal.setAttribute('data-uf-soon', '1');
      } else {
        if (title) title.textContent = DEFAULT_TITLE;
        modal.removeAttribute('data-uf-soon');
      }
    }, 0);
  }, true);

  // Заявка дублируется в бэкенд клуба (04.10.2026): форма Тильды доносит до RetailCRM только имя —
  // без товара, размера и телефона. Работает для «Оформить предзаказ» и «Узнать о поступлении».
  // Проверки — те же, что у виджета (почта и согласие), иначе заявка в Тильду тоже не уйдёт.
  var REQUESTS_URL = 'https://unfaded-app-api.onrender.com/drops/preorder';
  document.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('.uf-notify-modal__submit'))) return;
    var modal = document.getElementById('uf-notify-modal');
    if (!modal) return;
    // Телефон: поле в окне — копия маски Тильды, и маска в копии не заполняет скрытое поле-результат
    // (data-uf="phone"), откуда его берёт виджет, — телефон терялся и в RetailCRM, и здесь (04.10.2026).
    // Перед отправкой переносим набранный номер в поле-результат с кодом страны.
    var phoneWrap = modal.querySelector('.uf-notify-modal__phone-wrap');
    var phoneVisible = phoneWrap && phoneWrap.querySelector('.t-input-phonemask');
    var phoneResult = modal.querySelector('[data-uf="phone"]');
    if (phoneVisible && phoneResult && phoneResult !== phoneVisible && !phoneResult.value &&
        String(phoneVisible.value || '').replace(/\D/g, '').length >= 10) {
      var codeEl = phoneWrap.querySelector('.t-input-phonemask__select-code');
      phoneResult.value = ((codeEl && codeEl.textContent.trim()) || '+7') + ' ' + phoneVisible.value.trim();
    }
    var val = function (sel) { var el = modal.querySelector(sel); return el ? String(el.value || '').trim() : ''; };
    var email = val('[data-uf="email"]');
    var consent = modal.querySelector('[data-uf="consent"]');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !(consent && consent.checked)) return;
    var product = getProduct();
    if (!product || !product.externalid) return;
    var body = {
      kind: modal.getAttribute('data-uf-soon') ? 'preorder' : 'notify',
      sku: product.externalid,
      size: selectedSize() || null,
      name: val('[data-uf="name"]') || null,
      email: email,
      phone: val('[data-uf="phone"]') || null
    };
    try {
      fetch(REQUESTS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), keepalive: true }).catch(function () {});
    } catch (err) {}
  }, true);

  document.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('.uf-notify-modal__submit'))) return;
    setTimeout(function () {
      var modal = document.getElementById('uf-notify-modal');
      var msg = modal && modal.querySelector('.uf-notify-modal__msg');
      if (modal && modal.getAttribute('data-uf-soon') && msg && /^Спасибо/.test(msg.textContent)) {
        msg.textContent = 'Спасибо! Предзаказ оформлен — напишем, как только партия поступит.';
      }
    }, 0);
  });

  function tick() {
    if (soon === null) return;
    try { applyPdp(); } catch (e) {}
    try { applyCatalog(); } catch (e) {}
  }

  loadSoon();
  loadDrops();
  setInterval(tick, 700);
  setInterval(loadDrops, 5 * 60 * 1000);
})();

/*
 * «Дополните образ» на карточках без табов (03.10.2026). Виджет из настроек сайта ставит блок
 * под табы; если табов у товара нет — сразу под ценой, и он растягивается тёмной полосой
 * посередине карточки (так было на топе «Heartbreaker»). Переносим блок туда же, где он стоит
 * у товаров с табами: последним в контейнере карточки.
 */
(function () {
  function placeOutfit() {
    var block = document.getElementById('uf-outfit-standalone');
    if (!block) return;
    var hasTabs = Array.prototype.some.call(document.querySelectorAll('.t-store__tabs'),
      function (t) { return t.offsetParent !== null; });
    if (hasTabs) return;
    var info = document.querySelector('.t-store__prod-popup__info');
    var container = info && info.closest('.t-container');
    if (!container || container.lastElementChild === block) return;
    block.classList.add('t-col', 't-col_12');
    container.appendChild(block);
  }
  setInterval(function () { try { placeOutfit(); } catch (e) {} }, 700);
})();

// --- Закрытый архив клуба: проверка наличия перед оформлением заказа ---
// Карточки архива — копии основных в Тильде; их остатки синхронизация с МоимСкладом не
// обновляет. Поэтому, если в корзине вещь из архива, перед «Оформить заказ» спрашиваем
// сервис клуба: он смотрит живой остаток в МоёмСкладе и не даёт продать то, чего нет.
// Обычные заказы (без вещей архива) не задерживаем: сервис даже не вызываем.
(function () {
  var API = 'https://unfaded-app-api.onrender.com';
  var ARCHIVE_PART = '491983923473';
  var LIST_URL = 'https://store.tildaapi.com/api/getproductslist/?storepartuid=' + ARCHIVE_PART +
    '&recid=504309825&c=1&slice=1&getparts=false&size=500';
  var cache = { at: 0, map: null };
  var approved = null;

  function num(v) { return parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')) || 0; }

  // артикул размера → цена в архиве (публичные данные раздела «Архив»)
  function archiveMap() {
    if (cache.map && Date.now() - cache.at < 10 * 60 * 1000) return Promise.resolve(cache.map);
    return fetch(LIST_URL).then(function (r) { return r.json(); }).then(function (d) {
      var map = {};
      (d.products || []).forEach(function (p) {
        var eds = p.editions;
        if (typeof eds === 'string') { try { eds = JSON.parse(eds); } catch (e) { eds = []; } }
        (eds && eds.length ? eds : [p]).forEach(function (e) {
          if (e.sku || e.externalid) map[e.sku || e.externalid] = num(e.price);
        });
      });
      cache = { at: Date.now(), map: map };
      return map;
    });
  }

  function cartItems() {
    var c = window.tcart;
    if (!c || !c.products) return [];
    return c.products.map(function (p) {
      return { sku: String(p.sku || p.externalid || ''), quantity: parseInt(p.quantity, 10) || 1,
               price: num(p.price), name: p.name || '' };
    });
  }

  function hasArchive(items, map) {
    return items.some(function (i) { return map[i.sku] && Math.abs(map[i.sku] - i.price) <= 1; });
  }

  function signature(items) {
    return items.map(function (i) { return i.sku + 'x' + i.quantity + '@' + i.price; }).join('|');
  }

  function showMessage(btn, text) {
    var holder = btn.closest('.t-form__submit') || btn.parentElement;
    var box = holder.parentElement.querySelector('.uf-archive-msg');
    if (!box) {
      box = document.createElement('div');
      box.className = 'uf-archive-msg';
      box.style.cssText = 'margin:10px 0;padding:10px 12px;background:#FBEAEA;color:#7A1F2A;font-size:14px;line-height:1.4';
      holder.parentElement.insertBefore(box, holder);
    }
    box.textContent = text;
    box.hidden = !text;
  }

  function soldOutText(items, skus, message) {
    var names = items.filter(function (i) { return skus.indexOf(i.sku) !== -1; })
      .map(function (i) { return i.name; });
    return names.length
      ? message + ' ' + names.join(', ') + ' — уберите из корзины, чтобы оформить остальное.'
      : message;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.t706 .t-form__submit .t-submit, .t706 .t-submit');
    if (!btn) return;
    var items = cartItems();
    if (!items.length) return;
    var sig = signature(items);
    if (approved === sig) { approved = null; return; }  // повторный клик после проверки — пропускаем
    e.preventDefault();
    e.stopImmediatePropagation();
    showMessage(btn, '');
    archiveMap().catch(function () { return null; }).then(function (map) {
      if (map && !hasArchive(items, map)) return { ok: true };  // обычный заказ
      btn.classList.add('t-btn_sending');
      return fetch(API + '/club/archive/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: items.map(function (i) { return { sku: i.sku, quantity: i.quantity, price: i.price }; }) })
      }).then(function (r) { return r.json(); }).catch(function () {
        // сервис не ответил: вещи архива не продаём вслепую, обычные заказы — пропускаем
        return map ? { ok: false, sold_out: [], message: 'Не удалось проверить наличие. Попробуйте через минуту.' } : { ok: true };
      });
    }).then(function (res) {
      btn.classList.remove('t-btn_sending');
      if (res && res.ok) {
        approved = sig;
        btn.click();
        return;
      }
      showMessage(btn, soldOutText(items, (res && res.sold_out) || [], (res && res.message) || 'Не удалось проверить наличие.'));
    });
  }, true);
})();

// --- Закрытый архив клуба: раскупленные размеры на странице товара ---
// Остатки карточек архива в Тильде статичны. На странице товара архива спрашиваем сервис клуба
// (живой остаток МоегоСклада минус брони) и размер, которого больше нет, делаем серым —
// так же, как Тильда показывает размер с нулевым остатком. Заказ всё равно защищён проверкой
// в корзине (блок выше). Сервис не ответил — страницу не трогаем.
(function () {
  var m = location.pathname.match(/\/tproduct\/\d+-(\d+)-/);
  if (!m) return;
  var uid = m[1];
  var API = 'https://unfaded-app-api.onrender.com';
  var LIST_URL = 'https://store.tildaapi.com/api/getproductslist/?storepartuid=491983923473' +
    '&recid=504309825&c=1&slice=1&getparts=false&size=500';

  function sizeSkus() {
    return fetch(LIST_URL).then(function (r) { return r.json(); }).then(function (d) {
      var p = (d.products || []).filter(function (x) { return String(x.uid) === uid; })[0];
      if (!p) return null;  // не архив
      var eds = p.editions;
      if (typeof eds === 'string') { try { eds = JSON.parse(eds); } catch (e) { eds = []; } }
      var bySize = {};
      (eds || []).forEach(function (e) {
        if (e['Размер'] && (e.sku || e.externalid)) {
          (bySize[e['Размер']] = bySize[e['Размер']] || []).push(e.sku || e.externalid);
        }
      });
      return bySize;
    });
  }

  function apply(bySize, stock) {
    document.querySelectorAll('.t-product__option-item').forEach(function (label) {
      var skus = bySize[(label.textContent || '').trim()];
      if (!skus) return;
      var gone = skus.every(function (s) { return s in stock && stock[s] <= 0; });
      if (gone) label.classList.add('t-product__option-item_disabled');
    });
  }

  sizeSkus().then(function (bySize) {
    if (!bySize) return;
    return fetch(API + '/club/archive/stock', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (stock) {
        if (!stock) return;
        apply(bySize, stock);
        // Тильда перерисовывает варианты при выборе цвета/размера — повторяем
        document.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('.t-product__option')) {
            setTimeout(function () { apply(bySize, stock); }, 0);
          }
        });
      });
  }).catch(function () {});
})();

// ============================================================
// UNFADED — промокоды с условиями (UNFD1000, 06.10.2026)
//
// У промокодов Тильды нет ни минимальной суммы, ни ограничения «только первый
// заказ». UNFD1000 (−1000 ₽) действует от 7 000 ₽ товаров и только на первый
// заказ, поэтому:
// а) «Применить» с UNFD1000 при сумме товаров меньше порога — не применяем,
//    пишем условие под полем промокода;
// б) «Оформить заказ» с применённым UNFD1000 — сначала спрашиваем сервер
//    заказов (POST delivery.unfadedstore.com/promo/check: есть ли у клиентки
//    с этим телефоном/e-mail заказы в RetailCRM, кроме отменённых). Ответ
//    ok:false — снимаем промокод, пересчитываем итог, показываем причину и
//    заказ не отправляем. Ответ ok:true, сервер не ответил или ошибка сети —
//    оформляем как обычно (заказ важнее);
// в) состав корзины изменился и сумма товаров упала ниже порога — снимаем
//    промокод с сообщением.
//
// Список кодов и порог дублируют PromoRules::RULES на сервере
// (unfaded-delivery-calc, src/Service/PromoRules.php) — менять в обоих местах.
//
// Перехват — на window в фазе захвата: срабатывает раньше обработчиков Тильды
// и раньше проверки архива клуба (она висит на document).
// Откат: удалить этот блок — промокод снова будет работать без условий.
// ============================================================
(function () {
  'use strict';
  if (window.__ufPromoRulesInit) return;  // файл подключён дважды — второй раз не запускаем
  window.__ufPromoRulesInit = true;

  var API = 'https://delivery.unfadedstore.com/promo/check';
  var PROMO_RULES = {
    UNFD1000: { minAmount: 7000, firstOrderOnly: true }
  };
  var CHECK_TIMEOUT_MS = 7000;           // дольше покупательницу на кнопке не держим
  var APPROVAL_TTL_MS = 2 * 60 * 1000;   // проверенный заказ повторно не проверяем
  var SUBMIT_SEL = '.t706 .t-form__submit .t-submit, .t706 .t-submit, .t706 .t-form [type="submit"]';

  var pending = false;
  var approved = null;  // { sig, at }

  function norm(code) { return String(code == null ? '' : code).trim().toUpperCase(); }
  function rule(code) {
    code = norm(code);
    return Object.prototype.hasOwnProperty.call(PROMO_RULES, code) ? PROMO_RULES[code] : null;
  }
  function rub(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function minText(code, min) { return 'Промокод ' + code + ' действует на заказ от ' + rub(min) + ' ₽'; }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function call(name) {
    try { if (typeof window[name] === 'function') window[name](); } catch (e) { /* не ломаем корзину */ }
  }

  function cart() { return window.tcart && typeof window.tcart === 'object' ? window.tcart : null; }
  function goodsAmount() { var c = cart(); return c ? (parseFloat(c.prodamount) || 0) : 0; }

  // Применённый код. Обычно он в tcart.promocode; если скидки корзины выгоднее
  // промокода, Тильда прячет его в cartCalculator.appliedPromocode.
  function appliedCode() {
    var c = cart();
    var p = c && c.promocode;
    if (p && typeof p === 'object' && p.promocode) return norm(p.promocode);
    var calc = window.cartCalculator;
    var a = calc && calc.appliedPromocode;
    if (a && typeof a === 'object' && a.promocode) return norm(a.promocode);
    return '';
  }

  // --- поле промокода ---
  // После применения Тильда заменяет содержимое .t-inputpromocode__wrapper
  // текстом «Промокод … активирован», поле и кнопка пропадают. Своей функции
  // «снять промокод» у неё нет, поэтому заранее запоминаем сами узлы поля
  // (с обработчиками Тильды и ссылками Checkout v2 на них) и при снятии
  // возвращаем их на место.
  function wrappers() { return qa('.t706 .t-inputpromocode__wrapper'); }
  function snapshot(w) {
    if (w && w.querySelector('.t-inputpromocode')) w.__ufPromoNodes = Array.prototype.slice.call(w.childNodes);
  }
  function restoreField(w) {
    var nodes = w.__ufPromoNodes;
    if (nodes && nodes.length && !w.querySelector('.t-inputpromocode')) {
      while (w.firstChild) w.removeChild(w.firstChild);
      nodes.forEach(function (n) { w.appendChild(n); });
    }
    var input = w.querySelector('.t-inputpromocode');
    if (input) input.value = '';  // иначе Тильда не даст оформить: «Активируйте промокод или очистите поле»
    var group = w.closest ? w.closest('.t-input-group') : null;
    var title = group && group.querySelector('.t-input-title');
    if (title) title.style.visibility = '';
  }

  // Сообщение под полем промокода: и у поля Тильды, и у поля Checkout v2
  // (поле Тильды в Checkout v2 скрыто, показываем в обоих).
  function showPromoMessage(text) {
    wrappers().forEach(function (w) {
      var group = (w.closest && w.closest('.t-input-group')) || w.parentElement;
      var err = group && group.querySelector('.t-input-error');
      if (err) {
        err.textContent = text;
        err.style.display = text ? 'block' : '';
      }
    });
    qa('.uf-co2-promo__msg').forEach(function (m) { m.textContent = text; });
  }

  // Сообщение над кнопкой «Оформить заказ» — оформлено как у проверки архива клуба.
  function showSubmitMessage(btn, text) {
    var holder = (btn && (btn.closest('.t-form__submit') || btn.parentElement)) || null;
    if (!holder || !holder.parentElement) return;
    var box = holder.parentElement.querySelector('.uf-promo-msg');
    if (!box) {
      if (!text) return;
      box = document.createElement('div');
      box.className = 'uf-promo-msg';
      box.setAttribute('aria-live', 'polite');
      box.style.cssText = 'margin:10px 0;padding:10px 12px;background:#FBEAEA;color:#7A1F2A;font-size:14px;line-height:1.4';
      holder.parentElement.insertBefore(box, holder);
    }
    box.textContent = text;
    box.hidden = !text;
  }

  function removePromo(text) {
    var c = cart();
    if (c && c.promocode) delete c.promocode;
    var calc = window.cartCalculator;
    if (calc && calc.appliedPromocode) calc.appliedPromocode = undefined;
    wrappers().forEach(restoreField);
    qa('.uf-co2-promo__input').forEach(function (i) { i.value = ''; });
    // пересчёт итога — тот же набор, что Тильда вызывает после применения кода
    call('tcart__updateTotalProductsinCartObj');
    call('tcart__reDrawTotal');
    call('tcart__saveLocalObj');
    approved = null;
    showPromoMessage(text);
  }

  // --- а) «Применить» ---
  window.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.t-inputpromocode__btn');
    if (!btn) return;
    var w = btn.closest('.t-inputpromocode__wrapper');
    snapshot(w);
    var input = w && w.querySelector('.t-inputpromocode');
    var code = norm(input && input.value);
    var r = rule(code);
    if (!r) return;
    showPromoMessage('');
    if (r.minAmount && goodsAmount() < r.minAmount) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showPromoMessage(minText(code, r.minAmount));
    }
  }, true);

  // --- б) «Оформить заказ» ---
  function fieldValue(form, selectors) {
    if (!form) return '';
    for (var i = 0; i < selectors.length; i++) {
      var els = form.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        var v = String(els[j].value || '').trim();
        if (v) return v;
      }
    }
    return '';
  }
  var PHONE_SEL = ['.js-phonemask-result', 'input[name="Phone"]', 'input[name="phone"]', 'input[type="tel"]'];
  var EMAIL_SEL = ['input[name="Email"]', 'input[name="email"]', 'input[data-tilda-rule="email"]', 'input[type="email"]'];

  function check(data) {
    var body = Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }).join('&');
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer;
    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
        resolve({ ok: true, degraded: true });
      }, CHECK_TIMEOUT_MS);
    });
    // form-urlencoded — «простой» запрос, без предварительного OPTIONS
    var req = fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: body,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json();
    }).catch(function () {
      return { ok: true, degraded: true };  // сеть/сервер упали — не мешаем заказу
    });
    return Promise.race([req, timeout]).then(function (res) {
      clearTimeout(timer);
      return res && typeof res === 'object' ? res : { ok: true, degraded: true };
    });
  }

  window.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest(SUBMIT_SEL);
    if (!btn) return;
    var code = appliedCode();
    var r = rule(code);
    if (!r) { showSubmitMessage(btn, ''); return; }  // промокод уже снят — старое сообщение убираем
    if (pending) {  // проверка уже идёт — второй клик гасим
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (btn.classList.contains('t706__submit_disable')) return;  // Тильда сама не отправит

    var amount = goodsAmount();
    if (r.minAmount && amount < r.minAmount) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var t = minText(code, r.minAmount) + '. Промокод снят, итог пересчитан.';
      removePromo(t);
      showSubmitMessage(btn, t);
      return;
    }
    if (!r.firstOrderOnly) return;

    var form = btn.closest('form') || document.querySelector('.t706 .t-form');
    var phone = fieldValue(form, PHONE_SEL);
    var email = fieldValue(form, EMAIL_SEL);
    if (!phone && !email) return;  // контактов нет — Тильда сама попросит их заполнить

    var sig = [code, amount, phone.replace(/\D+/g, ''), email.toLowerCase()].join('|');
    if (approved && approved.sig === sig && Date.now() - approved.at < APPROVAL_TTL_MS) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    pending = true;
    btn.classList.add('t-btn_sending');
    showSubmitMessage(btn, '');

    check({ code: code, amount: amount, phone: phone, email: email }).then(function (res) {
      pending = false;
      btn.classList.remove('t-btn_sending');
      if (res.ok === false) {
        var t = (res.message || 'Промокод ' + code + ' не подходит к этому заказу') + '. Промокод снят, итог пересчитан.';
        removePromo(t);
        showSubmitMessage(btn, t);
        return;
      }
      approved = { sig: sig, at: Date.now() };
      btn.click();  // исходная отправка — один раз, с уже одобренной подписью
    });
  }, true);

  // --- в) состав корзины изменился ---
  // Тильда пересчитывает корзину без событий, на которые можно надёжно
  // подписаться, поэтому лёгкий опрос (как и в Checkout v2 выше).
  setInterval(function () {
    try {
      wrappers().forEach(snapshot);
      var code = appliedCode();
      var r = rule(code);
      if (!r || !r.minAmount) return;
      var c = cart();
      if (!c || !c.products) return;
      if (goodsAmount() < r.minAmount) {
        var t = minText(code, r.minAmount) + '. Промокод снят, итог пересчитан.';
        removePromo(t);
        var btn = document.querySelector(SUBMIT_SEL);
        if (btn) showSubmitMessage(btn, t);
      }
    } catch (e) { /* не ломаем корзину */ }
  }, 800);
})();

/*
 * UNFADED — фильтры каталога по утверждённому макету (2026-10-07):
 * компьютер — «вариант А» (фильтры строкой над сеткой, сетка 4 в ряд),
 * телефон — «список» (чипы разделов, липкая строка «Фильтры | Сортировка»,
 * панель фильтров снизу).
 *
 * Область действия — ТОЛЬКО страницы каталога, где есть наш <h1 class="uf-cat-h1">
 * (17 страниц разделов). Главная, /archive, страница товара, «Дополните образ» —
 * не затрагиваются: без .uf-cat-h1 код ничего не делает.
 *
 * Логику фильтрации Тильды НЕ переписываем. Родная панель Тильды (ST320N, .t951)
 * остаётся в DOM, только спрятана CSS-ом; наши кнопки ставят/снимают её чекбоксы,
 * меняют её поля цены и её <select> сортировки и шлют штатное событие change —
 * дальше Тильда сама делает запрос, перерисовывает сетку, обновляет URL.
 * Каждый change Тильды прерывает предыдущий запрос (tStoreXHR[rec].abort()),
 * поэтому пачка чекбоксов (группа цветов/размеров) даёт один итоговый результат.
 *
 * Количество товаров берём из ответа Тильды: t_store_process(products, recid,
 * opts, append, relevants, response) получает response.total — оборачиваем её
 * прозрачно (вызываем оригинал без изменений, только запоминаем total).
 *
 * Повторные запуски безопасны: всё строится один раз, дальше только обновляется.
 */
(function () {
  'use strict';
  if (window.__ufCatFilters) return;
  window.__ufCatFilters = true;

  var BP = 980; // < 980 — телефонный вид
  var PFX = 'uf-cf';

  // --- Разделы для чипов (как в меню сайта) ---
  var SEC_TOP = [
    ['Верхняя одежда', '/catalog/outerwear'],
    ['Жакеты', '/catalog/jackets'],
    ['Блузки и рубашки', '/catalog/blouses-and-shirts'],
    ['Лонгсливы', '/catalog/long-sleeve'],
    ['Топы и корсеты', '/catalog/top'],
    ['Боди', '/catalog/body'],
    ['Худи', '/hoodie']
  ];
  var SEC_BOTTOM = [
    ['Брюки', '/catalog/trousers'],
    ['Деним', '/catalog/denim'],
    ['Юбки', '/catalog/skirts'],
    ['Шорты', '/catalog/shorts']
  ];
  // Общие разделы — для /catalog, /new, /bestseller, /catalog/sale, /last, /catalog/dresses
  var SEC_MAIN = [
    ['Все товары', '/catalog'],
    ['Новинки', '/new'],
    ['Bestseller', '/bestseller'],
    ['Hot sale — до 50%', '/catalog/sale'],
    ['Платья', '/catalog/dresses'],
    ['Last chance', '/last']
  ];
  var PATH_ALIASES = { '/page87274436.html': '/bestseller' };

  // --- Группы цветов (решение Леры). Сравнение без регистра и ё/е. ---
  var COLOR_GROUPS = [
    { label: 'Белый / молочный', sw: '#F4EFE4', vals: ['Белый', 'Молочный', 'Айвори', 'Сливочный', 'Ваниль', 'Ванильный', 'Перламутровый'] },
    { label: 'Бежевый / нюд', sw: '#D9C3A6', vals: ['Бежевый', 'Песочный', 'Телесный', 'Пудровый', 'Персиковый'] },
    { label: 'Серый', sw: '#8E8C8C', vals: ['Серый', 'Светло-серый', 'Графит', 'Графитовый', 'Серебряный'] },
    { label: 'Коричневый', sw: '#6B4630', vals: ['Коричневый', 'Кофейный', 'Шоколад', 'Шоколадный'] },
    { label: 'Синий / голубой', sw: '#24336B', vals: ['Синий', 'Темно-синий', 'Голубой', 'Индиго'] },
    { label: 'Красный', sw: '#8E1F2C', vals: ['Красный', 'Винный'] },
    { label: 'Розовый', sw: '#E6B3BB', vals: ['Розовый', 'Чайная роза'] },
    { label: 'Жёлтый', sw: '#D8B04A', vals: ['Желтый', 'Золотой', 'Оранжевый'] },
    { label: 'Зелёный', sw: '#6A6F45', vals: ['Хаки'], re: /зелен|хаки|олив|изумруд|мят|салат|фисташ|болотн/ },
    { label: 'Чёрный', sw: '#111111', vals: ['Черный', 'Черно-белый'] }
  ];
  var SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'];

  var SORT_LABELS = {
    '': ['По умолчанию', ''],
    'created:desc': ['Сначала новые', 'новые'],
    'created:asc': ['Сначала старые', 'старые'],
    'price:asc': ['Сначала дешевле', 'дешевле'],
    'price:desc': ['Сначала дороже', 'дороже'],
    'title:asc': ['По названию: А—Я', 'А—Я'],
    'title:desc': ['По названию: Я—А', 'Я—А']
  };

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var NBSP = String.fromCharCode(160);
  function fmtNum(n) {
    return String(Math.round(+n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  }
  function cleanNum(s) {
    var v = String(s == null ? '' : s).replace(/[^\d]/g, '');
    return v === '' ? null : parseInt(v, 10);
  }
  function plural(n) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'товар';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'товара';
    return 'товаров';
  }
  function isMobile() { return window.innerWidth < BP; }
  function curPath() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    return PATH_ALIASES[p] || p;
  }

  // Нормализованные значения цветов -> индекс группы
  var COLOR_MAP = {};
  COLOR_GROUPS.forEach(function (g, i) {
    g.vals.forEach(function (v) { COLOR_MAP[norm(v)] = i; });
  });
  function colorKey(v) {
    var n = norm(v);
    if (COLOR_MAP.hasOwnProperty(n)) return 'g' + COLOR_MAP[n];
    for (var i = 0; i < COLOR_GROUPS.length; i++) {
      if (COLOR_GROUPS[i].re && COLOR_GROUPS[i].re.test(n)) return 'g' + i;
    }
    return 'v:' + String(v).trim();
  }
  var SIZE_RE = /^(XXS|XS|S|M|L|XL|XXL)(?:\s*[-–\/]\s*(XXS|XS|S|M|L|XL|XXL|\d{2,3}))?$/;
  function sizeKeys(v) {
    var s = String(v).trim().toUpperCase();
    if (/^(ONE\s*SIZE|ONESIZE|OS)$/.test(s)) return ['One size'];
    var m = s.match(SIZE_RE);
    if (m) return m[2] && !/^\d+$/.test(m[2]) ? [m[1], m[2]] : [m[1]];
    return ['v:' + String(v).trim()];
  }

  // --- Область действия ---
  function getH1() { return document.querySelector('.uf-cat-h1'); }
  function inScope() {
    if (/^\/archive/i.test(location.pathname)) return false; // закрытый архив клуба — никогда
    return !!getH1();
  }
  function getT951() {
    var h1 = getH1();
    return (h1 && h1.closest('.t951')) || document.querySelector('.t951');
  }
  function getRec() {
    var t = getT951();
    return t ? t.closest('.r[id^="rec"]') || t.closest('[id^="rec"]') : null;
  }

  // --- Состояние ---
  var ui = null;          // наши элементы
  var sel = {};           // filterId -> { key: true } — выбранные пункты (наши группы)
  var totals = {};        // recid -> total из ответа Тильды
  var loading = false;
  var openPop = null;     // 'f:<id>' | 'price' | 'sort' — открытая панель (компьютер)
  var sheetOpen = null;   // 'filters' | 'sort' — открытая панель (телефон)
  var cache = {};         // кэш HTML, чтобы не трогать DOM без изменений

  // Прозрачная обёртка t_store_process — только чтобы знать total
  function hookProcess() {
    var f = window.t_store_process;
    if (typeof f !== 'function' || f.__ufcf) return;
    var w = function (products, recid, opts, append, relevants, resp) {
      var r = f.apply(this, arguments);
      try {
        if (!relevants && resp && resp.total != null && !isNaN(+resp.total)) {
          totals[String(recid)] = +resp.total;
        }
        if (!relevants) { loading = false; schedule(); }
      } catch (e) { /* не мешаем Тильде */ }
      return r;
    };
    w.__ufcf = true;
    window.t_store_process = w;
  }

  // --- Модель фильтров из DOM Тильды ---
  function readModel(rec) {
    var filters = [];
    var items = rec.querySelectorAll('.js-store-filter .js-store-filter-item');
    Array.prototype.forEach.call(items, function (item) {
      var title = item.querySelector('.js-store-filter-item-title');
      if (!title) return;
      var fid = title.getAttribute('data-filter-name') || '';
      if (fid === 'sort' || fid === 'storepartuid') return;
      var cbs = item.querySelectorAll('input.js-store-filter-opt-chb');
      if (!cbs.length) return;
      var tn = norm(title.textContent);
      var kind = tn.indexOf('цвет') === 0 ? 'color' : (tn.indexOf('размер') === 0 ? 'size' : 'plain');
      var keys = {}, order = [];
      Array.prototype.forEach.call(cbs, function (cb, idx) {
        var v = cb.getAttribute('data-filter-value') || cb.getAttribute('name') || '';
        if (!v) return;
        var ks = kind === 'size' ? sizeKeys(v) : (kind === 'color' ? [colorKey(v)] : ['v:' + v]);
        ks.forEach(function (k) {
          if (!keys[k]) {
            var label, sw = '', ord;
            if (k.charAt(0) === 'g' && kind === 'color') {
              var g = COLOR_GROUPS[+k.slice(1)];
              label = g.label; sw = g.sw; ord = +k.slice(1);
            } else if (k.indexOf('v:') === 0) {
              label = k.slice(2);
              if (kind === 'color') {
                var ind = cb.parentNode && cb.parentNode.querySelector('.t-checkbox__indicator');
                sw = ind ? ind.style.backgroundColor : '';
              }
              ord = 100 + idx;
            } else {
              label = k; ord = SIZE_ORDER.indexOf(k);
            }
            keys[k] = { key: k, label: label, sw: sw, ord: ord, cbs: [] };
            order.push(k);
          }
          if (keys[k].cbs.indexOf(cb) === -1) keys[k].cbs.push(cb);
        });
      });
      order.sort(function (a, b) { return keys[a].ord - keys[b].ord; });
      var name = kind === 'color' ? 'Цвет' : (kind === 'size' ? 'Размер' : title.textContent.trim());
      filters.push({ id: fid, kind: kind, name: name, keys: keys, order: order, cbs: cbs, pos: filters.length });
    });
    // Порядок как в макете: Размер, Цвет, остальные — как у Тильды
    var RANK = { size: 0, color: 1, plain: 2 };
    filters.sort(function (a, b) { return (RANK[a.kind] - RANK[b.kind]) || (a.pos - b.pos); });
    var pmin = rec.querySelector('.js-store-filter-pricemin');
    var pmax = rec.querySelector('.js-store-filter-pricemax');
    var price = null;
    if (pmin && pmax) {
      var lo = cleanNum(pmin.getAttribute('data-min-val'));
      var hi = cleanNum(pmax.getAttribute('data-max-val'));
      if (lo != null && hi != null && hi > lo) {
        var cmin = cleanNum(pmin.value), cmax = cleanNum(pmax.value);
        price = {
          pmin: pmin, pmax: pmax, lo: lo, hi: hi,
          min: cmin == null ? lo : cmin, max: cmax == null ? hi : cmax
        };
        price.active = price.min > lo || price.max < hi;
      }
    }
    var sortSel = rec.querySelector('select.js-store-filter-sort');
    var avail = rec.querySelector('input.js-store-filter-onlyavail');
    return { filters: filters, price: price, sort: sortSel, avail: avail };
  }

  // Синхронизация нашей «памяти выбора» с реальными чекбоксами Тильды
  // (восстановление из URL, сброс самой Тильдой и т.п.)
  function syncSel(model) {
    model.filters.forEach(function (f) {
      var s = sel[f.id] || (sel[f.id] = {});
      f.order.forEach(function (k) {
        var cbs = f.keys[k].cbs;
        var any = cbs.some(function (cb) { return cb.checked; });
        var all = cbs.every(function (cb) { return cb.checked; });
        if (s[k] && !any) delete s[k];
        else if (!s[k] && all) s[k] = true;
      });
      Object.keys(s).forEach(function (k) { if (!f.keys[k]) delete s[k]; });
    });
  }

  function setChecked(cb, val) {
    if (cb.checked === val) return false;
    cb.checked = val;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Привести чекбоксы фильтра к выбранным ключам: сначала снимаем, потом ставим —
  // последний change даст итоговый запрос (предыдущие Тильда прерывает сама)
  function applyFilter(f) {
    var s = sel[f.id] || {};
    var want = [];
    Object.keys(s).forEach(function (k) {
      if (f.keys[k]) f.keys[k].cbs.forEach(function (cb) { if (want.indexOf(cb) === -1) want.push(cb); });
    });
    var changed = false;
    Array.prototype.forEach.call(f.cbs, function (cb) {
      if (want.indexOf(cb) === -1 && setChecked(cb, false)) changed = true;
    });
    want.forEach(function (cb) { if (setChecked(cb, true)) changed = true; });
    if (changed) loading = true;
  }

  function applyPrice(price, min, max) {
    if (!price) return;
    var lo = price.lo, hi = price.hi;
    if (min == null || isNaN(min)) min = lo;
    if (max == null || isNaN(max)) max = hi;
    min = Math.max(lo, Math.min(hi, min));
    max = Math.max(lo, Math.min(hi, max));
    if (min > max) { var t = min; min = max; max = t; }
    if (min === price.min && max === price.max) return;
    price.pmin.value = fmtNum(min).split(NBSP).join(' ');
    price.pmax.value = fmtNum(max).split(NBSP).join(' ');
    price.pmin.dispatchEvent(new Event('change', { bubbles: true }));
    price.pmax.dispatchEvent(new Event('change', { bubbles: true }));
    loading = true;
  }

  function applySort(model, val) {
    if (!model.sort) return;
    if (model.sort.value === val) return;
    model.sort.value = val;
    model.sort.dispatchEvent(new Event('change', { bubbles: true }));
    loading = true;
  }

  function resetAll(model) {
    var keepSort = model.sort ? model.sort.value : '';
    var btn = getRec() && getRec().querySelector('.js-store-filter-reset');
    sel = {};
    if (btn) {
      btn.click(); // штатный «Очистить все» Тильды
      if (keepSort && model.sort) { // Тильда сбрасывает и сортировку — вернём её
        model.sort.value = keepSort;
        model.sort.dispatchEvent(new Event('change', { bubbles: true }));
      }
      loading = true;
    } else {
      model.filters.forEach(applyFilter);
      if (model.price) applyPrice(model.price, model.price.lo, model.price.hi);
      if (model.avail && model.avail.checked) setChecked(model.avail, false);
    }
  }

  function selCount(model) {
    var n = 0;
    model.filters.forEach(function (f) { n += Object.keys(sel[f.id] || {}).length; });
    if (model.price && model.price.active) n++;
    if (model.avail && model.avail.checked) n++;
    return n;
  }

  function getCount() {
    if (loading) return null;
    var rec = getRec();
    if (!rec) return null;
    var id = rec.id.replace(/^rec/, '');
    if (totals[id] != null) return totals[id];
    var more = rec.querySelector('.js-store-load-more-btn');
    if (more && more.style.display !== 'none') return null;
    return rec.querySelectorAll('.t-store__card-list .t-store__card').length;
  }

  // --- HTML-кусочки ---
  function optsHtml(f) {
    var s = sel[f.id] || {};
    if (f.kind === 'color') {
      return '<div class="' + PFX + '-colors">' + f.order.map(function (k) {
        var o = f.keys[k];
        return '<button type="button" class="' + PFX + '-color' + (s[k] ? ' is-on' : '') + '" data-act="opt" data-f="' + esc(f.id) + '" data-k="' + esc(k) + '" aria-pressed="' + (s[k] ? 'true' : 'false') + '">' +
          '<i style="background:' + esc(o.sw || '#ccc') + '"></i><span>' + esc(o.label) + '</span></button>';
      }).join('') + '</div>';
    }
    return '<div class="' + PFX + '-sizes">' + f.order.map(function (k) {
      var o = f.keys[k];
      return '<button type="button" class="' + PFX + '-size' + (s[k] ? ' is-on' : '') + '" data-act="opt" data-f="' + esc(f.id) + '" data-k="' + esc(k) + '" aria-pressed="' + (s[k] ? 'true' : 'false') + '">' + esc(o.label) + '</button>';
    }).join('') + '</div>';
  }
  function priceHtml(p) {
    return '<div class="' + PFX + '-price">' +
      '<label><span>от</span><input type="text" inputmode="numeric" autocomplete="off" data-price="min" value="' + (p.min > p.lo ? fmtNum(p.min) : '') + '" placeholder="' + fmtNum(p.lo) + '" aria-label="Цена от, RUB"></label>' +
      '<b>—</b>' +
      '<label><span>до</span><input type="text" inputmode="numeric" autocomplete="off" data-price="max" value="' + (p.max < p.hi ? fmtNum(p.max) : '') + '" placeholder="' + fmtNum(p.hi) + '" aria-label="Цена до, RUB"></label>' +
      '</div>';
  }
  function sortListHtml(model) {
    var cur = model.sort ? model.sort.value : '';
    return '<div class="' + PFX + '-sortlist" role="listbox">' + Array.prototype.map.call(model.sort ? model.sort.options : [], function (o) {
      var lab = SORT_LABELS[o.value] ? SORT_LABELS[o.value][0] : o.textContent.trim();
      var on = o.value === cur;
      return '<button type="button" role="option" aria-selected="' + on + '" class="' + PFX + '-sortopt' + (on ? ' is-on' : '') + '" data-act="sort" data-v="' + esc(o.value) + '">' + esc(lab) + '</button>';
    }).join('') + '</div>';
  }
  function showLabel(n) {
    return n == null ? 'Показать' : 'Показать ' + fmtNum(n) + ' ' + plural(n);
  }
  function filterBtnLabel(f) {
    var s = sel[f.id] || {};
    var ks = f.order.filter(function (k) { return s[k]; });
    if (!ks.length) return esc(f.name);
    if (f.kind === 'size' && ks.length <= 3) return esc(f.name) + ' · ' + esc(ks.map(function (k) { return f.keys[k].label; }).join(', '));
    return esc(f.name) + ' · ' + ks.length;
  }
  function priceLabel(p) {
    if (!p.active) return 'Цена';
    if (p.min > p.lo && p.max < p.hi) return 'Цена · ' + fmtNum(p.min) + '–' + fmtNum(p.max);
    if (p.min > p.lo) return 'Цена · от ' + fmtNum(p.min);
    return 'Цена · до ' + fmtNum(p.max);
  }
  function sortShort(model) {
    var v = model.sort ? model.sort.value : '';
    var l = SORT_LABELS[v];
    return v && l ? 'Сортировка: ' + l[1] : 'Сортировка';
  }

  function setHtml(el, key, html) {
    if (!el) return;
    if (cache[key] === html && el.innerHTML !== '') return;
    cache[key] = html;
    el.innerHTML = html;
  }

  // --- Построение ---
  function sectionsHtml() {
    var p = curPath();
    var list = null;
    [SEC_TOP, SEC_BOTTOM].forEach(function (g) {
      g.forEach(function (it) { if (it[1] === p) list = g; });
    });
    if (!list) list = SEC_MAIN;
    return list.map(function (it) {
      var on = it[1] === p;
      return '<a class="' + PFX + '-chip' + (on ? ' is-on' : '') + '" href="' + it[1] + '"' + (on ? ' aria-current="page"' : '') + '>' + esc(it[0]) + '</a>';
    }).join('');
  }

  function build() {
    var t951 = getT951();
    if (!t951) return false;
    var store = t951.querySelector(':scope > .t-store') || t951.querySelector('.t-store');
    if (!store) return false;
    var anchor = store.parentNode === t951 ? store : null;

    ui = {};
    ui.secs = document.createElement('nav');
    ui.secs.className = PFX + ' ' + PFX + '-secs';
    ui.secs.setAttribute('aria-label', 'Разделы');
    ui.secs.innerHTML = sectionsHtml();

    ui.bar = document.createElement('div');
    ui.bar.className = PFX + ' ' + PFX + '-bar';
    ui.bar.innerHTML = '<div class="' + PFX + '-bar__filters"></div><span class="' + PFX + '-bar__sp"></span><span class="' + PFX + '-count" aria-live="polite"></span><span class="' + PFX + '-bar__sort"></span><div class="' + PFX + '-pop" hidden></div>';

    ui.mbar = document.createElement('div');
    ui.mbar.className = PFX + ' ' + PFX + '-mbar';
    ui.mbar.innerHTML = '<button type="button" data-act="sheet" data-v="filters" aria-haspopup="dialog">Фильтры<em hidden></em></button><button type="button" data-act="sheet" data-v="sort" aria-haspopup="dialog">Сортировка</button>';

    ui.active = document.createElement('div');
    ui.active.className = PFX + ' ' + PFX + '-active';

    ui.sheet = document.createElement('div');
    ui.sheet.className = PFX + ' ' + PFX + '-sheet';
    ui.sheet.hidden = true;
    ui.sheet.innerHTML = '<div class="' + PFX + '-sheet__dim" data-act="close"></div>' +
      '<div class="' + PFX + '-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="' + PFX + '-sheet-title">' +
      '<div class="' + PFX + '-sheet__grab"></div>' +
      '<div class="' + PFX + '-sheet__top"><b id="' + PFX + '-sheet-title"></b><button type="button" class="' + PFX + '-sheet__x" data-act="close" aria-label="Закрыть">✕</button></div>' +
      '<div class="' + PFX + '-sheet__body"></div>' +
      '<div class="' + PFX + '-sheet__foot"><button type="button" class="' + PFX + '-ghost" data-act="reset-all">Сбросить</button><button type="button" class="' + PFX + '-btn ' + PFX + '-btn_wine" data-act="close" data-apply="1"></button></div>' +
      '</div>';

    if (anchor) {
      t951.insertBefore(ui.secs, anchor);
      t951.insertBefore(ui.bar, anchor);
      t951.insertBefore(ui.mbar, anchor);
      t951.insertBefore(ui.active, anchor);
    } else {
      store.parentNode.insertBefore(ui.secs, store);
      store.parentNode.insertBefore(ui.bar, store);
      store.parentNode.insertBefore(ui.mbar, store);
      store.parentNode.insertBefore(ui.active, store);
    }
    document.body.appendChild(ui.sheet);
    document.documentElement.classList.add(PFX + '-on');
    cache = {};
    scrollActiveChip();
    return true;
  }

  function scrollActiveChip() {
    if (!ui || !isMobile()) return;
    var on = ui.secs.querySelector('.is-on');
    if (on && ui.secs.scrollWidth > ui.secs.clientWidth) {
      ui.secs.scrollLeft = Math.max(0, on.offsetLeft - 16);
    }
  }

  function alive() {
    return ui && ui.bar.isConnected && ui.secs.isConnected && ui.sheet.isConnected;
  }

  // --- Обновление ---
  function refresh() {
    var rec = getRec();
    if (!rec || !ui) return;
    var model = readModel(rec);
    syncSel(model);
    var count = getCount();
    var hasFilters = model.filters.length || model.price || model.avail;
    var h1 = getH1();
    if (h1) {
      var pad = getComputedStyle(h1).paddingLeft;
      if (pad && ui.__pad !== pad) {
        ui.__pad = pad;
        [ui.secs, ui.bar, ui.mbar, ui.active].forEach(function (el) { el.style.setProperty('--uf-cf-pad', pad); });
      }
    }

    // Компьютер: полоса фильтров
    var fb = model.filters.map(function (f) {
      var s = Object.keys(sel[f.id] || {}).length;
      var id = 'f:' + f.id;
      return '<button type="button" class="' + PFX + '-dd' + (s ? ' is-sel' : '') + (openPop === id ? ' is-open' : '') + '" data-act="pop" data-v="' + esc(id) + '" aria-expanded="' + (openPop === id) + '">' + filterBtnLabel(f) + '</button>';
    });
    if (model.price) {
      fb.push('<button type="button" class="' + PFX + '-dd' + (model.price.active ? ' is-sel' : '') + (openPop === 'price' ? ' is-open' : '') + '" data-act="pop" data-v="price" aria-expanded="' + (openPop === 'price') + '">' + priceLabel(model.price) + '</button>');
    }
    if (model.avail) {
      fb.push('<button type="button" class="' + PFX + '-tg' + (model.avail.checked ? ' is-sel' : '') + '" data-act="avail" aria-pressed="' + model.avail.checked + '">В наличии</button>');
    }
    setHtml(ui.bar.querySelector('.' + PFX + '-bar__filters'), 'bar', fb.join(''));
    setHtml(ui.bar.querySelector('.' + PFX + '-count'), 'count', count == null ? '' : fmtNum(count) + ' ' + plural(count));
    setHtml(ui.bar.querySelector('.' + PFX + '-bar__sort'), 'sortbtn', model.sort ?
      '<button type="button" class="' + PFX + '-dd' + (model.sort.value ? ' is-sel' : '') + (openPop === 'sort' ? ' is-open' : '') + '" data-act="pop" data-v="sort" aria-expanded="' + (openPop === 'sort') + '">' + esc(sortShort(model)) + '</button>' : '');
    ui.bar.classList.toggle('is-empty', !hasFilters && !model.sort);

    // Компьютер: открытая панель
    var pop = ui.bar.querySelector('.' + PFX + '-pop');
    var popKey = '';
    if (openPop) {
      var inner = '';
      var btn = ui.bar.querySelector('[data-act="pop"][data-v="' + openPop + '"]');
      if (openPop === 'sort' && model.sort) {
        inner = '<div class="' + PFX + '-pop__hd">Сортировка</div>' + sortListHtml(model);
      } else if (openPop === 'price' && model.price) {
        popKey = 'price';
        inner = '<div class="' + PFX + '-pop__hd">Цена, RUB</div>' + priceHtml(model.price) +
          '<div class="' + PFX + '-pop__acts"><button type="button" class="' + PFX + '-ghost" data-act="reset-one" data-v="price">Сбросить</button><button type="button" class="' + PFX + '-btn" data-act="pop-close" data-apply="1">' + esc(showLabel(count)) + '</button></div>';
      } else {
        var f = null;
        model.filters.forEach(function (x) { if ('f:' + x.id === openPop) f = x; });
        if (f) {
          inner = '<div class="' + PFX + '-pop__hd">' + esc(f.name) + '</div>' + optsHtml(f) +
            '<div class="' + PFX + '-pop__acts"><button type="button" class="' + PFX + '-ghost" data-act="reset-one" data-v="' + esc(f.id) + '">Сбросить</button><button type="button" class="' + PFX + '-btn" data-act="pop-close">' + esc(showLabel(count)) + '</button></div>';
        }
      }
      if (!inner || !btn) { openPop = null; pop.hidden = true; cache.pop = ''; }
      else {
        // Поля цены не перерисовываем, пока покупатель в них печатает
        var focusedInside = pop.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
        if (popKey === 'price' && focusedInside && cache.popId === 'price') {
          var sb = pop.querySelector('[data-apply]');
          if (sb) sb.textContent = showLabel(count);
        } else {
          setHtml(pop, 'pop', inner);
        }
        cache.popId = openPop;
        pop.hidden = false;
        var left = btn.offsetLeft;
        var w = Math.min(340, ui.bar.clientWidth - 16);
        if (left + w > ui.bar.clientWidth - 8) left = Math.max(8, btn.offsetLeft + btn.offsetWidth - w);
        pop.style.left = left + 'px';
        pop.style.width = w + 'px';
      }
    } else if (!pop.hidden) { pop.hidden = true; cache.pop = ''; cache.popId = ''; }

    // Телефон: строка кнопок
    var n = selCount(model);
    var em = ui.mbar.querySelector('em');
    var emTxt = n ? String(n) : '';
    if (em.textContent !== emTxt) em.textContent = emTxt;
    em.hidden = !n;
    var fbtn = ui.mbar.querySelector('[data-v="filters"]');
    var sbtn = ui.mbar.querySelector('[data-v="sort"]');
    fbtn.hidden = !hasFilters;
    sbtn.hidden = !model.sort;
    ui.mbar.classList.toggle('is-single', !hasFilters || !model.sort);
    ui.mbar.classList.toggle('is-empty', !hasFilters && !model.sort);
    var sTxt = model.sort && model.sort.value ? sortShort(model) : 'Сортировка';
    if (sbtn.textContent !== sTxt) sbtn.textContent = sTxt;

    // Выбранные фильтры чипами
    var chips = [];
    model.filters.forEach(function (f) {
      f.order.forEach(function (k) {
        if ((sel[f.id] || {})[k]) {
          var lab = f.kind === 'size' ? 'Размер ' + f.keys[k].label : f.keys[k].label;
          chips.push('<button type="button" class="' + PFX + '-chip ' + PFX + '-chip_sel" data-act="opt" data-f="' + esc(f.id) + '" data-k="' + esc(k) + '" aria-label="Убрать: ' + esc(lab) + '">' + esc(lab) + '<span class="' + PFX + '-x" aria-hidden="true">✕</span></button>');
        }
      });
    });
    if (model.price && model.price.active) {
      chips.push('<button type="button" class="' + PFX + '-chip ' + PFX + '-chip_sel" data-act="reset-one" data-v="price" aria-label="Убрать фильтр по цене">' + esc(priceLabel(model.price).replace('Цена · ', 'Цена ')) + '<span class="' + PFX + '-x" aria-hidden="true">✕</span></button>');
    }
    if (model.avail && model.avail.checked) {
      chips.push('<button type="button" class="' + PFX + '-chip ' + PFX + '-chip_sel" data-act="avail" aria-label="Убрать: в наличии">В наличии<span class="' + PFX + '-x" aria-hidden="true">✕</span></button>');
    }
    setHtml(ui.active, 'active', chips.length ?
      '<span class="' + PFX + '-active__lbl">Выбрано:</span>' + chips.join('') + '<button type="button" class="' + PFX + '-ghost" data-act="reset-all">Сбросить всё</button>' : '');
    ui.active.hidden = !chips.length;

    // Телефон: панель снизу
    if (sheetOpen) {
      var title = sheetOpen === 'sort' ? 'Сортировка' : 'Фильтры';
      var tEl = ui.sheet.querySelector('#' + PFX + '-sheet-title');
      if (tEl.textContent !== title) tEl.textContent = title;
      var body = ui.sheet.querySelector('.' + PFX + '-sheet__body');
      var foot = ui.sheet.querySelector('.' + PFX + '-sheet__foot');
      if (sheetOpen === 'sort') {
        setHtml(body, 'sheet', sortListHtml(model));
        foot.hidden = true;
      } else {
        foot.hidden = false;
        var secs = model.filters.map(function (f) {
          return '<section class="' + PFX + '-sec" data-sec="' + esc(f.id) + '"><div class="' + PFX + '-sec__hd">' + esc(f.name) + '</div>' + optsHtml(f) + '</section>';
        }).join('');
        if (model.avail) {
          secs += '<section class="' + PFX + '-sec ' + PFX + '-sec_row"><span>Только в наличии</span><button type="button" class="' + PFX + '-switch' + (model.avail.checked ? ' is-on' : '') + '" role="switch" aria-checked="' + model.avail.checked + '" data-act="avail" aria-label="Только в наличии"><i></i></button></section>';
        }
        // Секцию цены ставим отдельно и не перерисовываем во время ввода
        var priceSec = body.querySelector('[data-sec="__price"]');
        var priceFocused = priceSec && priceSec.contains(document.activeElement);
        var key = secs + '|' + (model.price ? 'p' : '');
        if (cache.sheet !== key || !body.firstChild) {
          var keepPrice = priceFocused ? priceSec : null;
          cache.sheet = key;
          body.innerHTML = secs;
          if (model.price) {
            if (keepPrice) body.insertBefore(keepPrice, body.querySelector('.' + PFX + '-sec_row'));
            else {
              var ps = document.createElement('section');
              ps.className = PFX + '-sec';
              ps.setAttribute('data-sec', '__price');
              ps.innerHTML = '<div class="' + PFX + '-sec__hd">Цена, RUB</div>' + priceHtml(model.price);
              body.insertBefore(ps, body.querySelector('.' + PFX + '-sec_row'));
            }
          }
        }
        var ab = foot.querySelector('[data-apply]');
        var at = showLabel(count);
        if (ab.textContent !== at) ab.textContent = at;
        var rb = foot.querySelector('[data-act="reset-all"]');
        rb.disabled = !n;
      }
      ui.sheet.hidden = false;
    } else if (!ui.sheet.hidden) {
      ui.sheet.hidden = true;
      cache.sheet = '';
    }
  }

  // --- Открытие/закрытие ---
  function readPriceInputs(scope) {
    var a = scope && scope.querySelector('input[data-price="min"]');
    var b = scope && scope.querySelector('input[data-price="max"]');
    if (!a || !b) return null;
    return [cleanNum(a.value), cleanNum(b.value)];
  }
  function commitPrice(scope) {
    var rec = getRec();
    if (!rec) return;
    var model = readModel(rec);
    var v = readPriceInputs(scope);
    if (model.price && v) applyPrice(model.price, v[0], v[1]);
  }
  function closePop(apply) {
    if (!openPop) return;
    if (apply && openPop === 'price') commitPrice(ui.bar.querySelector('.' + PFX + '-pop'));
    openPop = null;
    refresh();
  }
  function openSheet(kind) {
    sheetOpen = kind;
    cache.sheet = '';
    document.documentElement.classList.add(PFX + '-lock');
    refresh();
    var x = ui.sheet.querySelector('.' + PFX + '-sheet__x');
    if (x) { try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); } }
  }
  function closeSheet(apply) {
    if (!sheetOpen) return;
    if (apply || sheetOpen === 'filters') commitPrice(ui.sheet.querySelector('[data-sec="__price"]'));
    var was = sheetOpen;
    sheetOpen = null;
    document.documentElement.classList.remove(PFX + '-lock');
    refresh();
    var back = ui.mbar.querySelector('[data-v="' + was + '"]');
    if (back) { try { back.focus({ preventScroll: true }); } catch (e) { /* */ } }
  }

  // --- События (делегирование, ставится один раз) ---
  document.addEventListener('click', function (e) {
    if (!ui || !inScope()) return;
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    var inUi = t && t.closest('.' + PFX);
    if (!inUi) {
      // клик мимо — закрыть выпадающую панель на компьютере
      if (openPop && !(e.target.closest && e.target.closest('.' + PFX + '-pop'))) closePop(true);
      return;
    }
    var act = t.getAttribute('data-act');
    var rec = getRec();
    if (!rec) return;
    var model = readModel(rec);
    syncSel(model);
    if (act === 'opt') {
      var fid = t.getAttribute('data-f'), k = t.getAttribute('data-k');
      var f = null;
      model.filters.forEach(function (x) { if (x.id === fid) f = x; });
      if (!f || !f.keys[k]) return;
      var s = sel[fid] || (sel[fid] = {});
      if (s[k]) delete s[k]; else s[k] = true;
      applyFilter(f);
      refresh();
    } else if (act === 'pop') {
      var v = t.getAttribute('data-v');
      if (openPop === 'price' && v !== 'price') commitPrice(ui.bar.querySelector('.' + PFX + '-pop'));
      openPop = openPop === v ? null : v;
      cache.pop = '';
      refresh();
      if (openPop === 'price') {
        var inp = ui.bar.querySelector('.' + PFX + '-pop input');
        if (inp) inp.focus();
      }
    } else if (act === 'pop-close') {
      closePop(!!t.getAttribute('data-apply'));
    } else if (act === 'sort') {
      applySort(model, t.getAttribute('data-v') || '');
      if (sheetOpen) closeSheet(false);
      openPop = null;
      refresh();
    } else if (act === 'reset-one') {
      var rv = t.getAttribute('data-v');
      if (rv === 'price') {
        if (model.price) applyPrice(model.price, model.price.lo, model.price.hi);
        cache.pop = ''; cache.sheet = '';
      } else {
        model.filters.forEach(function (x) { if (x.id === rv) { sel[x.id] = {}; applyFilter(x); } });
      }
      refresh();
    } else if (act === 'reset-all') {
      resetAll(model);
      cache.pop = ''; cache.sheet = '';
      refresh();
    } else if (act === 'avail') {
      if (model.avail) { setChecked(model.avail, !model.avail.checked); loading = true; }
      refresh();
    } else if (act === 'sheet') {
      openSheet(t.getAttribute('data-v'));
    } else if (act === 'close') {
      closeSheet(!!t.getAttribute('data-apply'));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!ui) return;
    if (e.key === 'Escape') {
      if (sheetOpen) closeSheet(false);
      else if (openPop) closePop(false);
    } else if (e.key === 'Enter' && e.target && e.target.getAttribute && e.target.getAttribute('data-price')) {
      e.preventDefault();
      if (sheetOpen) commitPrice(ui.sheet.querySelector('[data-sec="__price"]'));
      else closePop(true);
      refresh();
    }
  });

  document.addEventListener('change', function (e) {
    if (!ui || !e.target || !e.target.getAttribute || !e.target.getAttribute('data-price')) return;
    // на телефоне цену применяем сразу по выходу из поля, чтобы «Показать N» было честным
    if (sheetOpen) { commitPrice(ui.sheet.querySelector('[data-sec="__price"]')); refresh(); }
  });

  // --- Липкая строка на телефоне: отступ под фиксированную шапку сайта ---
  var stickyTick = 0;
  function updateStickyTop() {
    stickyTick = 0;
    if (!ui || !isMobile()) return;
    var bottom = 0;
    var stack = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, 2) : [];
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (el.closest && el.closest('.' + PFX)) continue;
      while (el && el !== document.body && el !== document.documentElement) {
        var cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.position === 'sticky') {
          var r = el.getBoundingClientRect();
          if (r.top <= 2 && r.height < 160 && r.bottom > bottom) bottom = r.bottom;
          break;
        }
        el = el.parentElement;
      }
    }
    var v = Math.max(0, Math.round(bottom)) + 'px';
    if (ui.mbar.style.top !== v) ui.mbar.style.top = v;
  }
  window.addEventListener('scroll', function () {
    if (!ui || stickyTick) return;
    stickyTick = setTimeout(updateStickyTop, 120);
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!ui) return;
    if (!isMobile() && sheetOpen) closeSheet(false);
    if (isMobile() && openPop) { openPop = null; }
    schedule();
    updateStickyTop();
  });

  // --- Запуск / перезапуск ---
  var timer = 0;
  function schedule() {
    if (timer) return;
    timer = setTimeout(run, 80);
  }
  function run() {
    timer = 0;
    try {
      if (!inScope()) return;
      hookProcess();
      if (!alive()) {
        if (ui) { [ui.secs, ui.bar, ui.mbar, ui.active, ui.sheet].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); }); ui = null; }
        if (!build()) return;
        updateStickyTop();
      }
      refresh();
    } catch (err) {
      if (window.console && console.warn) console.warn('[uf-cf]', err);
    }
  }

  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var tg = records[i].target;
        if (!(tg.closest && tg.closest('.' + PFX))) { schedule(); return; }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  window.addEventListener('load', schedule);
})();
