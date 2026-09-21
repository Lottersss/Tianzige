// src/web-canvas.js
// Паучок в подвале, который тянется за курсором. Вся анимация процедурная:
// тело едет к цели, а восемь лап переставляются сами, когда стопа слишком
// далеко отъехала от своего места под телом — отсюда живая, чуть нескладная
// походка, которую не получить простым поворотом картинки.
import { el } from './dom.js';

  // Цвета берутся из CSS-переменных темы и перечитываются при её смене —
  // иначе в тёмной теме тёмно-коричневый паук растворился бы в фоне.
  var INK = "58,47,35";       // --ink
  var SILK = "140,122,98";    // --muted
  var EYE = "251,246,235";    // --surface

  function cssRGB(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) return fallback;
    var n = parseInt(m[1], 16);
    return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
  }
  function readColors() {
    INK = cssRGB("--ink", INK);
    SILK = cssRGB("--muted", SILK);
    EYE = cssRGB("--surface", EYE);
  }

  var LEGS = 8;
  var STEP_MS = 170;          // сколько длится перестановка одной лапы
  var STEP_REACH = 33;        // на сколько стопа может отстать, прежде чем шагнуть
  var MAX_STEPPING = 4;       // больше половины лап в воздухе одновременно — уже не паук
  var BODY_EASE = 0.055;
  // Потолок скорости тела. Без него при резком прыжке курсора тело летело бы
  // быстрее, чем лапы успевают переставляться (шаг — 170 мс), и они
  // растягивались бы резинками на пол-экрана.
  var MAX_SPEED = 3.6;        // пикселей за кадр, ~215 px/с
  var IDLE_MS = 2600;         // без курсора паук начинает бродить сам

  export function initWebCanvas() {
    var canvas = el("web-canvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var w = 0, h = 0;
    var spider = null;
    var anchors = [];
    var specks = [];
    var target = { x: 0, y: 0 };
    var lastPointer = 0;
    var wanderAt = 0;
    var running = false;
    var rafId = 0;
    var prev = 0;

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function buildScene() {
      // Точки крепления паутины и пылинки раскидываем один раз на текущий
      // размер — они статичные, пересчитываются только при ресайзе.
      anchors = [];
      var n = Math.max(3, Math.round(w / 260));
      for (var i = 0; i < n; i++) {
        anchors.push({ x: rand(w * 0.08, w * 0.92), y: rand(6, h - 6) });
      }
      specks = [];
      var m = Math.max(6, Math.round(w / 90));
      for (var j = 0; j < m; j++) {
        specks.push({ x: rand(0, w), y: rand(0, h), r: rand(0.5, 1.4), a: rand(0.12, 0.34) });
      }
    }

    function makeSpider() {
      var s = { x: w * 0.72, y: h * 0.5, px: w * 0.72, py: h * 0.5, angle: 0, legs: [] };
      for (var i = 0; i < LEGS; i++) {
        var side = i < LEGS / 2 ? -1 : 1;          // -1 слева, +1 справа
        var k = i % (LEGS / 2);                     // 0..3 от головы к брюшку
        var spread = (-0.75 + k * 0.5) * Math.PI * 0.42;
        var restAngle = side * (Math.PI / 2) + spread * side * -1;
        var restDist = 22 + Math.abs(1.5 - k) * 3.2;
        s.legs.push({
          restAngle: restAngle,
          restDist: restDist,
          foot: { x: s.x, y: s.y },
          from: null,
          to: null,
          t: 0,
          stepping: false
        });
      }
      placeFeet(s, true);
      return s;
    }

    function idealFoot(s, leg) {
      var a = s.angle + leg.restAngle;
      return { x: s.x + Math.cos(a) * leg.restDist, y: s.y + Math.sin(a) * leg.restDist };
    }

    function placeFeet(s, snap) {
      for (var i = 0; i < s.legs.length; i++) {
        var p = idealFoot(s, s.legs[i]);
        if (snap) {
          s.legs[i].foot.x = p.x;
          s.legs[i].foot.y = p.y;
        }
      }
    }

    function clampTarget(x, y) {
      var pad = 22;
      target.x = Math.max(pad, Math.min(w - pad, x));
      target.y = Math.max(pad, Math.min(h - pad, y));
    }

    function onPointer(e) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      lastPointer = performance.now();
      clampTarget(e.clientX - rect.left, e.clientY - rect.top);
    }

    function wander(now) {
      // Курсора нет (телефон, или мышь давно не двигалась) — паук гуляет сам,
      // иначе он просто замирал бы в углу и выглядел сломанным.
      if (now < wanderAt) return;
      wanderAt = now + rand(1400, 3200);
      clampTarget(rand(w * 0.12, w * 0.88), rand(h * 0.2, h * 0.8));
    }

    function update(dt, now) {
      if (now - lastPointer > IDLE_MS) wander(now);

      spider.px = spider.x;
      spider.py = spider.y;
      var mx = (target.x - spider.x) * BODY_EASE, my = (target.y - spider.y) * BODY_EASE;
      var step = Math.sqrt(mx * mx + my * my);
      if (step > MAX_SPEED) {
        mx *= MAX_SPEED / step;
        my *= MAX_SPEED / step;
      }
      spider.x += mx;
      spider.y += my;

      var dx = spider.x - spider.px, dy = spider.y - spider.py;
      var speed = Math.sqrt(dx * dx + dy * dy);
      if (speed > 0.12) {
        var want = Math.atan2(dy, dx);
        var diff = Math.atan2(Math.sin(want - spider.angle), Math.cos(want - spider.angle));
        spider.angle += diff * 0.12;
      }

      var steppingNow = 0;
      var i;
      for (i = 0; i < spider.legs.length; i++) if (spider.legs[i].stepping) steppingNow++;

      for (i = 0; i < spider.legs.length; i++) {
        var leg = spider.legs[i];
        if (leg.stepping) {
          leg.t += dt / STEP_MS;
          if (leg.t >= 1) {
            leg.t = 1;
            leg.stepping = false;
            leg.foot.x = leg.to.x;
            leg.foot.y = leg.to.y;
          } else {
            var e = leg.t < 0.5 ? 2 * leg.t * leg.t : 1 - Math.pow(-2 * leg.t + 2, 2) / 2;
            leg.foot.x = leg.from.x + (leg.to.x - leg.from.x) * e;
            leg.foot.y = leg.from.y + (leg.to.y - leg.from.y) * e;
          }
          continue;
        }
        var ideal = idealFoot(spider, leg);
        var fx = ideal.x - leg.foot.x, fy = ideal.y - leg.foot.y;
        var lag = Math.sqrt(fx * fx + fy * fy);
        if (lag < STEP_REACH) continue;
        // Соседнюю лапу в паре не отрываем одновременно — иначе паук
        // «плывёт», как будто у него нет опоры. Но лапу, отставшую втрое
        // больше обычного (после ресайза или сна вкладки), переставляем сразу.
        var stuck = lag > STEP_REACH * 3;
        if (!stuck && (steppingNow >= MAX_STEPPING || spider.legs[i ^ 1].stepping)) continue;
        leg.stepping = true;
        leg.t = 0;
        leg.from = { x: leg.foot.x, y: leg.foot.y };
        leg.to = { x: ideal.x + rand(-2, 2), y: ideal.y + rand(-2, 2) };
        steppingNow++;
      }
    }

    function drawLeg(s, leg) {
      var hipA = s.angle + leg.restAngle * 0.55;
      var hx = s.x + Math.cos(hipA) * 4.3;
      var hy = s.y + Math.sin(hipA) * 4.3;
      var fx = leg.foot.x, fy = leg.foot.y;
      var mx = (hx + fx) / 2, my = (hy + fy) / 2;
      // Колено поднимаем перпендикулярно лапе: получается характерный излом,
      // а в шаге ещё и подъём, чтобы стопа не ехала по земле.
      var dx = fx - hx, dy = fy - hy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var lift = 6 + len * 0.17 + (leg.stepping ? Math.sin(leg.t * Math.PI) * 5 : 0);
      var kx = mx + (-dy / len) * lift;
      var ky = my + (dx / len) * lift;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(kx, ky, fx, fy);
      ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      var i;
      for (i = 0; i < specks.length; i++) {
        var sp = specks[i];
        ctx.fillStyle = "rgba(" + SILK + "," + sp.a + ")";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Паутинка: ниточки к ближайшим точкам крепления, чем дальше — тем бледнее.
      ctx.lineWidth = 0.7;
      for (i = 0; i < anchors.length; i++) {
        var a = anchors[i];
        var d = Math.hypot(a.x - spider.x, a.y - spider.y);
        var alpha = Math.max(0, 0.3 - d / (w * 1.9));
        if (alpha <= 0.015) continue;
        ctx.strokeStyle = "rgba(" + SILK + "," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        var sag = Math.min(14, d * 0.12);
        ctx.quadraticCurveTo((a.x + spider.x) / 2, (a.y + spider.y) / 2 + sag, spider.x, spider.y);
        ctx.stroke();
        ctx.fillStyle = "rgba(" + SILK + ",0.3)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(" + INK + ",0.75)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      for (i = 0; i < spider.legs.length; i++) drawLeg(spider, spider.legs[i]);

      ctx.save();
      ctx.translate(spider.x, spider.y);
      ctx.rotate(spider.angle);
      ctx.fillStyle = "rgba(" + INK + ",0.92)";
      ctx.beginPath();
      ctx.ellipse(-4.6, 0, 7.2, 5.8, 0, 0, Math.PI * 2);   // брюшко
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4.1, 0, 4.2, 3.5, 0, 0, Math.PI * 2);      // головогрудь
      ctx.fill();
      ctx.fillStyle = "rgba(" + EYE + ",0.85)";
      ctx.beginPath();
      ctx.arc(5.9, -1.5, 0.9, 0, Math.PI * 2);
      ctx.arc(5.9, 1.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min(48, now - prev || 16);
      prev = now;
      update(dt, now);
      draw();
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced) return;
      running = true;
      prev = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function setup() {
      if (!resize()) return false;
      buildScene();
      if (!spider) {
        spider = makeSpider();
        clampTarget(spider.x, spider.y);
      } else {
        clampTarget(spider.x, spider.y);
        placeFeet(spider, true);
      }
      draw();
      return true;
    }

    readColors();
    if (!setup()) {
      // Подвал может быть ещё нулевой высоты на первом кадре — пробуем ещё раз.
      requestAnimationFrame(setup);
    }
    window.addEventListener("zhuzhu:themechange", () => {
      readColors();
      if (!running && spider) draw();
    });

    window.addEventListener("resize", () => {
      if (resize()) {
        buildScene();
        clampTarget(spider.x, spider.y);
        if (!running) draw();
      }
    });
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Крутить анимацию, когда подвал за экраном, незачем — это просто
    // сожранная батарея на ноутбуке и телефоне.
    if (!reduced && "IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) start();
        else stop();
      }, { threshold: 0.01 }).observe(canvas);
    } else if (!reduced) {
      start();
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
  }
