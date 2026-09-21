// src/content-views.js
import { grammarFor, textsFor } from './data/content-index.js';
import { BOOKS } from './data/meta.js';
import { el, showView } from './dom.js';
import { updateCrumbsForStudy } from './navigation.js';
import { hasSpeech, speakText } from './speech.js';
import { state } from './state.js';
import { renderTappable } from './tap-translate.js';
import { loadHsk3 } from './hsk3.js';
import { round } from './vendor/hanzi-writer.esm.js';

  export function goToTextView(ctx) {
    const texts = textsFor(ctx.book, ctx.lesson);
    if (!texts) return;
    // Словник нового HSK помогает правильно делить текст на слова; грузим его
    // в фоне, и когда он придёт, строки пересоберутся сами (tap-translate.js).
    loadHsk3();
    state.studyCtx = Object.assign({ mode: "text" }, ctx);
    showView("view-text");
    updateCrumbsForStudy();
    const book = BOOKS.find((b) => b.id === ctx.book);
    el("text-eyebrow").textContent = book.hz + " \xB7 Урок " + ctx.lesson + " \xB7 Текст";
    const wrap = el("text-list");
    wrap.innerHTML = "";
    texts.forEach((situ) => {
      const block = document.createElement("div");
      block.className = "text-situation";
      if (situ.t) {
        const h = document.createElement("p");
        h.className = "text-situation-title";
        h.textContent = situ.t;
        block.appendChild(h);
      }
      situ.lines.forEach((ln) => {
        const row = document.createElement("div");
        row.className = "text-line";
        const spHtml = ln.sp ? '<span class="text-line-sp">' + ln.sp + "</span>" : "";
        row.innerHTML = spHtml + '<div class="text-line-body"><p class="text-line-zh"></p><p class="text-line-py"></p><p class="text-line-ru"></p></div><button class="speak-btn speak-btn-sm text-line-speak" type="button" aria-label="Произнести"><svg class="icon-inline" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 8v4h3l4 3V5L6 8H3z" fill="currentColor"/><path d="M13 7.5c1 1 1 4 0 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M15.2 5.5c2 2 2 7 0 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>';
        renderTappable(row.querySelector(".text-line-zh"), ln.zh, ctx);
        row.querySelector(".text-line-py").textContent = ln.py;
        row.querySelector(".text-line-ru").textContent = ln.ru;
        const spk = row.querySelector(".text-line-speak");
        spk.addEventListener("click", () => speakText(ln.zh));
        if (!hasSpeech) spk.disabled = true;
        block.appendChild(row);
      });
      wrap.appendChild(block);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function goToGrammarView(ctx) {
    const points = grammarFor(ctx.book, ctx.lesson);
    if (!points) return;
    loadHsk3();
    state.studyCtx = Object.assign({ mode: "grammar" }, ctx);
    showView("view-grammar");
    updateCrumbsForStudy();
    const book = BOOKS.find((b) => b.id === ctx.book);
    el("grammar-eyebrow").textContent = book.hz + " \xB7 Урок " + ctx.lesson + " \xB7 Грамматика";
    const wrap = el("grammar-list");
    wrap.innerHTML = "";
    points.forEach((g) => {
      const card = document.createElement("div");
      card.className = "grammar-card";
      const head = document.createElement("p");
      head.className = "grammar-hz";
      head.textContent = g.h;
      const title = document.createElement("p");
      title.className = "grammar-ru-title";
      title.textContent = g.ru;
      card.appendChild(head);
      card.appendChild(title);
      if (g.ex) {
        const p = document.createElement("p");
        p.className = "grammar-explain";
        p.textContent = g.ex;
        card.appendChild(p);
      }
      (g.examples || []).forEach((ex) => {
        const row = document.createElement("div");
        row.className = "grammar-example";
        row.innerHTML = '<p class="example-zh"></p><p class="example-pinyin"></p><p class="example-ru"></p><button class="speak-btn speak-btn-sm" type="button">Произнести</button>';
        renderTappable(row.querySelector(".example-zh"), ex.zh, ctx);
        row.querySelector(".example-pinyin").textContent = ex.py;
        row.querySelector(".example-ru").textContent = ex.ru;
        const spk = row.querySelector("button");
        spk.addEventListener("click", () => speakText(ex.zh));
        if (!hasSpeech) spk.disabled = true;
        card.appendChild(row);
      });
      wrap.appendChild(card);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

