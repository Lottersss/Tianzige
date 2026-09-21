// src/tap-translate.js
// Перевод по нажатию: строка текста урока разбивается на слова, каждое слово —
// кнопка, по нажатию открывается карточка слова. Слова берутся из учебников,
// а когда подгружен словник нового HSK — ещё и оттуда (с пиньинем и озвучкой,
// но без перевода).
import { entriesFor, extraInfo, segment } from './data/word-index.js';
import { closeWordPopover, openWordPopover, popoverAnchor } from './word-popover.js';

  // Кнопки, а не span с обработчиком: их можно нажать с клавиатуры, и Safari
  // надёжно отдаёт им клик.
  export function renderTappable(container, text, ctx) {
    container.textContent = "";
    container.dataset.tapText = text;
    container.setAttribute("data-tappable", "");
    if (ctx) {
      container.dataset.book = ctx.book || "";
      container.dataset.lesson = ctx.lesson || "";
    }
    segment(text).forEach((seg) => {
      if (!seg.word) {
        container.appendChild(document.createTextNode(seg.t));
        return;
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tw" + (seg.base ? "" : " is-extra");
      b.textContent = seg.t;
      container.appendChild(b);
    });
  }

  // Словник догрузился — пересобираем уже показанные строки, чтобы слова
  // вроде 暖和 перестали распадаться на части. Прокрутку это не трогает.
  window.addEventListener("zhuzhu:hsk3ready", () => {
    document.querySelectorAll("[data-tappable]").forEach((c) => {
      const ctx = c.dataset.book ? { book: c.dataset.book, lesson: c.dataset.lesson } : null;
      renderTappable(c, c.dataset.tapText || "", ctx);
    });
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".tw");
    if (!b) return;
    // Повторное нажатие на то же слово закрывает карточку.
    if (popoverAnchor() === b) {
      closeWordPopover();
      return;
    }
    const host = b.closest("[data-book]");
    const ctx = host ? { book: host.dataset.book, lesson: host.dataset.lesson } : null;
    const form = b.textContent;
    const entries = entriesFor(form, ctx);
    if (entries.length) {
      openWordPopover(b, { h: form, p: entries[0].p, speak: form, entries });
      return;
    }
    const extra = extraInfo(form);
    if (extra) openWordPopover(b, { h: form, p: extra.p, auto: true, speak: form, entries: [], level: extra.level });
  });
