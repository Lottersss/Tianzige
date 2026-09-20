// src/match.js
import { el, showView, shuffle } from './dom.js';
import { showSummary, summaryActionsFor, updateCrumbsForStudy } from './navigation.js';
import { setProgressStatus } from './progress.js';
import { state } from './state.js';

  export function matchBestKey() {
    if (state.studyCtx.type === "lesson") return "tianzige_match_best_" + state.studyCtx.book + "_" + state.studyCtx.lesson;
    return null;
  }
  export function formatTime(ms) {
    const s = Math.floor(ms / 1e3);
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return mm + ":" + ss;
  }
  export function updateMatchTimer() {
    const M = state.M;
    if (!M || M.finished) return;
    el("match-timer").textContent = formatTime(Date.now() - M.startTime);
  }
  export function renderMatchGrid() {
    const M = state.M;
    const tiles = [];
    M.pairs.forEach((w) => {
      tiles.push({ word: w, side: "hz", text: w.h });
      tiles.push({ word: w, side: "ru", text: w.ru });
    });
    const shuffled = shuffle(tiles);
    const grid = el("match-grid");
    grid.innerHTML = "";
    shuffled.forEach((t) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "match-tile" + (t.side === "hz" ? " is-hz" : "");
      tile.innerHTML = t.side === "hz" ? '<span class="mt-main">' + t.text + "</span>" : '<span class="mt-ru">' + t.text + "</span>";
      tile._data = t;
      tile.addEventListener("click", () => onMatchTileClick(tile));
      grid.appendChild(tile);
    });
  }
  export function onMatchTileClick(tile) {
    const M = state.M;
    if (!M || M.finished) return;
    if (tile.classList.contains("matched") || tile.classList.contains("selected")) return;
    if (M.selected.length >= 2) return;
    tile.classList.add("selected");
    M.selected.push(tile);
    if (M.selected.length === 2) {
      const a = M.selected[0], b = M.selected[1];
      if (a._data.word.h === b._data.word.h && a._data.side !== b._data.side) {
        a.classList.add("matched");
        b.classList.add("matched");
        a.classList.remove("selected");
        b.classList.remove("selected");
        M.matchedCount++;
        setProgressStatus(a._data.word._book, a._data.word._lesson, a._data.word.h, "known");
        M.selected = [];
        el("match-status").textContent = "\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0430\u0440: " + (M.total - M.matchedCount);
        if (M.matchedCount === M.total) {
          finishMatch();
        }
      } else {
        a.classList.add("wrong");
        b.classList.add("wrong");
        el("match-status").textContent = "\u041D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u2014 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451";
        setTimeout(() => {
          a.classList.remove("selected", "wrong");
          b.classList.remove("selected", "wrong");
          M.selected = [];
          el("match-status").textContent = "\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0430\u0440: " + (M.total - M.matchedCount);
        }, 650);
      }
    }
  }
  export function startMatch(words, ctx) {
    if (state.M && state.M.timerId) {
      clearInterval(state.M.timerId);
    }
    state.studyCtx = Object.assign({ mode: "match" }, ctx);
    const pairs = shuffle(words).slice(0, 8);
    state.M = { pairs, selected: [], matchedCount: 0, total: pairs.length, startTime: Date.now(), timerId: null, finished: false };
    showView("view-match");
    updateCrumbsForStudy();
    renderMatchGrid();
    el("match-status").textContent = "\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0430\u0440: " + pairs.length;
    const bestKey = matchBestKey();
    let bestVal = null;
    if (bestKey) {
      try {
        bestVal = localStorage.getItem(bestKey);
      } catch (e) {
      }
    }
    el("match-best").textContent = bestVal ? "\u0440\u0435\u043A\u043E\u0440\u0434: " + formatTime(+bestVal) : "";
    el("match-timer").textContent = "00:00";
    state.M.timerId = setInterval(updateMatchTimer, 250);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function finishMatch() {
    const M = state.M;
    M.finished = true;
    clearInterval(M.timerId);
    const elapsed = Date.now() - M.startTime;
    el("match-status").textContent = "\u0413\u043E\u0442\u043E\u0432\u043E!";
    const bestKey = matchBestKey();
    let note = M.total + " \u043F\u0430\u0440";
    if (bestKey) {
      let prevBest = null;
      try {
        prevBest = +localStorage.getItem(bestKey) || null;
      } catch (e) {
      }
      if (!prevBest || elapsed < prevBest) {
        try {
          localStorage.setItem(bestKey, String(elapsed));
        } catch (e) {
        }
        note += " \u2014 \u043D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u043E\u0440\u0434!";
      } else {
        note += " (\u0440\u0435\u043A\u043E\u0440\u0434: " + formatTime(prevBest) + ")";
      }
    }
    const actions = [{ label: "\u0421\u044B\u0433\u0440\u0430\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437", primary: true, action: () => startMatch(state.studyCtx.words, state.studyCtx) }].concat(summaryActionsFor(false));
    showSummary({
      eyebrow: "\u041C\u0430\u0442\u0447 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D",
      big: formatTime(elapsed),
      note,
      actions
    });
  }

