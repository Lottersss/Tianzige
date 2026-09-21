// src/goal.js
// Цель (уровень HSK + дата экзамена) и расчёт темпа: сколько слов осталось,
// сколько нужно в день и сколько на деле получается.
import { dayTotals, firstActivityDay } from './activity.js';
import { BOOKS } from './data/meta.js';
import { HSK3_TARGETS, hsk3Ready, hsk3Totals, loadHsk3 } from './hsk3.js';
import { bookKnownCount } from './progress.js';
import { saveGoal, state, todayStr } from './state.js';

  var DAY = 864e5;
  export var PACE_WINDOW = 14;   // темп считаем по последним двум неделям
  export var MIN_DATA_DAYS = 3;  // меньше трёх дней — это ещё не темп

  // Стандарт экзамена: "2.0" — старый HSK 1–6, под который написан Standard
  // Course (на сайте есть книги до 5-го уровня); "3.0" — новый HSK по
  // программе 2025 года, уровни 1–6 и блок 7–9 (у нас он «уровень 9»).
  export function goalStd() {
    return state.GOAL && state.GOAL.std === "3.0" ? "3.0" : "2.0";
  }
  export function levelsFor(std) {
    return std === "3.0" ? [1, 2, 3, 4, 5, 6, 9] : [1, 2, 3, 4, 5];
  }
  export function setGoal(level, date, std) {
    std = std === "3.0" ? "3.0" : "2.0";
    const allowed = levelsFor(std);
    if (allowed.indexOf(level) === -1) level = allowed.indexOf(5) !== -1 ? 5 : allowed[allowed.length - 1];
    state.GOAL = { std: std, level: level, date: date || "", at: Date.now() };
    saveGoal();
  }
  export function goalLevel() {
    const lv = state.GOAL && +state.GOAL.level;
    return levelsFor(goalStd()).indexOf(lv) !== -1 ? lv : 5;
  }

  // Все слова книг до уровня включительно — по метаданным, то есть вместе с
  // книгами, которых на сайте ещё нет (4下): экзамену всё равно, есть ли они тут.
  export function targetWords(level) {
    return BOOKS.filter((b) => b.hsk <= level).reduce((s, b) => s + b.words, 0);
  }
  export function missingBooks(level) {
    return BOOKS.filter((b) => b.hsk <= level && !b.ready);
  }
  export function knownUpTo(level) {
    return BOOKS.filter((b) => b.hsk <= level && b.ready).reduce((s, b) => s + bookKnownCount(b.id).known, 0);
  }

  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function startOfToday(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  export function computePace(now) {
    now = now || Date.now();
    const std = goalStd();
    const level = goalLevel();
    let target, known, coverage = null;
    if (std === "3.0") {
      // Словник 3.0 грузится отдельно; пока его нет — честно говорим, что
      // считаем, а по готовности экран перерисуется (событие zhuzhu:hsk3ready).
      if (!hsk3Ready()) {
        loadHsk3();
        return { std, level, state: "loading", target: HSK3_TARGETS[level], known: 0, remaining: 0, dataDays: 0, learnedToday: 0 };
      }
      const t = hsk3Totals(level);
      target = HSK3_TARGETS[level];
      known = t.known;
      coverage = { total: t.total, inBase: t.inBase };
    } else {
      target = targetWords(level);
      known = knownUpTo(level);
    }
    const remaining = Math.max(0, target - known);
    const examDay = parseDay(state.GOAL && state.GOAL.date);
    const today = startOfToday(now);

    // Сколько новых слов в день получается на деле — за последние две недели,
    // но не раньше первого дня в журнале, иначе пустые дни до появления
    // журнала занижали бы темп.
    const first = firstActivityDay();
    let learned = 0, days = 0;
    if (first) {
      const firstDate = parseDay(first);
      for (let i = 0; i < PACE_WINDOW; i++) {
        const d = new Date(today.getTime() - i * DAY);
        if (d < firstDate) break;
        learned += dayTotals(todayStr(d)).learned;
        days++;
      }
    }
    const actual = days >= MIN_DATA_DAYS ? learned / days : null;
    const learnedToday = dayTotals(todayStr(today)).learned;

    const out = { std, level, target, known, remaining, examDay, actual, dataDays: days, learnedToday, firstDay: first, coverage };
    if (remaining === 0) return Object.assign(out, { state: "done" });
    if (!examDay) return Object.assign(out, { state: "nogoal" });
    // День экзамена считаем рабочим: до него включительно ещё можно учить.
    const daysLeft = Math.round((examDay - today) / DAY);
    out.daysLeft = daysLeft;
    if (daysLeft <= 0) return Object.assign(out, { state: "past" });
    out.need = remaining / daysLeft;
    if (actual > 0) out.projected = new Date(today.getTime() + Math.ceil(remaining / actual) * DAY);
    if (actual === null) return Object.assign(out, { state: "nodata" });
    return Object.assign(out, { state: actual >= out.need ? "ontrack" : "behind" });
  }
