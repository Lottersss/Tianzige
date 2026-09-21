// src/library.js
// Библиотека — витрина всех словарных списков в одном месте: учебники,
// избранное, повторение и поиск. Собственных данных у неё нет, она только
// показывает то, что уже лежит в базе и в прогрессе.
import { ALL_READY_WORDS } from './data/content-index.js';
import { BOOKS } from './data/meta.js';
import { el, showView } from './dom.js';
import { favoriteCount, favoriteWords } from './favorites.js';
import { hsk3Levels, hsk3WordInfo, levelLabel, levelNum, levelStats, loadHsk3 } from './hsk3.js';
import { goToModeSelect, goToRoadmap, goToReview, setActiveNav } from './navigation.js';
import { collectDueWords, wordKey } from './progress.js';
import { openWordPopover } from './word-popover.js';
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
      title: "Словники HSK 3.0",
      meta: "новый экзамен · 11 000 слов по уровням, с пометкой, что уже есть в учебниках",
      action: showHsk3Levels
    }));

    updateLibraryBadge();
  }

  export function showFavoritesList() {
    libPlace = "fav";
    setBack("К библиотеке");
    el("view-library").classList.add("is-sub");
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
    libPlace = "grid";
    setBack("К библиотеке");
    el("view-library").classList.remove("is-sub");
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

  // Где мы внутри библиотеки: витрина, избранное, уровни словника или один
  // уровень. От этого зависит, куда ведёт кнопка «назад».
  var libPlace = "grid";
  function setBack(label) {
    el("library-back").textContent = "← " + label;
  }

  el("library-back").addEventListener("click", () => {
    if (libPlace === "hsk3-level") {
      showHsk3Levels();
      return;
    }
    libPlace = "grid";
    el("view-library").classList.remove("is-sub");
    el("library-grid").hidden = false;
    el("library-list").hidden = true;
    renderLibrary();
  });

  // --- Словники HSK 3.0 ---------------------------------------------------

  function openList(title) {
    el("view-library").classList.add("is-sub");
    el("library-grid").hidden = true;
    el("library-list").hidden = false;
    el("library-list-title").textContent = title;
    const wrap = el("library-results");
    wrap.innerHTML = "";
    return wrap;
  }

  export function showHsk3Levels() {
    libPlace = "hsk3";
    setBack("К библиотеке");
    const wrap = openList("Словники HSK 3.0 — программа 2025 года");
    if (!hsk3Levels().length) {
      const p = document.createElement("p");
      p.className = "search-hint";
      p.textContent = "Загружаю словник — 11 000 слов…";
      wrap.appendChild(p);
      loadHsk3().then(() => {
        if (libPlace === "hsk3") showHsk3Levels();
      });
      return;
    }
    const intro = document.createElement("p");
    intro.className = "hsk3-intro";
    intro.textContent = "Слова нового HSK по уровням. Зелёным — то, что ты уже знаешь, обычным — есть в твоих учебниках, " +
      "пунктиром — в учебниках нет (у таких слов пока только пиньинь и озвучка). Номера уровней не совпадают со старым HSK: " +
      "новый HSK 5 — это 3 600 слов, старый — около 2 500.";
    wrap.appendChild(intro);
    let cum = 0;
    hsk3Levels().forEach((lv) => {
      const st = levelStats(lv);
      cum += st.total;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "hsk3-level";
      const pk = st.total ? (100 * st.known) / st.total : 0;
      const pb = st.total ? (100 * (st.inBase - st.known)) / st.total : 0;
      row.innerHTML =
        '<span class="hsk3-level-name">' + levelLabel(levelNum(lv.id)) + "</span>" +
        '<span class="hsk3-level-meta">' + st.total + " " + ruWordsCount(st.total) + " · всего " + cum.toLocaleString("ru-RU") +
        " · в учебниках " + st.inBase + " · знаешь " + st.known + "</span>" +
        '<span class="hsk3-bar"><span class="hsk3-bar-known" style="width:' + pk.toFixed(1) + '%"></span>' +
        '<span class="hsk3-bar-base" style="width:' + pb.toFixed(1) + '%"></span></span>';
      row.addEventListener("click", () => showHsk3Level(lv.id));
      wrap.appendChild(row);
    });
  }

  var FILTERS = [["all", "все"], ["todo", "не выучены"], ["missing", "нет в учебниках"]];
  var hsk3Filter = "all";

  export function showHsk3Level(id) {
    const lv = hsk3Levels().find((x) => x.id === id);
    if (!lv) return;
    libPlace = "hsk3-level";
    setBack("Уровни");
    const infos = lv.words.map((w) => hsk3WordInfo(w, id));
    const st = { total: infos.length, inBase: infos.filter((i) => i.entries.length).length, known: infos.filter((i) => i.known).length };
    const wrap = openList("Новый " + levelLabel(levelNum(id)) + " — " + st.total + " " + ruWordsCount(st.total));

    const bar = document.createElement("div");
    bar.className = "hsk3-toolbar";
    const filters = document.createElement("div");
    filters.className = "hsk3-filters";
    FILTERS.forEach(([key, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hsk3-filter" + (hsk3Filter === key ? " is-active" : "");
      b.textContent = label;
      b.setAttribute("aria-pressed", hsk3Filter === key ? "true" : "false");
      b.addEventListener("click", () => {
        hsk3Filter = key;
        showHsk3Level(id);
      });
      filters.appendChild(b);
    });
    bar.appendChild(filters);

    // Учить можно только слова из учебников — у остальных пока нет перевода.
    // Берём следующие 30 невыученных, чтобы урок не растягивался на сотни карточек.
    const todo = [];
    const seen = new Set();
    infos.forEach((i) => {
      if (i.known || !i.entries.length) return;
      const w = i.entries[0];
      const k = wordKey(w._book, w._lesson, w.h);
      if (seen.has(k)) return;
      seen.add(k);
      todo.push(w);
    });
    if (todo.length) {
      const learn = document.createElement("button");
      learn.type = "button";
      learn.className = "side-btn hsk3-learn";
      const n = Math.min(30, todo.length);
      learn.textContent = "Учить " + (todo.length > n ? "следующие " + n + " из " + todo.length : "все " + todo.length) + " →";
      learn.addEventListener("click", () => {
        goToModeSelect({
          type: "list",
          words: todo.slice(0, n),
          label: "Новый " + levelLabel(levelNum(id)) + " · " + n + " " + ruWordsCount(n) + " из учебников",
          crumb: "Словник " + levelLabel(levelNum(id)),
          back: () => goToLibraryAt(() => showHsk3Level(id)),
        });
      });
      bar.appendChild(learn);
    }
    wrap.appendChild(bar);

    const summary = document.createElement("p");
    summary.className = "hsk3-intro";
    summary.textContent = "В учебниках: " + st.inBase + " из " + st.total + " · знаешь: " + st.known + ". Нажми на слово — появится карточка.";
    wrap.appendChild(summary);

    const grid = document.createElement("div");
    grid.className = "hsk3-grid";
    const frag = document.createDocumentFragment();
    let shown = 0;
    infos.forEach((info) => {
      if (hsk3Filter === "todo" && info.known) return;
      if (hsk3Filter === "missing" && info.entries.length) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "hz-chip" + (info.known ? " is-known" : "") + (info.entries.length ? "" : " is-missing");
      chip.innerHTML = '<span class="hz-chip-h"></span><span class="hz-chip-p"></span>';
      chip.firstChild.textContent = info.h;
      chip.lastChild.textContent = info.p;
      chip.addEventListener("click", () => openWordPopover(chip, info));
      frag.appendChild(chip);
      shown++;
    });
    grid.appendChild(frag);
    if (!shown) {
      const p = document.createElement("p");
      p.className = "search-hint";
      p.textContent = hsk3Filter === "todo" ? "Все слова уровня уже отмечены как знакомые." : "На этом уровне все слова есть в твоих учебниках.";
      wrap.appendChild(p);
    }
    wrap.appendChild(grid);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Вернуться в библиотеку и сразу открыть нужное место внутри неё.
  export function goToLibraryAt(open) {
    goToLibrary();
    if (open) open();
  }
