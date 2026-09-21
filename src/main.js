// src/main.js
import './style.css';
import './backup.js';
import './cat-menu.js';
import './mascots.js';
import { startPracticeSession } from './cards.js';
import { goToGrammarView, goToTextView } from './content-views.js';
import { el } from './dom.js';
import { startExerciseSession } from './exercise.js';
import { startMatch } from './match.js';
import { goToAbout, goToReview, goToRoadmap, renderSidebar } from './navigation.js';
import { startLearnSession, startTestSession } from './quiz.js';
import { goToSearch } from './search.js';
import { saveProgress, state } from './state.js';
import { startWritingSession } from './writing.js';

  document.querySelectorAll(".mode-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || !state.currentCtx) return;
      const mode = btn.dataset.mode;
      const words = state.currentCtx.words;
      if (mode === "cards") startPracticeSession(words, state.currentCtx);
      else if (mode === "learn") startLearnSession(words, state.currentCtx);
      else if (mode === "test") startTestSession(words, state.currentCtx);
      else if (mode === "match") startMatch(words, state.currentCtx);
      else if (mode === "writing") startWritingSession(words, state.currentCtx);
      else if (mode === "text") goToTextView(state.currentCtx);
      else if (mode === "grammar") goToGrammarView(state.currentCtx);
      else if (mode === "exercise") startExerciseSession(state.currentCtx);
    });
  });
  el("brand-home").addEventListener("click", goToRoadmap);
  el("brand-home-fixed").addEventListener("click", goToRoadmap);
  el("nav-roadmap").addEventListener("click", goToRoadmap);
  el("nav-review").addEventListener("click", goToReview);
  el("nav-search").addEventListener("click", goToSearch);
  el("nav-about").addEventListener("click", goToAbout);
  el("about-to-roadmap").addEventListener("click", goToRoadmap);
  el("review-empty-back").addEventListener("click", goToRoadmap);
  el("reset-progress").addEventListener("click", () => {
    state.PROGRESS = {};
    saveProgress();
    goToRoadmap();
  });
  renderSidebar();
  goToRoadmap();

  // Firebase is a heavy dependency (auth + Firestore) — load it as a
  // separate chunk after the core app is already interactive, instead of
  // blocking first paint on it.
  import('./auth.js');
