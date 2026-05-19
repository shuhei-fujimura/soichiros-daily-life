import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore, collection, doc, query, where, orderBy, limit,
  onSnapshot, getDocs, setDoc, addDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMjWM5i4MfRNvYwHbSs_BrvG4trTP22bA",
  authDomain: "soichiros-daily-life.firebaseapp.com",
  projectId: "soichiros-daily-life",
  storageBucket: "soichiros-daily-life.firebasestorage.app",
  messagingSenderId: "297000197202",
  appId: "1:297000197202:web:932e207cdb95eb7bcb938b",
};

const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getFirestore(fb);
const storage = getStorage(fb);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW register failed:", e));
  });
}

const LOCAL_KEY = "skate_local_v3";
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const HISTORY_DAYS = 60;
const todayKey = () => new Date().toLocaleDateString("sv-SE");
const dateNDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv-SE");
};
const defaultMemo = "まずはチャレンジ\nできない・わからない時は聞いてみよう";
const dailyMessages = [
  "エジソンみたいに、失敗は発見だと思ってみよう。",
  "できない日は、できる日に近づいている日。",
  "一回やってみた自分を、ちゃんとほめよう。",
  "小さな一回が、いつか大きなメイクになる。",
  "転んでも、考えて立てたら前に進んでいる。",
  "今日はうまくいかなくても、体はちゃんと覚えている。",
  "わからない時に聞ける人は、強くなれる人。",
  "昨日より少しだけ勇気を出せたら、それで勝ち。",
  "まず乗る。まず試す。答えはそのあとでいい。",
  "何回も挑戦する人にだけ、できた瞬間が来る。",
  "うまい人も、最初はできないところから始まった。",
  "怖いと思ったら、ちょっと小さくしてもう一回。",
  "できない技は、未来の得意技かもしれない。",
  "今日の一回は、明日の自信になる。",
];

const els = {
  doneCount: document.getElementById("doneCount"),
  totalCount: document.getElementById("totalCount"),
  remainingLabel: document.getElementById("remainingLabel"),
  todayLabel: document.getElementById("todayLabel"),
  progressBar: document.getElementById("progressBar"),
  searchInput: document.getElementById("searchInput"),
  kindChips: document.getElementById("kindChips"),
  levelChips: document.getElementById("levelChips"),
  doneToggle: document.getElementById("doneToggle"),
  donePanelCount: document.getElementById("donePanelCount"),
  doneList: document.getElementById("doneList"),
  emptyState: document.getElementById("emptyState"),
  trickList: document.getElementById("trickList"),
  template: document.getElementById("trickCardTemplate"),
  dailyMessage: document.getElementById("dailyMessage"),
  focusList: document.getElementById("focusList"),
  missionSummary: document.getElementById("missionSummary"),
  routineList: document.getElementById("routineList"),
  homePinnedList: document.getElementById("homePinnedList"),
  pinnedHelp: document.getElementById("pinnedHelp"),
  clearPinnedButton: document.getElementById("clearPinnedButton"),
  drawNextButton: document.getElementById("drawNextButton"),
  nextHelp: document.getElementById("nextHelp"),
  nextChallengeResult: document.getElementById("nextChallengeResult"),
  gachaMachine: document.getElementById("gachaMachine"),
  gachaBall: document.getElementById("gachaBall"),
  librarySummary: document.getElementById("librarySummary"),
  landedCount: document.getElementById("landedCount"),
  goalClearedCount: document.getElementById("goalClearedCount"),
  libraryList: document.getElementById("libraryList"),
  growthSummary: document.getElementById("growthSummary"),
  practiceDaysCount: document.getElementById("practiceDaysCount"),
  totalPracticeCount: document.getElementById("totalPracticeCount"),
  weaponKind: document.getElementById("weaponKind"),
  stretchKind: document.getElementById("stretchKind"),
  weaponList: document.getElementById("weaponList"),
  almostList: document.getElementById("almostList"),
  kindBalanceList: document.getElementById("kindBalanceList"),
  dailyLogList: document.getElementById("dailyLogList"),
  videoLogList: document.getElementById("videoLogList"),
  parentSummary: document.getElementById("parentSummary"),
  parentPinnedList: document.getElementById("parentPinnedList"),
  parentPickList: document.getElementById("parentPickList"),
  loginOverlay: document.getElementById("loginOverlay"),
  loginButton: document.getElementById("loginButton"),
  loginStatus: document.getElementById("loginStatus"),
  appShell: document.getElementById("appShell"),
  parentUser: document.getElementById("parentUser"),
  logoutButton: document.getElementById("logoutButton"),
  uploadProgress: document.getElementById("uploadProgress"),
  uploadProgressBar: document.getElementById("uploadProgressBar"),
  uploadProgressLabel: document.getElementById("uploadProgressLabel"),
};

