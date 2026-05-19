const STORAGE_KEY = "skate_challenge_state_v2";
const OLD_STORAGE_KEY = "skate_challenge_state_v1";
const MAX_VIDEO_BYTES = 35 * 1024 * 1024;
const todayKey = () => new Date().toLocaleDateString("sv-SE");
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
  "今日の一回は、明日の自信になる。"
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
  uploadEndpointInput: document.getElementById("uploadEndpointInput"),
  uploadTokenInput: document.getElementById("uploadTokenInput"),
  saveUploadSettingsButton: document.getElementById("saveUploadSettingsButton"),
  uploadSettingsStatus: document.getElementById("uploadSettingsStatus"),
};

let tricks = [];
let state = loadState();

function fallbackState() {
  return {
    version: 2,
    date: todayKey(),
    firstUsedDate: todayKey(),
    query: "",
    kind: "すべて",
    level: "すべて",
    saved: [],
    pinnedToday: [],
    nextChallenge: null,
    uploadSettings: { endpoint: "", token: "" },
    videoUploads: [],
    dailyFocus: { date: "", ids: [] },
    todayProgress: {},
    allTimeDone: {},
    history: {},
  };
}

function loadState() {
  const fallback = fallbackState();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed) {
      return normalizeState({ ...fallback, ...parsed });
    }

    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) || "null");
    if (old) {
      old.done = Array.isArray(old.done) ? old.done : [];
      const migrated = {
        ...fallback,
        saved: Array.isArray(old.saved) ? old.saved : [],
        query: old.query || "",
        kind: old.kind || "すべて",
        level: old.level || "すべて",
        todayProgress: Object.fromEntries(old.done.map((id) => [id, { count: 1, landed: true, goalCleared: false }])),
        allTimeDone: Object.fromEntries(old.done.map((id) => [id, { firstLandedDate: todayKey(), bestCount: 1, goalCleared: false }]))
      };
      return normalizeState(migrated);
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function normalizeState(nextState) {
  const today = todayKey();
  nextState.history = nextState.history || {};
  if (nextState.date && nextState.date !== today) {
    nextState.history[nextState.date] = nextState.todayProgress || {};
    nextState.todayProgress = {};
    nextState.dailyFocus = { date: "", ids: [] };
    nextState.pinnedToday = [];
    nextState.nextChallenge = null;
  }
  nextState.date = today;
  nextState.firstUsedDate = nextState.firstUsedDate || today;
  nextState.saved = Array.isArray(nextState.saved) ? nextState.saved : [];
  nextState.pinnedToday = Array.isArray(nextState.pinnedToday) ? nextState.pinnedToday : [];
  nextState.nextChallenge = nextState.nextChallenge || null;
  nextState.uploadSettings = nextState.uploadSettings || { endpoint: "", token: "" };
  nextState.videoUploads = Array.isArray(nextState.videoUploads) ? nextState.videoUploads : [];
  nextState.dailyFocus = nextState.dailyFocus || { date: "", ids: [] };
  nextState.todayProgress = nextState.todayProgress || {};
  nextState.allTimeDone = nextState.allTimeDone || {};
  return nextState;
}

function saveState() {
  state.date = todayKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function boot() {
  const response = await fetch("./data/tricks.json", { cache: "no-store" });
  tricks = await response.json();
  ensureDailyFocus();
  els.searchInput.value = state.query;
  els.uploadEndpointInput.value = state.uploadSettings.endpoint || "";
  els.uploadTokenInput.value = state.uploadSettings.token || "";
  els.todayLabel.textContent = `${state.date} のチャレンジ`;
  renderDailyMessage();
  render();
  refreshPendingVideos();
}

function renderDailyMessage() {
  const seed = hashText(todayKey());
  els.dailyMessage.textContent = dailyMessages[seed % dailyMessages.length];
}

function hashText(text) {
  return String(text).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 2166136261);
}

function seededShuffle(items, seedText) {
  const shuffled = [...items];
  let seed = hashText(seedText) || 1;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function findTrick(id) {
  return tricks.find((trick) => trick.id === id);
}

function isIntermediateOrBelow(trick) {
  return trick.level === "初級" || trick.level === "中級";
}

function targetParts(trick) {
  const match = String(trick.target || "1回").match(/(\d+)/);
  const total = match ? Number(match[1]) : 1;
  const unit = String(trick.target || "1回").replace(/\d+/g, "") || "回";
  return { total: Math.max(total, 1), unit };
}

function progressFor(id) {
  const progress = state.todayProgress[id] || {};
  return {
    count: Number(progress.count || 0),
    landed: Boolean(progress.landed),
    goalCleared: Boolean(progress.goalCleared),
  };
}

function ensureDailyFocus() {
  if (state.dailyFocus.date === todayKey() && state.dailyFocus.ids.length) return;

  const landedIds = Object.keys(state.allTimeDone);
  const landed = seededShuffle(landedIds.map(findTrick).filter(Boolean), `${todayKey()}-landed`).slice(0, 3);
  const unlandedIntermediate = seededShuffle(
    tricks.filter((trick) => isIntermediateOrBelow(trick) && !state.allTimeDone[trick.id]),
    `${todayKey()}-new`
  ).slice(0, 2);
  const fallback = seededShuffle(
    tricks.filter(isIntermediateOrBelow),
    `${todayKey()}-fallback`
  );
  const selected = uniqueById([...landed, ...unlandedIntermediate, ...fallback]).slice(0, 5);

  state.dailyFocus = { date: todayKey(), ids: selected.map((trick) => trick.id) };
  saveState();
}

function focusTricks() {
  ensureDailyFocus();
  return state.dailyFocus.ids.map(findTrick).filter(Boolean);
}

function unique(values) {
  return ["すべて", ...Array.from(new Set(values.filter(Boolean)))];
}

function normalizeKind(kind) {
  return String(kind).replace(/[\/・\s]/g, "");
}

function makeChip(label, key) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chip${state[key] === label ? " active" : ""}`;
  button.textContent = label;
  button.addEventListener("click", () => {
    state[key] = label;
    saveState();
    render();
  });
  return button;
}

function renderChips() {
  els.kindChips.replaceChildren(...unique(tricks.map((trick) => trick.kind)).map((value) => makeChip(value, "kind")));
  els.levelChips.replaceChildren(...unique(tricks.map((trick) => trick.level)).map((value) => makeChip(value, "level")));
}

function filteredTricks() {
  const query = state.query.trim().toLowerCase();
  return tricks.filter((trick) => {
    const haystack = `${trick.name} ${trick.kind} ${trick.level} ${trick.memo}`.toLowerCase();
    return (!query || haystack.includes(query))
      && (state.kind === "すべて" || trick.kind === state.kind)
      && (state.level === "すべて" || trick.level === state.level);
  });
}

function todayLandedTricks() {
  return Object.entries(state.todayProgress)
    .filter(([, progress]) => progress.landed)
    .map(([id]) => findTrick(id))
    .filter(Boolean);
}

function todayGoalClearedIds() {
  return Object.entries(state.todayProgress)
    .filter(([, progress]) => progress.goalCleared)
    .map(([id]) => id);
}

function addLanded(trick, card) {
  const { total } = targetParts(trick);
  const previous = progressFor(trick.id);
  const count = Math.min(previous.count + 1, total);
  const goalCleared = count >= total;

  state.todayProgress[trick.id] = {
    count,
    target: total,
    landed: true,
    goalCleared,
    updatedAt: new Date().toISOString(),
  };

  const allTime = state.allTimeDone[trick.id] || {
    firstLandedDate: todayKey(),
    bestCount: 0,
    goalCleared: false,
    firstGoalClearedDate: null,
  };
  allTime.bestCount = Math.max(Number(allTime.bestCount || 0), count);
  allTime.goalCleared = Boolean(allTime.goalCleared || goalCleared);
  allTime.firstGoalClearedDate = allTime.firstGoalClearedDate || (goalCleared ? todayKey() : null);
  allTime.lastLandedDate = todayKey();
  state.allTimeDone[trick.id] = allTime;

  saveState();
  if (goalCleared) {
    card.classList.add("done-pop");
    setTimeout(render, 180);
  } else {
    render();
  }
}

function undoToday(id) {
  delete state.todayProgress[id];
  saveState();
  render();
}

function toggleSaved(id) {
  state.saved = state.saved.includes(id)
    ? state.saved.filter((savedId) => savedId !== id)
    : [...state.saved, id];
  saveState();
  render();
}

function togglePinned(id) {
  state.pinnedToday = state.pinnedToday.includes(id)
    ? state.pinnedToday.filter((pinnedId) => pinnedId !== id)
    : [...state.pinnedToday, id];
  saveState();
  render();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("動画を読み込めませんでした")));
    reader.readAsDataURL(file);
  });
}

function pickVideoFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.capture = "environment";
    input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
    input.click();
  });
}

function rememberVideoUpload(record) {
  state.videoUploads = [
    { ...(state.videoUploads || []).find((item) => item.localId === record.localId), ...record },
    ...(state.videoUploads || []).filter((item) => item.localId !== record.localId),
  ].slice(0, 80);
  saveState();
}

function jsonpRequest(endpoint, params) {
  return new Promise((resolve, reject) => {
    const callbackName = `skateJsonp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const url = new URL(endpoint);
    Object.entries({ ...params, callback: callbackName }).forEach(([key, value]) => {
      url.searchParams.set(key, value == null ? "" : value);
    });
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("保存結果を確認できませんでした"));
    }, 15000);
    window[callbackName] = (data) => {
      window.clearTimeout(timer);
      cleanup();
      resolve(data);
    };
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("保存結果の取得に失敗しました"));
    });
    script.src = url.toString();
    document.body.append(script);
  });
}

