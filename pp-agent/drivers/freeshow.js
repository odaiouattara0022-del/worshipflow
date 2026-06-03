"use strict";
// FreeShow agent driver.
//
// FreeShow exposes a local API in two transports (Settings → Connections → API):
//   - WebSocket (Socket.IO) on port 5505
//   - HTTP/REST          on port 5506  ← we use this (stateless, simplest from Node)
// REST call: POST http://<host>:5506  with JSON body { action: ACTION_ID, ...data }
// Confirmed action ids: next_slide, previous_slide, clear_all, clear_slide,
// clear_background, start_show {id}, name_select_show {value}, set_plain_text {id,value}.
// See docs/superpowers/notes/freeshow-api.md.
const fs = require("fs");
const path = require("path");

const REST_PORT = 5506;

function apiBase(config) {
  const host = config.ppHost || "127.0.0.1";
  const port = config.freeShowPort || REST_PORT;
  return `http://${host}:${port}`;
}

async function callApi(config, action, data) {
  const res = await fetch(apiBase(config), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...(data || {}) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`FreeShow ${res.status}`);
  return { ok: true, action };
}

// Map our generic control verbs to FreeShow action ids. For "clear", the app
// sends a scope as `target` ("presentation" = the slide/text, "media" = the
// background); anything else clears everything.
function sendControl(config, action, target) {
  if (action === "next") return callApi(config, "next_slide");
  if (action === "previous") return callApi(config, "previous_slide");
  if (action === "clear") {
    const clearAction =
      target === "presentation" ? "clear_slide" :
      target === "media" ? "clear_background" :
      "clear_all";
    return callApi(config, clearAction);
  }
  throw new Error(`FreeShow: action de contrôle non supportée: ${action}`);
}

// Write the generated show to FreeShow's Shows folder, then ask FreeShow to
// select it by name so it shows up live without the operator hunting for it.
async function writeShow(config, show) {
  const dir = config.freeShowShowsPath;
  if (!dir) throw new Error("freeShowShowsPath manquant dans la config");

  // FreeShow stores each show on disk as a [id, show] tuple in <id>.show.
  const id = show.id || path.basename(`${Date.now()}`);
  const file = path.join(dir, `${id}.show`);
  fs.writeFileSync(file, JSON.stringify([id, show]), "utf8");

  // Best-effort: bring it up live. Non-fatal if FreeShow hasn't re-indexed the
  // folder yet — the file is written regardless and will appear after a refresh.
  let selected = false;
  try {
    await callApi(config, "name_select_show", { value: show.name });
    selected = true;
  } catch {
    /* file is on disk; selection can be done manually in FreeShow */
  }
  return { ok: true, file, selected };
}

async function dispatch(command, params, config) {
  switch (command) {
    case "control":
      return sendControl(config, params.action, params.target);
    case "send-song":
      return writeShow(config, params.payload);
    case "status":
      // TODO(spike): FreeShow's REST API has no documented "get active slide"
      // read action; revisit if status display is needed for FreeShow.
      return { current: null, next: null };
    default:
      throw new Error(`FreeShow: commande non supportée: ${command}`);
  }
}

module.exports = { dispatch };
