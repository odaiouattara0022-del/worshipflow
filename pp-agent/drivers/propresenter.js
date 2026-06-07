/**
 * handlers.js — Command dispatch and ProPresenter operations.
 * generateProFile is a direct JS port of src/lib/propresenter/pro-file-generator.ts
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// PP HTTP helpers
// ---------------------------------------------------------------------------

function ppUrl(config, endpoint) {
  return `http://${config.ppHost}:${config.ppPort}${endpoint}`;
}

async function ppGet(config, endpoint, timeoutMs = 5000) {
  return fetch(ppUrl(config, endpoint), { signal: AbortSignal.timeout(timeoutMs) });
}

async function ppPost(config, endpoint, body, timeoutMs = 5000) {
  return fetch(ppUrl(config, endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function ppPut(config, endpoint, body, timeoutMs = 5000) {
  return fetch(ppUrl(config, endpoint), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

async function handleStatus(params, config) {
  try {
    const res = await ppGet(config, "/version", 3000);
    if (!res.ok) return { connected: false, error: `PP retourné ${res.status}` };
    const data = await res.json();
    return { connected: true, version: data.versionString || data.version || "unknown" };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// control
// ---------------------------------------------------------------------------

async function handleControl(params, config) {
  const { action, ...rest } = params;
  let url, method = "GET", body = null;

  switch (action) {
    case "next":              url = "/v1/trigger/next"; break;
    case "previous":          url = "/v1/trigger/previous"; break;
    case "trigger":
      if (!rest.id) throw new Error("id requis pour trigger");
      url = rest.index !== undefined ? `/v1/trigger/${rest.id}/${rest.index}` : `/v1/trigger/${rest.id}`;
      break;
    case "triggerPlaylist":
      if (!rest.id) throw new Error("id requis pour triggerPlaylist");
      url = rest.index !== undefined ? `/v1/playlist/${rest.id}/${rest.index}/trigger` : `/v1/playlist/${rest.id}/trigger`;
      break;
    case "clear":             url = `/v1/clear/layer/${rest.layer || "presentation"}`; break;
    case "clearAll":          url = "/v1/clear"; break;
    case "status":            url = "/v1/status/slide"; break;
    case "activePresentation":  url = "/v1/presentation/active"; break;
    case "focusedPresentation": url = "/v1/presentation/focused"; break;
    case "playlists":         url = "/v1/playlists"; break;
    case "playlistItems":
      if (!rest.id) throw new Error("id requis pour playlistItems");
      url = `/v1/playlist/${rest.id}`;
      break;
    case "thumbnail": {
      if (!rest.id) throw new Error("id requis pour thumbnail");
      const thumbRes = await ppGet(config, `/v1/presentation/${rest.id}/thumbnail/${rest.index ?? 0}`, 5000);
      if (!thumbRes.ok) throw new Error(`Thumbnail non disponible (${thumbRes.status})`);
      const buf = Buffer.from(await thumbRes.arrayBuffer());
      return { success: true, data: buf.toString("base64"), contentType: thumbRes.headers.get("content-type") || "image/jpeg" };
    }
    default: throw new Error(`Action inconnue: ${action}`);
  }

  const res = await fetch(ppUrl(config, url), {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });

  if (res.status === 204) return { success: true };
  if (!res.ok) throw new Error(`ProPresenter a retourné ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) return { success: true, data: await res.json() };
  return { success: true, data: (await res.text()) || null };
}

// ---------------------------------------------------------------------------
// themes
// ---------------------------------------------------------------------------

async function handleThemes(params, config) {
  try {
    const res = await ppGet(config, "/v1/themes", 3000);
    if (res.ok) {
      const data = await res.json();
      const themes = (data.themes ?? []).map((t) => ({
        name: t.id.name, index: t.id.index,
        slides: (t.slides ?? []).map((s) => ({ uuid: s.id.uuid, name: s.id.name, index: s.id.index })),
      }));
      if (themes.length > 0) return { themes, source: "api" };
    }
  } catch { /* fall through */ }

  try {
    return { themes: await readThemesFromDisk(config), source: "disk" };
  } catch {
    return { themes: [], source: "none" };
  }
}

