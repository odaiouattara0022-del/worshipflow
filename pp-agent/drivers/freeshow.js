"use strict";
// FreeShow agent driver. Talks to the local FreeShow API (default ws/http on
// config.freeShowPort, fallback 5505). See docs/superpowers/notes/freeshow-api.md.
const fs = require("fs");
const path = require("path");

async function sendControl(config, action, target) {
  // TODO(spike): send the exact FreeShow action message captured in the spike.
  // Map: next -> next_slide, previous -> previous_slide, clear -> clear_all.
  const base = `http://${config.ppHost || "127.0.0.1"}:${config.freeShowPort || 5505}`;
  const map = { next: "next_slide", previous: "previous_slide", clear: "clear_all" };
  const fsAction = map[action] || action;
  const res = await fetch(`${base}/api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: fsAction, ...(target ? { value: target } : {}) }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`FreeShow ${res.status}`);
  return { ok: true };
}

async function writeShow(config, payload) {
  // payload is the FreeShow .show JSON from src/lib/freeshow/show-generator.ts
  const dir = config.freeShowShowsPath;
  if (!dir) throw new Error("freeShowShowsPath manquant dans la config");
  const file = path.join(dir, `${payload.name}.show`);
  fs.writeFileSync(file, JSON.stringify([payload.name, payload]), "utf8");
  return { ok: true, file };
}

async function dispatch(command, params, config) {
  switch (command) {
    case "control": return sendControl(config, params.action, params.target);
    case "send-song": return writeShow(config, params.payload);
    case "status":
      // TODO(spike): read active slide from FreeShow API
      return { current: null, next: null };
    default:
      throw new Error(`FreeShow: commande non supportée: ${command}`);
  }
}

module.exports = { dispatch };
