// src/backup.js
import { el } from './dom.js';
import { goToRoadmap, renderSidebar } from './navigation.js';
import { migrateEntry, saveProgress, saveStreak, state } from './state.js';

  export function showStatus(text, isError) {
    const s = el("backup-status");
    s.textContent = text;
    s.classList.toggle("is-error", !!isError);
    s.hidden = false;
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => {
      s.hidden = true;
    }, 6e3);
  }
  export async function getDownloadsCapability() {
    if (typeof window === "undefined" || !window.claude || typeof window.claude.use !== "function") return null;
    try {
      return await window.claude.use("downloads");
    } catch (e) {
      return null;
    }
  }
  export async function doExport() {
    const payload = {
      app: "tianzige",
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      progress: state.PROGRESS,
      streak: state.STREAK
    };
    const json = JSON.stringify(payload, null, 2);
    const filename = "tianzige-progress-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    const downloads = await getDownloadsCapability();
    if (downloads) {
      try {
        await downloads.save({ filename, data: json });
        showStatus("\u0424\u0430\u0439\u043B \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.");
      } catch (e) {
        if (e && e.code !== "declined") showStatus("\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0444\u0430\u0439\u043B.", true);
      }
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2e3);
    showStatus("\u0424\u0430\u0439\u043B \u0441\u043A\u0430\u0447\u0430\u043D.");
  }
  export var pendingImport = null;
  export function showImportConfirm(count2) {
    el("import-confirm-text").textContent = "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 (" + count2 + " \u0441\u043B\u043E\u0432)? \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u043C\u0435\u043D\u0451\u043D.";
    el("import-confirm").hidden = false;
  }
  export function hideImportConfirm() {
    el("import-confirm").hidden = true;
    pendingImport = null;
  }
  export function doImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        showStatus("\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u2014 \u044D\u0442\u043E \u043D\u0435 JSON.", true);
        return;
      }
      if (!data || typeof data.progress !== "object" || data.progress === null || Array.isArray(data.progress)) {
        showStatus("\u0424\u0430\u0439\u043B \u043D\u0435 \u043F\u043E\u0445\u043E\u0436 \u043D\u0430 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430 Tianzige.", true);
        return;
      }
      pendingImport = data;
      showImportConfirm(Object.keys(data.progress).length);
    };
    reader.onerror = () => showStatus("\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B.", true);
    reader.readAsText(file);
  }
  export function applyPendingImport() {
    const data = pendingImport;
    if (!data) return;
    const merged = {};
    for (const key of Object.keys(data.progress)) merged[key] = migrateEntry(data.progress[key]);
    state.PROGRESS = merged;
    saveProgress();
    if (data.streak && typeof data.streak === "object") {
      state.STREAK = Object.assign({ current: 0, longest: 0, lastDate: null }, data.streak);
      saveStreak();
    }
    const count2 = Object.keys(merged).length;
    hideImportConfirm();
    renderSidebar();
    goToRoadmap();
    showStatus("\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0441\u043B\u043E\u0432: " + count2 + ".");
  }
  el("export-progress").addEventListener("click", doExport);
  el("import-progress").addEventListener("click", () => el("import-file-input").click());
  el("import-file-input").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) doImportFile(file);
    e.target.value = "";
  });
  el("import-confirm-cancel").addEventListener("click", hideImportConfirm);
  el("import-confirm-apply").addEventListener("click", applyPendingImport);