let currentUser = null;
let tricks = [];
let practiceLogs = [];
let videos = [];
let pinnedTodayDoc = { trickIds: [] };
let settingsDoc = { todays5: [] };

let local = loadLocal();
let unsubscribers = [];
let bootDone = false;

function loadLocal() {
  const fallback = {
    query: "",
    kind: "すべて",
    level: "すべて",
    saved: [],
    dailyFocus: { date: "", ids: [] },
    nextChallenge: null,
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    if (parsed) return { ...fallback, ...parsed };
  } catch {}
  return fallback;
}

function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
}

onAuthStateChanged(auth, (user) => {
  if (user && isFamilyEmail(user.email)) {
    currentUser = user;
    els.loginOverlay.hidden = true;
    els.appShell.hidden = false;
    els.parentUser.textContent = `ログイン中: ${user.email}`;
    applyRoleVisibility(user);
    if (!bootDone) {
      bootDone = true;
      boot();
    }
  } else if (user && !isFamilyEmail(user.email)) {
    els.loginStatus.textContent = `このアカウント（${user.email}）は家族リストにありません。別のアカウントでログインしてください。`;
    signOut(auth);
  } else {
    currentUser = null;
    els.appShell.hidden = true;
    els.loginOverlay.hidden = false;
    detachSubscriptions();
    bootDone = false;
  }
});

function isFamilyEmail(email) {
  return [
    "s.fujimura0406@gmail.com",
    "0522fujimura@gmail.com",
    "so3215.fuji@gmail.com",
  ].includes(email);
}

function isParentEmail(email) {
  return [
    "s.fujimura0406@gmail.com",
    "0522fujimura@gmail.com",
  ].includes(email);
}

function applyRoleVisibility(user) {
  const isParent = user && isParentEmail(user.email);
  document.querySelectorAll('[data-view-target="parentView"]').forEach((el) => {
    el.hidden = !isParent;
  });
  const parentView = document.getElementById("parentView");
  if (parentView && !isParent && parentView.classList.contains("active-view")) {
    document.querySelector('[data-view-target="homeView"]')?.click();
  }
}

els.loginButton.addEventListener("click", async () => {
  els.loginStatus.textContent = "ログイン中…";
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    els.loginStatus.textContent = `ログイン失敗: ${e.message}`;
  }
});

els.logoutButton.addEventListener("click", () => signOut(auth));

function detachSubscriptions() {
  unsubscribers.forEach((u) => { try { u(); } catch {} });
  unsubscribers = [];
}

async function boot() {
  els.todayLabel.textContent = `${todayKey()} のチャレンジ`;
  renderDailyMessage();

  // tricks (one-time fetch — マスターはほぼ変わらないので購読不要)
  const tricksSnap = await getDocs(collection(db, "tricks"));
  tricks = tricksSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => t.active !== false)
    .sort((a, b) => (a.no || 0) - (b.no || 0));

  // settings (Today's 5)
  unsubscribers.push(onSnapshot(doc(db, "settings", "app"), (snap) => {
    settingsDoc = snap.exists() ? snap.data() : { todays5: [] };
    rerender();
  }));

  // pinnedToday
  unsubscribers.push(onSnapshot(doc(db, "pinnedToday", todayKey()), (snap) => {
    pinnedTodayDoc = snap.exists() ? snap.data() : { trickIds: [] };
    rerender();
  }));

  // practiceLogs (60日分)
  const since = dateNDaysAgo(HISTORY_DAYS);
  unsubscribers.push(onSnapshot(
    query(collection(db, "practiceLogs"), where("date", ">=", since)),
    (snap) => {
      practiceLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rerender();
    }
  ));

  // videos (直近60件)
  unsubscribers.push(onSnapshot(
    query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(60)),
    (snap) => {
      videos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rerender();
    }
  ));

  els.searchInput.value = local.query;
  ensureDailyFocus();
  rerender();
}

// ───── 派生データ算出 ─────

function findTrick(id) { return tricks.find((t) => t.id === id); }

