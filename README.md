# 蛛蛛 Zhuzhu

Тренажёр лексики по HSK Standard Course (7 учебников) — карточки слов,
тексты уроков, грамматика и интерактивные упражнения с проверкой.

## Разработка

```bash
npm install
npm run dev       # локальный сервер с горячей перезагрузкой
npm run build     # собрать production-версию в dist/
npm run preview   # посмотреть собранную версию локально
```

## Структура

- `index.html` — точка входа Vite
- `src/main.js` — инициализация приложения, обработчики событий верхнего уровня
- `src/state.js` — состояние приложения, прогресс изучения, localStorage
- `src/dom.js`, `src/navigation.js` — работа с DOM, переходы между экранами
- `src/cards.js`, `src/quiz.js`, `src/match.js`, `src/writing.js` — режимы тренировки (карточки, тест, память, письмо)
- `src/exercise.js`, `src/content-views.js` — тексты уроков, грамматика, интерактивные упражнения
- `src/search.js`, `src/backup.js`, `src/speech.js`, `src/progress.js` — поиск, экспорт/импорт прогресса, озвучка, планировщик повторений
- `src/data/bookN.js` — списки слов по учебникам (1, 2, 3, 4a, 5a, 5b)
- `src/data/bookN-content.js` — тексты, грамматика и упражнения по учебникам
- `src/vendor/hanzi-writer.esm.js` — библиотека для практики написания иероглифов (встроена как есть)

Книга 4B (Standard Course 4下) в разработке — как только уроки будут готовы,
для неё добавляются `src/data/book4b.js` и `src/data/book4b-content.js` по
образцу остальных книг, плюс запись в `BOOKS`/`HSK_WORDS`/`HSK_TEXTS` и т.д.

## Деплой на GitHub Pages

Смотри `.github/workflows/deploy.yml` — при пуше в `main` сборка автоматически
публикуется на GitHub Pages.
