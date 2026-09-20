// src/quiz.js
import { ALL_READY_WORDS } from './data/content-index.js';
import { el, showView, shuffle } from './dom.js';
import { showSummary, summaryActionsFor, updateCrumbsForStudy } from './navigation.js';
import { setProgressStatus } from './progress.js';
import { state } from './state.js';

  export function buildOptions(word, pool, n) {
    n = n || 4;
    const others = pool.filter((w) => w.h !== word.h);
    const distractors = shuffle(others).slice(0, Math.min(n - 1, others.length));
    return shuffle([word].concat(distractors));
  }
  export function renderQuizQuestion(word, pool) {
    const Q = state.Q;
    const rev = state.direction === "rev";
    const modePrefix = Q.mode === "learn" ? "\u0423\u0447\u0438\u043C" : "\u0422\u0435\u0441\u0442";
    el("quiz-prompt-label").textContent = modePrefix + (rev ? " \u2014 \u0432\u044B\u0431\u0435\u0440\u0438 \u0438\u0435\u0440\u043E\u0433\u043B\u0438\u0444" : " \u2014 \u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0435\u0440\u0435\u0432\u043E\u0434");
    const promptEl = el("quiz-prompt");
    promptEl.classList.toggle("quiz-prompt-ru", rev);
    promptEl.textContent = rev ? word.ru : word.h;
    el("quiz-prompt-sub").textContent = rev ? word.en || "" : word.p;
    el("quiz-next-btn").hidden = true;
    const options = buildOptions(word, pool, 4);
    const wrap = el("quiz-options");
    wrap.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-opt";
      btn.innerHTML = rev ? '<span class="quiz-opt-hz">' + opt.h + '</span><span class="quiz-opt-sub">' + opt.p + "</span>" : '<span class="quiz-opt-main">' + opt.ru + "</span>";
      btn._word = opt;
      btn.addEventListener("click", () => answerQuiz(opt, btn));
      wrap.appendChild(btn);
    });
  }
  export function answerQuiz(opt, btnEl) {
    const Q = state.Q;
    if (!Q || Q.locked) return;
    Q.locked = true;
    const correctWord = Q.current;
    const isCorrect = opt.h === correctWord.h;
    Array.from(el("quiz-options").children).forEach((b) => {
      b.disabled = true;
      if (b._word.h === correctWord.h) b.classList.add("correct");
      else if (b === btnEl) b.classList.add("incorrect");
    });
    handleQuizResult(isCorrect);
    el("quiz-next-btn").hidden = false;
    el("quiz-next-btn").focus();
  }
  export function handleQuizResult(isCorrect) {
    const Q = state.Q;
    const w = Q.current;
    if (Q.mode === "learn") {
      if (isCorrect) {
        Q.streaks[w.h] = (Q.streaks[w.h] || 0) + 1;
        if (Q.streaks[w.h] >= 2) {
          Q.mastered++;
          setProgressStatus(w._book, w._lesson, w.h, "known");
        } else {
          Q.queue.push(w);
        }
      } else {
        Q.streaks[w.h] = 0;
        setProgressStatus(w._book, w._lesson, w.h, "learning");
        Q.queue.push(w);
      }
      el("quiz-score").textContent = (Q.streaks[w.h] || 0) + "/2 \u043F\u043E\u0434\u0440\u044F\u0434";
    } else {
      Q.answered++;
      if (isCorrect) {
        Q.correct++;
        setProgressStatus(w._book, w._lesson, w.h, "known");
      } else {
        setProgressStatus(w._book, w._lesson, w.h, "learning");
      }
      Q.testLog.push({ word: w, gotIt: isCorrect });
      el("quiz-score").textContent = Q.correct + " \u0432\u0435\u0440\u043D\u043E";
    }
  }
  el("quiz-next-btn").addEventListener("click", () => {
    if (!state.Q) return;
    if (state.Q.mode === "learn") askNextLearnQuestion();
    else askNextTestQuestion();
  });
  export function startLearnSession(words, ctx) {
    state.studyCtx = Object.assign({ mode: "learn" }, ctx);
    state.Q = { mode: "learn", queue: shuffle(words), streaks: {}, total: words.length, mastered: 0, current: null, locked: false };
    showView("view-quiz");
    updateCrumbsForStudy();
    el("quiz-score").hidden = false;
    askNextLearnQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function askNextLearnQuestion() {
    const Q = state.Q;
    if (!Q.queue.length) {
      finishLearnSession();
      return;
    }
    Q.current = Q.queue.shift();
    Q.locked = false;
    el("quiz-progress").textContent = "\u043E\u0441\u0432\u043E\u0435\u043D\u043E " + Q.mastered + "/" + Q.total;
    el("quiz-score").textContent = (Q.streaks[Q.current.h] || 0) + "/2 \u043F\u043E\u0434\u0440\u044F\u0434";
    renderQuizQuestion(Q.current, ALL_READY_WORDS);
  }
  export function finishLearnSession() {
    const Q = state.Q;
    const actions = [{ label: "\u041F\u0440\u043E\u0439\u0442\u0438 \u0435\u0449\u0451 \u0440\u0430\u0437", action: () => startLearnSession(state.studyCtx.words, state.studyCtx) }].concat(summaryActionsFor(true));
    showSummary({
      eyebrow: state.studyCtx.type === "review" ? "\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \u043E\u0441\u0432\u043E\u0435\u043D\u043E" : "\u0423\u0440\u043E\u043A \u043E\u0441\u0432\u043E\u0435\u043D",
      big: Q.total + "/" + Q.total,
      note: "\u043A\u0430\u0436\u0434\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u043E\u0442\u0432\u0435\u0447\u0435\u043D\u043E \u0432\u0435\u0440\u043D\u043E \u0434\u0432\u0430 \u0440\u0430\u0437\u0430 \u043F\u043E\u0434\u0440\u044F\u0434",
      actions
    });
  }
  export function startTestSession(words, ctx) {
    state.studyCtx = Object.assign({ mode: "test" }, ctx);
    state.Q = { mode: "test", queue: shuffle(words), total: words.length, correct: 0, answered: 0, current: null, locked: false, testLog: [] };
    showView("view-quiz");
    updateCrumbsForStudy();
    el("quiz-score").hidden = false;
    el("quiz-score").textContent = "0 \u0432\u0435\u0440\u043D\u043E";
    askNextTestQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function askNextTestQuestion() {
    const Q = state.Q;
    if (!Q.queue.length) {
      finishTestSession();
      return;
    }
    Q.current = Q.queue.shift();
    Q.locked = false;
    el("quiz-progress").textContent = Q.answered + 1 + " / " + Q.total;
    renderQuizQuestion(Q.current, ALL_READY_WORDS);
  }
  export function finishTestSession() {
    const Q = state.Q;
    const wrongWords = Q.testLog.filter((r) => !r.gotIt).map((r) => r.word);
    const actions = [];
    if (wrongWords.length) {
      actions.push({ label: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0438 (" + wrongWords.length + ")", primary: true, action: () => startTestSession(wrongWords, state.studyCtx) });
    }
    actions.push({ label: "\u041F\u0440\u043E\u0439\u0442\u0438 \u0442\u0435\u0441\u0442 \u0437\u0430\u043D\u043E\u0432\u043E", action: () => startTestSession(state.studyCtx.words, state.studyCtx) });
    actions.push.apply(actions, summaryActionsFor(!wrongWords.length));
    showSummary({
      eyebrow: "\u0422\u0435\u0441\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D",
      big: Q.correct + "/" + Q.total,
      note: "\u0432\u0435\u0440\u043D\u044B\u0445 \u043E\u0442\u0432\u0435\u0442\u043E\u0432 \u0438\u0437 " + Q.total,
      actions
    });
  }