function targetParts(trick) {
  if (trick.targetCount && trick.targetUnit) {
    return { total: Math.max(Number(trick.targetCount) || 1, 1), unit: trick.targetUnit };
  }
  const match = String(trick.target || "1回").match(/(\d+)/);
  const total = match ? Number(match[1]) : 1;
  const unit = String(trick.target || "1回").replace(/\d+/g, "") || "回";
  return { total: Math.max(total, 1), unit };
}

function todayProgressMap() {
  const today = todayKey();
  const map = {};
  practiceLogs.filter((log) => log.date === today).forEach((log) => {
    const cur = map[log.trickId] || { count: 0, landed: false, goalCleared: false };
    cur.count += Number(log.count || 0);
    cur.landed = cur.landed || Boolean(log.landed);
    cur.goalCleared = cur.goalCleared || Boolean(log.goalCleared);
    map[log.trickId] = cur;
  });
  // goalClearedはtargetに対する達成で再判定
  Object.entries(map).forEach(([trickId, p]) => {
    const t = findTrick(trickId);
    if (!t) return;
    const { total } = targetParts(t);
    p.goalCleared = p.goalCleared || p.count >= total;
  });
  return map;
}

function progressFor(id) {
  const p = todayProgressMap()[id] || {};
  return {
    count: Number(p.count || 0),
    landed: Boolean(p.landed),
    goalCleared: Boolean(p.goalCleared),
  };
}

function allTimeMap() {
  // 全期間（=取得範囲60日）で日次集計→技ごとの統計
  const byDate = {}; // {date: {trickId: count}}
  practiceLogs.forEach((log) => {
    byDate[log.date] = byDate[log.date] || {};
    byDate[log.date][log.trickId] = (byDate[log.date][log.trickId] || 0) + Number(log.count || 0);
  });
  const out = {}; // {trickId: {firstLandedDate, bestCount, goalCleared, firstGoalClearedDate, lastLandedDate}}
  const dates = Object.keys(byDate).sort();
  for (const date of dates) {
    for (const [trickId, cnt] of Object.entries(byDate[date])) {
      const t = findTrick(trickId);
      if (!t) continue;
      const { total } = targetParts(t);
      const cleared = cnt >= total;
      const cur = out[trickId] || {
        firstLandedDate: date,
        bestCount: 0,
        goalCleared: false,
        firstGoalClearedDate: null,
        lastLandedDate: date,
      };
      cur.bestCount = Math.max(cur.bestCount, cnt);
      if (cleared && !cur.firstGoalClearedDate) cur.firstGoalClearedDate = date;
      cur.goalCleared = cur.goalCleared || cleared;
      cur.lastLandedDate = date;
      out[trickId] = cur;
    }
  }
  return out;
}

// ───── アクション ─────

async function addLanded(trick, card) {
  if (!currentUser) return;
  const { total } = targetParts(trick);
  const before = progressFor(trick.id);
  const newCount = Math.min(before.count + 1, total);
  const goalCleared = newCount >= total;

  try {
    await addDoc(collection(db, "practiceLogs"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      trickId: trick.id,
      trickName: trick.name,
      date: todayKey(),
      count: 1,
      landed: true,
      goalCleared,
      createdAt: serverTimestamp(),
    });
    if (goalCleared && !before.goalCleared) {
      card.classList.add("done-pop");
      setTimeout(() => card.classList.remove("done-pop"), 400);
    }
  } catch (e) {
    alert("記録できませんでした: " + e.message);
  }
}

async function undoToday(trickId) {
  if (!currentUser) return;
  const today = todayKey();
  const targets = practiceLogs
    .filter((log) => log.date === today && log.trickId === trickId)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const last = targets[0];
  if (!last) return;
  try {
    await deleteDoc(doc(db, "practiceLogs", last.id));
  } catch (e) {
    alert("もどせませんでした: " + e.message);
  }
}

function toggleSaved(id) {
  local.saved = local.saved.includes(id)
    ? local.saved.filter((x) => x !== id)
    : [...local.saved, id];
  saveLocal();
  rerender();
}

