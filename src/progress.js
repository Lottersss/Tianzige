// src/progress.js
import { HSK_WORDS, lessonKeysFor } from './data/index.js';
import { BOOKS } from './data/meta.js';
import { saveProgress, state, touchStreak } from './state.js';
import { ease } from './vendor/hanzi-writer.esm.js';

  export var DAY_MS = 24 * 60 * 60 * 1e3;
  export function wordKey(book, lesson, h) {
    return book + "__" + lesson + "__" + h;
  }
  export function scheduleNext(rec, correct) {
    const now = Date.now();
    if (!rec) rec = { status: "learning", due: now, interval: 0, ease: 2.3, reps: 0, lastSeen: now };
    if (correct) {
      rec.reps += 1;
      if (rec.reps === 1) rec.interval = 1;
      else if (rec.reps === 2) rec.interval = 3;
      else rec.interval = Math.round(rec.interval * rec.ease);
      rec.ease = Math.min(3, rec.ease + 0.05);
      rec.status = "known";
    } else {
      rec.reps = 0;
      rec.interval = 0;
      rec.ease = Math.max(1.3, rec.ease - 0.2);
      rec.status = "learning";
    }
    rec.due = now + rec.interval * DAY_MS;
    rec.lastSeen = now;
    return rec;
  }
  export function setProgressStatus(book, lesson, h, status) {
    const key = wordKey(book, lesson, h);
    state.PROGRESS[key] = scheduleNext(state.PROGRESS[key], status === "known");
    saveProgress();
    touchStreak();
  }
  export function lessonKnownCount(book, lesson) {
    const words = HSK_WORDS[book][lesson];
    return words.filter((w) => {
      const rec = state.PROGRESS[wordKey(book, lesson, w.h)];
      return rec && rec.status === "known";
    }).length;
  }
  // Урок считается пройденным только когда все его слова отмечены «знаю».
  export function lessonDone(book, lesson) {
    const words = HSK_WORDS[book][lesson];
    return words.length > 0 && lessonKnownCount(book, lesson) === words.length;
  }
  // На какой книге стоит метка «ты здесь». Появляется только когда где-то
  // закрыт хотя бы один урок целиком (иначе null — на чистом старте метки
  // нет вообще), а встаёт на ту книгу, где занимались последней, чтобы не
  // спорить с кнопкой «Продолжить». Запасной вариант — самая дальняя книга
  // с пройденным уроком.
  export function currentBookId() {
    let furthest = null;
    BOOKS.filter((b) => b.ready).forEach((b) => {
      if (lessonKeysFor(b.id).some((lk) => lessonDone(b.id, lk))) furthest = b.id;
    });
    if (!furthest) return null;
    const last = lastStudiedLesson();
    return last ? last.book : furthest;
  }
  export function bookKnownCount(bookId) {
    const keys = lessonKeysFor(bookId);
    let known = 0, total = 0;
    keys.forEach((lk) => {
      const ws = HSK_WORDS[bookId][lk];
      total += ws.length;
      known += lessonKnownCount(bookId, lk);
    });
    return { known, total };
  }
  export function readyBooksLabel() {
    const ids = BOOKS.filter((b) => b.ready).map((b) => b.id);
    if (!ids.length) return "";
    if (ids.every((id) => /^\d+$/.test(id))) {
      const nums = ids.map(Number);
      const min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
      if (max - min + 1 === ids.length) return min === max ? "\u043A\u043D\u0438\u0433\u0430 " + min : "\u043A\u043D\u0438\u0433\u0438 " + min + "\u2013" + max;
    }
    return "\u043A\u043D\u0438\u0433\u0438 " + ids.map((id) => id.toUpperCase()).join(", ");
  }
  export function overallCount() {
    let known = 0, total = 0;
    BOOKS.filter((b) => b.ready).forEach((b) => {
      const c = bookKnownCount(b.id);
      known += c.known;
      total += c.total;
    });
    return { known, total };
  }
  // Последний урок, в котором что-то отмечали — для кнопки «Продолжить».
  // Ничего нового не храним: у каждой записи прогресса уже есть lastSeen,
  // а ключ записи сам по себе содержит книгу и урок.
  export function lastStudiedLesson() {
    let best = null, bestTime = 0;
    for (const key of Object.keys(state.PROGRESS)) {
      const rec = state.PROGRESS[key];
      if (!rec || !rec.lastSeen || rec.lastSeen <= bestTime) continue;
      const parts = key.split("__");
      if (parts.length < 3) continue;
      const book = parts[0], lesson = parts[1];
      if (!HSK_WORDS[book] || !HSK_WORDS[book][lesson]) continue;
      const meta = BOOKS.find((b) => b.id === book);
      if (!meta || !meta.ready) continue;
      bestTime = rec.lastSeen;
      best = { book, lesson };
    }
    return best;
  }
  // Сколько слов трогали сегодня — считаем по lastSeen, без отдельного счётчика.
  export function studiedToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const from = start.getTime();
    let n = 0;
    for (const key of Object.keys(state.PROGRESS)) {
      const rec = state.PROGRESS[key];
      if (rec && rec.lastSeen >= from) n += 1;
    }
    return n;
  }
  export function collectDueWords() {
    const out = [];
    const now = Date.now();
    BOOKS.filter((b) => b.ready).forEach((b) => {
      lessonKeysFor(b.id).forEach((lk) => {
        HSK_WORDS[b.id][lk].forEach((w) => {
          const rec = state.PROGRESS[wordKey(b.id, lk, w.h)];
          if (rec && rec.due <= now) {
            out.push(Object.assign({}, w, { _book: b.id, _lesson: lk }));
          }
        });
      });
    });
    return out;
  }

