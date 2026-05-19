const CONFIG = {
  TOKEN: "CHANGE_ME_LONG_RANDOM_TEXT",
  DRIVE_FOLDER_NAME: "Soichiro Skate Videos",
  SPREADSHEET_NAME: "Soichiro Skate Challenge Log",
  VIDEO_SHEET_NAME: "videos",
  DAILY_SHEET_NAME: "daily_progress",
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (CONFIG.TOKEN && payload.token !== CONFIG.TOKEN) {
      return jsonResponse({ ok: false, error: "invalid token" });
    }
    if (payload.kind === "practiceVideo") {
      return jsonResponse(savePracticeVideo(payload));
    }
    if (payload.kind === "dailyProgress") {
      return jsonResponse(saveDailyProgress(payload));
    }
    return jsonResponse({ ok: false, error: "unknown kind" });
  } catch (error) {
    logUploadError("doPost", error.message, e && e.postData && e.postData.contents);
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doGet(e) {
  try {
    const params = e.parameter || {};
    if (CONFIG.TOKEN && params.token !== CONFIG.TOKEN) {
      return scriptResponse(params.callback, { ok: false, error: "invalid token" });
    }
    if (params.action === "videoStatus") {
      return scriptResponse(params.callback, getVideoStatus(params.localId));
    }
    if (params.action === "recentVideos") {
      return scriptResponse(params.callback, getRecentVideos(Number(params.limit || 20)));
    }
    return scriptResponse(params.callback, {
      ok: true,
      app: "Soichiro's Daily Life upload endpoint",
      message: "POST practiceVideo or dailyProgress JSON here.",
    });
  } catch (error) {
    return scriptResponse(e.parameter && e.parameter.callback, { ok: false, error: error.message });
  }
}

function savePracticeVideo(payload) {
  try {
    const folder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_NAME);
    const dayFolder = getOrCreateChildFolder(folder, payload.date || dateText(new Date()));
    const safeName = sanitizeFileName([
      payload.date || dateText(new Date()),
      payload.trickNo || payload.trickId || "trick",
      payload.trickName || "practice",
      new Date().getTime(),
    ].join("_"));
    const extension = extensionForMime(payload.mimeType || "video/mp4");
    const bytes = Utilities.base64Decode(payload.base64 || "");
    const blob = Utilities.newBlob(bytes, payload.mimeType || "video/mp4", `${safeName}.${extension}`);
    const file = dayFolder.createFile(blob);
    const spreadsheet = getOrCreateSpreadsheet(CONFIG.SPREADSHEET_NAME);
    const sheet = getOrCreateSheet(spreadsheet, CONFIG.VIDEO_SHEET_NAME, [
      "recordedAt",
      "date",
      "trickId",
      "trickNo",
      "trickName",
      "kind",
      "level",
      "count",
      "target",
      "landed",
      "goalCleared",
      "fileName",
      "fileSize",
      "driveFileId",
      "driveUrl",
      "localId",
    ]);

    sheet.appendRow([
      new Date(),
      payload.date || "",
      payload.trickId || "",
      payload.trickNo || "",
      payload.trickName || "",
      payload.trickKind || "",
      payload.trickLevel || "",
      payload.count || 0,
      payload.target || "",
      Boolean(payload.landed),
      Boolean(payload.goalCleared),
      payload.fileName || file.getName(),
      payload.fileSize || "",
      file.getId(),
      file.getUrl(),
      payload.localId || "",
    ]);

    return {
      ok: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      spreadsheetUrl: spreadsheet.getUrl(),
    };
  } catch (error) {
    logUploadError("savePracticeVideo", error.message, JSON.stringify({
      localId: payload.localId,
      trickId: payload.trickId,
      trickName: payload.trickName,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      mimeType: payload.mimeType,
    }));
    throw error;
  }
}