async function togglePinned(id) {
  const cur = pinnedTodayDoc.trickIds || [];
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  try {
    await setDoc(doc(db, "pinnedToday", todayKey()), {
      trickIds: next,
      selectedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    alert("ピン留め変更に失敗: " + e.message);
  }
}

async function clearPinned() {
  try {
    await setDoc(doc(db, "pinnedToday", todayKey()), {
      trickIds: [],
      selectedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    alert("クリアに失敗: " + e.message);
  }
}

// ───── 動画アップロード ─────

function pickVideoFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
    input.click();
  });
}

async function uploadPracticeVideo(trick, button) {
  if (!currentUser) return;
  const file = await pickVideoFile();
  if (!file) return;
  if (file.size > MAX_VIDEO_BYTES) {
    button.textContent = "大きすぎる";
    setTimeout(() => { button.textContent = "動画を撮る"; }, 1800);
    return;
  }

  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().slice(0, 6);
  const videoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `videos/${currentUser.uid}/${videoId}.${ext}`;
  const ref = storageRef(storage, path);
  const task = uploadBytesResumable(ref, file, { contentType: file.type || "video/mp4" });

  button.disabled = true;
  button.textContent = "送信中";
  els.uploadProgress.hidden = false;
  els.uploadProgressLabel.textContent = `${trick.name}: 0%`;
  els.uploadProgressBar.style.width = "0%";

  task.on("state_changed",
    (snap) => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      els.uploadProgressBar.style.width = `${pct}%`;
      els.uploadProgressLabel.textContent = `${trick.name}: ${pct}%`;
      button.textContent = `${pct}%`;
    },
    (error) => {
      button.disabled = false;
      button.textContent = "失敗";
      els.uploadProgressLabel.textContent = `失敗: ${error.message}`;
      setTimeout(() => {
        button.textContent = "動画を撮る";
        els.uploadProgress.hidden = true;
      }, 2400);
    },
    async () => {
      try {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, "videos"), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          trickId: trick.id,
          trickName: trick.name,
          date: todayKey(),
          fileName: file.name || `${todayKey()}_${trick.name}.${ext}`,
          fileSize: file.size,
          mimeType: file.type || "video/mp4",
          storagePath: path,
          downloadUrl: url,
          createdAt: serverTimestamp(),
        });
        button.textContent = "保存した";
        els.uploadProgressLabel.textContent = `${trick.name}: 完了`;
      } catch (e) {
        button.textContent = "保存失敗";
        els.uploadProgressLabel.textContent = `メタ保存失敗: ${e.message}`;
      } finally {
        setTimeout(() => {
          button.disabled = false;
          button.textContent = "動画を撮る";
          els.uploadProgress.hidden = true;
        }, 2000);
      }
    }
  );
}

// ───── 表示計算 ─────

function hashText(text) {
  return String(text).split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) >>> 0, 2166136261);
}

function seededShuffle(items, seedText) {
  const out = [...items];
  let seed = hashText(seedText) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((it) => it && !seen.has(it.id) && seen.add(it.id));
}

function isIntermediateOrBelow(t) { return t.level === "初級" || t.level === "中級"; }

function ensureDailyFocus() {
  // Today's 5: settingsDoc.todays5 が設定されていればそれを優先、なければ動的選定
  const today = todayKey();
  if (settingsDoc.todays5 && settingsDoc.todays5.length === 5) {
    local.dailyFocus = { date: today, ids: settingsDoc.todays5 };
    return;
  }
  if (local.dailyFocus.date === today && local.dailyFocus.ids.length) return;
  const all = allTimeMap();
  const landedIds = Object.keys(all);
  const landed = seededShuffle(landedIds.map(findTrick).filter(Boolean), `${today}-l`).slice(0, 3);
  const unlanded = seededShuffle(
    tricks.filter((t) => isIntermediateOrBelow(t) && !all[t.id]),
    `${today}-n`
  ).slice(0, 2);
  const fb = seededShuffle(tricks.filter(isIntermediateOrBelow), `${today}-f`);
  const selected = uniqueById([...landed, ...unlanded, ...fb]).slice(0, 5);
  local.dailyFocus = { date: today, ids: selected.map((t) => t.id) };
  saveLocal();
}

function focusTricks() {
  ensureDailyFocus();
  return local.dailyFocus.ids.map(findTrick).filter(Boolean);
}

function normalizeKind(kind) { return String(kind).replace(/[\/・\s]/g, ""); }

function unique(values) { return ["すべて", ...Array.from(new Set(values.filter(Boolean)))]; }

