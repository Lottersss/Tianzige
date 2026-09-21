// src/word-popover.js
// Всплывающая карточка слова: пиньинь, перевод, откуда слово, озвучка и
// звёздочка. Одна на весь сайт — её открывают и перевод по нажатию в текстах
// уроков, и списки словника HSK 3.0.
import { BOOKS, POS_RU } from './data/meta.js';
import { makeStarButton } from './favorites.js';
import { hsk3LevelOf } from './hsk3.js';
import { wordKey } from './progress.js';
import { hasSpeech, speakText } from './speech.js';
import { state } from './state.js';

  var pop = null;
  var anchor = null;

  function ensure() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "word-pop";
    pop.id = "word-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Слово");
    pop.hidden = true;
    document.body.appendChild(pop);
    return pop;
  }

  function statusOf(w) {
    const r = state.PROGRESS[wordKey(w._book, w._lesson, w.h)];
    if (r && r.status === "known") return { cls: "is-known", text: "знаю" };
    if (r && r.status === "learning") return { cls: "is-learning", text: "учу" };
    return { cls: "", text: "новое" };
  }
  function bookName(id) {
    const b = BOOKS.find((x) => x.id === id);
    return b ? b.hz : id;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // info: { h, p, auto, speak, entries: [слова из учебников], level? }
  export function openWordPopover(el, info) {
    const box = ensure();
    if (anchor) anchor.classList.remove("is-active");
    anchor = el;
    el.classList.add("is-active");

    const main = info.entries && info.entries[0];
    const lvl = info.level || hsk3LevelOf(info.speak || info.h);
    let html = '<div class="wp-head"><span class="wp-hz">' + esc(info.h) + '</span><span class="wp-tools"></span></div>' +
      '<p class="wp-py">' + esc(info.p) + (info.auto ? ' <span class="wp-auto" title="Пиньинь подобран автоматически и может ошибаться в тонах">авто</span>' : "") + "</p>";
    if (main) {
      html += '<p class="wp-ru">' + esc(main.ru) + (main.pos ? ' <span class="wp-pos">' + esc(POS_RU[main.pos] || main.pos) + "</span>" : "") + "</p>";
      if (main.en) html += '<p class="wp-en">' + esc(main.en) + "</p>";
      // Если слово учится в нескольких местах с разными значениями — покажем и их.
      const other = [];
      info.entries.slice(1).forEach((w) => {
        if (w.ru !== main.ru && other.indexOf(w.ru) === -1) other.push(w.ru);
      });
      if (other.length) html += '<p class="wp-other">ещё: ' + other.slice(0, 2).map(esc).join("; ") + "</p>";
      const st = statusOf(main);
      html += '<p class="wp-src"><span class="wp-status ' + st.cls + '">' + st.text + "</span>" +
        esc(bookName(main._book)) + " · урок " + esc(main._lesson) + (lvl ? " · новый HSK " + esc(lvl) : "") + "</p>";
    } else {
      html += '<p class="wp-missing">Этого слова нет в твоих учебниках, поэтому перевода пока нет. Послушать можно.</p>';
      if (lvl) html += '<p class="wp-src">новый HSK ' + esc(lvl) + "</p>";
    }
    box.innerHTML = html;

    const tools = box.querySelector(".wp-tools");
    const spk = document.createElement("button");
    spk.type = "button";
    spk.className = "wp-speak";
    spk.setAttribute("aria-label", "Произнести");
    spk.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 8v4h3l4 3V5L6 8H3z" fill="currentColor"/><path d="M13 7.5c1 1 1 4 0 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M15.2 5.5c2 2 2 7 0 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    spk.disabled = !hasSpeech;
    spk.addEventListener("click", () => speakText(info.speak || info.h));
    tools.appendChild(spk);
    if (main) tools.appendChild(makeStarButton(main));

    box.hidden = false;
    place(el);
  }

  // Под словом, а если снизу не хватает места — над ним. По горизонтали не
  // вылезаем за край экрана (на телефоне это главное).
  function place(el) {
    const r = el.getBoundingClientRect();
    const margin = 12;
    pop.style.left = "0px";
    pop.style.top = "0px";
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(margin, Math.min(window.innerWidth - w - margin, left));
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - margin && r.top - h - 8 > margin) top = r.top - h - 8;
    pop.style.left = left + window.scrollX + "px";
    pop.style.top = top + window.scrollY + "px";
  }

  export function closeWordPopover() {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (anchor) {
      anchor.classList.remove("is-active");
      anchor = null;
    }
  }
  export function popoverAnchor() {
    return anchor;
  }

  document.addEventListener("click", (e) => {
    if (!pop || pop.hidden) return;
    if (pop.contains(e.target) || (anchor && anchor.contains(e.target))) return;
    closeWordPopover();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !pop || pop.hidden) return;
    const a = anchor;
    closeWordPopover();
    if (a) a.focus();
  });
  window.addEventListener("resize", closeWordPopover);
  window.addEventListener("zhuzhu:viewchange", closeWordPopover);
