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

  function apply() {
    // PDP-фиксы (хлебная крошка / галерея / таблица размеров) не зависят от
    // попапа подписки и элементов ниже — запускаем их до возможного раннего
    // return, иначе на странице без загруженного попапа подписки (или до
    // его загрузки) PDP-функции вообще не выполнились бы.
    ensureBreadcrumb();
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