function makeChip(label, key) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chip${local[key] === label ? " active" : ""}`;
  button.textContent = label;
  button.addEventListener("click", () => { local[key] = label; saveLocal(); rerender(); });
  return button;
}

function renderChips() {
  els.kindChips.replaceChildren(...unique(tricks.map((t) => t.kind)).map((v) => makeChip(v, "kind")));
  els.levelChips.replaceChildren(...unique(tricks.map((t) => t.level)).map((v) => makeChip(v, "level")));
}

function filteredTricks() {
  const q = local.query.trim().toLowerCase();
  return tricks.filter((t) => {
    const hay = `${t.name} ${t.kind} ${t.level} ${t.memo}`.toLowerCase();
    return (!q || hay.includes(q))
      && (local.kind === "すべて" || t.kind === local.kind)
      && (local.level === "すべて" || t.level === local.level);
  });
}

function todayLandedTricks() {
  const map = todayProgressMap();
  return Object.entries(map).filter(([, p]) => p.landed).map(([id]) => findTrick(id)).filter(Boolean);
}

function todayGoalClearedIds() {
  const map = todayProgressMap();
  return Object.entries(map).filter(([, p]) => p.goalCleared).map(([id]) => id);
}

function renderDailyMessage() {
  const seed = hashText(todayKey());
  els.dailyMessage.textContent = dailyMessages[seed % dailyMessages.length];
}

function renderCard(trick, options = {}) {
  const fragment = els.template.content.cloneNode(true);
  const card = fragment.querySelector(".trick-card");
  const progress = progressFor(trick.id);
  const { total, unit } = targetParts(trick);
  card.classList.add(`kind-${normalizeKind(trick.kind)}`);
  if (options.compact) card.classList.add("compact-card");
  if (progress.goalCleared) card.classList.add("goal-cleared");
  fragment.querySelector(".number").textContent = trick.no;
  fragment.querySelector(".trick-name").textContent = trick.name;
  fragment.querySelector(".kind").textContent = trick.kind;
  fragment.querySelector(".level").textContent = trick.level || "練習";
  fragment.querySelector(".target").textContent = `${progress.count}/${total}${unit}`;
  const memo = fragment.querySelector(".memo");
  memo.textContent = progress.goalCleared ? "目標クリア！" : trick.memo || defaultMemo;
  const video = fragment.querySelector(".video-button");
  video.href = trick.videoSearchUrl || trick.video || "#";
  const save = fragment.querySelector(".save-button");
  const saved = local.saved.includes(trick.id);
  save.textContent = saved ? "★" : "☆";
  save.classList.toggle("active", saved);
  save.addEventListener("click", () => toggleSaved(trick.id));
  const doneButton = fragment.querySelector(".done-button");
  doneButton.textContent = progress.goalCleared ? "クリア済み" : "+ できた";
  doneButton.disabled = progress.goalCleared;
  doneButton.addEventListener("click", () => addLanded(trick, card));
  const uploadButton = fragment.querySelector(".upload-video-button");
  uploadButton.addEventListener("click", () => uploadPracticeVideo(trick, uploadButton));
  return fragment;
}

function renderDoneList() {
  const done = todayLandedTricks();
  els.donePanelCount.textContent = done.length;
  if (!done.length) { els.doneList.replaceChildren(); return; }
  els.doneList.replaceChildren(...done.map((trick) => {
    const progress = progressFor(trick.id);
    const { total, unit } = targetParts(trick);
    const row = document.createElement("div");
    row.className = "done-item";
    const name = document.createElement("span");
    name.textContent = `${trick.no}. ${trick.name} ${progress.count}/${total}${unit}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "undo-button";
    button.textContent = "もどす";
    button.addEventListener("click", () => undoToday(trick.id));
    row.append(name, button);
    return row;
  }));
}

function makeRoutineCard(items, index) {
  const card = document.createElement("article");
  card.className = "routine-card";
  const title = document.createElement("h3");
  title.textContent = `ルーティン ${index + 1}`;
  const list = document.createElement("ol");
  items.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t.name;
    list.append(li);
  });
  card.append(title, list);
  return card;
}

function visibleHomeIds() {
  return new Set([
    ...(local.dailyFocus.ids || []),
    ...(pinnedTodayDoc.trickIds || []),
  ]);
}

function nextChallengePool() {
  const excluded = visibleHomeIds();
  if (local.nextChallenge?.date === todayKey() && local.nextChallenge.id) {
    excluded.add(local.nextChallenge.id);
  }
  const unseen = tricks.filter((t) => !excluded.has(t.id));
  return unseen.length ? unseen : tricks;
}

function renderNextChallenge() {
  let current = local.nextChallenge?.date === todayKey()
    ? findTrick(local.nextChallenge.id)
    : null;
  if (current && visibleHomeIds().has(current.id)) {
    local.nextChallenge = null;
    saveLocal();
    current = null;
  }
  els.nextHelp.hidden = Boolean(current);
  els.gachaMachine.classList.toggle("result-ready", Boolean(current));
  els.nextChallengeResult.replaceChildren(
    current ? renderCard(current, { compact: true }) : document.createTextNode("")
  );
}

