// src/data/word-index.js
// Индекс «форма слова → записи из учебников». Нужен двум вещам: переводу по
// нажатию в текстах (найти слово в строке) и сверке с программой HSK 3.0
// (понять, есть ли слово в учебниках и выучено ли оно).
//
// Заголовки в учебниках не всегда совпадают с тем, как слово стоит в тексте:
// 南(方) — это и 南, и 南方; (躲)藏 — и 藏, и 躲藏; 不但……而且…… — парная
// конструкция из двух слов; 《非你莫属》 — название в кавычках. Поэтому каждая
// запись разворачивается во все свои формы.
import { ALL_READY_WORDS } from './content-index.js';

  // prio 0 — полноценная форма слова, 1 — часть парной конструкции (при
  // совпадении проигрывает самостоятельному слову).
  export function expandForms(h) {
    let base = String(h || "").replace(/（/g, "(").replace(/）/g, ")").replace(/[《》]/g, "").trim();
    if (!base) return [];
    if (base.indexOf("……") !== -1) {
      return base.split("……").map((s) => s.trim())
        .filter((s) => [...s].length >= 2)          // одиночное «才» из «只有……才……» — не отдельное слово
        .map((s) => ({ form: s, prio: 1 }));
    }
    const parts = base.split(/(\([^)]*\))/).filter(Boolean);
    let variants = [""];
    for (const part of parts) {
      if (part.charAt(0) === "(" && part.charAt(part.length - 1) === ")") {
        const inner = part.slice(1, -1);
        variants = variants.flatMap((v) => [v, v + inner]);
      } else {
        variants = variants.map((v) => v + part);
      }
    }
    return Array.from(new Set(variants.filter(Boolean))).map((v) => ({ form: v, prio: 0 }));
  }

  var INDEX = null;
  var MAX_LEN = 1;
  // Дополнительный словарь только для разбивки: слова нового HSK, которых нет
  // в учебниках. Без него 暖和 («тёплый») распадалось бы на 暖 + 和, и по
  // нажатию на 和 показывалось бы «и» — неправда в этом месте текста.
  var EXTRA = new Map();   // форма → { p, level }
  export function setExtraForms(map) {
    wordIndex();
    EXTRA = map;
    map.forEach((_, form) => { MAX_LEN = Math.max(MAX_LEN, [...form].length); });
  }
  export function extraInfo(form) {
    return EXTRA.get(form) || null;
  }

  export function wordIndex() {
    if (INDEX) return INDEX;
    INDEX = new Map();
    ALL_READY_WORDS.forEach((w) => {
      expandForms(w.h).forEach(({ form, prio }) => {
        if (!INDEX.has(form)) INDEX.set(form, []);
        INDEX.get(form).push({ w, prio });
        MAX_LEN = Math.max(MAX_LEN, [...form].length);
      });
    });
    return INDEX;
  }
  export function maxFormLength() {
    wordIndex();
    return MAX_LEN;
  }

  // Лучшая запись для формы с учётом того, где мы сейчас: сначала
  // самостоятельные слова, потом — тот же урок, та же книга, более ранняя книга.
  var BOOK_ORDER = ["1", "2", "3", "4a", "4b", "5a", "5b"];
  export function entriesFor(form, ctx) {
    const list = wordIndex().get(form);
    if (!list) return [];
    const book = ctx && ctx.book, lesson = ctx && ctx.lesson;
    return list.slice().sort((a, b) => {
      if (a.prio !== b.prio) return a.prio - b.prio;
      const al = a.w._book === book && a.w._lesson === lesson, bl = b.w._book === book && b.w._lesson === lesson;
      if (al !== bl) return al ? -1 : 1;
      const ab = a.w._book === book, bb = b.w._book === book;
      if (ab !== bb) return ab ? -1 : 1;
      return BOOK_ORDER.indexOf(a.w._book) - BOOK_ORDER.indexOf(b.w._book);
    }).map((x) => x.w);
  }

  // Разбивка строки на слова: жадно берём самое длинное совпадение с
  // индексом. Для учебных текстов на лексике тех же учебников этого хватает;
  // всё, что не нашлось (имена, знаки препинания), остаётся простым текстом.
  export function segment(text) {
    const idx = wordIndex();
    const chars = [...String(text || "")];
    const out = [];
    let i = 0;
    while (i < chars.length) {
      let hit = null;
      for (let L = Math.min(MAX_LEN, chars.length - i); L >= 1; L--) {
        const s = chars.slice(i, i + L).join("");
        if (idx.has(s) || EXTRA.has(s)) {
          hit = s;
          break;
        }
      }
      if (hit) {
        out.push({ t: hit, word: true, base: idx.has(hit) });
        i += [...hit].length;
      } else {
        const last = out[out.length - 1];
        if (last && !last.word) last.t += chars[i];
        else out.push({ t: chars[i], word: false });
        i++;
      }
    }
    return out;
  }
