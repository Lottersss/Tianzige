// src/exercise.js
import { exercisesFor } from './data/content-index.js';
import { el, setHidden, showView, shuffle } from './dom.js';
import { showSummary, summaryActionsFor, updateCrumbsForStudy } from './navigation.js';
import { state } from './state.js';

  // and true/false expressed as choice lists) and word-order assembly.
  export function runExerciseQueue(list, ctx) {
    state.studyCtx = Object.assign({ mode: "exercise" }, ctx);
    state.X = { queue: shuffle(list.slice()), total: list.length, correct: 0, current: null, locked: false, wrongLog: [] };
    showView("view-exercise");
    updateCrumbsForStudy();
    el("exercise-score").hidden = false;
    el("exercise-score").textContent = "0 верно";
    askNextExercise();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  export function startExerciseSession(ctx) {
    const list = exercisesFor(ctx.book, ctx.lesson);
    if (!list) return;
    runExerciseQueue(list, ctx);
  }
  export function askNextExercise() {
    const X = state.X;
    if (!X.queue.length) {
      finishExerciseSession();
      return;
    }
    X.current = X.queue.shift();
    X.locked = false;
    const answeredIdx = X.total - X.queue.length;
    el("exercise-progress").textContent = answeredIdx + " / " + X.total;
    el("exercise-next-btn").hidden = true;
    if (X.current.ty === "order") renderOrderExercise(X.current);
    else renderChoiceExercise(X.current);
  }
  export function renderChoiceExercise(ex) {
    setHidden("exercise-choice", false);
    setHidden("exercise-options", false);
    setHidden("exercise-order", true);
    el("exercise-zh").textContent = ex.zh || "";
    el("exercise-ru").textContent = ex.ru || "";
    const wrap = el("exercise-options");
    wrap.innerHTML = "";
    // Render options in a shuffled order so the correct answer isn't always
    // in the same visual slot -- state.C.order[renderedPosition] = original opts index.
    const order = shuffle(ex.opts.map((_, i) => i));
    state.C = { order: order };
    order.forEach((origIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-opt";
      btn.innerHTML = '<span class="quiz-opt-hz">' + ex.opts[origIdx] + "</span>";
      btn.addEventListener("click", () => answerChoiceExercise(origIdx, btn));
      wrap.appendChild(btn);
    });
  }
  export function answerChoiceExercise(origIdx, btnEl) {
    const X = state.X;
    if (X.locked) return;
    X.locked = true;
    const ex = X.current;
    const isCorrect = origIdx === ex.a;
    const order = state.C.order;
    Array.from(el("exercise-options").children).forEach((b, bi) => {
      b.disabled = true;
      if (order[bi] === ex.a) b.classList.add("correct");
      else if (b === btnEl) b.classList.add("incorrect");
    });
    registerExerciseResult(isCorrect);
  }
  export function renderOrderExercise(ex) {
    setHidden("exercise-choice", true);
    setHidden("exercise-options", true);
    setHidden("exercise-order", false);
    el("exercise-order-ru").textContent = ex.ru || "";
    const idxs = shuffle(ex.tok.map((_, i) => i));
    state.O = { tok: ex.tok, bank: idxs, answer: [], checked: false };
    el("exercise-order-check").hidden = false;
    el("exercise-order-check").disabled = true;
    renderOrderTiles();
  }
  export function renderOrderTiles() {
    const O = state.O;
    const bankWrap = el("exercise-order-bank");
    const ansWrap = el("exercise-order-answer");
    bankWrap.innerHTML = "";
    ansWrap.innerHTML = "";
    O.bank.forEach((i) => {
      if (O.answer.indexOf(i) !== -1) return;
      const t = document.createElement("button");
      t.type = "button";
      t.className = "order-tile";
      t.textContent = O.tok[i];
      t.disabled = O.checked;
      t.addEventListener("click", () => {
        O.answer.push(i);
        renderOrderTiles();
        el("exercise-order-check").disabled = O.answer.length !== O.tok.length;
      });
      bankWrap.appendChild(t);
    });
    O.answer.forEach((i) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "order-tile is-placed";
      t.textContent = O.tok[i];
      t.disabled = O.checked;
      t.addEventListener("click", () => {
        O.answer = O.answer.filter((x) => x !== i);
        renderOrderTiles();
        el("exercise-order-check").disabled = O.answer.length !== O.tok.length;
      });
      ansWrap.appendChild(t);
    });
  }
  el("exercise-order-check").addEventListener("click", () => {
    const O = state.O;
    if (!O || O.checked) return;
    O.checked = true;
    const isCorrect = O.answer.length === O.tok.length && O.answer.every((v, i) => v === i);
    Array.from(el("exercise-order-answer").children).forEach((t) => {
      t.classList.add(isCorrect ? "correct" : "incorrect");
    });
    el("exercise-order-check").hidden = true;
    registerExerciseResult(isCorrect);
  });
  export function registerExerciseResult(isCorrect) {
    const X = state.X;
    if (isCorrect) X.correct++;
    else X.wrongLog.push(X.current);
    el("exercise-score").textContent = X.correct + " верно";
    el("exercise-next-btn").hidden = false;
    el("exercise-next-btn").focus();
  }
  el("exercise-next-btn").addEventListener("click", askNextExercise);
  export function finishExerciseSession() {
    const X = state.X;
    const ctx = { type: state.studyCtx.type, book: state.studyCtx.book, lesson: state.studyCtx.lesson, words: state.studyCtx.words };
    const actions = [];
    if (X.wrongLog.length) {
      actions.push({ label: "Повторить ошибки (" + X.wrongLog.length + ")", primary: true, action: () => runExerciseQueue(X.wrongLog, ctx) });
    }
    actions.push({ label: "Пройти заново", action: () => startExerciseSession(ctx) });
    actions.push.apply(actions, summaryActionsFor(!X.wrongLog.length));
    showSummary({
      eyebrow: "Упражнения завершены",
      big: X.correct + "/" + X.total,
      note: "верных ответов из " + X.total,
      actions
    });
  }

