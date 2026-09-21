// src/activity.js
// Журнал занятий по дням — основа календаря и расчёта темпа. Формат и то,
// почему он такой, описаны у loadActivity в state.js.
import { deviceId, saveActivity, state, todayStr } from './state.js';

  export function recordStudy(learned) {
    const day = todayStr();
    const dev = deviceId();
    const d = state.ACTIVITY[day] || (state.ACTIVITY[day] = {});
    const c = Array.isArray(d[dev]) ? d[dev] : (d[dev] = [0, 0]);
    c[0] = (c[0] || 0) + 1;
    if (learned) c[1] = (c[1] || 0) + 1;
    saveActivity();
  }

  // Сумма по всем устройствам за день.
  export function dayTotals(day) {
    const d = state.ACTIVITY[day];
    let seen = 0, learned = 0;
    if (d) {
      for (const k of Object.keys(d)) {
        const c = d[k];
        if (!Array.isArray(c)) continue;
        seen += c[0] || 0;
        learned += c[1] || 0;
      }
    }
    return { seen, learned };
  }

  export function firstActivityDay() {
    const days = Object.keys(state.ACTIVITY).filter((k) => dayTotals(k).seen > 0).sort();
    return days.length ? days[0] : null;
  }

  // Слияние двух журналов: по каждому дню и устройству — максимум каждого
  // счётчика. Устройство только увеличивает свои числа, поэтому максимум и
  // есть его самое свежее значение; повторная синхронизация ничего не удвоит.
  export function mergeActivity(a, b) {
    a = a || {};
    b = b || {};
    const out = {};
    const days = new Set(Object.keys(a).concat(Object.keys(b)));
    days.forEach((day) => {
      const da = a[day] || {}, db = b[day] || {};
      const devs = new Set(Object.keys(da).concat(Object.keys(db)));
      const row = {};
      devs.forEach((dev) => {
        const x = Array.isArray(da[dev]) ? da[dev] : [0, 0];
        const y = Array.isArray(db[dev]) ? db[dev] : [0, 0];
        row[dev] = [Math.max(x[0] || 0, y[0] || 0), Math.max(x[1] || 0, y[1] || 0)];
      });
      out[day] = row;
    });
    return out;
  }

  export function activityEqual(a, b) {
    a = a || {};
    b = b || {};
    const days = new Set(Object.keys(a).concat(Object.keys(b)));
    for (const day of days) {
      const da = a[day] || {}, db = b[day] || {};
      const devs = new Set(Object.keys(da).concat(Object.keys(db)));
      for (const dev of devs) {
        const x = da[dev] || [0, 0], y = db[dev] || [0, 0];
        if ((x[0] || 0) !== (y[0] || 0) || (x[1] || 0) !== (y[1] || 0)) return false;
      }
    }
    return true;
  }
