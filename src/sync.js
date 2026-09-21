// src/sync.js
// Syncs state.PROGRESS / state.STREAK with a per-user Firestore document
// (progress/{uid}) when the visitor is signed in. Local storage stays the
// source of truth while signed out, so nothing here changes behaviour for a
// visitor who never creates an account.
//
// Merge strategy: for each word key, keep whichever record (local vs cloud)
// has the more recent `lastSeen` — this way progress made on one device
// never overwrites/erases progress made on another, it just unions them.
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { refreshActiveCounts } from './navigation.js';
import { activityEqual, mergeActivity } from './activity.js';
import { onProgressSave, saveActivity, saveFavorites, saveGoal, saveProgress, saveStreak, state } from './state.js';

// Цель — одна на человека, побеждает последняя правка (по полю at).
function mergeGoal(local, remote) {
  if (!local) return remote || null;
  if (!remote) return local;
  return (remote.at || 0) > (local.at || 0) ? remote : local;
}
function goalsEqual(a, b) {
  if (!a || !b) return !a && !b;
  return a.level === b.level && a.date === b.date && (a.at || 0) === (b.at || 0);
}

var PUSH_DELAY_MS = 1500;

var currentUid = null;
var suppressPush = false;
var pushTimer = null;

function progressDocRef(uid) {
  return doc(db, "progress", uid);
}

function mergeProgressMaps(local, remote) {
  local = local || {};
  remote = remote || {};
  var out = Object.assign({}, local);
  Object.keys(remote).forEach(function (key) {
    var r = remote[key];
    var l = out[key];
    if (!l || (r.lastSeen || 0) > (l.lastSeen || 0)) out[key] = r;
  });
  return out;
}

function progressMapsEqual(a, b) {
  a = a || {};
  b = b || {};
  var ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (var i = 0; i < ak.length; i++) {
    var k = ak[i], x = a[k], y = b[k];
    if (!y) return false;
    if (x.status !== y.status || x.due !== y.due || x.interval !== y.interval || x.ease !== y.ease || x.reps !== y.reps || x.lastSeen !== y.lastSeen) return false;
  }
  return true;
}

// Избранное сливается по метке времени каждой записи, а не объединением
// ключей: иначе снятая на телефоне звёздочка вернулась бы с ноутбука.
function mergeFavorites(local, remote) {
  local = local || {};
  remote = remote || {};
  var out = Object.assign({}, local);
  Object.keys(remote).forEach(function (key) {
    var r = remote[key];
    var l = out[key];
    if (!r || typeof r !== "object") return;
    if (!l || (r.at || 0) > (l.at || 0)) out[key] = { on: !!r.on, at: r.at || 0 };
  });
  return out;
}

function favoritesEqual(a, b) {
  a = a || {};
  b = b || {};
  var ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (var i = 0; i < ak.length; i++) {
    var k = ak[i], x = a[k], y = b[k];
    if (!y || !!x.on !== !!y.on || (x.at || 0) !== (y.at || 0)) return false;
  }
  return true;
}

function mergeStreaks(local, remote) {
  if (!local) return remote || { current: 0, longest: 0, lastDate: null };
  if (!remote) return local;
  var newer = (local.lastDate || "") >= (remote.lastDate || "") ? local : remote;
  return Object.assign({}, newer, { longest: Math.max(local.longest || 0, remote.longest || 0) });
}

function streaksEqual(a, b) {
  a = a || {};
  b = b || {};
  return a.current === b.current && a.longest === b.longest && a.lastDate === b.lastDate;
}

async function pushNow(uid) {
  try {
    await setDoc(progressDocRef(uid), {
      progress: state.PROGRESS,
      streak: state.STREAK,
      favorites: state.FAVORITES,
      activity: state.ACTIVITY,
      goal: state.GOAL,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    // Offline, or a rules/network hiccup — local data is untouched, and the
    // next local change (or the next sign-in) will retry.
  }
}

function schedulePush() {
  if (!currentUid || suppressPush) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(function () {
    pushNow(currentUid);
  }, PUSH_DELAY_MS);
}

onProgressSave(schedulePush);

// Called once per sign-in (including the automatic one when a previous
// session is restored on page load). Pulls the cloud copy, merges it with
// whatever is already in this browser, writes the merged result back to
// both sides, and refreshes anything on screen that shows counts.
export async function syncOnSignIn(uid) {
  currentUid = uid;
  var remote = null;
  try {
    var snap = await getDoc(progressDocRef(uid));
    if (snap.exists()) remote = snap.data();
  } catch (e) {
    return;
  }

  var mergedProgress = mergeProgressMaps(state.PROGRESS, remote && remote.progress);
  var mergedStreak = mergeStreaks(state.STREAK, remote && remote.streak);
  var mergedFavorites = mergeFavorites(state.FAVORITES, remote && remote.favorites);
  var mergedActivity = mergeActivity(state.ACTIVITY, remote && remote.activity);
  var mergedGoal = mergeGoal(state.GOAL, remote && remote.goal);
  var progressChanged = !progressMapsEqual(state.PROGRESS, mergedProgress);
  var streakChanged = !streaksEqual(state.STREAK, mergedStreak);
  var favoritesChanged = !favoritesEqual(state.FAVORITES, mergedFavorites);
  var activityChanged = !activityEqual(state.ACTIVITY, mergedActivity);
  var goalChanged = !goalsEqual(state.GOAL, mergedGoal);

  if (progressChanged || streakChanged || favoritesChanged || activityChanged || goalChanged) {
    suppressPush = true;
    if (progressChanged) {
      state.PROGRESS = mergedProgress;
      saveProgress();
    }
    if (streakChanged) {
      state.STREAK = mergedStreak;
      saveStreak();
    }
    if (favoritesChanged) {
      state.FAVORITES = mergedFavorites;
      saveFavorites();
    }
    if (activityChanged) {
      state.ACTIVITY = mergedActivity;
      saveActivity();
    }
    if (goalChanged) {
      state.GOAL = mergedGoal;
      saveGoal();
    }
    suppressPush = false;
    refreshActiveCounts();
  }

  var remoteBehind = !remote || !progressMapsEqual(remote.progress, mergedProgress) ||
    !streaksEqual(remote.streak, mergedStreak) || !favoritesEqual(remote.favorites, mergedFavorites) ||
    !activityEqual(remote.activity, mergedActivity) || !goalsEqual(remote.goal, mergedGoal);
  if (remoteBehind) await pushNow(uid);
}

export function syncOnSignOut() {
  currentUid = null;
  clearTimeout(pushTimer);
}
