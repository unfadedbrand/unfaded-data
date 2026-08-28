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

  function apply() {
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
    }, 300);
  });
})();