async function readThemesFromDisk(config) {
  if (!config.ppDataPath) return [];
  const themesDir = path.join(config.ppDataPath, "Themes");
  if (!fs.existsSync(themesDir)) return [];

  let TemplateDoc;
  try {
    const root = await getTemplateRoot(config);
    TemplateDoc = root.lookupType("rv.data.Template.Document");
  } catch { return []; }

  const dirs = fs.readdirSync(themesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);

  const results = [];
  for (let i = 0; i < dirs.length; i++) {
    const themeFile = path.join(themesDir, dirs[i], "Theme");
    if (!fs.existsSync(themeFile)) continue;
    try {
      const obj = TemplateDoc.toObject(TemplateDoc.decode(fs.readFileSync(themeFile)), { defaults: false, bytes: String });
      results.push({
        name: dirs[i], index: i,
        slides: (obj.slides || []).map((s, si) => ({
          uuid: s.baseSlide?.uuid?.string || `slide-${si}`,
          name: s.baseSlide?.name || `Slide ${si + 1}`,
          index: si,
        })),
      });
    } catch { /* skip */ }
  }
  return results;
}

// ---------------------------------------------------------------------------
// libraries
// ---------------------------------------------------------------------------

async function handleLibraries(params, config) {
  const { libraryPath: configuredPath } = params;
  if (!configuredPath && !config.ppDataPath) {
    return { libraries: [], message: "Dossier ProPresenter introuvable (relancez l'agent à jour)" };
  }
  const basePath = configuredPath
    ? path.dirname(configuredPath)
    : path.join(config.ppDataPath, "Libraries");

  if (!fs.existsSync(basePath)) return { libraries: [], message: `Dossier introuvable : ${basePath}` };

  const libraries = [];
  for (const entry of fs.readdirSync(basePath)) {
    const fullPath = path.join(basePath, entry);
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        let songCount = 0;
        try { songCount = fs.readdirSync(fullPath).filter((f) => f.endsWith(".pro")).length; } catch { }
        libraries.push({ name: entry, path: fullPath, songCount });
      }
    } catch { }
  }
  return { libraries };
}

// ---------------------------------------------------------------------------
// send-song
// ---------------------------------------------------------------------------

async function handleSendSong(params, config) {
  const { song, theme, slideUuid, libraryPath, playlistId, playlistName } = params;
  const targetPath = libraryPath || path.join(config.ppDataPath, "Libraries", "Default");

  const result = await generateProFile(song, theme, slideUuid, targetPath, config);
  await sleep(2000);

  let matched = false, libraryUuid = null;
  try {
    const libRes = await ppGet(config, "/v1/libraries", 5000);
    if (libRes.ok) {
      for (const lib of (await libRes.json()) ?? []) {
        const itemsRes = await ppGet(config, `/v1/library/${lib.uuid}`, 5000);
        if (!itemsRes.ok) continue;
        const found = ((await itemsRes.json()).items ?? [])
          .find((item) => item.name.toLowerCase() === song.title.toLowerCase());
        if (found) { matched = true; libraryUuid = found.uuid; break; }
      }
    }
  } catch { }

  // Add to playlist if requested
  let addedToPlaylist = null;
  if (playlistId || playlistName) {
    try {
      addedToPlaylist = await addSongToPlaylist(config, playlistId, playlistName, song.title, libraryUuid);
    } catch (err) {
      console.error("[send-song] Playlist error:", err.message);
    }
  }

  return {
    success: true, songTitle: song.title, slides: result.slides,
    path: result.path, theme: theme || null, matchedInLibrary: matched, libraryUuid,
    playlist: addedToPlaylist,
    message: matched
      ? `« ${song.title} » envoyé à ProPresenter (${result.slides} slides)`
      : `« ${song.title} » généré (${result.slides} slides) — fichier écrit dans ${result.path}`,
  };
}

async function addSongToPlaylist(config, playlistId, playlistName, songTitle, songUuid) {
  let uuid = playlistId;

  // Find playlist by UUID or name
  if (!uuid && playlistName) {
    uuid = await findOrCreatePlaylist(config, playlistName);
  }
  if (!uuid) return null;

  // Get current playlist items
  let currentItems = [];
  try {
    const res = await ppGet(config, `/v1/playlist/${uuid}`, 5000);
    if (res.ok) currentItems = (await res.json()).items ?? [];
  } catch { }

  // Append song (avoid duplicates)
  const alreadyIn = currentItems.some((i) => i.id?.name?.toLowerCase() === songTitle.toLowerCase());
  if (!alreadyIn) {
    const newItem = songUuid
      ? { id: { name: songTitle, uuid: songUuid }, type: "presentation", is_hidden: false, is_pco: false, destination: "presentation" }
      : { id: { name: songTitle }, type: "placeholder", is_hidden: false, is_pco: false, destination: "presentation" };
    currentItems.push(newItem);
    const putRes = await ppPut(config, `/v1/playlist/${uuid}`, currentItems, 5000);
    if (putRes.ok || putRes.status === 204) return { uuid, added: true };
  }
  return { uuid, added: false };
}

// ---------------------------------------------------------------------------
// send-service
// ---------------------------------------------------------------------------

