// src/writing.js
import { strokes_default } from './data/strokes.js';
import { el, showView } from './dom.js';
import { showSummary, summaryActionsFor, updateCrumbsForStudy } from './navigation.js';
import { state } from './state.js';
import { hanzi_writer_esm_default } from './vendor/hanzi-writer.esm.js';

  export function uniqueCharsFrom(words) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    words.forEach((w) => {
      Array.from(w.h).forEach((ch) => {
        if (seen.has(ch) || !strokes_default[ch]) return;
        seen.add(ch);
        out.push({ ch, word: w });
      });
    });
    return out;
  }
  export function startWritingSession(words, ctx) {
    const items = uniqueCharsFrom(words);
    if (!items.length) return;
    state.studyCtx = Object.assign({ mode: "writing" }, ctx);
    state.W = { queue: items, index: 0, total: items.length, perfectCount: 0 };
    showView("view-writing");
    updateCrumbsForStudy();
    showWritingItem();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function showWritingItem() {
    const W = state.W;
    const item = W.queue[W.index];
    W.done = false;
    el("writing-progress").textContent = W.index + 1 + " / " + W.total;
    el("writing-pinyin").textContent = item.word.p;
    el("writing-ru").textContent = item.word.ru;
    el("writing-result").hidden = true;
    el("writing-skip-btn").hidden = false;
    el("writing-next-btn").hidden = true;
    const target = el("writing-target");
    target.innerHTML = "";
    const wrap = target.closest(".tianzige");
    const size = wrap && wrap.clientWidth || 260;
    W.writer = hanzi_writer_esm_default.create(target, item.ch, {
      width: size,
      height: size,
      padding: 22,
      strokeColor: "#F1F1F4",
      outlineColor: "#2A2A32",
      drawingColor: "#5AD1AB",
      highlightColor: "#F0BA5C",
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      showHintAfterMisses: 2,
      charDataLoader: (char, onComplete) => onComplete(strokes_default[char])
    });
    W.writer.quiz({
      onComplete: (summary) => onWritingComplete(false, summary.totalMistakes)
    });
  }
  export function onWritingComplete(skipped, totalMistakes) {
    const W = state.W;
    if (W.done) return;
    W.done = true;
    if (!skipped && totalMistakes === 0) W.perfectCount++;
    el("writing-skip-btn").hidden = true;
    const nextBtn = el("writing-next-btn");
    nextBtn.hidden = false;
    nextBtn.focus();
    const resultEl = el("writing-result");
    resultEl.hidden = false;
    if (skipped) {
      resultEl.textContent = "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E";
      resultEl.className = "writing-result is-skip";
    } else if (totalMistakes === 0) {
      resultEl.textContent = "\u0411\u0435\u0437 \u043E\u0448\u0438\u0431\u043E\u043A!";
      resultEl.className = "writing-result is-perfect";
    } else {
      resultEl.textContent = "\u041E\u0448\u0438\u0431\u043E\u043A: " + totalMistakes;
      resultEl.className = "writing-result is-ok";
    }
  }
  el("writing-skip-btn").addEventListener("click", () => {
    const W = state.W;
    if (!W || W.done) return;
    if (W.writer) {
      try {
        W.writer.cancelQuiz();
        W.writer.showCharacter();
      } catch (e) {
      }
    }
    onWritingComplete(true, 0);
  });
  el("writing-next-btn").addEventListener("click", () => {
    const W = state.W;
    if (!W) return;
    if (W.index < W.total - 1) {
      W.index++;
      showWritingItem();
    } else finishWritingSession();
  });
  export function finishWritingSession() {
    const W = state.W;
    const actions = [{ label: "\u041F\u0440\u043E\u0439\u0442\u0438 \u0435\u0449\u0451 \u0440\u0430\u0437", action: () => startWritingSession(state.studyCtx.words, state.studyCtx) }].concat(summaryActionsFor(true));
    showSummary({
      eyebrow: state.studyCtx.type === "review" ? "\u041D\u0430\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u2014 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E" : "\u041D\u0430\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E",
      big: W.perfectCount + "/" + W.total,
      note: "\u0438\u0435\u0440\u043E\u0433\u043B\u0438\u0444\u043E\u0432 \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0431\u0435\u0437 \u0435\u0434\u0438\u043D\u043E\u0439 \u043E\u0448\u0438\u0431\u043A\u0438",
      actions
    });
  }

