// src/dom.js
import { state } from './state.js';

  // js/dom.js
  export function el(id) {
    return document.getElementById(id);
  }
  export function setHidden(id, val) {
    el(id).hidden = val;
  }
  export function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }
  export var ALL_VIEWS = [
    "view-roadmap",
    "view-library",
    "view-progress",
    "view-about",
    "view-review-empty",
    "view-lessons",
    "view-mode-select",
    "view-practice",
    "view-quiz",
    "view-match",
    "view-summary",
    "view-search",
    "view-writing",
    "view-text",
    "view-grammar",
    "view-exercise"
  ];
  export function showView(id) {
    if (id !== "view-match" && state.M && state.M.timerId) {
      clearInterval(state.M.timerId);
      state.M.timerId = null;
    }
    ALL_VIEWS.forEach((v) => setHidden(v, v !== id));
    // Всплывающие окна (карточка слова) закрываются при смене экрана.
    window.dispatchEvent(new CustomEvent("zhuzhu:viewchange", { detail: { view: id } }));
  }