async function handleSendService(params, config) {
  const { manifest, songs, theme, slideUuid, libraryPath, playlistId, playlistName } = params;
  const targetPath = libraryPath || path.join(config.ppDataPath, "Libraries", "Default");
  const songMap = new Map(songs.map((s) => [s.title.toLowerCase(), s]));

  const generated = [];
  for (const item of manifest.items) {
    if (item.type !== "song" || !item.songTitle) continue;
    const song = songMap.get(item.songTitle.toLowerCase());
    if (!song) continue;
    try {
      await generateProFile(song, theme, slideUuid, targetPath, config);
      generated.push(song.title);
    } catch (err) {
      console.error(`Failed to generate .pro for ${song.title}:`, err.message);
    }
  }

  if (generated.length > 0) await sleep(1000);

  const libraryMap = new Map();
  try {
    const libRes = await ppGet(config, "/v1/libraries", 5000);
    if (libRes.ok) {
      for (const lib of (await libRes.json()) ?? []) {
        const itemsRes = await ppGet(config, `/v1/library/${lib.uuid}`, 5000);
        if (!itemsRes.ok) continue;
        for (const item of (await itemsRes.json()).items ?? [])
          libraryMap.set(item.name.toLowerCase(), item.uuid);
      }
    }
  } catch { }

  // Use provided playlist, or auto-create from service name, or skip
  const targetPlaylistName = playlistName || (playlistId ? null : manifest.name);
  const playlistUuid = playlistId || (targetPlaylistName ? await findOrCreatePlaylist(config, targetPlaylistName) : null);
  if (!playlistUuid && (playlistId || playlistName)) throw new Error("Impossible de trouver/créer la playlist dans ProPresenter");

  const ppItems = [], results = [];
  for (const item of manifest.items) {
    if (item.type === "song" && item.songTitle) {
      const uuid = libraryMap.get(item.songTitle.toLowerCase());
      ppItems.push(uuid
        ? { id: { name: item.songTitle, uuid }, type: "presentation", is_hidden: false, is_pco: false, destination: "presentation" }
        : { id: { name: item.songTitle }, type: "placeholder", is_hidden: false, is_pco: false, destination: "presentation" });
      results.push({ title: item.songTitle, type: "song", matched: !!uuid, ppType: uuid ? "presentation" : "placeholder" });
    } else {
      ppItems.push({ id: { name: item.title }, type: "header", is_hidden: false, is_pco: false, destination: "presentation" });
      results.push({ title: item.title, type: item.type, matched: false, ppType: "header" });
    }
  }

  let itemsAdded = false;
  if (playlistUuid) {
    try {
      const putRes = await ppPut(config, `/v1/playlist/${playlistUuid}`, ppItems, 5000);
      itemsAdded = putRes.status === 204 || putRes.ok;
    } catch { }
  }

  const matchedCount = results.filter((r) => r.matched).length;
  const songCount = results.filter((r) => r.type === "song").length;
  const effectivePlaylistName = playlistName || (playlistId ? playlistId : manifest.name);

  return {
    success: playlistUuid ? itemsAdded : generated.length > 0,
    playlistUuid, playlistName: effectivePlaylistName,
    totalItems: ppItems.length, songsMatched: matchedCount, songsTotal: songCount,
    generated, results,
    message: !playlistUuid
      ? `${generated.length} fichier(s) .pro générés (aucune liste de lecture)`
      : itemsAdded
        ? `Playlist « ${effectivePlaylistName} » mise à jour avec ${ppItems.length} éléments (${matchedCount}/${songCount} chants liés)`
        : "La playlist a été créée mais les éléments n'ont pas pu être ajoutés",
  };
}

