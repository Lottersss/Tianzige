// src/mascots.js
// Tiny click reactions for the decorative cat mascots — purely for fun, no
// effect on app state or progress.
function bounceOnce(el) {
  if (el.classList.contains("is-bouncing")) return;
  el.classList.add("is-bouncing");
  el.addEventListener(
    "animationend",
    () => el.classList.remove("is-bouncing"),
    { once: true }
  );
}

document.querySelectorAll(".mascot").forEach((el) => {
  el.addEventListener("click", () => bounceOnce(el));
});
