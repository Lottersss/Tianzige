// src/data/content-index.js
import { book1_exercises, book1_grammar, book1_texts } from './book1-content.js';
import { book2_exercises, book2_grammar, book2_texts } from './book2-content.js';
import { book3_exercises, book3_grammar, book3_texts } from './book3-content.js';
import { book4a_exercises, book4a_grammar, book4a_texts } from './book4a-content.js';
import { book5a_exercises, book5a_grammar, book5a_texts } from './book5a-content.js';
import { book5b_exercises, book5b_grammar, book5b_texts } from './book5b-content.js';
import { HSK_WORDS, lessonKeysFor } from './index.js';
import { BOOKS } from './meta.js';

  // grammar exercises (练习), layered on top of the vocab data above. Filled in book by
  // book from the HSK Standard Course textbooks; a missing lesson key just means that
  // lesson's content hasn't been transcribed yet -- the UI hides the corresponding mode.
  export var HSK_TEXTS = { "1": book1_texts, "2": book2_texts, "3": book3_texts, "4a": book4a_texts, "5a": book5a_texts, "5b": book5b_texts };
  export var HSK_GRAMMAR = { "1": book1_grammar, "2": book2_grammar, "3": book3_grammar, "4a": book4a_grammar, "5a": book5a_grammar, "5b": book5b_grammar };
  export var HSK_EXERCISES = { "1": book1_exercises, "2": book2_exercises, "3": book3_exercises, "4a": book4a_exercises, "5a": book5a_exercises, "5b": book5b_exercises };
  export function textsFor(bookId, lesson) {
    return (HSK_TEXTS[bookId] && HSK_TEXTS[bookId][lesson]) || null;
  }
  export function grammarFor(bookId, lesson) {
    return (HSK_GRAMMAR[bookId] && HSK_GRAMMAR[bookId][lesson]) || null;
  }
  export function exercisesFor(bookId, lesson) {
    const list = HSK_EXERCISES[bookId] && HSK_EXERCISES[bookId][lesson];
    return list && list.length ? list : null;
  }
  export var ALL_READY_WORDS = [];
  BOOKS.filter((b) => b.ready).forEach((b) => {
    lessonKeysFor(b.id).forEach((lk) => {
      HSK_WORDS[b.id][lk].forEach((w) => ALL_READY_WORDS.push(Object.assign({}, w, { _book: b.id, _lesson: lk })));
    });
  });