async function findOrCreatePlaylist(config, name) {
  try {
    const res = await ppGet(config, "/v1/playlists", 5000);
    if (res.ok) {
      const existing = (await res.json()).find?.((p) => p.id?.name === name);
      if (existing) return existing.id.uuid;
    }
  } catch { }
  try {
    await ppPost(config, "/v1/playlists", { name }, 5000);
    await sleep(500);
    const res = await ppGet(config, "/v1/playlists", 5000);
    if (!res.ok) return null;
    return (await res.json()).find?.((p) => p.id?.name === name)?.id.uuid ?? null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// detect-path
// ---------------------------------------------------------------------------

async function handleDetectPath(params, config) {
  const localPath = path.join(config.ppDataPath, "Libraries", "Default");
  if (fs.existsSync(localPath))
    return { found: true, path: localPath, message: `Chemin local détecté : ${localPath}` };

  const { host, name: deviceName } = params;
  const users = ["HP", "User", "Admin", "Administrateur"];
  const paths = [
    ...users.flatMap((u) => [
      `\\\\${deviceName}\\Users\\${u}\\Documents\\ProPresenter\\Libraries\\Default`,
      `\\\\${host}\\Users\\${u}\\Documents\\ProPresenter\\Libraries\\Default`,
    ]),
    `\\\\${deviceName}\\ProPresenter\\Libraries\\Default`,
    `\\\\${host}\\ProPresenter\\Libraries\\Default`,
  ];

  for (const p of paths) {
    try { if (fs.existsSync(p)) return { found: true, path: p, message: `Chemin réseau détecté : ${p}` }; }
    catch { }
  }
  return { found: false, tried: paths.length, message: `Aucun chemin trouvé sur ${deviceName} (${host}).` };
}

// ---------------------------------------------------------------------------
// .pro file generation — ported from pro-file-generator.ts
// ---------------------------------------------------------------------------

let _protoRoot = null;
let _templateRoot = null;
let _protoLoadPromise = null;
let _templateLoadPromise = null;

function getBuiltinProtoDir() {
  // In pkg mode, proto files are bundled in snapshot at __dirname/../proto
  // In dev mode, __dirname is pp-agent/drivers, so ".." resolves to pp-agent/
  return path.join(__dirname, "..", "proto");
}

function resolveProtoDir(config) {
  return (config.protoDir && fs.existsSync(config.protoDir))
    ? config.protoDir
    : getBuiltinProtoDir();
}

async function getProtoRoot(config) {
  if (_protoRoot) return _protoRoot;
  if (_protoLoadPromise) return _protoLoadPromise;
  const protoDir = resolveProtoDir(config);
  const protobuf = require("protobufjs");
  _protoLoadPromise = protobuf.load([
    path.join(protoDir, "presentation.proto"),
    path.join(protoDir, "presentationSlide.proto"),
    path.join(protoDir, "cue.proto"),
    path.join(protoDir, "slide.proto"),
    path.join(protoDir, "graphicsData.proto"),
    path.join(protoDir, "basicTypes.proto"),
    path.join(protoDir, "groups.proto"),
    path.join(protoDir, "action.proto"),
  ]).then((root) => { _protoRoot = root; _protoLoadPromise = null; return root; });
  return _protoLoadPromise;
}

async function getTemplateRoot(config) {
  if (_templateRoot) return _templateRoot;
  if (_templateLoadPromise) return _templateLoadPromise;
  const protoDir = resolveProtoDir(config);
  const protobuf = require("protobufjs");
  _templateLoadPromise = protobuf.load([
    path.join(protoDir, "template.proto"),
    path.join(protoDir, "slide.proto"),
    path.join(protoDir, "graphicsData.proto"),
    path.join(protoDir, "action.proto"),
    path.join(protoDir, "basicTypes.proto"),
    path.join(protoDir, "effects.proto"),
  ]).then((root) => { _templateRoot = root; _templateLoadPromise = null; return root; });
  return _templateLoadPromise;
}

async function loadSlideTemplate(slideUuid, themeName, config) {
  if (!slideUuid) return null;
  try {
    const root = await getTemplateRoot(config);
    const TemplateDoc = root.lookupType("rv.data.Template.Document");
    const themesDir = path.join(config.ppDataPath, "Themes");
    let themeFiles = [];

    if (themeName) {
      const exact = path.join(themesDir, themeName, "Theme");
      if (fs.existsSync(exact)) themeFiles = [exact];
    }
    if (themeFiles.length === 0 && fs.existsSync(themesDir)) {
      themeFiles = fs.readdirSync(themesDir)
        .map((d) => path.join(themesDir, d, "Theme"))
        .filter((p) => fs.existsSync(p));
    }

    for (const themeFile of themeFiles) {
      const obj = TemplateDoc.toObject(TemplateDoc.decode(fs.readFileSync(themeFile)), { defaults: false, bytes: String });
      if (!obj.slides) continue;
      const matchedSlide = obj.slides.find((s) => s.baseSlide?.uuid?.string === slideUuid);
      if (!matchedSlide) continue;

      const themeDir = path.dirname(themeFile);
      const adaptedElements = [];
      for (const el of (matchedSlide.baseSlide.elements || [])) {
        const clone = JSON.parse(JSON.stringify(el));
        if (clone.info === 2) clone.info = 3;
        if (clone.element?.fill?.media?.url?.local?.path) {
          const filename = clone.element.fill.media.url.local.path.split("/").pop() || "";
          const newRelPath = `Media/Assets/${slideUuid}${filename}`;
          const absPath = path.join(config.ppDataPath, newRelPath);
          clone.element.fill.media.url.local.path = newRelPath;
          clone.element.fill.media.url.absoluteString = absPath;
          if (!fs.existsSync(absPath)) {
            const src = path.join(themeDir, clone.element.fill.media.url.local.path.replace(newRelPath, "") || "", filename);
            const srcAlt = path.join(themeDir, "Assets", filename);
            const srcFile = fs.existsSync(srcAlt) ? srcAlt : src;
            if (fs.existsSync(srcFile)) {
              const assetDir = path.join(config.ppDataPath, "Media", "Assets");
              if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });
              fs.copyFileSync(srcFile, absPath);
            }
          }
          if (clone.info === undefined || clone.info === 0) clone.info = 1;
        }
        adaptedElements.push(clone);
      }

      return {
        elements: adaptedElements,
        backgroundColor: matchedSlide.baseSlide.backgroundColor || { alpha: 1 },
        size: matchedSlide.baseSlide.size || { width: 1920, height: 1080 },
      };
    }
  } catch (err) {
    console.log("[pro-gen] Theme load failed:", err.message);
  }
  return null;
}