function getVideoStatus(localId) {
  const spreadsheet = getOrCreateSpreadsheet(CONFIG.SPREADSHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, CONFIG.VIDEO_SHEET_NAME, [
    "recordedAt",
    "date",
    "trickId",
    "trickNo",
    "trickName",
    "kind",
    "level",
    "count",
    "target",
    "landed",
    "goalCleared",
    "fileName",
    "fileSize",
    "driveFileId",
    "driveUrl",
    "localId",
  ]);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift() || [];
  const localIdIndex = headers.indexOf("localId");
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i][localIdIndex]) === String(localId)) {
      return {
        ok: true,
        video: rowToObject(headers, rows[i]),
        spreadsheetUrl: spreadsheet.getUrl(),
      };
    }
  }
  return { ok: false, pending: true, error: "not found yet" };
}

function getRecentVideos(limit) {
  const spreadsheet = getOrCreateSpreadsheet(CONFIG.SPREADSHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, CONFIG.VIDEO_SHEET_NAME, [
    "recordedAt",
    "date",
    "trickId",
    "trickNo",
    "trickName",
    "kind",
    "level",
    "count",
    "target",
    "landed",
    "goalCleared",
    "fileName",
    "fileSize",
    "driveFileId",
    "driveUrl",
    "localId",
  ]);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift() || [];
  return {
    ok: true,
    videos: rows.slice(-Math.max(1, limit)).reverse().map((row) => rowToObject(headers, row)),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function saveDailyProgress(payload) {
  const spreadsheet = getOrCreateSpreadsheet(CONFIG.SPREADSHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, CONFIG.DAILY_SHEET_NAME, [
    "recordedAt",
    "date",
    "trickId",
    "trickName",
    "kind",
    "level",
    "count",
    "target",
    "landed",
    "goalCleared",
    "source",
  ]);
  (payload.records || []).forEach((record) => {
    sheet.appendRow([
      new Date(),
      payload.date || record.date || "",
      record.trickId || "",
      record.trickName || "",
      record.kind || "",
      record.level || "",
      record.count || 0,
      record.target || "",
      Boolean(record.landed),
      Boolean(record.goalCleared),
      payload.source || "app",
    ]);
  });
  return { ok: true, rows: (payload.records || []).length, spreadsheetUrl: spreadsheet.getUrl() };
}

function installNightlyTrigger() {
  ScriptApp.newTrigger("nightlyPlaceholder")
    .timeBased()
    .everyDays(1)
    .atHour(22)
    .create();
}

function nightlyPlaceholder() {
  const spreadsheet = getOrCreateSpreadsheet(CONFIG.SPREADSHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, "nightly_runs", ["ranAt", "note"]);
  sheet.appendRow([new Date(), "22:00 trigger is active. App-side daily records can be sent here later."]);
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function getOrCreateChildFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function getOrCreateSpreadsheet(name) {
  const files = DriveApp.getFilesByName(name);
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(file.getId());
    }
  }
  return SpreadsheetApp.create(name);
}

function getOrCreateSheet(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function logUploadError(stage, message, detail) {
  const spreadsheet = getOrCreateSpreadsheet(CONFIG.SPREADSHEET_NAME);
  const sheet = getOrCreateSheet(spreadsheet, "upload_errors", [
    "recordedAt",
    "stage",
    "message",
    "detail",
  ]);
  sheet.appendRow([
    new Date(),
    stage,
    message,
    String(detail || "").slice(0, 2000),
  ]);
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function scriptResponse(callback, value) {
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(value)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(value);
}

function rowToObject(headers, row) {
  return headers.reduce((object, header, index) => {
    object[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
    return object;
  }, {});
}

function sanitizeFileName(value) {
  return String(value).replace(/[\\/:*?"<>|#%{}~&]/g, "_").slice(0, 140);
}

function extensionForMime(mimeType) {
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  if (mimeType === "video/x-m4v") return "m4v";
  return "mp4";
}

function dateText(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}