function drawNextChallenge() {
  const pool = nextChallengePool();
  if (!pool.length) return;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  local.nextChallenge = {
    id: selected.id,
    date: todayKey(),
    drawnAt: new Date().toISOString(),
  };
  saveLocal();

  els.gachaBall.classList.remove("rolling");
  els.gachaMachine.classList.remove("result-ready");
  els.gachaMachine.classList.add("is-spinning");
  els.nextChallengeResult.classList.add("drawing");
  els.nextChallengeResult.replaceChildren();
  window.requestAnimationFrame(() => {
    els.gachaBall.classList.add("rolling");
    window.setTimeout(() => {
      renderNextChallenge();
      els.nextChallengeResult.classList.remove("drawing");
      els.gachaMachine.classList.remove("is-spinning");
    }, 960);
  });
}

function renderRoutines() {
  const source = focusTricks();
  const routines = [0, 1, 2].map((offset) => {
    const shuffled = seededShuffle(source, `${todayKey()}-r-${offset}`);
    return shuffled.slice(0, offset === 0 ? 2 : 3);
  });
  els.routineList.replaceChildren(...routines.map(makeRoutineCard));
}

function renderLibrary() {
  const allTime = allTimeMap();
  const landedIds = Object.keys(allTime);
  const goalIds = landedIds.filter((id) => allTime[id].goalCleared);
  els.librarySummary.textContent = `${landedIds.length}/${tricks.length}`;
  els.landedCount.textContent = landedIds.length;
  els.goalClearedCount.textContent = goalIds.length;

  const rows = tricks.map((trick) => {
    const record = allTime[trick.id];
    const trickVideos = videos.filter((v) => v.trickId === trick.id);
    const latestVideo = trickVideos[0];
    const row = document.createElement("div");
    row.className = `library-item${record ? " collected" : ""}`;
    const name = document.createElement("strong");
    name.textContent = `${trick.no}. ${trick.name}`;
    const meta = document.createElement("span");
    meta.textContent = record ? [
      record.goalCleared ? "目標クリア" : "1回以上できた",
      `初達成 ${record.firstLandedDate || "-"}`,
      record.firstGoalClearedDate ? `目標達成 ${record.firstGoalClearedDate}` : null,
      `最高 ${record.bestCount || 1}${targetParts(trick).unit}`,
      trickVideos.length ? `動画 ${trickVideos.length}本` : null,
    ].filter(Boolean).join(" / ") : `${trick.kind} / ${trick.level}`;
    row.append(name, meta);
    if (latestVideo?.downloadUrl) {
      const link = document.createElement("a");
      link.className = "library-video-link";
      link.href = latestVideo.downloadUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "動画";
      row.append(link);
    }
    return row;
  });
  els.libraryList.replaceChildren(...rows);
}

function practiceRecordsForGrowth() {
  const out = [];
  const byDate = {};
  practiceLogs.forEach((log) => {
    const k = `${log.date}|${log.trickId}`;
    byDate[k] = byDate[k] || { date: log.date, trickId: log.trickId, count: 0, landed: false, goalCleared: false };
    byDate[k].count += Number(log.count || 0);
    byDate[k].landed = byDate[k].landed || Boolean(log.landed);
  });
  Object.values(byDate).forEach((row) => {
    const trick = findTrick(row.trickId);
    if (!trick || row.count <= 0) return;
    const { total } = targetParts(trick);
    out.push({
      date: row.date,
      id: row.trickId,
      trick,
      count: row.count,
      target: total,
      landed: row.landed,
      goalCleared: row.count >= total,
    });
  });
  return out;
}

function summarizeByTrick(records) {
  const m = new Map();
  records.forEach((r) => {
    const c = m.get(r.id) || { trick: r.trick, totalCount: 0, bestCount: 0, practicedDays: new Set(), goalCleared: false, lastDate: r.date };
    c.totalCount += r.count;
    c.bestCount = Math.max(c.bestCount, r.count);
    c.practicedDays.add(r.date);
    c.goalCleared = c.goalCleared || r.goalCleared;
    c.lastDate = c.lastDate > r.date ? c.lastDate : r.date;
    m.set(r.id, c);
  });
  return Array.from(m.values());
}

function summarizeByKind(records) {
  const m = new Map();
  records.forEach((r) => {
    const kind = r.trick.kind || "その他";
    const c = m.get(kind) || { kind, totalCount: 0, practicedDays: new Set(), trickIds: new Set(), goalClearCount: 0 };
    c.totalCount += r.count;
    c.practicedDays.add(r.date);
    c.trickIds.add(r.id);
    if (r.goalCleared) c.goalClearCount += 1;
    m.set(kind, c);
  });
  return Array.from(m.values());
}

