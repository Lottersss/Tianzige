// src/hsk3.js
// Трек нового HSK 3.0 (программа 2025 года). Сам словник — 11 000 слов —
// подгружается отдельным файлом только когда нужен, чтобы не утяжелять
// открытие сайта. Здесь же — сверка словника с учебниками и прогрессом:
// какие слова уровня есть в Standard Course и какие из них уже выучены.
import { setExtraForms, wordIndex } from './data/word-index.js';
import { wordKey } from './progress.js';
import { state } from './state.js';

  // Уровни 7–9 в новом HSK идут одним блоком; внутри сайта это «уровень 9».
  export var HSK3_TARGETS = { 1: 300, 2: 500, 3: 1000, 4: 2000, 5: 3600, 6: 5400, 9: 11000 };
  export var HSK3_LEVEL_IDS = ["1", "2", "3", "4", "5", "6", "7-9"];
  export function levelNum(id) {
    return id === "7-9" ? 9 : +id;
  }
  export function levelLabel(n) {
    return n === 9 ? "HSK 7–9" : "HSK " + n;
  }

  var DATA = null;
  var loading = null;
  export function hsk3Ready() {
    return !!DATA;
  }
  export function loadHsk3() {
    if (DATA) return Promise.resolve(DATA);
    if (!loading) {
      loading = import('./data/hsk3-2025.js').then((m) => {
        DATA = m.HSK3_LEVELS;
        // Слова словника становятся частью разбивки текстов (см. word-index).
        const extra = new Map();
        DATA.forEach((lv) => lv.words.forEach((w) => {
          const forms = formsOf(w);
          const pys = String(w[1]).split("/");
          forms.forEach((f, i) => {
            if (!extra.has(f)) extra.set(f, { p: pys[i] || pys[0], level: lv.id });
          });
        }));
        setExtraForms(extra);
        window.dispatchEvent(new CustomEvent("zhuzhu:hsk3ready"));
        return DATA;
      });
    }
    return loading;
  }
  export function hsk3Levels() {
    return DATA || [];
  }

  // Слово словника: [иероглифы, пиньинь] или [«没/没有», пиньинь, формы].
  function formsOf(w) {
    return w[2] || [w[0]];
  }
  // Записи из учебников для слова (пустой список — в учебниках его нет).
  export function textbookEntries(w) {
    const idx = wordIndex();
    for (const f of formsOf(w)) {
      const list = idx.get(f);
      if (list && list.length) return list.filter((x) => x.prio === 0).map((x) => x.w).concat(list.filter((x) => x.prio !== 0).map((x) => x.w));
    }
    return [];
  }
  function isKnown(entry) {
    const r = state.PROGRESS[wordKey(entry._book, entry._lesson, entry.h)];
    return !!(r && r.status === "known");
  }
  // Полная карточка слова для списка и всплывающего окна.
  export function hsk3WordInfo(w, levelId) {
    const entries = textbookEntries(w);
    return {
      h: w[0],
      p: entries.length ? entries[0].p : w[1],
      auto: !entries.length,
      speak: formsOf(w)[formsOf(w).length - 1],
      entries,
      known: entries.some(isKnown),
      level: levelId,
    };
  }

  export function levelStats(level) {
    let inBase = 0, known = 0;
    level.words.forEach((w) => {
      const e = textbookEntries(w);
      if (!e.length) return;
      inBase++;
      if (e.some(isKnown)) known++;
    });
    return { total: level.words.length, inBase, known };
  }

  // Для цели: сколько слов уровня ≤ N (нарастающим итогом) есть в учебниках
  // и сколько из них выучено. null, пока словник не загружен.
  export function hsk3Totals(n) {
    if (!DATA) return null;
    let inBase = 0, known = 0, total = 0;
    DATA.forEach((lv) => {
      if (levelNum(lv.id) > n) return;
      const s = levelStats(lv);
      total += s.total;
      inBase += s.inBase;
      known += s.known;
    });
    return { total, inBase, known };
  }

  // Уровень нового HSK, к которому относится форма (для подписи в переводе
  // по нажатию). Только если словник уже загружен — ради подписи грузить
  // 11 000 слов не стоит.
  var FORM_LEVEL = null;
  export function hsk3LevelOf(form) {
    if (!DATA) return null;
    if (!FORM_LEVEL) {
      FORM_LEVEL = new Map();
      DATA.forEach((lv) => lv.words.forEach((w) => formsOf(w).forEach((f) => {
        if (!FORM_LEVEL.has(f)) FORM_LEVEL.set(f, lv.id);
      })));
    }
    return FORM_LEVEL.get(form) || null;
  }
