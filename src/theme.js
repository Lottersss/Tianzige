// src/theme.js
// Светлая и тёмная тема. Сама тема ставится ещё в <head> (см. index.html),
// чтобы страница не мигала светлой при загрузке; здесь — переключатель в меню
// и слежение за системной темой, пока своего выбора нет.
import { el } from './dom.js';

  var THEME_KEY = "tianzige_theme_v1";

  function stored() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return t === "dark" || t === "light" ? t : null;
    } catch (e) {
      return null;
    }
  }

  export function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function syncButton() {
    var dark = currentTheme() === "dark";
    var btn = el("theme-toggle");
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    el("theme-toggle-text").textContent = dark ? "Светлая тема" : "Тёмная тема";
  }

  // Канвас с паучком и всё, что рисует цветами не через CSS, слушает это
  // событие и перечитывает палитру.
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    syncButton();
    window.dispatchEvent(new CustomEvent("zhuzhu:themechange", { detail: { theme: theme } }));
  }

  export function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
    }
    apply(next);
  }

  el("theme-toggle").addEventListener("click", toggleTheme);
  syncButton();

  // Пока тему не выбирали вручную, сайт следует за системой — в том числе
  // когда мак сам переключается на тёмную тему вечером.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onSystem = function (e) {
      if (!stored()) apply(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", onSystem);
    else if (mq.addListener) mq.addListener(onSystem);
  }
