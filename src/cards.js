// src/cards.js
import { POS_RU } from './data/meta.js';
import { el, setHidden, showView } from './dom.js';
import { showSummary, summaryActionsFor, updateCrumbsForStudy } from './navigation.js';
import { setProgressStatus } from './progress.js';
import { hasSpeech, speakText } from './speech.js';
import { state } from './state.js';

  export function startPracticeSession(words, ctx) {
    state.studyQueue = words.slice();
    state.studyIndex = 0;
    state.sessionMarks = {};
    state.studyCtx = Object.assign({ mode: "cards" }, ctx);
    showView("view-practice");
    updateCrumbsForStudy();
    showCard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function showCard() {
    const w = state.studyQueue[state.studyIndex];
    el("card").classList.remove("flipped");
    el("hz-face").textContent = w.h;
    el("back-pinyin").textContent = w.p;
    el("back-ru").textContent = w.ru;
    el("back-en").textContent = w.en;
    const posEl = el("back-pos");
    if (w.pos) {
      posEl.hidden = false;
      posEl.textContent = POS_RU[w.pos] || w.pos;
    } else {
      posEl.hidden = true;
    }
    el("practice-progress").textContent = state.studyIndex + 1 + " / " + state.studyQueue.length;
    setHidden("answer-row", true);
    el("reveal-btn").hidden = false;
    if (w.sz) {
      el("example-zh").textContent = w.sz;
      el("example-pinyin").textContent = w.sp;
      el("example-ru").textContent = w.sr;
    }
    setHidden("example", true);
  }
  el("reveal-btn").addEventListener("click", () => {
    el("card").classList.add("flipped");
    el("reveal-btn").hidden = true;
    setHidden("answer-row", false);
    const w = state.studyQueue[state.studyIndex];
    if (w.sz) {
      setHidden("example", false);
    }
  });
  export var speakBtn = el("speak-btn");
  export var speakSentenceBtn = el("speak-sentence-btn");
  if (!hasSpeech) {
    speakBtn.disabled = true;
    speakBtn.textContent = "\u043D\u0435\u0442 \u043E\u0437\u0432\u0443\u0447\u043A\u0438 \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435";
    speakSentenceBtn.disabled = true;
  }
  export function speakCurrentWord() {
    const w = state.studyQueue[state.studyIndex];
    if (w) speakText(w.h);
  }
  export function speakCurrentSentence() {
    const w = state.studyQueue[state.studyIndex];
    if (w) speakText(w.sz || w.h);
  }
  speakBtn.addEventListener("click", speakCurrentWord);
  speakSentenceBtn.addEventListener("click", speakCurrentSentence);
  export function markAndAdvance(status) {
    const w = state.studyQueue[state.studyIndex];
    setProgressStatus(w._book, w._lesson, w.h, status);
    state.sessionMarks[w.h] = status;
    if (state.studyIndex < state.studyQueue.length - 1) {
      state.studyIndex++;
      showCard();
    } else {
      finishPracticeSession();
    }
  }
  el("btn-learning").addEventListener("click", () => markAndAdvance("learning"));
  el("btn-known").addEventListener("click", () => markAndAdvance("known"));
  export function finishPracticeSession() {
    const knownNow = Object.values(state.sessionMarks).filter((v) => v === "known").length;
    const learningWords = state.studyQueue.filter((w) => state.sessionMarks[w.h] === "learning");
    const actions = [];
    if (learningWords.length) {
      actions.push({ label: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \xAB\u0435\u0449\u0451 \u0443\u0447\u0443\xBB (" + learningWords.length + ")", primary: true, action: () => startPracticeSession(learningWords, state.studyCtx) });
    }
    actions.push({ label: "\u041F\u0440\u043E\u0439\u0442\u0438 \u0435\u0449\u0451 \u0440\u0430\u0437", action: () => startPracticeSession(state.studyQueue, state.studyCtx) });
    actions.push.apply(actions, summaryActionsFor(!learningWords.length));
    showSummary({
      eyebrow: state.studyCtx.type === "review" ? "\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E" : "\u0423\u0440\u043E\u043A \u043F\u0440\u043E\u0439\u0434\u0435\u043D",
      big: knownNow + "/" + state.studyQueue.length,
      note: "\u0441\u043B\u043E\u0432 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043A\u0430\u043A \xAB\u0437\u043D\u0430\u044E\xBB \u0432 \u044D\u0442\u043E\u043C \u043F\u0440\u043E\u0445\u043E\u0434\u0435",
      actions
    });
  }

