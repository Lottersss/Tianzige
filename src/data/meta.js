// src/data/meta.js

  export var BOOKS = [
    { id: "1", hz: "\u6807\u51C6\u6559\u7A0B 1", sub: "Standard Course 1", lessons: 15, words: 148, ready: true, hsk: 1 },
    { id: "2", hz: "\u6807\u51C6\u6559\u7A0B 2", sub: "Standard Course 2", lessons: 15, words: 147, ready: true, hsk: 2 },
    { id: "3", hz: "\u6807\u51C6\u6559\u7A0B 3", sub: "Standard Course 3", lessons: 20, words: 300, ready: true, hsk: 3 },
    { id: "4a", hz: "\u6807\u51C6\u6559\u7A0B 4\u4E0A", sub: "Standard Course 4A", lessons: 10, words: 300, ready: true, hsk: 4 },
    { id: "4b", hz: "\u6807\u51C6\u6559\u7A0B 4\u4E0B", sub: "Standard Course 4B", lessons: 10, words: 302, ready: false, hsk: 4 },
    { id: "5a", hz: "\u6807\u51C6\u6559\u7A0B 5\u4E0A", sub: "Standard Course 5A", lessons: 18, words: 749, ready: true, hsk: 5 },
    { id: "5b", hz: "\u6807\u51C6\u6559\u7A0B 5\u4E0B", sub: "Standard Course 5B", lessons: 18, words: 693, ready: true, hsk: 5 }
  ];
  // Each HSK level gets its own accent color (CSS custom properties defined
  // in style.css :root) so the roadmap can group books by level and tint
  // every card in a group to match \u2014 "each section the same color as its
  // textbook".
  export var HSK_LEVELS = [
    { level: 1, label: "HSK 1", color: "var(--jade)", soft: "var(--jade-soft)" },
    { level: 2, label: "HSK 2", color: "var(--gold)", soft: "var(--gold-soft)" },
    { level: 3, label: "HSK 3", color: "var(--red)", soft: "var(--red-soft)" },
    { level: 4, label: "HSK 4", color: "var(--blue)", soft: "var(--blue-soft)" },
    { level: 5, label: "HSK 5", color: "var(--plum)", soft: "var(--plum-soft)" }
  ];
  export var CURRENT_BOOK = "2";
  export var POS_RU = {
    "v.": "\u0433\u043B.",
    "n.": "\u0441\u0443\u0449.",
    "adj.": "\u043F\u0440\u0438\u043B.",
    "adv.": "\u043D\u0430\u0440\u0435\u0447.",
    "pron.": "\u043C\u0435\u0441\u0442.",
    "num.": "\u0447\u0438\u0441\u043B.",
    "m.": "\u0441\u0447\u0451\u0442\u043D. \u0441\u043B\u043E\u0432\u043E",
    "part.": "\u0447\u0430\u0441\u0442.",
    "conj.": "\u0441\u043E\u044E\u0437",
    "prep.": "\u043F\u0440\u0435\u0434\u043B.",
    "aux.": "\u043C\u043E\u0434\u0430\u043B\u044C\u043D.",
    "mod.": "\u043C\u043E\u0434\u0430\u043B\u044C\u043D.",
    "int.": "\u043C\u0435\u0436\u0434.",
    "v./n.": "\u0433\u043B./\u0441\u0443\u0449.",
    "n./v.": "\u0441\u0443\u0449./\u0433\u043B.",
    "v./prep.": "\u0433\u043B./\u043F\u0440\u0435\u0434\u043B.",
    "num.-m.": "\u0447\u0438\u0441\u043B.-\u0441\u0447\u0451\u0442\u043D."
  };