async function refreshVideoUpload(localId) {
  const endpoint = (state.uploadSettings.endpoint || "").trim();
  if (!endpoint || !localId) return null;
  rememberVideoUpload({
    localId,
    status: "checking",
    lastCheckMessage: "保存結果を確認中です。",
    lastCheckedAt: new Date().toISOString(),
  });
  renderGrowth();
  try {
    const result = await jsonpRequest(endpoint, {
      action: "videoStatus",
      token: state.uploadSettings.token || "",
      localId,
    });
    if (result?.ok && result.video) {
      rememberVideoUpload({
        localId,
        status: "saved",
        driveUrl: result.video.driveUrl,
        driveFileId: result.video.driveFileId,
        spreadsheetUrl: result.spreadsheetUrl || "",
        savedAt: result.video.recordedAt || new Date().toISOString(),
        lastCheckMessage: "Drive保存を確認しました。",
        lastCheckedAt: new Date().toISOString(),
      });
      renderGrowth();
      return result;
    }
    rememberVideoUpload({
      localId,
      status: result?.error === "invalid token" ? "failed" : "sent",
      lastCheckMessage: result?.error === "invalid token"
        ? "合言葉が一致していません。"
        : "まだDrive保存が見つかりません。",
      lastCheckedAt: new Date().toISOString(),
    });
    renderGrowth();
    return result;
  } catch (error) {
    rememberVideoUpload({
      localId,
      status: "failed",
      lastCheckMessage: error.message,
      lastCheckedAt: new Date().toISOString(),
    });
    renderGrowth();
    return { ok: false, error: error.message };
  }
}

