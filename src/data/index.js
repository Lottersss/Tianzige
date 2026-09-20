// src/data/index.js
import { book1_default } from './book1.js';
import { book2_default } from './book2.js';
import { book3_default } from './book3.js';
import { book4a_default } from './book4a.js';
import { book5a_default } from './book5a.js';
import { book5b_default } from './book5b.js';

  export var HSK_WORDS = {
    "1": book1_default,
    "2": book2_default,
    "3": book3_default,
    "4a": book4a_default,
    "5a": book5a_default,
    "5b": book5b_default
  };
  export function lessonKeysFor(bookId) {
    const b = HSK_WORDS[bookId];
    if (!b) return [];
    return Object.keys(b).sort((a, c) => parseFloat(a) - parseFloat(c));
  }

