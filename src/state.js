// src/state.js
import { ease } from './vendor/hanzi-writer.esm.js';

  // js/state.js
  export var PROGRESS_KEY = "tianzige_progress_v1";
  export var STREAK_KEY = "tianzige_streak_v1";
  export var DIRECTION_KEY = "tianzige_direction_v1";

  // Lightweight pub-sub so other modules (e.g. cloud sync) can react to a
  // progress/streak save without state.js needing to know about them —
  // avoids a circular import between state.js and sync.js.
  var progressListeners = [];
  export function onProgressSave(cb) {
    progressListeners.push(cb);
  }
  function notifyProgressSave() {
    progressListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
      }
    });
  }
  export function migrateEntry(v) {
    if (typeof v === "string") {
      const now = Date.now();
      return { status: v, due: now, interval: 0, ease: 2.3, reps: v === "known" ? 1 : 0, lastSeen: now };
    }
    return v;
  }
  export function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      const out = {};
      for (const key of Object.keys(raw)) out[key] = migrateEntry(raw[key]);
      return out;
    } catch (e) {
      return {};
    }
  }
  export function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.PROGRESS));
    } catch (e) {
    }
    notifyProgressSave();
  }
  export function todayStr(d) {
    d = d || /* @__PURE__ */ new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  export function loadStreak() {
    try {
      return JSON.parse(localStorage.getItem(STREAK_KEY) || "null") || { current: 0, longest: 0, lastDate: null };
    } catch (e) {
      return { current: 0, longest: 0, lastDate: null };
    }
  }
  export function saveStreak() {
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(state.STREAK));
    } catch (e) {
    }
    notifyProgressSave();
  }
  export function touchStreak() {
    const s = state.STREAK;
    const today = todayStr();
    if (s.lastDate === today) return;
    const yesterday = todayStr(new Date(Date.now() - 864e5));
    s.current = s.lastDate === yesterday ? s.current + 1 : 1;
    s.longest = Math.max(s.longest, s.current);
    s.lastDate = today;
    saveStreak();
  }
  export function loadDirection() {
    try {
      return localStorage.getItem(DIRECTION_KEY) === "rev" ? "rev" : "fwd";
    } catch (e) {
      return "fwd";
    }
  }
  export function saveDirection() {
    try {
      localStorage.setItem(DIRECTION_KEY, state.direction);
    } catch (e) {
    }
  }
  export var state = {
    PROGRESS: loadProgress(),
    STREAK: loadStreak(),
    direction: loadDirection(),
    currentBookId: null,
    currentCtx: null,
    studyQueue: [],
    studyIndex: 0,
    studyCtx: null,
    sessionMarks: {},
    Q: null,
    M: null,
    W: null
  };
  saveProgress();