async function refreshPendingVideos() {
  const pending = (state.videoUploads || [])
    .filter((item) => item.status === "sent" && !item.driveUrl)
    .slice(0, 5);
  for (const item of pending) {
    try {
      await refreshVideoUpload(item.localId);
    } catch {
      // 次回表示時にもう一度確認します。
    }
  }
}

async function uploadPracticeVideo(trick, button) {
  const endpoint = (state.uploadSettings.endpoint || "").trim();
  if (!endpoint) {
    button.textContent = "親設定でURL";
    window.setTimeout(() => { button.textContent = "動画を撮る"; }, 1800);
    return;
  }

  const file = await pickVideoFile();
  if (!file) return;
  if (file.size > MAX_VIDEO_BYTES) {
    button.textContent = "大きすぎる";
    window.setTimeout(() => { button.textContent = "動画を撮る"; }, 1800);
    return;
  }

  const progress = progressFor(trick.id);
  const { total, unit } = targetParts(trick);
  const localId = `${Date.now()}-${trick.id}`;
  button.disabled = true;
  button.textContent = "保存中";

  try {
    const base64 = await fileToBase64(file);
    const payload = {
      token: state.uploadSettings.token || "",
      app: "Soichiro's Daily Life",
      kind: "practiceVideo",
      localId,
      date: todayKey(),
      capturedAt: new Date().toISOString(),
      trickId: trick.id,
      trickNo: trick.no,
      trickName: trick.name,
      trickKind: trick.kind,
      trickLevel: trick.level,
      count: progress.count,
      target: total,
      unit,
      landed: progress.landed,
      goalCleared: progress.goalCleared,
      fileName: file.name || `${todayKey()}_${trick.name}.mp4`,
      mimeType: file.type || "video/mp4",
      fileSize: file.size,
      base64,
    };

    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    rememberVideoUpload({
      localId,
      date: todayKey(),
      trickId: trick.id,
      trickName: trick.name,
      fileName: payload.fileName,
      fileSize: file.size,
      status: "sent",
      uploadedAt: new Date().toISOString(),
    });
    button.textContent = "保存した";
    renderGrowth();
    window.setTimeout(() => refreshVideoUpload(localId), 1800);
  } catch (error) {
    rememberVideoUpload({
      localId,
      date: todayKey(),
      trickId: trick.id,
      trickName: trick.name,
      fileName: file.name || "",
      fileSize: file.size,
      status: "failed",
      error: error.message,
      uploadedAt: new Date().toISOString(),
    });
    button.textContent = "失敗";
  } finally {
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = "動画を撮る";
    }, 1600);
  }
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
  video.href = trick.video;
  const save = fragment.querySelector(".save-button");
  const saved = state.saved.includes(trick.id);
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
  if (!done.length) {
    els.doneList.replaceChildren();
    return;
  }
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
  items.forEach((trick) => {
    const item = document.createElement("li");
    item.textContent = trick.name;
    list.append(item);
  });
  card.append(title, list);
  return card;
}

