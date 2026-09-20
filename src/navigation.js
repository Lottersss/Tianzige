// src/navigation.js
import { exercisesFor, grammarFor, textsFor } from './data/content-index.js';
import { HSK_WORDS, lessonKeysFor } from './data/index.js';
import { lessonTitleFor } from './data/lesson-titles.js';
import { BOOKS, CURRENT_BOOK } from './data/meta.js';
import { el, showView, shuffle } from './dom.js';
import { bookKnownCount, collectDueWords, lessonKnownCount, overallCount, readyBooksLabel } from './progress.js';
import { saveDirection, state } from './state.js';
import { count } from './vendor/hanzi-writer.esm.js';

  export function setActiveNav(which) {
    el("nav-roadmap").classList.toggle("is-active", which === "roadmap");
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
    const due = collectDueWords().length;
    const badge = el("review-badge");
    if (due > 0) {
      badge.hidden = false;
      badge.textContent = due;
    } else {
      badge.hidden = true;
    }
    const streakBadge = el("streak-badge");
    const current = state.STREAK.current;
    if (current > 0) {
      streakBadge.hidden = false;
      el("streak-text").textContent = current + " " + ruDays(current) + " \u043F\u043E\u0434\u0440\u044F\u0434";
    } else {
      streakBadge.hidden = true;
    }
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
    const grid = el("roadmap-grid");
    grid.innerHTML = "";
    BOOKS.forEach((b) => {
      const card = document.createElement("button");
      card.className = "book-card";
      card.type = "button";
      card.disabled = !b.ready;
      if (b.id === CURRENT_BOOK) {
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
        progressHtml = '<div class="book-progress-track"><div class="book-progress-fill" style="width:' + pct + '%"></div></div><div class="book-meta">' + c.known + "/" + c.total + " \u0441\u043B\u043E\u0432 \u0437\u043D\u0430\u044E</div>";
      } else {
        progressHtml = '<span class="soon-tag">\u0441\u043A\u043E\u0440\u043E</span><div class="book-meta">' + b.lessons + " \u0443\u0440\u043E\u043A\u043E\u0432 \xB7 " + b.words + " \u0441\u043B\u043E\u0432</div>";
      }
      card.innerHTML += '<span class="book-hz">' + b.hz + '</span><span class="book-sub">' + b.sub + "</span>" + progressHtml;
      if (b.ready) card.addEventListener("click", () => goToLessons(b.id));
      grid.appendChild(card);
    });
  }
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
      { label: "\u7530\u5B57\u683C", action: goToRoadmap },
      { label: book.hz }
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function goToModeSelect(ctx) {
    state.currentCtx = ctx;
    showView("view-mode-select");
    setActiveNav(ctx.type === "review" ? "review" : "roadmap");
    renderDirectionToggle();
    if (ctx.type === "lesson") {
      const book = BOOKS.find((b) => b.id === ctx.book);
      const title = lessonTitleFor(ctx.book, ctx.lesson);
      el("mode-select-eyebrow").textContent = book.hz + " \xB7 \u0423\u0440\u043E\u043A " + ctx.lesson + (title ? " \xB7 " + title.zh : "");
      renderCrumbs([
        { label: "\u7530\u5B57\u683C", action: goToRoadmap },
        { label: book.hz, action: () => goToLessons(ctx.book) },
        { label: "\u0423\u0440\u043E\u043A " + ctx.lesson }
      ]);
    } else {
      el("mode-select-eyebrow").textContent = "\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \xB7 " + ctx.words.length + " \u0441\u043B\u043E\u0432";
      renderCrumbs([
        { label: "\u7530\u5B57\u683C", action: goToRoadmap },
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
    if (studyCtx.type === "review") {
      renderCrumbs([
        { label: "\u7530\u5B57\u683C", action: goToRoadmap },
        { label: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C", action: goToReview },
        { label: modeLabel(studyCtx.mode) }
      ]);
    } else {
      const book = BOOKS.find((b) => b.id === studyCtx.book);
      renderCrumbs([
        { label: "\u7530\u5B57\u683C", action: goToRoadmap },
        { label: book.hz, action: () => goToLessons(studyCtx.book) },
        { label: "\u0423\u0440\u043E\u043A " + studyCtx.lesson, action: () => goToModeSelect(studyCtx) },
        { label: modeLabel(studyCtx.mode) }
      ]);
    }
  }
  export function summaryActionsFor(primary) {
    const studyCtx = state.studyCtx;
    const actions = [{ label: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0440\u0435\u0436\u0438\u043C", primary: !!primary, action: () => goToModeSelect(studyCtx) }];
    if (studyCtx.type === "review") {
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

