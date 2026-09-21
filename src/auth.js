// src/auth.js
// Sign-up / sign-in / sign-out UI wiring. Firebase persists the session in
// the browser itself, so a returning visitor is signed back in automatically
// — onAuthStateChanged below fires for that case exactly like a fresh login.
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { el } from './dom.js';
import { auth, googleProvider } from './firebase.js';
import { syncOnSignIn, syncOnSignOut } from './sync.js';

  var mode = "signin";
  var lastUid = null;

  function errorMessage(err) {
    switch (err && err.code) {
      case "auth/email-already-in-use":
        return "Этот email уже зарегистрирован — попробуйте войти.";
      case "auth/invalid-email":
        return "Некорректный email.";
      case "auth/weak-password":
        return "Пароль слишком короткий (минимум 6 символов).";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Неверный email или пароль.";
      case "auth/user-not-found":
        return "Аккаунт с таким email не найден.";
      case "auth/too-many-requests":
        return "Слишком много попыток. Попробуйте позже.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return null;
      case "auth/popup-blocked":
        return "Браузер заблокировал всплывающее окно. Разрешите всплывающие окна и попробуйте ещё раз.";
      case "auth/network-request-failed":
        return "Нет соединения с сетью.";
      case "auth/missing-email":
        return "Введите email — на него придёт письмо для сброса пароля.";
      default:
        return "Что-то пошло не так. Попробуйте ещё раз.";
    }
  }

  function showError(text) {
    var box = el("auth-error");
    if (!text) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    el("auth-note").hidden = true;
    box.hidden = false;
    box.textContent = text;
  }

  // Спокойное сообщение (не ошибка) — например, что письмо для сброса ушло.
  function showNote(text) {
    var box = el("auth-note");
    if (!text) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    el("auth-error").hidden = true;
    box.hidden = false;
    box.textContent = text;
  }

  // «Запомнить меня» делает ровно то, что обещает: с галочкой сессия живёт в
  // браузере между запусками, без неё — только до закрытия вкладки.
  async function applyPersistence() {
    try {
      await setPersistence(auth, el("auth-remember").checked ? browserLocalPersistence : browserSessionPersistence);
    } catch (e) {
      // Приватный режим может не дать нужное хранилище — тогда остаётся
      // то, что Firebase выбрал сам, и входу это не мешает.
    }
  }

  function setMode(next) {
    mode = next;
    showError(null);
    showNote(null);
    var isSignup = mode === "signup";
    // Сбрасывать пароль имеет смысл только при входе; при регистрации
    // сбрасывать нечего.
    el("auth-forgot").hidden = isSignup;
    el("auth-modal-title").textContent = isSignup ? "Регистрация в Zhuzhu" : "Войти в Zhuzhu";
    el("auth-submit").textContent = isSignup ? "Зарегистрироваться" : "Войти";
    el("auth-toggle-text").textContent = isSignup ? "Уже есть аккаунт?" : "Нет аккаунта?";
    el("auth-toggle-mode").textContent = isSignup ? "Войти" : "Зарегистрироваться";
    el("auth-password").setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
  }

  function openModal() {
    setMode("signin");
    el("auth-form").reset();
    // reset() возвращает чекбокс к checked, но тип поля пароля не трогает —
    // если прошлый раз закрыли с открытым глазком, он бы так и остался.
    el("auth-password").type = "password";
    el("auth-eye").classList.remove("is-shown");
    el("auth-eye").setAttribute("aria-pressed", "false");
    el("auth-modal").hidden = false;
    el("auth-email").focus();
  }
  function closeModal() {
    el("auth-modal").hidden = true;
  }

  function renderAccountUI(user) {
    el("account-signed-out").hidden = !!user;
    el("account-signed-in").hidden = !user;
    if (user) el("account-email-text").textContent = user.email || user.displayName || "";
  }

  el("account-open-login").addEventListener("click", openModal);
  el("auth-modal-close").addEventListener("click", closeModal);
  el("auth-modal").addEventListener("click", (e) => {
    if (e.target.id === "auth-modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el("auth-modal").hidden) closeModal();
  });
  el("auth-toggle-mode").addEventListener("click", () => setMode(mode === "signin" ? "signup" : "signin"));

  // Глазок у поля пароля. Фокус возвращаем в поле и ставим каретку в конец,
  // иначе после нажатия приходится кликать обратно.
  el("auth-eye").addEventListener("click", () => {
    const input = el("auth-password");
    const btn = el("auth-eye");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.classList.toggle("is-shown", show);
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
    input.focus();
    const end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch (e) {
    }
  });

  el("auth-forgot").addEventListener("click", async () => {
    showError(null);
    showNote(null);
    const email = el("auth-email").value.trim();
    if (!email) {
      showError("Введите email — на него придёт письмо для сброса пароля.");
      el("auth-email").focus();
      return;
    }
    const btn = el("auth-forgot");
    btn.disabled = true;
    try {
      await sendPasswordResetEmail(auth, email);
      // Намеренно не уточняем, есть ли такой аккаунт: иначе форма станет
      // способом проверять чужие адреса на регистрацию.
      showNote("Если аккаунт с таким email существует, письмо для сброса пароля уже отправлено.");
    } catch (e) {
      if (e && e.code === "auth/user-not-found") {
        showNote("Если аккаунт с таким email существует, письмо для сброса пароля уже отправлено.");
      } else {
        showError(errorMessage(e));
      }
    } finally {
      btn.disabled = false;
    }
  });

  el("auth-google").addEventListener("click", async () => {
    showError(null);
    showNote(null);
    try {
      await applyPersistence();
      await signInWithPopup(auth, googleProvider);
      closeModal();
    } catch (e) {
      showError(errorMessage(e));
    }
  });

  el("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(null);
    showNote(null);
    const email = el("auth-email").value.trim();
    const password = el("auth-password").value;
    const submitBtn = el("auth-submit");
    submitBtn.disabled = true;
    try {
      await applyPersistence();
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      closeModal();
    } catch (err) {
      showError(errorMessage(err));
    } finally {
      submitBtn.disabled = false;
    }
  });

  el("account-logout").addEventListener("click", () => {
    signOut(auth);
  });

  onAuthStateChanged(auth, (user) => {
    renderAccountUI(user);
    const uid = user ? user.uid : null;
    if (uid === lastUid) return;
    lastUid = uid;
    if (uid) syncOnSignIn(uid);
    else syncOnSignOut();
  });