function emptyInsight(text) {
  const p = document.createElement("p");
  p.className = "empty-insight";
  p.textContent = text;
  return p;
}

function makeInsightItem(title, meta, value = "") {
  const item = document.createElement("div");
  item.className = "insight-item";
  const body = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = title;
  const sub = document.createElement("span");
  sub.textContent = meta;
  body.append(name, sub);
  if (value) {
    const badge = document.createElement("b");
    badge.textContent = value;
    item.append(body, badge);
  } else {
    item.append(body);
  }
  return item;
}

function makeVideoInsightItem(v) {
  const row = makeInsightItem(
    v.trickName || "動画",
    [
      v.date || "-",
      `${Math.round((Number(v.fileSize || 0) / 1024 / 1024) * 10) / 10}MB`,
    ].join(" / "),
    "保存済み"
  );
  if (v.downloadUrl) {
    const link = document.createElement("a");
    link.className = "insight-link";
    link.href = v.downloadUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "見る";
    row.append(link);
  }
  const del = document.createElement("button");
  del.type = "button";
  del.className = "insight-link insight-link-danger";
  del.textContent = "削除";
  del.addEventListener("click", () => deleteVideo(v, del));
  row.append(del);
  return row;
}

async function deleteVideo(v, button) {
  if (!confirm(`「${v.trickName || "動画"}」を削除しますか？\nこの操作は取り消せません。`)) return;
  button.disabled = true;
  button.textContent = "削除中";
  try {
    if (v.storagePath) {
      try {
        await deleteObject(storageRef(storage, v.storagePath));
      } catch (e) {
        if (e?.code !== "storage/object-not-found") throw e;
      }
    }
    await deleteDoc(doc(db, "videos", v.id));
  } catch (e) {
    button.disabled = false;
    button.textContent = "削除";
    alert("削除できませんでした: " + e.message);
  }
}

function renderInsightList(container, items, emptyText) {
  container.replaceChildren(...(items.length ? items : [emptyInsight(emptyText)]));
}

function renderGrowth() {
  const records = practiceRecordsForGrowth();
  const practiceDays = new Set(records.map((r) => r.date));
  const totalCount = records.reduce((s, r) => s + r.count, 0);
  const trickStats = summarizeByTrick(records);
  const kindStats = summarizeByKind(records);

  const weaponKind = [...kindStats].sort((a, b) =>
    (b.goalClearCount * 5 + b.trickIds.size * 3 + b.totalCount) - (a.goalClearCount * 5 + a.trickIds.size * 3 + a.totalCount)
  )[0];
  const stretchKind = [...kindStats].sort((a, b) =>
    ((b.totalCount - b.goalClearCount * 3) + b.trickIds.size) - ((a.totalCount - a.goalClearCount * 3) + a.trickIds.size)
  )[0];

  els.growthSummary.textContent = `${practiceDays.size}日`;
  els.practiceDaysCount.textContent = practiceDays.size;
  els.totalPracticeCount.textContent = totalCount;
  els.weaponKind.textContent = weaponKind?.kind || "-";
  els.stretchKind.textContent = stretchKind?.kind || "-";

  const weaponItems = trickStats
    .filter((it) => it.goalCleared || it.bestCount >= Math.max(2, Math.ceil(targetParts(it.trick).total * .6)))
    .sort((a, b) => (Number(b.goalCleared) - Number(a.goalCleared)) || b.bestCount - a.bestCount || b.totalCount - a.totalCount)
    .slice(0, 4)
    .map((it) => makeInsightItem(it.trick.name, `${it.trick.kind} / 最高 ${it.bestCount}${targetParts(it.trick).unit} / ${it.practicedDays.size}日`, it.goalCleared ? "クリア" : "成長中"));

  const almostItems = trickStats
    .filter((it) => !it.goalCleared)
    .map((it) => ({ ...it, target: targetParts(it.trick).total, unit: targetParts(it.trick).unit }))
    .filter((it) => it.bestCount > 0)
    .sort((a, b) => (b.bestCount / b.target) - (a.bestCount / a.target) || b.totalCount - a.totalCount)
    .slice(0, 4)
    .map((it) => makeInsightItem(it.trick.name, `${it.trick.kind} / 最高 ${it.bestCount}/${it.target}${it.unit}`, "もう少し"));

  const kindItems = kindStats
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5)
    .map((it) => makeInsightItem(it.kind, `${it.trickIds.size}技 / ${it.practicedDays.size}日`, `${it.totalCount}回`));

  const dayItems = Array.from(practiceDays)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 7)
    .map((date) => {
      const dr = records.filter((r) => r.date === date);
      const dc = dr.reduce((s, r) => s + r.count, 0);
      const gc = dr.filter((r) => r.goalCleared).length;
      return makeInsightItem(date, `${dr.length}技 / 目標クリア ${gc}技`, `${dc}回`);
    });

  const videoItems = videos.slice(0, 8).map(makeVideoInsightItem);

  renderInsightList(els.weaponList, weaponItems, "記録が増えると、武器になってきた技がここに出ます。");
  renderInsightList(els.almostList, almostItems, "あと少しでクリアの技が、ここに出ます。");
  renderInsightList(els.kindBalanceList, kindItems, "練習すると、よく取り組んでいる種類が見えてきます。");
  renderInsightList(els.dailyLogList, dayItems, "毎日の記録がここに積み上がります。");
  renderInsightList(els.videoLogList, videoItems, "動画を保存すると、ここに送信記録が出ます。");
}