function makeUUID(str) {
  return { string: str || crypto.randomUUID() };
}

function rectPath() {
  return {
    closed: true,
    points: [
      { point: {}, q0: {}, q1: {} },
      { point: { x: 1 }, q0: { x: 1 }, q1: { x: 1 } },
      { point: { x: 1, y: 1 }, q0: { x: 1, y: 1 }, q1: { x: 1, y: 1 } },
      { point: { y: 1 }, q0: { y: 1 }, q1: { y: 1 } },
    ],
    shape: { type: 1 },
  };
}

function escapeRTF(text) {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (char === "\\") out += "\\\\";
    else if (char === "{") out += "\\{";
    else if (char === "}") out += "\\}";
    else if (code > 127) out += `\\u${code}?`;
    else out += char;
  }
  return out;
}

function buildDefaultRTF(text) {
  const parFmt =
    "\\pard\\li0\\fi0\\ri0\\qc\\sb0\\sa0\\sl192\\slmult1\\slleading0" +
    "\\f0\\b\\i0\\ul0\\strike0\\fs200\\expnd0\\expndtw0" +
    "\\CocoaLigature1\\cf1\\strokewidth0\\strokec1\\nosupersub\\ulc0\\highlight2\\cb2 ";
  const lines = text.split("\n");
  let body = "";
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) body += "\\par\n" + parFmt;
    body += escapeRTF(lines[i]);
  }
  return Buffer.from(
    "{\\rtf0\\ansi\\ansicpg1252" +
    "{\\fonttbl\\f0\\fnil ArialMT;}" +
    "{\\colortbl;\\red255\\green255\\blue255;\\red255\\green255\\blue255;}" +
    "{\\*\\expandedcolortbl;\\csgenericrgb\\c100000\\c100000\\c100000\\c100000;" +
    "\\csgenericrgb\\c100000\\c100000\\c100000\\c0;}" +
    "{\\*\\listtable}{\\*\\listoverridetable}" +
    "\\uc1\\paperw28800\\margl0\\margr0\\margt0\\margb0" +
    parFmt + body + "}",
    "utf-8"
  );
}

function buildRTFFromTemplate(text, templateRTFBase64) {
  const templateStr = Buffer.from(templateRTFBase64, "base64").toString("utf-8");
  const cbMatch = templateStr.match(/([\s\S]*?\\cb\d)\s*/);
  if (!cbMatch) return buildDefaultRTF(text).toString("base64");
  const header = cbMatch[1];
  const parFmtMatch = templateStr.match(/(\\pard[\s\S]*?\\cb\d)\s*/);
  const parFmt = parFmtMatch ? parFmtMatch[1] + " " : "";
  const lines = text.split("\n");
  let body = "";
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) body += "\\par\n" + parFmt;
    body += escapeRTF(lines[i]);
  }
  return Buffer.from(header + " " + body + "}", "utf-8").toString("base64");
}

function buildFallbackTextElement(verseText) {
  return {
    element: {
      uuid: makeUUID(), name: "",
      bounds: { origin: { x: 78, y: 228 }, size: { width: 1764, height: 624 } },
      opacity: 1, path: rectPath(),
      fill: {},
      stroke: { width: 3, color: { red: 1, green: 1, blue: 1, alpha: 1 } },
      shadow: { angle: 315, offset: 5, radius: 5, color: { alpha: 1 }, opacity: 0.75 },
      feather: { radius: 0.05 },
      text: {
        attributes: {
          font: { name: "ArialMT", size: 100, family: "Arial", face: "Regular" },
          textSolidFill: { red: 1, green: 1, blue: 1, alpha: 1 },
          paragraphStyle: { alignment: 2, lineHeightMultiple: 1 },
          strokeColor: { red: 1, green: 1, blue: 1, alpha: 1 },
        },
        shadow: { angle: 315, offset: 5, radius: 5, color: { alpha: 1 }, opacity: 0.75 },
        rtfData: buildDefaultRTF(verseText).toString("base64"),
        verticalAlignment: 1, scaleBehavior: 1, margins: {},
        isSuperscriptStandardized: true, transformDelimiter: "  •  ",
        chordPro: { color: { alpha: 1 } },
      },
      textLineMask: {},
    },
    info: 3,
    textScroller: { scrollRate: 0.5, shouldRepeat: true, repeatDistance: 0.05 },
  };
}

