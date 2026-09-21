// src/cat-menu.js
// The site's primary navigation: click the peeking cat (now a persistent,
// fixed element visible on every view, top right) and this drawer slides in
// from the right. It carries everything the old always-visible sidebar used
// to — branding, nav links, progress badges, account, backup/export/import
// and reset — all migrated here, so the drawer is now the only way in.
import { el } from './dom.js';

  export function openMenu() {
    el("cat-menu").classList.add("is-open");
    el("cat-menu-backdrop").classList.add("is-open");
  }
  export function closeMenu() {
    el("cat-menu").classList.remove("is-open");
    el("cat-menu-backdrop").classList.remove("is-open");
  }

  document.querySelectorAll(".mascot-peek-btn").forEach((btn) => {
    btn.addEventListener("click", openMenu);
  });
  el("cat-menu-close").addEventListener("click", closeMenu);
  el("cat-menu-backdrop").addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el("cat-menu").classList.contains("is-open")) closeMenu();
  });

  // The real nav/brand/account/reset buttons now live inside the drawer
  // with their original ids, so main.js's own listeners already handle what
  // they do — this just closes the drawer afterwards. The export/import
  // controls are excluded: that flow needs the drawer to stay open across
  // multiple steps (pick a file, then confirm the replace).
  // .keep-menu-open — кнопки, после которых меню должно остаться открытым:
  // переключатель темы (чтобы сразу увидеть результат и при желании вернуть).
  el("cat-menu").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || btn.closest(".sidebar-backup") || btn.classList.contains("keep-menu-open")) return;
    closeMenu();
  });