function renderPinned() {
  const pinned = (pinnedTodayDoc.trickIds || []).map(findTrick).filter(Boolean);
  els.parentSummary.textContent = `${pinned.length}個`;
  els.pinnedHelp.hidden = pinned.length > 0;
  els.homePinnedList.replaceChildren(...pinned.map((t) => renderCard(t, { compact: true })));

  if (!pinned.length) {
    const empty = document.createElement("p");
    empty.className = "panel-note";
    empty.textContent = "まだ今日のチャレンジミッションはありません。下の一覧で選べます。";
    els.parentPinnedList.replaceChildren(empty);
  } else {
    els.parentPinnedList.replaceChildren(...pinned.map((trick) => {
      const row = document.createElement("div");
      row.className = "library-item collected";
      const name = document.createElement("strong");
      name.textContent = `${trick.no}. ${trick.name}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "undo-button";
      button.textContent = "外す";
      button.addEventListener("click", () => togglePinned(trick.id));
      row.append(name, button);
      return row;
    }));
  }

  els.parentPickList.replaceChildren(...tricks.map((trick) => {
    const isPinned = (pinnedTodayDoc.trickIds || []).includes(trick.id);
    const row = document.createElement("div");
    row.className = `parent-pick-item${isPinned ? " selected" : ""}`;
    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${trick.no}. ${trick.name}`;
    const meta = document.createElement("span");
    meta.textContent = `${trick.kind} / ${trick.level} / ${trick.target || "1回"}`;
    body.append(name, meta);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pick-button${isPinned ? " selected" : ""}`;
    button.textContent = isPinned ? "外す" : "追加";
    button.addEventListener("click", () => togglePinned(trick.id));
    row.append(body, button);
    return row;
  }));
}

function rerender() {
  if (!tricks.length) return;
  ensureDailyFocus();
  renderChips();
  const focus = focusTricks();
  const focusGoalCleared = focus.filter((t) => progressFor(t.id).goalCleared).length;
  const total = tricks.length;
  const remaining = Math.max(focus.length - focusGoalCleared, 0);
  els.doneCount.textContent = focusGoalCleared;
  els.totalCount.textContent = focus.length;
  els.missionSummary.textContent = `${focusGoalCleared}/${focus.length}`;
  els.remainingLabel.textContent = `まずは残り ${remaining} 技`;
  els.progressBar.style.width = focus.length ? `${Math.round((focusGoalCleared / focus.length) * 100)}%` : "0%";
  renderDoneList();
  els.focusList.replaceChildren(...focus.map((t) => renderCard(t, { compact: true })));
  renderRoutines();
  renderPinned();
  renderNextChallenge();
  const rows = filteredTricks();
  els.emptyState.hidden = !(todayGoalClearedIds().length === total && total > 0);
  els.trickList.replaceChildren(...rows.map((t) => renderCard(t)));
  renderLibrary();
  renderGrowth();
}

els.searchInput.addEventListener("input", (e) => { local.query = e.target.value; saveLocal(); rerender(); });
els.doneToggle.addEventListener("click", () => { els.doneList.hidden = !els.doneList.hidden; });
els.clearPinnedButton.addEventListener("click", clearPinned);
els.drawNextButton.addEventListener("click", drawNextChallenge);

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view-target]").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("active-view", view.id === button.dataset.viewTarget));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
