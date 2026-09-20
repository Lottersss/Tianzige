// src/speech.js

  export var hasSpeech = "speechSynthesis" in window;

  // Browsers expose many "zh-CN" voices, but the one picked by default is
  // often the lowest-quality robotic one. Rank known-good engines higher so
  // playback actually sounds like a native speaker where such a voice exists.
  var VOICE_RANK = [
    "google 普通话", "google mandarin",
    "xiaoxiao", "yunxi", "yunyang",
    "tingting", "ting-ting",
    "huihui", "yaoyao", "kangkang",
    "meijia", "sin-ji",
  ];

  var cachedVoice = null;

  function pickBestVoice() {
    if (!hasSpeech) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    var zh = voices.filter(function (v) { return /^zh([-_]|$)/i.test(v.lang); });
    if (!zh.length) return null;
    var mainland = zh.filter(function (v) { return /^zh[-_]CN/i.test(v.lang); });
    var pool = mainland.length ? mainland : zh;
    for (var i = 0; i < VOICE_RANK.length; i++) {
      var hint = VOICE_RANK[i];
      var match = pool.find(function (v) { return v.name.toLowerCase().indexOf(hint) !== -1; });
      if (match) return match;
    }
    return pool[0];
  }

  function refreshVoice() {
    var v = pickBestVoice();
    if (v) cachedVoice = v;
  }

  if (hasSpeech) {
    refreshVoice();
    // Chrome/Edge load voices asynchronously; re-pick once the real list arrives.
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoice);
  }

  export function speakText(text) {
    if (!hasSpeech || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.85;
      if (cachedVoice) u.voice = cachedVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {
    }
  }

