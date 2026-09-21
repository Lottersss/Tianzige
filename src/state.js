// src/state.js
import { ease } from './vendor/hanzi-writer.esm.js';

  // js/state.js
  export var PROGRESS_KEY = "tianzige_progress_v1";
  export var STREAK_KEY = "tianzige_streak_v1";
  export var DIRECTION_KEY = "tianzige_direction_v1";
  export var FAVORITES_KEY = "tianzige_favorites_v1";
  export var ACTIVITY_KEY = "tianzige_activity_v1";
  export var GOAL_KEY = "tianzige_goal_v1";
  export var DEVICE_KEY = "tianzige_device_v1";

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
  // Серия «на сегодня». В state.STREAK.current лежит число с последнего
  // занятия, и если пропустить несколько дней, оно так и висит до следующего
  // занятия — показывать его как «N дней подряд» было бы неправдой.
  export function liveStreak() {
    const s = state.STREAK;
    if (!s || !s.lastDate) return 0;
    const today = todayStr();
    const yesterday = todayStr(new Date(Date.now() - 864e5));
    return s.lastDate === today || s.lastDate === yesterday ? s.current : 0;
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
  // Избранное хранится как {ключ слова: {on, at}}, а не просто списком
  // ключей: без отметки времени и «выключенной» записи снятая на одном
  // устройстве звёздочка вернулась бы обратно при следующей синхронизации.
  export function loadFavorites() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "{}");
      const out = {};
      for (const key of Object.keys(raw)) {
        const v = raw[key];
        if (v && typeof v === "object") out[key] = { on: !!v.on, at: v.at || 0 };
        else if (v) out[key] = { on: true, at: 0 };
      }
      return out;
    } catch (e) {
      return {};
    }
  }
  export function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.FAVORITES));
    } catch (e) {
    }
    notifyProgressSave();
  }
  // Журнал занятий: {"2026-09-21": {"<устройство>": [повторений, новых слов]}}.
  // Каждое устройство пишет только в свою ячейку, а синхронизация берёт
  // максимум по каждой — так счёт с телефона и ноутбука за один день
  // складывается, а не затирается и не удваивается.
  export function loadActivity() {
    try {
      const v = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch (e) {
      return {};
    }
  }
  export function saveActivity() {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(state.ACTIVITY));
    } catch (e) {
    }
    notifyProgressSave();
  }
  // Цель: {level, date: "YYYY-MM-DD", at}. `at` — когда её меняли, чтобы при
  // синхронизации побеждала последняя правка, а не случайное устройство.
  export function loadGoal() {
    try {
      const g = JSON.parse(localStorage.getItem(GOAL_KEY) || "null");
      return g && typeof g === "object" ? g : null;
    } catch (e) {
      return null;
    }
  }
  export function saveGoal() {
    try {
      localStorage.setItem(GOAL_KEY, JSON.stringify(state.GOAL));
    } catch (e) {
    }
    notifyProgressSave();
  }
  // Идентификатор этого браузера для журнала. Не синхронизируется: у каждого
  // устройства он свой, иначе их счётчики слились бы в одну ячейку.
  var cachedDevice = null;
  export function deviceId() {
    if (cachedDevice) return cachedDevice;
    try {
      cachedDevice = localStorage.getItem(DEVICE_KEY);
      if (!cachedDevice) {
        cachedDevice = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        localStorage.setItem(DEVICE_KEY, cachedDevice);
      }
    } catch (e) {
      cachedDevice = cachedDevice || "d-local";
    }
    return cachedDevice;
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
    FAVORITES: loadFavorites(),
    ACTIVITY: loadActivity(),
    GOAL: loadGoal(),
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