function renderRoutines() {
  const source = focusTricks();
  const routines = [0, 1, 2].map((offset) => {
    const shuffled = seededShuffle(source, `${todayKey()}-routine-${offset}`);
    return shuffled.slice(0, offset === 0 ? 2 : 3);
  });
  els.routineList.replaceChildren(...routines.map(makeRoutineCard));
}

function visibleHomeIds() {
  return new Set([
    ...state.dailyFocus.ids,
    ...state.pinnedToday,
  ]);
}

function nextChallengePool() {
  const excluded = visibleHomeIds();
  if (state.nextChallenge?.date === todayKey() && state.nextChallenge.id) {
    excluded.add(state.nextChallenge.id);
  }
  const unseen = tricks.filter((trick) => !excluded.has(trick.id));
  return unseen.length ? unseen : tricks;
}

function renderNextChallenge() {
  let current = state.nextChallenge?.date === todayKey()
    ? findTrick(state.nextChallenge.id)
    : null;
  if (current && visibleHomeIds().has(current.id)) {
    state.nextChallenge = null;
    saveState();
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
  state.nextChallenge = {
    id: selected.id,
    date: todayKey(),
    drawnAt: new Date().toISOString(),
  };
  saveState();

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

function renderLibrary() {
  const landedIds = Object.keys(state.allTimeDone);
  const goalIds = landedIds.filter((id) => state.allTimeDone[id]?.goalCleared);
  els.librarySummary.textContent = `${landedIds.length}/${tricks.length}`;
  els.landedCount.textContent = landedIds.length;
  els.goalClearedCount.textContent = goalIds.length;

  const rows = tricks.map((trick) => {
    const record = state.allTimeDone[trick.id];
    const videos = (state.videoUploads || []).filter((item) => item.trickId === trick.id && item.driveUrl);
    const latestVideo = videos[0];
    const row = document.createElement("div");
    row.className = `library-item${record ? " collected" : ""}`;
    const name = document.createElement("strong");
    name.textContent = `${trick.no}. ${trick.name}`;
    const meta = document.createElement("span");
    meta.textContent = record
      ? [
        record.goalCleared ? "目標クリア" : "1回以上できた",
        `初達成 ${record.firstLandedDate || "-"}`,
        record.firstGoalClearedDate ? `目標達成 ${record.firstGoalClearedDate}` : null,
        `最高 ${record.bestCount || 1}${targetParts(trick).unit}`,
        videos.length ? `動画 ${videos.length}本` : null
      ].filter(Boolean).join(" / ")
      : `${trick.kind} / ${trick.level}`;
    row.append(name, meta);
    if (latestVideo) {
      const link = document.createElement("a");
      link.className = "library-video-link";
      link.href = latestVideo.driveUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "動画";
      row.append(link);
    }
    return row;
  });
  els.libraryList.replaceChildren(...rows);
}

function practiceRecords() {
  const records = [];
  const addRecords = (date, progressById = {}) => {
    Object.entries(progressById || {}).forEach(([id, progress]) => {
      const trick = findTrick(id);
      const count = Number(progress?.count || 0);
      if (!trick || count <= 0) return;
      const { total } = targetParts(trick);
      records.push({
        date,
        id,
        trick,
        count,
        target: Number(progress?.target || total),
        landed: Boolean(progress?.landed),
        goalCleared: Boolean(progress?.goalCleared),
      });
    });
  };
  Object.entries(state.history || {}).forEach(([date, progressById]) => addRecords(date, progressById));
  addRecords(todayKey(), state.todayProgress);
  return records;
}

function summarizeByTrick(records) {
  const byTrick = new Map();
  records.forEach((record) => {
    const current = byTrick.get(record.id) || {
      trick: record.trick,
      totalCount: 0,
      bestCount: 0,
      practicedDays: new Set(),
      goalCleared: false,
      lastDate: record.date,
    };
    current.totalCount += record.count;
    current.bestCount = Math.max(current.bestCount, record.count);
    current.practicedDays.add(record.date);
    current.goalCleared = current.goalCleared || record.goalCleared;
    current.lastDate = current.lastDate > record.date ? current.lastDate : record.date;
    byTrick.set(record.id, current);
  });
  return Array.from(byTrick.values());
}

function summarizeByKind(records) {
  const byKind = new Map();
  records.forEach((record) => {
    const kind = record.trick.kind || "その他";
    const current = byKind.get(kind) || {
      kind,
      totalCount: 0,
      practicedDays: new Set(),
      trickIds: new Set(),
      goalClearCount: 0,
    };
    current.totalCount += record.count;
    current.practicedDays.add(record.date);
    current.trickIds.add(record.id);
    if (record.goalCleared) current.goalClearCount += 1;
    byKind.set(kind, current);
  });
  return Array.from(byKind.values());
}

function emptyInsight(text) {
  const item = document.createElement("p");
  item.className = "empty-insight";
  item.textContent = text;
  return item;
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

function videoStatusLabel(item) {
  if (item.driveUrl || item.status === "saved") return "保存済み";
  if (item.status === "checking") return "確認中";
  if (item.status === "failed") return "失敗";
  return "未保存";
}

function makeVideoInsightItem(item) {
  const row = makeInsightItem(
    item.trickName || "動画",
    [
      item.date || "-",
      `${Math.round((Number(item.fileSize || 0) / 1024 / 1024) * 10) / 10}MB`,
      item.lastCheckMessage || null
    ].filter(Boolean).join(" / "),
    videoStatusLabel(item)
  );
  if (item.driveUrl) {
    const link = document.createElement("a");
    link.className = "insight-link";
    link.href = item.driveUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "見る";
    row.append(link);
  } else if (item.status !== "checking") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "insight-link";
    button.textContent = item.status === "failed" ? "再確認" : "確認";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "確認中";
      await refreshVideoUpload(item.localId);
    });
    row.append(button);
  }
  return row;
}

