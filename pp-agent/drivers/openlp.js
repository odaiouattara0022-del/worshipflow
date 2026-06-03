"use strict";
// OpenLP agent driver — talks to the OpenLP Remote HTTP API v2.
//
// In OpenLP: Settings → Remote → enable the remote (default port 4316). The API
// is at http://<host>:4316/api/v2. Authentication is OFF by default; if the user
// turned it on, GET /core/system returns { login_required: true } and we obtain a
// token via POST /core/login { username, password } (default openlp/password),
// then send it as the "Authorization" header (raw token, no "Bearer").
//
// Endpoints used (confirmed from OpenLP source, core/api/versions/v2):
//   GET  /core/system                         -> { login_required, ... }
//   POST /core/login        { username,password } -> { token }
//   POST /controller/progress { action }      -> next / previous
//   POST /core/display        { display }      -> "blank" | "show"
//   GET  /controller/live-items               -> current live item + slides
//   GET  /plugins/songs/search?text=<title>   -> [[id, title, alt], ...]
//   POST /plugins/songs/live  { id }          -> go live
//
// OpenLP has NO API to push arbitrary lyrics, so "send-song" searches OpenLP's
// own song database by title and goes live; if the song isn't there, we say so.
// See docs/superpowers/notes/openlp-api.md.

let cachedToken = null;

function base(config) {
  const host = config.ppHost || "127.0.0.1";
  const port = config.openLpPort || 4316;
  return `http://${host}:${port}/api/v2`;
}

async function ensureToken(config) {
  // Find out whether this OpenLP requires auth (cheap, also acts as a ping).
  const sysRes = await fetch(`${base(config)}/core/system`, { signal: AbortSignal.timeout(5000) });
  if (!sysRes.ok) throw new Error(`OpenLP injoignable (${sysRes.status})`);
  const sys = await sysRes.json().catch(() => ({}));
  if (!sys.login_required) return null;
  if (cachedToken) return cachedToken;

  const res = await fetch(`${base(config)}/core/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.openLpUser || "openlp",
      password: config.openLpPassword || "password",
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error("OpenLP : identifiants refusés (Réglages → Remote)");
  const data = await res.json().catch(() => ({}));
  cachedToken = data.token || null;
  return cachedToken;
}

async function api(config, method, pathAndQuery, body) {
  const token = await ensureToken(config);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = token;
  const res = await fetch(`${base(config)}${pathAndQuery}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 401) {
    cachedToken = null; // force re-login next time
    throw new Error("OpenLP : non autorisé (authentification)");
  }
  if (!res.ok) throw new Error(`OpenLP ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function sendControl(config, action) {
  if (action === "next") return api(config, "POST", "/controller/progress", { action: "next" });
  if (action === "previous") return api(config, "POST", "/controller/progress", { action: "previous" });
  if (action === "clear") return api(config, "POST", "/core/display", { display: "blank" });
  if (action === "show") return api(config, "POST", "/core/display", { display: "show" });
  throw new Error(`OpenLP : action non supportée: ${action}`);
}

// OpenLP can only display songs already in its database. Search by title, then go live.
async function sendSong(config, payload) {
  const title = (payload && payload.title ? String(payload.title) : "").trim();
  if (!title) throw new Error("Titre du chant manquant");

  const results = await api(config, "GET", `/plugins/songs/search?text=${encodeURIComponent(title)}`);
  const list = Array.isArray(results) ? results : [];
  if (list.length === 0) {
    throw new Error(`« ${title} » introuvable dans OpenLP. Ajoutez-le d'abord dans OpenLP.`);
  }
  // results are [id, title, alt]; prefer an exact (case-insensitive) title match.
  const exact = list.find((r) => String(r[1] || "").trim().toLowerCase() === title.toLowerCase());
  const chosen = exact || list[0];
  const id = chosen[0];

  await api(config, "POST", "/plugins/songs/live", { id });
  return { ok: true, matched: chosen[1] ?? title };
}

async function status(config) {
  try {
    const items = await api(config, "GET", "/controller/live-items");
    const slides = (items && items.slides) || [];
    const selected = slides.find((s) => s.selected) || null;
    return {
      current: selected ? (selected.text || selected.tag || null) : null,
      next: null,
      presentationName: items && items.title ? items.title : null,
    };
  } catch {
    return { current: null, next: null };
  }
}

async function dispatch(command, params, config) {
  switch (command) {
    case "control":
      return sendControl(config, params.action);
    case "send-song":
      return sendSong(config, params.payload);
    case "status":
      return status(config);
    default:
      throw new Error(`OpenLP : commande non supportée: ${command}`);
  }
}

module.exports = { dispatch };