function cloneSlideElements(templateElements, verseText) {
  return templateElements.map((el) => {
    const clone = JSON.parse(JSON.stringify(el));
    if (clone.element?.uuid) clone.element.uuid = makeUUID();
    if (clone.element?.fill?.media?.uuid) clone.element.fill.media.uuid = makeUUID();
    if (clone.info === 3 && clone.element?.text?.rtfData)
      clone.element.text.rtfData = buildRTFFromTemplate(verseText, clone.element.text.rtfData);
    return clone;
  });
}

/**
 * Split lyrics into slides.
 * Rules (strict, no exceptions):
 *   1. Max 2 lines per slide.
 *   2. A line longer than LONG_LINE_CHARS goes alone on its own slide.
 *   3. Section labels [Verse 1], (Refrain) etc. are stripped from display
 *      but kept as the group name in ProPresenter.
 */
const LONG_LINE_CHARS = 38;

function splitVerses(lyrics) {
  const normalized = lyrics.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const labelRe = /^\s*[\[(]([^\])\n]{1,40})[\])][\s:]*$/;
  const blocks = normalized.split(/\n{2,}/);
  const slides = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    // Extract label from first line if it's a section marker
    let label = "";
    let contentLines = lines;
    if (lines.length === 1 && labelRe.test(lines[0])) continue; // pure label block, skip
    if (labelRe.test(lines[0])) {
      label = lines[0].replace(labelRe, "$1").trim();
      contentLines = lines.slice(1);
    }

    // Group lines: max 2 per slide, long lines get their own slide
    let pending = [];
    let pendingLabel = label;

    for (const line of contentLines) {
      const isLong = line.length > LONG_LINE_CHARS;

      if (isLong) {
        // Flush whatever is pending first
        if (pending.length > 0) {
          slides.push({ text: pending.join("\n"), label: pendingLabel });
          pending = [];
          pendingLabel = "";
        }
        // Long line alone
        slides.push({ text: line, label: pendingLabel });
        pendingLabel = "";
      } else {
        pending.push(line);
        if (pending.length === 2) {
          slides.push({ text: pending.join("\n"), label: pendingLabel });
          pending = [];
          pendingLabel = "";
        }
      }
    }

    // Flush last incomplete group
    if (pending.length > 0) {
      slides.push({ text: pending.join("\n"), label: pendingLabel });
    }
  }

  return slides;
}

