/* Баннер клуба UNFADED ACCESS SYSTEM: 3D-оборот карт уровней (как в ролике).
   Ищет на странице блоки .ufcb, в каждый .ufcb__card вставляет карту и крутит её:
   ~1,3 с доворот, ~1,7 с полный оборот, на обороте — следующая карта ENTRY → INSIDER → ARCHIVE → PRIVATE. */
(function () {
  if (window.__ufcbStarted) return; window.__ufcbStarted = true;
  var BASE = 'https://unfadedbrand.github.io/unfaded-data/club-banner/';
  var CARDS = ['card_entry.webp', 'card_insider.webp', 'card_archive.webp', 'card_private.webp'].map(function (f) { return BASE + f; });
  var HOLD = 1.3, SPIN = 1.7, CYCLE = HOLD + SPIN, YAW0 = -14;
  var LOGO = '<svg viewBox="0 0 65 13" aria-hidden="true"><g fill="currentColor">' +
    '<path d="M8.21062 0C8.21062 0 8.04682 4.43902 9.85445 4.43902C9.85445 4.43902 8.70879 4.43902 8.21062 4.93225V8.87805C8.1992 10.2109 7.84247 11.2326 7.14041 11.9431C6.43836 12.6477 5.43094 13 4.11815 13C2.78253 13 1.76085 12.6418 1.05308 11.9255C0.351028 11.2091 2.33907e-07 10.1728 2.33907e-07 8.8164V4.93225C0.47703 4.4126 1.51094 4.4126 1.51094 4.4126C2.61281e-07 4.4126 2.33907e-07 0 2.33907e-07 0H2.53425C2.53425 0 2.32785 4.4126 4.18857 4.4126C4.18857 4.4126 2.97267 4.4126 2.53425 4.93225V8.8252C2.53425 9.5533 2.6484 10.0729 2.87671 10.3841C3.10502 10.6953 3.51884 10.8509 4.11815 10.8509C4.71747 10.8509 5.12842 10.6983 5.35103 10.393C5.57363 10.0818 5.68779 9.57385 5.69349 8.86924V4.93225C6.18001 4.43902 7.3245 4.43902 7.3245 4.43902C5.69349 4.43902 5.69349 0 5.69349 0H8.21062Z"/>' +
    '<path d="M19.1781 12.8238H16.661L12.9795 4.4126V12.8238H10.4623V0H12.9795L16.6695 8.42005V0H19.1781V12.8238Z"/>' +
    '<path d="M27.6284 7.59214H23.7158V12.8238H21.1986V0H28.0993V2.15786H23.7158V5.44309H27.6284V7.59214Z"/>' +
    '<path d="M33.8442 10.1992H30.411L29.7432 12.8238H27.0805L30.976 0H33.2791L37.2003 12.8238H34.512L33.8442 10.1992ZM30.9589 8.04133H33.2877L32.1233 3.47019L30.9589 8.04133Z"/>' +
    '<path d="M38.3733 12.8238V0H41.6695C43.125 0 44.2837 0.47561 45.1455 1.42683C46.0131 2.37805 46.4555 3.68157 46.4726 5.3374V7.41599C46.4726 9.10117 46.0388 10.4252 45.1712 11.3882C44.3094 12.3453 43.1193 12.8238 41.601 12.8238H38.3733ZM40.8904 2.15786V10.6748H41.6438C42.4829 10.6748 43.0736 10.4487 43.4161 9.99661C43.7586 9.53862 43.9384 8.75181 43.9555 7.63618V5.40786C43.9555 4.21003 43.7928 3.37624 43.4675 2.9065C43.1421 2.43089 42.5885 2.18135 41.8065 2.15786H40.8904Z"/>' +
    '<path d="M54.726 7.27507H50.8048V10.6748H55.4452V12.8238H48.2877V0H55.4281V2.15786H50.8048V5.18767H54.726V7.27507Z"/>' +
    '<path d="M56.9007 12.8238V0H60.1969C61.6524 0 62.8111 0.47561 63.6729 1.42683C64.5405 2.37805 64.9829 3.68157 65 5.3374V7.41599C65 9.10117 64.5662 10.4252 63.6986 11.3882C62.8368 12.3453 61.6467 12.8238 60.1284 12.8238H56.9007ZM59.4178 2.15786V10.6748H60.1712C61.0103 10.6748 61.601 10.4487 61.9435 9.99661C62.286 9.53862 62.4658 8.75181 62.4829 7.63618V5.40786C62.4829 4.21003 62.3202 3.37624 61.9949 2.9065C61.6695 2.43089 61.1159 2.18135 60.3339 2.15786H59.4178Z"/>' +
    '</g></svg>';
  var INNER = '<div class="ufcb__edge ufcb__edge--1"></div><div class="ufcb__edge ufcb__edge--2"></div>' +
    '<div class="ufcb__face ufcb__back">' + LOGO + '<div>ACCESS SYSTEM</div><i class="ufcb__gloss"></i></div>' +
    '<div class="ufcb__face ufcb__front"><img alt="Карта UNFADED ACCESS SYSTEM" width="816" height="600" src="' + CARDS[0] + '"><i class="ufcb__gloss"></i></div>';
  CARDS.forEach(function (s) { var i = new Image(); i.src = s; });
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function easeIO(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  var cards = [], groups = [];
  function init() {
    var roots = document.querySelectorAll('.ufcb');
    if (!roots.length) return false;
    Array.prototype.forEach.call(roots, function (root) {
      if (root.__ufcb) return; root.__ufcb = true;
      Array.prototype.forEach.call(root.querySelectorAll('.ufcb__card'), function (el) {
        el.innerHTML = INNER;
        cards.push({ el: el, img: el.querySelector('.ufcb__front img'), gf: el.querySelector('.ufcb__front .ufcb__gloss'), gb: el.querySelector('.ufcb__back .ufcb__gloss'), shown: 0 });
      });
      var lv = root.querySelectorAll('.ufcb__lv'); if (lv.length) groups.push(lv);
    });
    return cards.length > 0;
  }

  var t0 = null, lastIdx = -1;
  function frame(now) {
    if (t0 === null) t0 = now;
    var t = (now - t0) / 1000, u = t % CYCLE, k = Math.floor(t / CYCLE) % 4, spin = 0;
    if (!reduce.matches) spin = 360 * (u < HOLD ? 0.03 * u / HOLD : 0.03 + 0.97 * easeIO((u - HOLD) / SPIN));
    var yaw = YAW0 + spin, idx = reduce.matches ? k : (spin > 180 ? (k + 1) % 4 : k);
    var s = Math.sin(yaw * Math.PI / 180), veil = 0.42 * Math.pow(Math.abs(s), 1.6);
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      c.el.style.transform = reduce.matches ? 'none' : 'rotateX(-4deg) rotateY(' + yaw.toFixed(2) + 'deg)';
      if (c.shown !== idx) { c.img.src = CARDS[idx]; c.shown = idx; }
      c.gf.style.setProperty('--g', (50 + 150 * s).toFixed(1) + '%'); c.gf.style.setProperty('--veil', veil.toFixed(3));
      c.gb.style.setProperty('--g', (50 - 150 * s).toFixed(1) + '%'); c.gb.style.setProperty('--veil', (veil * .6).toFixed(3));
    }
    if (idx !== lastIdx) {
      groups.forEach(function (g) { Array.prototype.forEach.call(g, function (l, j) { l.classList.toggle('is-on', j === idx); }); });
      lastIdx = idx;
    }
    requestAnimationFrame(frame);
  }
  function start() { if (init()) requestAnimationFrame(frame); else setTimeout(start, 500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
