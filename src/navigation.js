// src/navigation.js
import { exercisesFor, grammarFor, textsFor } from './data/content-index.js';
import { HSK_WORDS, lessonKeysFor } from './data/index.js';
import { lessonTitleFor } from './data/lesson-titles.js';
import { chengyuOfTheDay } from './data/chengyu.js';
import { BOOKS, HSK_LEVELS } from './data/meta.js';
import { el, showView, shuffle } from './dom.js';
import { bookKnownCount, collectDueWords, currentBookId, lastStudiedLesson, lessonKnownCount, overallCount, readyBooksLabel, studiedToday } from './progress.js';
import { computePace } from './goal.js';
import { liveStreak, saveDirection, state } from './state.js';
import { count } from './vendor/hanzi-writer.esm.js';

  export function setActiveNav(which) {
    el("nav-roadmap").classList.toggle("is-active", which === "roadmap");
    el("nav-library").classList.toggle("is-active", which === "library");
    el("nav-progress").classList.toggle("is-active", which === "progress");
    el("nav-review").classList.toggle("is-active", which === "review");
    el("nav-search").classList.toggle("is-active", which === "search");
    el("nav-about").classList.toggle("is-active", which === "about");
  }
  export function modeLabel(mode) {
    return { cards: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438", learn: "\u0423\u0447\u0438\u0442\u044C", test: "\u0422\u0435\u0441\u0442", match: "\u041C\u0430\u0442\u0447", text: "\u0422\u0435\u043A\u0441\u0442", grammar: "\u0413\u0440\u0430\u043C\u043C\u0430\u0442\u0438\u043A\u0430", exercise: "\u0423\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u044F" }[mode] || "";
  }
  export function ruDays(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "\u0434\u0435\u043D\u044C";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "\u0434\u043D\u044F";
    return "\u0434\u043D\u0435\u0439";
  }
  export function renderDirectionToggle() {
    el("direction-toggle").querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.dir === state.direction);
    });
  }
  el("direction-toggle").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.direction = btn.dataset.dir;
      saveDirection();
      renderDirectionToggle();
    });
  });
  export function renderSidebar() {
    const o = overallCount();
    el("overall-fill").style.width = (o.total ? Math.round(100 * o.known / o.total) : 0) + "%";
    el("overall-label").textContent = o.known + "/" + o.total + " \u0441\u043B\u043E\u0432";
    const readyWords = BOOKS.filter((b) => b.ready).reduce((s, b) => s + b.words, 0);
    el("loaded-badge").textContent = "\u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E: " + readyWords + " \u0441\u043B\u043E\u0432 (" + readyBooksLabel() + ")";
    // «сейчас: HSK N» — тоже не по умолчанию: показываем только когда есть
    // реально пройденный урок, и берём уровень той же книги, на которой
    // стоит метка «ты здесь», чтобы эти две подписи не спорили друг с другом.
    const hereBook = currentBookId();
    const levelBadge = el("level-badge");
    if (hereBook) {
      const hb = BOOKS.find((b) => b.id === hereBook);
      const lvl = HSK_LEVELS.find((h) => h.level === (hb && hb.hsk));
      el("level-badge-text").textContent = "сейчас: " + (lvl ? lvl.label : "HSK " + (hb ? hb.hsk : ""));
      levelBadge.hidden = false;
    } else {
      levelBadge.hidden = true;
    }
    const due = collectDueWords().length;
    const badge = el("review-badge");
    if (due > 0) {
      badge.hidden = false;
      badge.textContent = due;
    } else {
      badge.hidden = true;
    }
    const streakBadge = el("streak-badge");
    const current = liveStreak();
    if (current > 0) {
      streakBadge.hidden = false;
      el("streak-text").textContent = current + " " + ruDays(current) + " \u043F\u043E\u0434\u0440\u044F\u0434";
    } else {
      streakBadge.hidden = true;
    }
  }
  export function refreshActiveCounts() {
    renderSidebar();
    if (!el("view-roadmap").hidden) renderRoadmap();
  }
  export function renderCrumbs(parts) {
    const c = el("crumbs");
    if (!parts.length) {
      c.hidden = true;
      c.innerHTML = "";
      return;
    }
    c.hidden = false;
    c.innerHTML = parts.map((p, i) => {
      const isLast = i === parts.length - 1;
      const sep = i > 0 ? '<span class="sep">/</span>' : "";
      if (isLast) return sep + '<span class="current">' + p.label + "</span>";
      return sep + '<button data-nav="' + i + '">' + p.label + "</button>";
    }).join("");
    Array.from(c.querySelectorAll("button")).forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.nav, 10);
        parts[idx].action();
      });
    });
  }
  export function renderRoadmap() {
    const root = el("roadmap-grid");
    root.innerHTML = "";
    // Метка «ты здесь» — не по умолчанию: она появляется только после того,
    // как полностью закрыт хотя бы один урок, и стоит на той книге, где это
    // произошло (currentBookId вернёт null, пока ни один урок не пройден).
    const hereBook = currentBookId();

    // Group books by HSK level (in level order), then render one titled,
    // color-coded section per level \u2014 each section's cards inherit its
    // accent color via the --lvl-color custom property.
    const byLevel = new Map();
    BOOKS.forEach((b) => {
      const lvl = b.hsk || 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl).push(b);
    });

    Array.from(byLevel.keys()).sort((a, z) => a - z).forEach((lvl) => {
      const meta = HSK_LEVELS.find((h) => h.level === lvl);
      const section = document.createElement("div");
      section.className = "hsk-section";
      if (meta) {
        section.style.setProperty("--lvl-color", meta.color);
        section.style.setProperty("--lvl-soft", meta.soft);
      }

      const heading = document.createElement("h2");
      heading.className = "hsk-heading";
      heading.innerHTML = '<span class="hsk-dot"></span>' + (meta ? meta.label : "\u0414\u0440\u0443\u0433\u043E\u0435");
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "roadmap-grid";

      byLevel.get(lvl).forEach((b) => {
        const card = document.createElement("button");
        card.className = "book-card";
        card.type = "button";
        card.disabled = !b.ready;
        if (hereBook && b.id === hereBook) {
          const here = document.createElement("span");
          here.className = "here";
          here.textContent = "\u0442\u044B \u0437\u0434\u0435\u0441\u044C";
          card.appendChild(here);
        }
        let progressHtml = "";
        if (b.ready) {
          const c = bookKnownCount(b.id);
          const pct = c.total ? Math.round(100 * c.known / c.total) : 0;
          if (pct === 100) {
            const st = document.createElement("span");
            st.className = "stamp";
            st.textContent = "\u5B8C";
            card.appendChild(st);
          }
          progressHtml = '<div class="book-progress-track"><div class="book-progress-fill" style="width:' + pct + '%"></div></div><div class="book-meta">' + c.known + "/" + c.total + " \u0441\u043B\u043E\u0432 \u0437\u043D\u0430\u044E \xB7 " + b.lessons + " \u0443\u0440\u043E\u043A\u043E\u0432</div>";
        } else {
          progressHtml = '<span class="soon-tag">\u0441\u043A\u043E\u0440\u043E</span><div class="book-meta">' + b.lessons + " \u0443\u0440\u043E\u043A\u043E\u0432 \xB7 " + b.words + " \u0441\u043B\u043E\u0432</div>";
        }
        card.innerHTML += '<span class="book-num">' + b.hsk + "</span>" +
          '<span class="book-head"><span class="book-hz">' + b.hz + '</span><span class="book-sub">' + b.sub + "</span>" +
          (b.desc ? '<span class="book-desc">' + b.desc + "</span>" : "") + "</span>" +
          '<span class="book-foot">' + progressHtml + "</span>";
        if (b.ready) card.addEventListener("click", () => goToLessons(b.id));
        grid.appendChild(card);
      });

      section.appendChild(grid);
      root.appendChild(section);
    });
    renderHomeSide();
  }
  export function ruNew(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "новое";
    return "новых";
  }
  export function ruWords(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "слово";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "слова";
    return "слов";
  }
  // Правая колонка на главной: «Продолжить», короткая сводка за сегодня и
  // чэнъюй дня. Ничего из этого не хранится отдельно — всё считается из
  // того же прогресса, что и роадмап.
  export function renderHomeSide() {
    const root = el("home-side");
    root.innerHTML = "";

    // --- Продолжить -------------------------------------------------------
    const last = lastStudiedLesson();
    const target = last || (BOOKS.find((b) => b.ready) ? { book: BOOKS.find((b) => b.ready).id, lesson: lessonKeysFor(BOOKS.find((b) => b.ready).id)[0] } : null);
    if (target) {
      const book = BOOKS.find((b) => b.id === target.book);
      const title = lessonTitleFor(target.book, target.lesson);
      const known = lessonKnownCount(target.book, target.lesson);
      const total = HSK_WORDS[target.book][target.lesson].length;
      const card = document.createElement("div");
      card.className = "side-card side-resume";
      card.innerHTML =
        '<span class="side-label">' + (last ? "Продолжить" : "Начать") + "</span>" +
        '<span class="side-lesson-hz">' + (title ? title.zh : "Урок " + target.lesson) + "</span>" +
        '<span class="side-lesson-sub">' + book.hz + " \xB7 урок " + target.lesson + "</span>" +
        '<div class="side-bar"><div class="side-bar-fill" style="width:' + (total ? Math.round(100 * known / total) : 0) + '%"></div></div>' +
        '<span class="side-meta">' + known + "/" + total + " слов знаю</span>";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "side-btn";
      btn.textContent = last ? "Продолжить →" : "Начать →";
      btn.addEventListener("click", () => {
        const words = HSK_WORDS[target.book][target.lesson].map((w) => Object.assign({}, w, { _book: target.book, _lesson: target.lesson }));
        goToModeSelect({ type: "lesson", book: target.book, lesson: target.lesson, words });
      });
      card.appendChild(btn);
      root.appendChild(card);
    }

    // --- Сегодня ----------------------------------------------------------
    const today = studiedToday();
    const due = collectDueWords().length;
    const streak = liveStreak();
    const stats = document.createElement("div");
    stats.className = "side-card";
    stats.innerHTML =
      '<span class="side-label">Сегодня</span>' +
      '<div class="side-stats">' +
        '<div class="side-stat"><b>' + today + "</b><span>" + ruWords(today) + " за день</span></div>" +
        '<div class="side-stat"><b>' + streak + "</b><span>" + ruDays(streak) + " подряд</span></div>" +
        '<div class="side-stat"><b>' + due + "</b><span>ждут повтора</span></div>" +
      "</div>";

    // План на день из «Прогресса»: сколько новых слов нужно и сколько уже есть.
    // Кнопка ведёт на экран прогресса через пункт меню — так navigation.js не
    // импортирует progress-view.js (тот сам импортирует navigation.js).
    const pace = computePace();
    const toProgress = () => el("nav-progress").click();
    if (pace.need && (pace.state === "ontrack" || pace.state === "behind" || pace.state === "nodata")) {
      const perDay = Math.max(1, Math.ceil(pace.need));
      const pct = Math.min(100, Math.round((100 * pace.learnedToday) / perDay));
      const plan = document.createElement("button");
      plan.type = "button";
      plan.className = "side-plan" + (pace.learnedToday >= perDay ? " is-done" : "");
      plan.innerHTML =
        '<span class="side-plan-top"><span>План: ' + perDay + " " + ruNew(perDay) + " в день</span><span>сегодня " + pace.learnedToday + "</span></span>" +
        '<span class="side-plan-bar"><span style="width:' + pct + '%"></span></span>';
      plan.addEventListener("click", toProgress);
      stats.appendChild(plan);
    } else if (pace.state === "nogoal" || pace.state === "past") {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "side-link";
      link.textContent = pace.state === "past" ? "Дата экзамена прошла — обновить цель →" : "Поставить цель и посчитать темп →";
      link.addEventListener("click", toProgress);
      stats.appendChild(link);
    }
    if (due > 0) {
      const rbtn = document.createElement("button");
      rbtn.type = "button";
      rbtn.className = "side-btn ghost";
      rbtn.textContent = "Повторить →";
      rbtn.addEventListener("click", goToReview);
      stats.appendChild(rbtn);
    }
    root.appendChild(stats);

    // --- Чэнъюй дня -------------------------------------------------------
    const cy = chengyuOfTheDay();
    const quote = document.createElement("div");
    quote.className = "side-card side-chengyu";
    quote.innerHTML =
      '<span class="side-label">Чэнъюй дня</span>' +
      '<span class="chengyu-hz">' + cy.h + "</span>" +
      '<span class="chengyu-py">' + cy.p + "</span>" +
      '<span class="chengyu-ru">' + cy.ru + "</span>";
    root.appendChild(quote);
  }
  // Если цель — новый HSK, план на день ждёт словник 3.0; когда он
  // догрузится, перерисовываем правую колонку.
  window.addEventListener("zhuzhu:hsk3ready", () => {
    if (!el("view-roadmap").hidden) renderHomeSide();
  });
  export function goToRoadmap() {
    showView("view-roadmap");
    setActiveNav("roadmap");
    renderCrumbs([]);
    renderRoadmap();
    renderSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function goToAbout() {
    showView("view-about");
    setActiveNav("about");
    el("crumbs").hidden = true;
    el("crumbs").innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function goToReview() {
    setActiveNav("review");
    const words = collectDueWords();
    if (words.length === 0) {
      showView("view-review-empty");
      renderCrumbs([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goToModeSelect({ type: "review", words: shuffle(words) });
  }
  export function goToLessons(bookId) {
    state.currentBookId = bookId;
    showView("view-lessons");
    setActiveNav("roadmap");
    const book = BOOKS.find((b) => b.id === bookId);
    el("lessons-eyebrow").textContent = book.hz + " \xB7 " + book.sub;
    const grid = el("lessons-grid");
    grid.innerHTML = "";
    lessonKeysFor(bookId).forEach((lk) => {
      const words = HSK_WORDS[bookId][lk];
      const known = lessonKnownCount(bookId, lk);
      const tile = document.createElement("button");
      tile.className = "lesson-tile";
      tile.type = "button";
      if (known === words.length) {
        const st = document.createElement("span");
        st.className = "stamp-mini";
        st.textContent = "\u2713";
        tile.appendChild(st);
      }
      const title = lessonTitleFor(bookId, lk);
      tile.innerHTML += '<span class="lesson-num">' + lk + '</span>' +
        (title ? '<span class="lesson-title">' + title.zh + '</span>' : '<span class="lesson-title">\u0423\u0440\u043E\u043A ' + lk + '</span>') +
        '<span class="lesson-count">' + known + "/" + words.length + " \u0441\u043B\u043E\u0432</span>";
      tile.addEventListener("click", () => {
        const ctxWords = words.map((w) => Object.assign({}, w, { _book: bookId, _lesson: lk }));
        goToModeSelect({ type: "lesson", book: bookId, lesson: lk, words: ctxWords });
      });
      grid.appendChild(tile);
    });
    renderCrumbs([
      { label: "\u86DB\u86DB", action: goToRoadmap },
      { label: book.hz }
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function goToModeSelect(ctx) {
    state.currentCtx = ctx;
    showView("view-mode-select");
    setActiveNav(ctx.type === "review" ? "review" : ctx.type === "list" ? "library" : "roadmap");
    renderDirectionToggle();
    if (ctx.type === "list") {
      // Произвольный список слов (например, из словника HSK 3.0): своя подпись
      // и возврат туда, откуда пришли.
      el("mode-select-eyebrow").textContent = ctx.label;
      renderCrumbs([
        { label: "蛛蛛", action: goToRoadmap },
        { label: ctx.crumb, action: ctx.back },
        { label: "Режим" }
      ]);
    } else if (ctx.type === "lesson") {
      const book = BOOKS.find((b) => b.id === ctx.book);
      const title = lessonTitleFor(ctx.book, ctx.lesson);
      el("mode-select-eyebrow").textContent = book.hz + " \xB7 \u0423\u0440\u043E\u043A " + ctx.lesson + (title ? " \xB7 " + title.zh : "");
      renderCrumbs([
        { label: "\u86DB\u86DB", action: goToRoadmap },
        { label: book.hz, action: () => goToLessons(ctx.book) },
        { label: "\u0423\u0440\u043E\u043A " + ctx.lesson }
      ]);
    } else {
      el("mode-select-eyebrow").textContent = "\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \xB7 " + ctx.words.length + " \u0441\u043B\u043E\u0432";
      renderCrumbs([
        { label: "\u86DB\u86DB", action: goToRoadmap },
        { label: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" }
      ]);
    }
    const matchBtn = document.querySelector('.mode-card[data-mode="match"]');
    const tooFew = ctx.words.length < 2;
    matchBtn.disabled = tooFew;
    matchBtn.style.opacity = tooFew ? "0.4" : "";
    matchBtn.style.cursor = tooFew ? "default" : "";
    const isLesson = ctx.type === "lesson";
    [
      ["text", isLesson && textsFor(ctx.book, ctx.lesson)],
      ["grammar", isLesson && grammarFor(ctx.book, ctx.lesson)],
      ["exercise", isLesson && exercisesFor(ctx.book, ctx.lesson)]
    ].forEach((pair) => {
      const btn = document.querySelector('.mode-card[data-mode="' + pair[0] + '"]');
      const ok = !!pair[1];
      btn.hidden = !isLesson;
      btn.disabled = !ok;
      btn.style.opacity = ok ? "" : "0.4";
      btn.style.cursor = ok ? "" : "default";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function updateCrumbsForStudy() {
    const studyCtx = state.studyCtx;
    if (studyCtx.type === "list") {
      renderCrumbs([
        { label: "\u86DB\u86DB", action: goToRoadmap },
        { label: studyCtx.crumb, action: studyCtx.back },
        { label: modeLabel(studyCtx.mode) }
      ]);
    } else if (studyCtx.type === "review") {
      renderCrumbs([
        { label: "\u86DB\u86DB", action: goToRoadmap },
        { label: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C", action: goToReview },
        { label: modeLabel(studyCtx.mode) }
      ]);
    } else {
      const book = BOOKS.find((b) => b.id === studyCtx.book);
      renderCrumbs([
        { label: "\u86DB\u86DB", action: goToRoadmap },
        { label: book.hz, action: () => goToLessons(studyCtx.book) },
        { label: "\u0423\u0440\u043E\u043A " + studyCtx.lesson, action: () => goToModeSelect(studyCtx) },
        { label: modeLabel(studyCtx.mode) }
      ]);
    }
  }
  export function summaryActionsFor(primary) {
    const studyCtx = state.studyCtx;
    const actions = [{ label: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0440\u0435\u0436\u0438\u043C", primary: !!primary, action: () => goToModeSelect(studyCtx) }];
    if (studyCtx.type === "list") {
      actions.push({ label: "\u041A \u0441\u043B\u043E\u0432\u043D\u0438\u043A\u0443", action: studyCtx.back });
    } else if (studyCtx.type === "review") {
      actions.push({ label: "\u041A \u0440\u043E\u0430\u0434\u043C\u0430\u043F\u0443", action: goToRoadmap });
    } else {
      actions.push({ label: "\u041A \u0443\u0440\u043E\u043A\u0430\u043C", action: () => goToLessons(studyCtx.book) });
    }
    return actions;
  }
  export function showSummary(cfg) {
    showView("view-summary");
    el("summary-eyebrow").textContent = cfg.eyebrow;
    el("summary-count").textContent = cfg.big;
    el("summary-note").textContent = cfg.note;
    const wrap = el("summary-actions");
    wrap.innerHTML = "";
    cfg.actions.forEach((a) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = a.primary ? "reveal-btn" : "ghost-btn";
      btn.textContent = a.label;
      btn.addEventListener("click", a.action);
      wrap.appendChild(btn);
    });
    renderSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

