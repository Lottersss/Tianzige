// src/speech.js

  export var hasSpeech = "speechSynthesis" in window;
  export function speakText(text) {
    if (!hasSpeech || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {
    }
  }

