// src/favorites.js
// Звёздочка на слове. Ключ тот же, что у прогресса (книга__урок__иероглиф),
// поэтому избранное само собой переживает и экспорт, и синхронизацию, и не
// требует отдельного списка слов — по ключу слово всегда находится в базе.
import { ALL_READY_WORDS } from './data/content-index.js';
import { wordKey } from './progress.js';
import { saveFavorites, state } from './state.js';

  export function favKeyOf(w) {
    return wordKey(w._book, w._lesson, w.h);
  }
  export function isFav(w) {
    const rec = state.FAVORITES[favKeyOf(w)];
    return !!(rec && rec.on);
  }
  export function toggleFav(w) {
    const key = favKeyOf(w);
    const now = !isFav(w);
    state.FAVORITES[key] = { on: now, at: Date.now() };
    saveFavorites();
    return now;
  }
  export function favoriteCount() {
    return Object.keys(state.FAVORITES).filter((k) => state.FAVORITES[k].on).length;
  }
  // Слова в том же порядке, в каком они идут в учебниках, а не в порядке
  // добавления — так избранное читается как обычный список слов.
  export function favoriteWords() {
    return ALL_READY_WORDS.filter((w) => isFav(w));
  }

  export var STAR_SVG =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7L10 2.6z" ' +
    'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  // Одна кнопка-звёздочка, которую можно повесить куда угодно: и на карточку,
  // и в строку поиска. onChange нужен там, где от неё зависит что-то ещё на
  // экране (например, счётчик в библиотеке).
  export function makeStarButton(w, onChange) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "star-btn";
    btn.innerHTML = STAR_SVG;
    const sync = () => {
      const on = isFav(w);
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Убрать из избранного" : "В избранное");
    };
    sync();
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(w);
      sync();
      if (onChange) onChange();
    });
    btn.syncStar = sync;
    return btn;
  }
