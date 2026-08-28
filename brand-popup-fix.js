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
  var HEADING_TEXT = 'Ранний доступ к новым дропам и \u221210% на первый заказ';
  var SUB_TEXT = 'Подпишитесь на письма UNFADED \u2014 без спама, только новые коллекции и закрытые продажи.';
  var EYEBROW_TEXT = 'Будьте первыми';
  var DISMISS_TEXT = 'Нет, спасибо';

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