async function generateProFile(song, themeName, slideUuid, targetPath, config) {
  const root = await getProtoRoot(config);
  const Presentation = root.lookupType("rv.data.Presentation");

  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

  const slides = splitVerses(song.lyrics);
  const template = slideUuid ? await loadSlideTemplate(slideUuid, themeName, config) : null;

  const groupColors = [
    { red: 0.0, green: 0.0, blue: 1.0, alpha: 1.0 },
    { red: 0.53, green: 0.81, blue: 0.92, alpha: 1.0 },
    { red: 0.75, green: 0.0, blue: 0.75, alpha: 1.0 },
    { red: 0.0, green: 0.75, blue: 0.0, alpha: 1.0 },
    { red: 1.0, green: 0.55, blue: 0.0, alpha: 1.0 },
  ];

  const presentationUUID = crypto.randomUUID();
  const arrangementUUID = crypto.randomUUID();
  const groupUUIDs = [];
  const cueObjects = [];
  const cueGroupObjects = [];
  const emptyRTF = buildDefaultRTF("").toString("base64");

  for (let i = 0; i < slides.length; i++) {
    const { text: verse, label } = slides[i];
    const cueUUID = crypto.randomUUID();
    const groupUUID = crypto.randomUUID();
    groupUUIDs.push(groupUUID);

    const slideElements = template
      ? cloneSlideElements(template.elements, verse)
      : [buildFallbackTextElement(verse)];

    const slideName = label || `Diapo ${i + 1}`;

    cueObjects.push({
      uuid: makeUUID(cueUUID),
      name: slideName,
      completionTargetUuid: makeUUID("00000000-0000-0000-0000-000000000000"),
      completionActionType: 1,
      completionActionUuid: makeUUID("00000000-0000-0000-0000-000000000000"),
      triggerTime: {}, isEnabled: true,
      actions: [{
        uuid: makeUUID(), isEnabled: true, type: 11,
        slide: {
          presentation: {
            baseSlide: {
              elements: slideElements,
              backgroundColor: template?.backgroundColor || { alpha: 1 },
              size: template?.size || { width: 1920, height: 1080 },
              uuid: makeUUID(),
            },
            notes: {
              rtfData: emptyRTF,
              attributes: {
                font: { name: "ArialMT", size: 50, family: "Arial", face: "Regular" },
                textSolidFill: { alpha: 1 },
                paragraphStyle: { lineHeightMultiple: 1 },
                strokeColor: { red: 1, green: 1, blue: 1, alpha: 1 },
              },
            },
            chordChart: {},
          },
        },
      }],
    });

    cueGroupObjects.push({
      group: { uuid: makeUUID(groupUUID), name: slideName, color: groupColors[i % groupColors.length] },
      cueIdentifiers: [makeUUID(cueUUID)],
    });
  }

  const presentation = {
    applicationInfo: { platform: 2, versionNumber: 26200 },
    uuid: makeUUID(presentationUUID),
    name: song.title,
    background: { color: { red: 1, green: 1, blue: 1 } },
    selectedArrangement: makeUUID(arrangementUUID),
    arrangements: [{ uuid: makeUUID(arrangementUUID), name: song.title, groupIdentifiers: groupUUIDs.map((id) => makeUUID(id)) }],
    cueGroups: cueGroupObjects,
    cues: cueObjects,
    ccli: {
      author: song.author || "",
      artistCredits: song.artistCredits || "",
      songTitle: song.title,
      publisher: song.publisher || "",
      copyrightYear: song.copyrightYear || 0,
      songNumber: song.ccliNumber ? parseInt(song.ccliNumber) : 0,
      display: song.copyrightDisplay ?? false,
      album: song.album || "",
    },
  };

  const buffer = Presentation.encode(Presentation.create(presentation)).finish();
  const filePath = path.join(targetPath, `${song.title.replace(/[<>:"/\\|?*]/g, "_").slice(0, 200)}.pro`);
  fs.writeFileSync(filePath, buffer);

  console.log(`[pro-gen] ${filePath} (${buffer.length} bytes, ${slides.length} slides)`);
  return { path: filePath, slides: slides.length };
}

// ---------------------------------------------------------------------------
// playlists — fetch PP playlists with robust parsing
// ---------------------------------------------------------------------------

async function handlePlaylists(params, config) {
  try {
    const res = await ppGet(config, "/v1/playlists", 5000);
    if (!res.ok) return { playlists: [], error: `PP retourné ${res.status}` };
    const raw = await res.json();
    console.log("[playlists] raw response:", JSON.stringify(raw).slice(0, 300));

    // PP7 HTTP API returns an array of playlist objects
    // Each has: { id: { uuid: "...", name: "..." } } OR { uuid: "...", name: "..." }
    const list = Array.isArray(raw) ? raw : (raw.playlists ?? raw.items ?? []);
    const playlists = list.map((p) => {
      const uuid = (typeof p.id?.uuid === "string") ? p.id.uuid
        : (typeof p.uuid === "string") ? p.uuid
        : (p.id?.uuid?.string) ? p.id.uuid.string
        : null;
      const name = p.id?.name ?? p.name ?? "Sans nom";
      return { uuid, name };
    }).filter((p) => p.uuid);

    console.log(`[playlists] parsed ${playlists.length} playlists`);
    return { playlists };
  } catch (err) {
    console.error("[playlists] error:", err.message);
    return { playlists: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// sync-library — push all ProSendWorship songs as .pro files into PP library
// ---------------------------------------------------------------------------

async function handleSyncLibrary(params, config) {
  const { songs, theme, slideUuid, libraryPath } = params;
  const targetPath = libraryPath || path.join(config.ppDataPath, "Libraries", "ProSendWorship");

  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

  let generated = 0, skipped = 0, errors = [];

  for (const song of songs) {
    if (!song.lyrics || !song.lyrics.trim()) { skipped++; continue; }
    try {
      await generateProFile(song, theme || null, slideUuid || null, targetPath, config);
      generated++;
    } catch (err) {
      errors.push({ title: song.title, error: err.message });
      skipped++;
    }
  }

  // Reload PP library so new files appear immediately in search
  try {
    await ppGet(config, "/v1/libraries/reload", 5000).catch(() => {});
  } catch { /* non-fatal */ }

  console.log(`[sync-library] ${generated} générés, ${skipped} ignorés dans ${targetPath}`);
  return {
    success: true,
    generated,
    skipped,
    errors: errors.slice(0, 10),
    path: targetPath,
    message: `${generated} chants synchronisés dans la bibliothèque « ProSendWorship »`,
  };
}

// ---------------------------------------------------------------------------
// scan-network — find ProPresenter instances on local network
// ---------------------------------------------------------------------------

async function handleScanNetwork(params, config) {
  const os = require("os");
  const nets = os.networkInterfaces();
  const localIPs = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) localIPs.push(net.address);
    }
  }

  if (localIPs.length === 0) return { devices: [], error: "Pas de réseau détecté" };

  const found = [];
  const portsToScan = [1025, 12345, 50001];

  for (const localIP of localIPs) {
    const prefix = localIP.split(".").slice(0, 3).join(".");
    const promises = [];

    for (let i = 1; i <= 254; i++) {
      const ip = `${prefix}.${i}`;
      for (const port of portsToScan) {
        promises.push(
          fetch(`http://${ip}:${port}/version`, { signal: AbortSignal.timeout(800) })
            .then(async (res) => {
              if (!res.ok) return;
              const data = await res.json();
              if (data.host_description?.includes("ProPresenter") || data.api_version) {
                found.push({ name: data.name || ip, host: ip, port, description: data.host_description || "ProPresenter" });
              }
            })
            .catch(() => { })
        );
      }
    }
    await Promise.all(promises);
  }

  return { devices: found };
}

