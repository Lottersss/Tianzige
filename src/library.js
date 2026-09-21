// src/library.js
// Библиотека — витрина всех словарных списков в одном месте: учебники,
// избранное, повторение и поиск. Собственных данных у неё нет, она только
// показывает то, что уже лежит в базе и в прогрессе.
import { ALL_READY_WORDS } from './data/content-index.js';
import { BOOKS } from './data/meta.js';
import { el, showView } from './dom.js';
import { favoriteCount, favoriteWords } from './favorites.js';
import { goToRoadmap, goToReview, setActiveNav } from './navigation.js';
import { collectDueWords } from './progress.js';
import { buildRow, goToSearch } from './search.js';
import { onProgressSave } from './state.js';

  function ruWordsCount(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "слово";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "слова";
    return "слов";
  }

  function tile(cfg) {
    const card = document.createElement("button");
    card.className = "lib-tile" + (cfg.soon ? " is-soon" : "");
    card.type = "button";
    card.disabled = !!cfg.soon;
    card.innerHTML =
      '<span class="lib-hz">' + cfg.hz + "</span>" +
      '<span class="lib-title">' + cfg.title + "</span>" +
      '<span class="lib-meta">' + cfg.meta + "</span>" +
      (cfg.soon ? '<span class="soon-tag">скоро</span>' : "");
    if (cfg.action) card.addEventListener("click", cfg.action);
    return card;
  }

  export function updateLibraryBadge() {
    const n = favoriteCount();
    const badge = el("library-badge");
    badge.hidden = n === 0;
    badge.textContent = n;
  }

  export function renderLibrary() {
    const root = el("library-grid");
    root.innerHTML = "";

    const readyBooks = BOOKS.filter((b) => b.ready);
    const lessons = readyBooks.reduce((s, b) => s + b.lessons, 0);
    const favN = favoriteCount();
    const dueN = collectDueWords().length;

    root.appendChild(tile({
      hz: "书",
      title: "Учебники",
      meta: readyBooks.length + " книг \xB7 " + lessons + " уроков \xB7 " + ALL_READY_WORDS.length + " слов",
      action: goToRoadmap
    }));
    root.appendChild(tile({
      hz: "星",
      title: "Избранное",
      meta: favN ? favN + " " + ruWordsCount(favN) : "пока пусто — жми звёздочку на слове",
      action: showFavoritesList
    }));
    root.appendChild(tile({
      hz: "复",
      title: "Повторение",
      meta: dueN ? dueN + " " + ruWordsCount(dueN) + " ждут" : "сейчас нечего повторять",
      action: goToReview
    }));
    root.appendChild(tile({
      hz: "找",
      title: "Поиск",
      meta: "по всей базе: иероглиф, pinyin или перевод",
      action: goToSearch
    }));
    root.appendChild(tile({
      hz: "我",
      title: "Мои слова",
      meta: "слова из своих текстов и книг",
      soon: true
    }));
    root.appendChild(tile({
      hz: "考",
      title: "Словники HSK",
      meta: "официальные списки HSK 1–6",
      soon: true
    }));

    updateLibraryBadge();
  }

  export function showFavoritesList() {
    const words = favoriteWords();
    el("library-grid").hidden = true;
    el("library-list").hidden = false;
    el("library-list-title").textContent = "Избранное — " + words.length + " " + ruWordsCount(words.length);
    const wrap = el("library-results");
    wrap.innerHTML = "";
    if (!words.length) {
      const p = document.createElement("p");
      p.className = "search-hint";
      p.textContent = "Здесь пока пусто. На любом слове — в карточках или в поиске — есть звёздочка: отмеченные собираются сюда.";
      wrap.appendChild(p);
      return;
    }
    // Снятая звёздочка должна убирать слово из списка сразу — иначе строка
    // остаётся висеть и непонятно, сработало ли.
    words.forEach((w) => wrap.appendChild(buildRow(w, () => {
      showFavoritesList();
      updateLibraryBadge();
    })));
  }

  export function goToLibrary() {
    showView("view-library");
    setActiveNav("library");
    el("crumbs").hidden = true;
    el("crumbs").innerHTML = "";
    el("library-grid").hidden = false;
    el("library-list").hidden = true;
    renderLibrary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Счётчик у пункта меню живёт сам по себе: navigation.js про библиотеку
  // ничего не знает, иначе получился бы циклический импорт.
  onProgressSave(updateLibraryBadge);
  updateLibraryBadge();

  el("library-back").addEventListener("click", () => {
    el("library-grid").hidden = false;
    el("library-list").hidden = true;
    renderLibrary();
  });
