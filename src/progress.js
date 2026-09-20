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

