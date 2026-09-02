видимыйвыбороплатытеперьреальнопереключаетшлюзТильдытехническийблокпрячется/*
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
    var fallback = 'Подписчик';
    if (emailInput && emailInput.value && emailInput.value.indexOf('@') > -1) {
      fallback = emailInput.value.split('@')[0];
    }
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
    if (!wa || !note) return;
    if (wa.previousElementSibling !== note) {
      note.parentElement.appendChild(wa);
    }
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
      } else if (el.matches('.t-input-group_cb, .t-input-group_dl')) {
        el.setAttribute('data-uf-step', '2');
        el.dataset.ufAssigned = '1';
      } else if (el.matches('.t-input-group_rd, .t-input-group_pm')) {
        el.setAttribute('data-uf-step', '3');
        el.dataset.ufAssigned = '1';
      }
    });
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

  document.addEventListener('DOMContentLoaded', ensureThanksHeaderCard);
  var ufThanksTries = 0;
  var ufThanksInterval = setInterval(function () {
    ufThanksTries++;
    ensureThanksHeaderCard();
    if (initialized || ufThanksTries > 40) clearInterval(ufThanksInterval);
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

  /* ---------- контент кастомных панелей ---------- */

  var RETURN_HTML =
    '<div class="uf-svc-head">' +
      '<div class="uf-svc-title">Возврат товара</div>' +
      '<div class="uf-svc-pill">14 дней на возврат</div>' +
    '</div>' +
    '<div class="uf-steps">' +
      '<div class="uf-step"><div class="uf-step-num">1</div><div><div class="uf-step-title">Оставьте заявку</div>' +
        '<div class="uf-step-text"><a href="#" class="uf-jump" data-uf-jump-type="Возврат">Заполнить онлайн, 2 минуты &rarr;</a></div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">2</div><div><div class="uf-step-title">Отправка СДЭК</div>' +
        '<div class="uf-step-text">Сдайте товар в ближайший ПВЗ — печатать и вкладывать ничего не нужно, пересылку оплачивает покупатель.</div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">3</div><div><div class="uf-step-title">Проверка</div>' +
        '<div class="uf-step-text">Проверяем товарный вид и бирки на складе.</div></div></div>' +
      '<div class="uf-step"><div class="uf-step-num">4</div><div><div class="uf-step-title">Возврат денег</div>' +
        '<div class="uf-step-text">На карту, которой оплачивали, в течение 3 рабочих дней.</div></div></div>' +
    '</div>' +
    '<div class="uf-callout"><b>Заказывали с примеркой у курьера?</b> Платите только за то, что подошло — платный возврат в этом случае не нужен.</div>' +
    '<details class="uf-legal"><summary>Условия возврата товара — полный текст</summary>' +
      '<p>Покупатель вправе отказаться от заказанного товара в любое время до его получения, а после получения — в течение 14 дней (п.&nbsp;21 Постановления Правительства РФ от 27.09.2007 №&nbsp;612, ред. от 30.11.2019, «Об утверждении Правил продажи товаров дистанционным способом»).</p>' +
      '<p>Посылка отправляется курьерской компанией СДЭК, расходы по пересылке несёт покупатель. Возврат товара надлежащего качества возможен, если сохранены товарный вид, фабричные ярлыки, пломбы, этикетки, потребительские свойства, а также документ, подтверждающий факт и условия покупки.</p>' +
      '<p><b>Оформление возврата (через ПВЗ).</b> Оставьте заявку онлайн — бумажный бланк вкладывать в посылку не нужно. Проверьте наличие бирок и ярлыков, герметично упакуйте посылку. Обратитесь в ближайший пункт выдачи СДЭК, сообщите менеджеру номер накладной, по которой получали заказ, и что оформляете клиентский возврат. Номер накладной — в личном кабинете СДЭК или в трек-номере из письма (11 цифр).</p>' +
      '<p><b>Оформление возврата (через личный кабинет СДЭК).</b> Оставьте заявку онлайн — бланк не нужен. Перейдите в личный кабинет СДЭК → «Возврат товара» → укажите UNFADED или нужный заказ → заполните ФИО, город отправления, размер посылки, пункт СДЭК для сдачи, характер груза «Одежда» → «ОФОРМИТЬ ВОЗВРАТ». Номер созданной накладной сообщите менеджеру СДЭК в пункте выдачи.</p>' +
      '<p><b>Срок обработки и возврат денег.</b> Возврат обрабатывается в течение 3 рабочих дней с момента поступления на склад. Деньги возвращаются на карту, которой был оплачен заказ; срок зачисления зависит от банка-эмитента. Мы вправе отказать в возврате, если товар пришёл ненадлежащего качества. Если возврат произошёл по нашей вине (дефект, не тот размер или модель), пересылку компенсируем мы.</p>' +
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
    '<div class="uf-callout"><b>Кто оплачивает пересылку.</b> Обмен оплачивает покупатель — кроме случаев, когда мы ошиблись с размером или моделью: тогда пересылку компенсирует UNFADED.</div>' +
    '<div class="uf-svc-contact">Можно и напрямую: WhatsApp <a href="https://wa.me/' + WA_NUMBER + '">+7&nbsp;993&nbsp;895&nbsp;50&nbsp;08</a> или <a href="mailto:unfadedwork@gmail.com">unfadedwork@gmail.com</a>.</div>';

  var CLAIM_HTML =
    '<div class="uf-svc-head"><div class="uf-svc-title">Заявка на возврат или обмен</div><span class="uf-badge">Без бумажного бланка</span></div>' +
    '<div class="uf-svc-lead">Заполните здесь — не нужно писать менеджеру, скачивать и распечатывать бланк.</div>' +
    '<div class="uf-toggle" data-uf-field="type">' +
      '<button type="button" class="active" data-value="Возврат">Возврат</button>' +
      '<button type="button" data-value="Обмен">Обмен</button>' +
    '</div>' +
    '<div class="uf-field-row">' +
      '<label>Номер заказа<input type="text" data-uf-field="order" placeholder="Например, 934C"></label>' +
      '<label>Телефон / WhatsApp<input type="tel" data-uf-field="phone" placeholder="+7 ___ ___ __ __"></label>' +
    '</div>' +
    '<label class="uf-field-block">Какой товар<input type="text" data-uf-field="item" placeholder="Название или артикул"></label>' +
    '<div class="uf-field-block"><div class="uf-label">Причина</div>' +
      '<div class="uf-chips" data-uf-field="reason">' +
        '<button type="button" class="uf-chip" data-value="Не подошёл размер">Не подошёл размер</button>' +
        '<button type="button" class="uf-chip" data-value="Не подошёл цвет/модель">Не подошёл цвет/модель</button>' +
        '<button type="button" class="uf-chip" data-value="Брак/дефект">Брак/дефект</button>' +
        '<button type="button" class="uf-chip uf-chip-return-only" data-value="Передумал(а)">Передумал(а)</button>' +
      '</div>' +
    '</div>' +
    '<label class="uf-field-block uf-conditional" data-uf-show-if="reason=Брак/дефект" hidden>Опишите, в чём брак<textarea data-uf-field="defect" rows="2" placeholder="Например: разошёлся шов на левом рукаве"></textarea></label>' +
    '<div class="uf-field-block"><div class="uf-label">Как был оплачен заказ</div>' +
      '<div class="uf-chips" data-uf-field="payment">' +
        '<button type="button" class="uf-chip" data-value="Картой на сайте">Картой на сайте</button>' +
        '<button type="button" class="uf-chip" data-value="Наложенным платежом">Наличными/картой курьеру при получении</button>' +
      '</div>' +
    '</div>' +
    '<label class="uf-field-block uf-conditional" data-uf-show-if="payment=Наложенным платежом" hidden>Реквизиты для возврата денег<input type="text" data-uf-field="requisites" placeholder="Номер карты и банк"></label>' +
    '<button type="button" class="uf-submit" data-uf-submit>Отправить заявку</button>' +
    '<div class="uf-svc-note">После отправки откроется WhatsApp с готовым сообщением — печатать и вкладывать в посылку ничего не нужно.</div>' +
    '<div class="uf-svc-error" data-uf-error hidden>Заполните номер заказа и телефон, чтобы отправить заявку.</div>';

  /* Доставка/Оплата/Контакты — короткий, редко меняющийся справочный
     контент; текст сверен построчно с живым сайтом (вкладки «Доставка»/
     «Оплата»/«Контакты» в T395) на момент вёрстки макета. Если цены или
     условия поменяются в Tilda, эти три блока надо будет поправить
     руками — в отличие от Оферты/Политики (см. richifyLegal выше), они
     достаточно короткие и стабильные, чтобы это было безопаснее, чем
     алгоритмический разбор совсем не размеченного текста. */
  var DELIVERY_HTML =
    '<div class="uf-svc-head">' +
      '<div class="uf-svc-title">Способы доставки</div>' +
      '<div class="uf-svc-pill">Бесплатно от 30 000 ₽</div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">Москва и Санкт-Петербург — курьером</div>' +
      '<div class="uf-legal-body"><p>Доставка курьером по Москве, Московской области, Санкт-Петербургу и Ленинградской области — в течение 1–5 дней с даты заказа. Стоимость — от 290 ₽, бесплатно при оплате на сайте от 30 000 ₽. Дата и интервал доставки согласуются со службой СДЭК через личный кабинет, курьер связывается с получателем в день доставки.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">Экспресс-доставка</div>' +
      '<div class="uf-legal-body"><p>По Москве в пределах МКАД — день в день при заказе до 12:00 или на следующий день при заказе после 12:00. Стоимость фиксированная — 1000 ₽ при заказе до 30 000 ₽.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">Доставка с примеркой и оплатой при получении — по всей России</div>' +
      '<div class="uf-legal-body"><p>Курьер даёт 15 минут на примерку — оплатить можно только то, что подошло. Отмечается отдельным пунктом при оформлении заказа.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method">' +
      '<div class="uf-legal-title">Самовывоз из пункта выдачи СДЭК</div>' +
      '<div class="uf-legal-body"><p>Точку выдачи можно выбрать при оформлении заказа. Стоимость — от 200 ₽ по Москве и Санкт-Петербургу, от 500 ₽ в другие регионы; точный расчёт — на шаге оформления. Бесплатное хранение посылки на пункте выдачи — 7 дней.</p></div>' +
    '</div>' +
    '<div class="uf-svc-method" style="border-bottom:none;">' +
      '<div class="uf-legal-title">Международная доставка</div>' +
      '<div class="uf-legal-body" style="margin-bottom:0;"><p>В Армению, Беларусь, Казахстан и Киргизию — службой СДЭК, курьером до двери. Стоимость рассчитывается при оформлении заказа, срок — от 7 дней.</p></div>' +
    '</div>' +
    '<div class="uf-callout"><b>Заказы по России, оплаченные онлайн, доставляются бесплатно при сумме от 30 000 ₽.</b> После передачи посылки в транспортную компанию на указанный при заказе email приходит трек-номер для отслеживания.</div>';

  var PAYMENT_HTML =
    '<div class="uf-svc-title" style="margin-bottom:8px;">Способы оплаты</div>' +
    '<div class="uf-svc-lead" style="margin-bottom:8px;">Оплатить заказ в интернет-магазине можно несколькими способами:</div>' +
    '<div style="margin-bottom:22px;">' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Банковской картой на сайте или через СБП</span></div>' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Через сервис «Долями»</span></div>' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Через сервис «Яндекс Сплит»</span></div>' +
      '<div class="uf-svc-way"><span class="uf-svc-way-dot"></span><span>Курьеру при получении — картой или наличными (только при доставке с примеркой)</span></div>' +
    '</div>' +
    '<div class="uf-callout" style="margin-bottom:8px;">Оформить и оплатить заказ можно на официальном сайте либо через менеджера — по ссылке в WhatsApp.</div>' +
    '<div class="uf-svc-method" style="border-top:1px solid #EDEEEE; margin-top:22px;">' +
      '<div class="uf-legal-title">Оплата при получении курьеру</div>' +
      '<div class="uf-legal-body" style="margin-bottom:0;"><p>Наличными или картой — доступно только при оформлении доставки с примеркой. Возврат денег при оплате при получении осуществляется только по реквизитам банковской карты, указанным в заявлении на возврат.</p></div>' +
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
      '<div class="uf-callout">Если у вас есть предложение о сотрудничестве с брендом — отправьте сообщение на почту <b>unfadedwork@gmail.com</b> или напишите нам в WhatsApp.</div>' +
    '</div>';

  /* ---------- инициализация ---------- */

  function build(root, wrapper) {
    root.dataset.ufSvcInit = '1';

    /* сопоставляем по видимому тексту вкладки, а не по data-tab-number —
       у Tilda он не всегда идёт подряд (бывают пропуски после правок в редакторе) */
    var recByLabel = {};
    qsa('.t395__tab', wrapper).forEach(function (li) {
      var btn = qs('.t395__title', li);
      if (!btn) return;
      var text = btn.textContent.replace(/\s+/g, ' ').trim();
      var recId = btn.getAttribute('aria-controls');
      if (recId) recByLabel[text] = document.getElementById(recId);
    });

    var ITEMS = [
      { key: 'delivery', label: 'Доставка', html: DELIVERY_HTML },
      { key: 'payment', label: 'Оплата', html: PAYMENT_HTML },
      { key: 'return', label: 'Возврат', html: RETURN_HTML },
      { key: 'exchange', label: 'Обмен', html: EXCHANGE_HTML },
      { key: 'claim', label: 'Оформить заявку', html: CLAIM_HTML },
      { key: 'contacts', label: 'Контакты', html: CONTACTS_HTML },
      { key: 'offer', label: 'Оферта', passthrough: 'Оферта' },
      { key: 'privacy', label: 'Политика конфиденциальности', passthrough: 'Политика конфиденциальности' }
    ];

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
        richifyLegal(cloneNode, item.label);
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
      qsa('.uf-chip-return-only', panel).forEach(function (chip) {
        chip.hidden = value === 'Обмен';
        if (value === 'Обмен' && chip.classList.contains('active')) {
          chip.classList.remove('active');
        }
      });
    }

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

      qs('[data-uf-submit]', claimPanel).addEventListener('click', function () {
        var val = function (sel) { var el = qs(sel, claimPanel); return el ? el.value.trim() : ''; };
        var activeChip = function (field) {
          var el = qs('.uf-chips[data-uf-field="' + field + '"] .uf-chip.active', claimPanel);
          return el ? el.getAttribute('data-value') : '';
        };
        var type = qs('[data-uf-field="type"] .active', claimPanel);
        type = type ? type.getAttribute('data-value') : 'Возврат';
        var order = val('[data-uf-field="order"]');
        var phone = val('[data-uf-field="phone"]');
        var itemv = val('[data-uf-field="item"]');
        var reason = activeChip('reason');
        var defect = val('[data-uf-field="defect"]');
        var payment = activeChip('payment');
        var requisites = val('[data-uf-field="requisites"]');

        var errEl = qs('[data-uf-error]', claimPanel);
        if (!order || !phone) {
          if (errEl) errEl.hidden = false;
          return;
        }
        if (errEl) errEl.hidden = true;

        var lines = [
          'Здравствуйте! Заявка на ' + type.toLowerCase() + ' с сайта UNFADED.',
          'Номер заказа: ' + order,
          'Телефон: ' + phone
        ];
        if (itemv) lines.push('Товар: ' + itemv);
        if (reason) lines.push('Причина: ' + reason);
        if (reason === 'Брак/дефект' && defect) lines.push('В чём брак: ' + defect);
        if (payment) lines.push('Оплата заказа: ' + payment);
        if (payment === 'Наложенным платежом' && requisites) lines.push('Реквизиты для возврата: ' + requisites);

        var text = encodeURIComponent(lines.join('\n'));
        window.open('https://wa.me/' + WA_NUMBER + '?text=' + text, '_blank');
      });
    }

    selectItem('delivery');
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
        '<div class="uf-svc-faqcard-sub">Служба поддержки: WhatsApp с 09:00 до 21:00 по МСК · unfadedwork@gmail.com</div></div>' +
        '<a class="uf-svc-faqcard-btn" href="https://wa.me/' + WA_NUMBER + '" target="_blank" rel="noopener">Написать в WhatsApp</a>';
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
        '<div class="uf-svc-howstep"><b>4</b>Сдайте товар в ПВЗ — печатать и вкладывать ничего не нужно</div>' +
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
// UNFADED: связываем видимый выбор оплаты с реальным платёжным шлюзом Тильды.
// pay_method (видимый блок) — просто текст, шлюз задаёт paymentsystem (технический блок).
// Наличные/при получении -> custom (RetailCRM), Карта/СБП -> tinkoff, Долями -> tinkoff (как сейчас).
// Откат: удалить этот блок и закоммитить.
;(function () {
  'use strict';

  var MAP = [
    [/налич|при получени/i, 'custom'],
    [/банковск|СБП|онлайн/i, 'tinkoff'],
    [/долям/i, 'tinkoff']
  ];
  var timer = null;

  function sync() {
    var box = document.querySelector('.t-input-group_pm');
    if (!box) return;

    if (box.getAttribute('data-uf-pay') !== '1') {
      box.setAttribute('data-uf-pay', '1');
      box.style.cssText =
        'position:absolute;width:1px;height:1px;overflow:hidden;' +
        'clip:rect(0 0 0 0);white-space:nowrap';
    }

    var checked = document.querySelector('input[name="pay_method"]:checked');
    if (!checked) return;

    var label = checked.closest('label');
    var text = label ? label.textContent : checked.value;

    var system = null;
    for (var i = 0; i < MAP.length; i++) {
      if (MAP[i][0].test(text)) { system = MAP[i][1]; break; }
    }
    if (!system) return;

    var radios = document.querySelectorAll('input[name="paymentsystem"]');
    for (var j = 0; j < radios.length; j++) {
      if (radios[j].value === system) {
        if (!radios[j].checked) radios[j].click();
        return;
      }
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(sync, 120);
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'pay_method') schedule();
  }, true);

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  schedule();
})();