function renderInsightList(container, items, emptyText) {
  container.replaceChildren(...(items.length ? items : [emptyInsight(emptyText)]));
}

function renderGrowth() {
  const records = practiceRecords();
  const practiceDays = new Set(records.map((record) => record.date));
  const totalCount = records.reduce((sum, record) => sum + record.count, 0);
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
    .filter((item) => item.goalCleared || item.bestCount >= Math.max(2, Math.ceil(targetParts(item.trick).total * .6)))
    .sort((a, b) => (Number(b.goalCleared) - Number(a.goalCleared)) || b.bestCount - a.bestCount || b.totalCount - a.totalCount)
    .slice(0, 4)
    .map((item) => makeInsightItem(
      item.trick.name,
      `${item.trick.kind} / 最高 ${item.bestCount}${targetParts(item.trick).unit} / ${item.practicedDays.size}日`,
      item.goalCleared ? "クリア" : "成長中"
    ));

  const almostItems = trickStats
    .filter((item) => !item.goalCleared)
    .map((item) => ({ ...item, target: targetParts(item.trick).total, unit: targetParts(item.trick).unit }))
    .filter((item) => item.bestCount > 0)
    .sort((a, b) => (b.bestCount / b.target) - (a.bestCount / a.target) || b.totalCount - a.totalCount)
    .slice(0, 4)
    .map((item) => makeInsightItem(
      item.trick.name,
      `${item.trick.kind} / 最高 ${item.bestCount}/${item.target}${item.unit}`,
      "もう少し"
    ));

  const kindItems = kindStats
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5)
    .map((item) => makeInsightItem(
      item.kind,
      `${item.trickIds.size}技 / ${item.practicedDays.size}日`,
      `${item.totalCount}回`
    ));

  const dayItems = Array.from(practiceDays)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 7)
    .map((date) => {
      const dayRecords = records.filter((record) => record.date === date);
      const dayCount = dayRecords.reduce((sum, record) => sum + record.count, 0);
      const goalCount = dayRecords.filter((record) => record.goalCleared).length;
      return makeInsightItem(
        date,
        `${dayRecords.length}技 / 目標クリア ${goalCount}技`,
        `${dayCount}回`
      );
    });
  const videoItems = (state.videoUploads || [])
    .slice(0, 8)
    .map(makeVideoInsightItem);

  renderInsightList(els.weaponList, weaponItems, "記録が増えると、武器になってきた技がここに出ます。");
  renderInsightList(els.almostList, almostItems, "あと少しでクリアの技が、ここに出ます。");
  renderInsightList(els.kindBalanceList, kindItems, "練習すると、よく取り組んでいる種類が見えてきます。");
  renderInsightList(els.dailyLogList, dayItems, "毎日の記録がここに積み上がります。");
  renderInsightList(els.videoLogList, videoItems, "動画を保存すると、ここに送信記録が出ます。");
}

