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
})();
