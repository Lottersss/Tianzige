// src/progress-view.js
// Экран «Прогресс»: цель с расчётом темпа и календарь занятий за год.
import { dayTotals } from './activity.js';
import { el, showView } from './dom.js';
import { computePace, goalStd, levelsFor, missingBooks, setGoal, MIN_DATA_DAYS } from './goal.js';
import { HSK3_TARGETS, levelLabel } from './hsk3.js';
import { setActiveNav } from './navigation.js';
import { liveStreak, state, todayStr } from './state.js';

  var WEEKS = 53;
  var MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  var WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  export function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }
  export function fmtDate(d, withYear) {
    const s = d.toLocaleDateString("ru-RU", withYear ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" });
    return s.replace(/\s*г\.?$/, "");
  }
  function fmtNum(n) {
    return Math.round(n).toLocaleString("ru-RU");
  }
  function fmtRate(x) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    return x < 10 ? x.toFixed(1).replace(".", ",") : String(Math.round(x));
  }
  // После дробного числа в русском — родительный единственного: «1,5 слова»,
  // «0,3 слова». Целые — по обычным правилам.
  function rateNoun(x, one, few, many) {
    const shown = fmtRate(x);
    return /,/.test(shown) ? few : plural(Math.round(x), one, few, many);
  }
  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // --- Цель и темп ---------------------------------------------------------

  function stat(value, label) {
    return '<div class="goal-stat"><b>' + value + "</b><span>" + label + "</span></div>";
  }

  // Название цели: «HSK 5» для старого экзамена, «нового HSK 5» для 3.0.
  function goalName(std, level, genitive) {
    const base = levelLabel(level);
    if (std !== "3.0") return base;
    return (genitive ? "нового " : "новый ") + base;
  }

  function fillLevelOptions(std, level) {
    const sel = el("goal-level");
    const want = levelsFor(std).map(String).join(",");
    if (sel.dataset.std !== std || sel.dataset.levels !== want) {
      sel.innerHTML = levelsFor(std).map((n) =>
        '<option value="' + n + '">' + levelLabel(n) + (std === "3.0" ? " · " + fmtNum(HSK3_TARGETS[n]) + " слов" : "") + "</option>").join("");
      sel.dataset.std = std;
      sel.dataset.levels = want;
    }
    sel.value = String(level);
  }

  export function renderGoal() {
    const p = computePace();
    const std = goalStd();
    el("goal-std").value = std;
    fillLevelOptions(std, p.level);
    el("progress-title").textContent = "Путь до " + goalName(std, p.level, true);
    const dateInput = el("goal-date");
    dateInput.value = (state.GOAL && state.GOAL.date) || "";
    dateInput.min = todayStr();

    if (p.state === "loading") {
      el("goal-stats").innerHTML = "";
      el("goal-verdict").className = "goal-verdict is-nodata";
      el("goal-verdict").textContent = "Загружаю словник нового HSK — 11 000 слов, это пара секунд…";
      el("goal-note").hidden = true;
      return;
    }

    const pct = p.target ? Math.round((100 * p.known) / p.target) : 0;
    el("goal-stats").innerHTML =
      '<div class="goal-bar"><div class="goal-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<p class="goal-bar-label">' + fmtNum(p.known) + " из " + fmtNum(p.target) + " слов до " + goalName(std, p.level, true) + " · " + pct + "%</p>" +
      '<div class="goal-stat-row">' +
        stat(fmtNum(p.remaining), plural(p.remaining, "слово осталось", "слова осталось", "слов осталось")) +
        stat(p.daysLeft > 0 ? fmtNum(p.daysLeft) : "—", p.daysLeft > 0 ? plural(p.daysLeft, "день до экзамена", "дня до экзамена", "дней до экзамена") : "дней до экзамена") +
        stat(fmtRate(p.need), "нужно новых в день") +
        stat(fmtRate(p.actual), "твой темп за " + Math.max(p.dataDays, 1) + " " + plural(Math.max(p.dataDays, 1), "день", "дня", "дней")) +
      "</div>";

    const v = el("goal-verdict");
    v.className = "goal-verdict is-" + p.state;
    const exam = p.examDay ? fmtDate(p.examDay, true) : "";
    let text = "";
    if (p.state === "done") {
      text = "Все слова до " + goalName(std, p.level, true) + ", которые есть на сайте, уже отмечены как знакомые.";
    } else if (p.state === "nogoal") {
      text = "Поставь дату экзамена — посчитаю, сколько новых слов в день нужно, чтобы успеть.";
    } else if (p.state === "past") {
      text = "Дата экзамена уже прошла — поставь новую.";
    } else if (p.state === "nodata") {
      text = "Чтобы успеть к " + exam + ", нужно примерно " + fmtRate(p.need) + " " + rateNoun(p.need, "новое слово", "новых слова", "новых слов") +
        " в день. Твой темп посчитаю, когда журналу будет хотя бы " + MIN_DATA_DAYS + " дня" +
        (p.dataDays ? " — сейчас " + p.dataDays + " " + plural(p.dataDays, "день", "дня", "дней") + "." : ".");
    } else if (p.state === "ontrack") {
      const ahead = p.projected ? Math.round((p.examDay - p.projected) / 864e5) : 0;
      text = "Успеваешь: в таком темпе закончишь к " + fmtDate(p.projected, true) +
        (ahead >= 7 ? " — на " + Math.round(ahead / 7) + " " + plural(Math.round(ahead / 7), "неделю", "недели", "недель") + " раньше экзамена." : ", как раз к экзамену.");
    } else if (p.state === "behind") {
      const gap = p.need - p.actual;
      text = "Пока отстаёшь: нужно на " + fmtRate(gap) + " " + rateNoun(gap, "слово", "слова", "слов") + " в день больше." +
        (p.projected ? " В нынешнем темпе — к " + fmtDate(p.projected, true) + "." : "");
    }
    v.textContent = text;

    const note = el("goal-note");
    if (std === "3.0" && p.coverage) {
      // Главное про новый экзамен: учебники покрывают его лишь частично.
      const out = p.coverage.total - p.coverage.inBase;
      const pctIn = Math.round((100 * p.coverage.inBase) / p.coverage.total);
      note.hidden = false;
      note.textContent = "Из " + fmtNum(p.coverage.total) + " слов " + goalName(std, p.level, true) + " в твоих учебниках есть " +
        fmtNum(p.coverage.inBase) + " (" + pctIn + "%). Остальные " + fmtNum(out) + " — в библиотеке, раздел «Словники HSK 3.0»: " +
        "их пока можно только посмотреть и послушать, перевода к ним нет. Номера уровней у экзаменов разные: новый HSK 5 — это 3 600 слов, старый — около 2 500.";
    } else {
      // Книги, которых на сайте ещё нет, входят в цель: экзамену всё равно.
      const missing = std === "3.0" ? [] : missingBooks(p.level);
      if (missing.length) {
        const words = missing.reduce((s, b) => s + b.words, 0);
        note.hidden = false;
        note.textContent = "В том числе " + fmtNum(words) + " " + plural(words, "слово", "слова", "слов") + " из " +
          missing.map((b) => b.hz).join(", ") + " — " + (missing.length > 1 ? "этих книг" : "этой книги") + " пока нет на сайте, их отметить нельзя.";
      } else {
        note.hidden = true;
      }
    }
  }

  function onGoalInput() {
    setGoal(+el("goal-level").value, el("goal-date").value, el("goal-std").value);
    renderGoal();
  }
  el("goal-std").addEventListener("change", onGoalInput);
  el("goal-level").addEventListener("change", onGoalInput);
  el("goal-date").addEventListener("change", onGoalInput);
  window.addEventListener("zhuzhu:hsk3ready", () => {
    if (!el("view-progress").hidden) renderGoal();
  });

  // --- Календарь -----------------------------------------------------------

  function heatLevel(seen) {
    if (seen <= 0) return 0;
    if (seen < 10) return 1;
    if (seen < 30) return 2;
    if (seen < 60) return 3;
    return 4;
  }
  function describeDay(day) {
    const t = dayTotals(day);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    const wd = WEEKDAYS[(d.getDay() + 6) % 7];
    const head = wd.charAt(0).toUpperCase() + wd.slice(1) + ", " + fmtDate(d, d.getFullYear() !== new Date().getFullYear());
    if (!t.seen) return head + ": занятий не было";
    return head + ": " + t.seen + " " + plural(t.seen, "повторение", "повторения", "повторений") +
      (t.learned ? ", " + t.learned + " " + plural(t.learned, "новое слово", "новых слова", "новых слов") : "");
  }

  export function renderHeatmap() {
    const root = el("heat");
    root.innerHTML = "";
    const today = startOfToday();
    const todayKey = todayStr(today);
    const dow = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - dow - (WEEKS - 1) * 7);   // понедельник 52 недели назад

    // Подписи месяцев: над неделей, в которую попадает первое число месяца.
    const months = document.createElement("div");
    months.className = "heat-months";
    let lastLabelCol = -9;
    for (let w = 0; w < WEEKS; w++) {
      const cell = document.createElement("span");
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        if (day.getDate() === 1 && day <= today && w - lastLabelCol >= 3) {
          cell.textContent = MONTHS[day.getMonth()];
          lastLabelCol = w;
          break;
        }
      }
      months.appendChild(cell);
    }

    const labels = document.createElement("div");
    labels.className = "heat-days";
    WEEKDAYS.forEach((name, i) => {
      const s = document.createElement("span");
      s.textContent = i % 2 === 0 ? name : "";   // пн, ср, пт, вс — через одну, как у GitHub
      labels.appendChild(s);
    });

    const grid = document.createElement("div");
    grid.className = "heat-grid";
    let activeDays = 0;
    for (let i = 0; i < WEEKS * 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = todayStr(day);
      const c = document.createElement("span");
      if (day > today) {
        c.className = "hc is-future";
      } else {
        const seen = dayTotals(key).seen;
        if (seen) activeDays++;
        c.className = "hc hl" + heatLevel(seen) + (key === todayKey ? " is-today" : "");
        c.dataset.day = key;
        c.title = describeDay(key);
      }
      grid.appendChild(c);
    }

    const body = document.createElement("div");
    body.className = "heat-body";
    body.appendChild(labels);
    body.appendChild(grid);
    root.appendChild(months);
    root.appendChild(body);

    const streak = liveStreak();
    const longest = Math.max(state.STREAK.longest || 0, streak);
    el("heat-summary").textContent = activeDays + " " + plural(activeDays, "день", "дня", "дней") + " с занятиями · серия " +
      streak + " (рекорд " + longest + ")";

    // На узком экране сетка шире экрана — прокручиваем к сегодняшнему дню.
    const scroller = el("heat-scroll");
    requestAnimationFrame(() => { scroller.scrollLeft = scroller.scrollWidth; });
  }

  el("heat").addEventListener("click", (e) => {
    const c = e.target.closest(".hc[data-day]");
    if (!c) return;
    el("heat").querySelectorAll(".hc.is-picked").forEach((x) => x.classList.remove("is-picked"));
    c.classList.add("is-picked");
    el("heat-detail").textContent = describeDay(c.dataset.day);
  });

  export function goToProgress() {
    showView("view-progress");
    setActiveNav("progress");
    el("crumbs").hidden = true;
    el("crumbs").innerHTML = "";
    renderGoal();
    renderHeatmap();
    const first = computePace().firstDay;
    el("heat-detail").textContent = first
      ? "Нажми на день, чтобы увидеть подробности."
      : "Журнал начнётся с первого занятия — отметь пару слов в любом уроке.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