// ---------------------------------------------------------------------------
// scan-library — read .pro files and extract lyrics
// ---------------------------------------------------------------------------

async function handleScanLibrary(params, config) {
  const { libraryPath } = params;
  const scanPath = libraryPath || path.join(config.ppDataPath, "Libraries");

  try {
    const { statSync } = fs;
    statSync(scanPath); // throws if not found
  } catch {
    return { presentations: [], error: `Dossier introuvable : ${scanPath}` };
  }

  const presentations = [];

  async function walkDir(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pro")) {
        try {
          const pres = readProFile(fullPath);
          if (pres.slides.length > 0) presentations.push(pres);
        } catch { /* skip */ }
      }
    }
  }

  await walkDir(scanPath);
  return { presentations };
}

function readProFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const title = path.basename(filePath, ".pro");
  const rtfBlocks = extractRtfBlocks(buffer);
  const slides = rtfBlocks
    .map((rtf) => ({ text: rtfToPlainText(rtf), label: "", notes: "" }))
    .filter((s) => s.text.length > 0);
  return { title, slides, filePath };
}

function extractRtfBlocks(buffer) {
  const blocks = [];
  const marker = Buffer.from("{\\rtf");
  let searchFrom = 0;
  while (searchFrom < buffer.length) {
    const idx = buffer.indexOf(marker, searchFrom);
    if (idx === -1) break;
    let depth = 0, end = -1;
    for (let i = idx; i < buffer.length; i++) {
      if (buffer[i] === 0x7b) depth++;
      if (buffer[i] === 0x7d) depth--;
      if (depth === 0) { end = i; break; }
    }
    if (end === -1) break;
    blocks.push(buffer.subarray(idx, end + 1).toString("utf-8"));
    searchFrom = end + 1;
  }
  return blocks;
}

function rtfToPlainText(rtf) {
  let text = rtf.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
  let result = "", skipGroup = false;
  const skipStack = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      skipStack.push(skipGroup);
      const ahead = text.substring(i + 1, i + 30);
      if (ahead.startsWith("\\fonttbl") || ahead.startsWith("\\colortbl") ||
          ahead.startsWith("\\*\\") || ahead.startsWith("\\stylesheet") ||
          ahead.startsWith("\\info")) skipGroup = true;
    } else if (ch === "}") {
      skipGroup = skipStack.pop() ?? false;
    } else if (!skipGroup) {
      result += ch;
    }
  }
  text = result
    .replace(/\\par\b\s?/g, "\n")
    .replace(/\\line\b\s?/g, "\n")
    .replace(/\\[a-z]+\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).join("\n").trim();
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function dispatch(command, params, config) {
  switch (command) {
    case "status":        return handleStatus(params, config);
    case "control":       return handleControl(params, config);
    case "themes":        return handleThemes(params, config);
    case "libraries":     return handleLibraries(params, config);
    case "send-song":     return handleSendSong(params, config);
    case "send-service":  return handleSendService(params, config);
    case "detect-path":   return handleDetectPath(params, config);
    case "scan-network":  return handleScanNetwork(params, config);
    case "scan-library":  return handleScanLibrary(params, config);
    case "playlists":     return handlePlaylists(params, config);
    case "sync-library":  return handleSyncLibrary(params, config);
    default: throw new Error(`Commande inconnue: ${command}`);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = { dispatch };