function renderPinned() {
  const pinned = state.pinnedToday.map(findTrick).filter(Boolean);
  els.parentSummary.textContent = `${pinned.length}個`;
  els.pinnedHelp.hidden = pinned.length > 0;
  els.homePinnedList.replaceChildren(...pinned.map((trick) => renderCard(trick, { compact: true })));

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
    const pinnedNow = state.pinnedToday.includes(trick.id);
    const row = document.createElement("div");
    row.className = `parent-pick-item${pinnedNow ? " selected" : ""}`;
    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${trick.no}. ${trick.name}`;
    const meta = document.createElement("span");
    meta.textContent = `${trick.kind} / ${trick.level} / ${trick.target || "1回"}`;
    body.append(name, meta);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pick-button${pinnedNow ? " selected" : ""}`;
    button.textContent = pinnedNow ? "外す" : "追加";
    button.addEventListener("click", () => togglePinned(trick.id));
    row.append(body, button);
    return row;
  }));
}

function render() {
  ensureDailyFocus();
  renderChips();
  const focus = focusTricks();
  const focusGoalCleared = focus.filter((trick) => progressFor(trick.id).goalCleared).length;
  const total = tricks.length;
  const remaining = Math.max(focus.length - focusGoalCleared, 0);
  els.doneCount.textContent = focusGoalCleared;
  els.totalCount.textContent = focus.length;
  els.missionSummary.textContent = `${focusGoalCleared}/${focus.length}`;
  els.remainingLabel.textContent = `まずは残り ${remaining} 技`;
  els.progressBar.style.width = focus.length ? `${Math.round((focusGoalCleared / focus.length) * 100)}%` : "0%";
  renderDoneList();

  els.focusList.replaceChildren(...focus.map((trick) => renderCard(trick, { compact: true })));
  renderRoutines();
  renderPinned();
  renderNextChallenge();

  const rows = filteredTricks();
  els.emptyState.hidden = !(todayGoalClearedIds().length === total && total > 0);
  els.trickList.replaceChildren(...rows.map((trick) => renderCard(trick)));
  renderLibrary();
  renderGrowth();
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  saveState();
  render();
});

els.doneToggle.addEventListener("click", () => {
  els.doneList.hidden = !els.doneList.hidden;
});

els.clearPinnedButton.addEventListener("click", () => {
  state.pinnedToday = [];
  saveState();
  render();
});

els.drawNextButton.addEventListener("click", drawNextChallenge);

els.saveUploadSettingsButton.addEventListener("click", () => {
  state.uploadSettings = {
    endpoint: els.uploadEndpointInput.value.trim(),
    token: els.uploadTokenInput.value.trim(),
  };
  saveState();
  els.uploadSettingsStatus.textContent = state.uploadSettings.endpoint
    ? "動画保存先を保存しました。"
    : "URLが空です。動画保存はまだ使えません。";
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view-target]").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("active-view", view.id === button.dataset.viewTarget));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

boot().catch((error) => {
  els.focusList.innerHTML = `<div class="empty-state"><h2>読み込みに失敗しました</h2><p>${error.message}</p></div>`;
});
