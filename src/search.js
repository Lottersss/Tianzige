// src/search.js
import { ALL_READY_WORDS } from './data/content-index.js';
import { BOOKS, POS_RU } from './data/meta.js';
import { el, showView } from './dom.js';
import { makeStarButton } from './favorites.js';
import { setActiveNav } from './navigation.js';
import { wordKey } from './progress.js';
import { state } from './state.js';

  export var MAX_RESULTS = 60;
  export function stripTones(s) {
    return Array.from(s.normalize("NFD")).filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 768 || code > 879;
    }).join("");
  }
  export function norm(s) {
    return stripTones((s || "").toLowerCase());
  }
  export function wordMatches(w, q) {
    if (q.norm && w.h.includes(q.raw)) return true;
    if (!q.norm) return false;
    return norm(w.p).includes(q.norm) || norm(w.ru).includes(q.norm) || norm(w.en).includes(q.norm);
  }
  export function bookLabel(bookId) {
    const b = BOOKS.find((x) => x.id === bookId);
    return b ? b.hz : bookId;
  }
  export function statusClass(w) {
    const rec = state.PROGRESS[wordKey(w._book, w._lesson, w.h)];
    if (rec && rec.status === "known") return "is-known";
    if (rec && rec.status === "learning") return "is-learning";
    return "";
  }
  // onFavChange нужен там, где от звёздочки зависит сам список (избранное:
  // сняли — строка должна исчезнуть). В обычном поиске он не передаётся.
  export function buildRow(w, onFavChange) {
    const row = document.createElement("div");
    row.className = "search-result";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sr-summary";
    const cls = statusClass(w);
    btn.innerHTML = '<span class="sr-hz">' + w.h + '</span><span class="sr-pinyin">' + w.p + '</span><span class="sr-ru">' + w.ru + '</span><span class="sr-status' + (cls ? " " + cls : "") + '"></span>';
    const detail = document.createElement("div");
    detail.className = "sr-detail";
    detail.hidden = true;
    let html = '<span class="sr-en">' + w.en + (w.pos ? " \xB7 " + (POS_RU[w.pos] || w.pos) : "") + "</span>";
    if (w.sz) {
      html += '<p class="sr-example-zh">' + w.sz + '</p><p class="sr-example-pinyin">' + w.sp + '</p><p class="sr-example-ru">' + w.sr + "</p>";
    }
    html += '<span class="sr-source">' + bookLabel(w._book) + " \xB7 \u0423\u0440\u043E\u043A " + w._lesson + "</span>";
    detail.innerHTML = html;
    btn.addEventListener("click", () => {
      detail.hidden = !detail.hidden;
    });
    const top = document.createElement("div");
    top.className = "sr-top";
    top.appendChild(btn);
    top.appendChild(makeStarButton(w, onFavChange));
    row.appendChild(top);
    row.appendChild(detail);
    return row;
  }
  export function renderResults(query) {
    const wrap = el("search-results");
    const raw = query.trim();
    wrap.innerHTML = "";
    if (!raw) {
      const p = document.createElement("p");
      p.className = "search-hint";
      p.textContent = "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u0438\u0435\u0440\u043E\u0433\u043B\u0438\u0444, pinyin \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0432\u043E\u0434.";
      wrap.appendChild(p);
      return;
    }
    const q = { raw, norm: norm(raw) };
    const matches = ALL_READY_WORDS.filter((w) => wordMatches(w, q));
    if (!matches.length) {
      const p = document.createElement("p");
      p.className = "search-hint";
      p.textContent = "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u0440\u0435\u0434\u0438 " + ALL_READY_WORDS.length + " \u0441\u043B\u043E\u0432.";
      wrap.appendChild(p);
      return;
    }
    matches.slice(0, MAX_RESULTS).forEach((w) => wrap.appendChild(buildRow(w)));
    if (matches.length > MAX_RESULTS) {
      const p = document.createElement("p");
      p.className = "search-hint";
      p.textContent = "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043F\u0435\u0440\u0432\u044B\u0435 " + MAX_RESULTS + " \u0438\u0437 " + matches.length + " \u2014 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441.";
      wrap.appendChild(p);
    }
  }
  el("search-input").addEventListener("input", (e) => renderResults(e.target.value));
  export function goToSearch() {
    showView("view-search");
    setActiveNav("search");
    el("crumbs").hidden = true;
    el("crumbs").innerHTML = "";
    renderResults(el("search-input").value);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => el("search-input").focus(), 50);
  }

