/**
 * pp-agent — ProPresenter Local Bridge Agent
 * Usage: pp-agent.exe  (or node agent.js)
 *
 * First run: automatically runs setup if no config file found.
 * Subsequent runs: polls ProSendWorship for commands.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── Path resolution ──────────────────────────────────────────────────────────
// When packaged with pkg, __dirname points to the snapshot inside the exe.
// The config file must live NEXT TO the exe, not inside it.
const IS_PKG  = typeof process.pkg !== "undefined";
const BASE_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const CONFIG_FILE = path.join(BASE_DIR, "pp-agent-config.json");

// Expose BASE_DIR so handlers.js can use it for proto resolution
process.env.PP_AGENT_BASE_DIR = BASE_DIR;

// ── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(CONFIG_FILE)) {
    // First run: launch setup wizard
    console.log("");
    console.log("  Première utilisation détectée.");
    console.log("  Lancement du assistant de configuration...");
    console.log("");
    await runSetup();
    return;
  }

  await runAgent();
}

// ── Setup ────────────────────────────────────────────────────────────────────
async function runSetup() {
  // setup.js is bundled in the snapshot at __dirname/setup.js
  require("./setup.js");
}

// ── Agent loop ───────────────────────────────────────────────────────────────
const POLL_MS  = 500;
const MAX_BACK = 30_000;
const HB_EVERY = 60;

let errors = 0, polls = 0;

async function runAgent() {
  const { dispatch } = require("./handlers");
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));

  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║      ProSendWorship PP Agent  —  Bridge v1.0        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Serveur : ${config.serverUrl}`);
  console.log(`  Appareil: ${config.deviceId}`);
  console.log(`  PP API  : http://${config.ppHost}:${config.ppPort}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("  En attente de commandes...  (Ctrl+C pour quitter)");
  console.log("");

  while (true) {
    await poll(config, dispatch);
    await sleep(POLL_MS);
  }
}

async function poll(config, dispatch) {
  const { serverUrl, agentToken } = config;
  let data;
  try {
    const res = await fetch(`${serverUrl}/api/pp-bridge/poll`, {
      headers: { Authorization: `Bearer ${agentToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) {
      console.error("\n❌  Token invalide. Supprimez pp-agent-config.json et relancez l'agent.");
      process.exit(1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    errors = 0;
  } catch (err) {
    errors++;
    const back = Math.min(POLL_MS * errors, MAX_BACK);
    if (errors <= 3 || errors % 10 === 0)
      console.warn(`⚠  Réseau (${errors}): ${err.message} — retry ${back}ms`);
    await sleep(back);
    return;
  }

  polls++;
  if (polls % HB_EVERY === 0)
    console.log(`✓  Actif — ${new Date().toLocaleTimeString()}`);

  if (!data.command) return;
  const cmd = data.command;
  console.log(`→  ${cmd.command}  [${cmd.id.slice(0, 8)}]`);

  await ack(config, cmd.id);

  let result = null, error = null;
  try {
    result = await dispatch(cmd.command, JSON.parse(cmd.params || "{}"), config);
    console.log(`✓  ${cmd.command} OK`);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error(`✗  ${cmd.command}: ${error}`);
  }

  await postResult(config, cmd.id, result, error);
}

async function ack(config, id) {
  try {
    await fetch(`${config.serverUrl}/api/pp-bridge/ack`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.agentToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: id }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch { /* non-fatal */ }
}

async function postResult(config, id, result, error) {
  try {
    await fetch(`${config.serverUrl}/api/pp-bridge/result`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.agentToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: id, result, error: error ?? undefined }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error(`⚠  Résultat non envoyé: ${e.message}`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error("Erreur fatale:", e.message); process.exit(1); });
