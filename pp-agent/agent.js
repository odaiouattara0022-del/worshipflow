/**
 * pp-agent — ProSendWorship Local Bridge Agent (zero-config)
 * Usage: pp-agent.exe  (or node agent.js)
 *
 * Zero-config pairing: the agent generates its own identity, auto-detects whether
 * ProPresenter or FreeShow is running, announces itself to ProSendWorship, and
 * waits for an admin to approve it in the app. No setup wizard, no IDs to copy.
 *
 * Server URL resolution order (the end user never touches this):
 *   1. PSW_SERVER environment variable
 *   2. serveur.txt next to the exe (one line: the URL)
 *   3. baked default → https://prosendworship.vercel.app
 */

"use strict";

const fs   = require("fs");
const os   = require("os");
const net  = require("net");
const path = require("path");
const { randomUUID } = require("crypto");
const { detect } = require("./detect");

// ── Path resolution ──────────────────────────────────────────────────────────
const IS_PKG   = typeof process.pkg !== "undefined";
const BASE_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const ID_FILE     = path.join(BASE_DIR, "pp-agent-id.json");
const CONFIG_FILE = path.join(BASE_DIR, "pp-agent-config.json");
const SERVER_FILE = path.join(BASE_DIR, "serveur.txt");
const LOCK_PORT = 49517; // single-instance guard: only one poller binds this

const DEFAULT_SERVER = "https://prosendworship.vercel.app";

process.env.PP_AGENT_BASE_DIR = BASE_DIR;

// The watchdog relaunches us hidden with --bg. A plain double-click has no --bg:
// that run pairs, installs the background autostart, then hands off to a hidden
// instance and closes its own window so nothing stays visible.
const BACKGROUND = process.argv.includes("--bg");

// ── Timing ─────────────────────────────────────────────────────────────────
const POLL_MS          = 250;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BACK         = 30_000;
const HB_EVERY         = 60;
const DETECT_RETRY_MS  = 3_000;
const PAIR_RETRY_MS    = 3_000;

let errors = 0, polls = 0;

const DRIVERS = {
  propresenter: () => require("./drivers/propresenter"),
  freeshow:     () => require("./drivers/freeshow"),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Identity & server URL ────────────────────────────────────────────────────
function loadOrCreateInstallId() {
  try {
    const { installId } = JSON.parse(fs.readFileSync(ID_FILE, "utf8"));
    if (installId) return installId;
  } catch { /* not created yet */ }
  const installId = randomUUID();
  fs.writeFileSync(ID_FILE, JSON.stringify({ installId }, null, 2), "utf8");
  return installId;
}

function resolveServerUrl() {
  const fromEnv = (process.env.PSW_SERVER || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  try {
    const fromFile = fs.readFileSync(SERVER_FILE, "utf8").trim();
    if (fromFile) return fromFile.replace(/\/$/, "");
  } catch { /* no override file */ }
  return DEFAULT_SERVER;
}

// ── Single-instance guard ────────────────────────────────────────────────────
// Bind a fixed local port. If it's taken, another agent is already running, so
// this one bows out. Prevents duplicate pollers (logon task + manual handoff).
function acquireSingleInstance() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(null));
    srv.listen(LOCK_PORT, "127.0.0.1", () => resolve(srv));
  });
}

// ── Background autostart (Windows, packaged exe only) ────────────────────────
// Writes a one-line VBS launcher that starts the agent HIDDEN (--bg), registers
// it to run at logon, and returns the launcher path. No WMI, no process polling:
// backslashes are literal in VBScript, so the path needs no escaping. Returns
// the launcher path on success, "skip" off-Windows/dev, or "failed".
function installAutostart() {
  if (process.platform !== "win32" || !IS_PKG) return "skip";
  try {
    const { execSync } = require("child_process");
    const exePath  = process.execPath;
    const exeDir   = path.dirname(exePath);
    const taskName = "ProSendWorship Agent";
    const launcherPath = path.join(exeDir, "_launch-hidden.vbs");

    // "" embeds a literal quote in VBScript; window style 0 = hidden, False = don't wait.
    const launcher = `CreateObject("WScript.Shell").Run """${exePath}"" --bg", 0, False`;
    fs.writeFileSync(launcherPath, launcher, "utf8");

    // Clean up the broken WMI watchdog shipped by an earlier build, if present.
    try { fs.unlinkSync(path.join(exeDir, "_watchdog.vbs")); } catch { /* none */ }

    try { execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: "ignore" }); } catch { /* none yet */ }
    execSync(
      `schtasks /create /tn "${taskName}" /tr "wscript.exe \\"${launcherPath}\\"" /sc ONLOGON /delay 0000:10 /rl HIGHEST /f /ru "${os.userInfo().username}"`,
      { stdio: "ignore" }
    );
    return launcherPath;
  } catch {
    return "failed";
  }
}

// Launch the hidden background agent now (returns immediately).
function startHidden(launcherPath) {
  try {
    require("child_process").execSync(`wscript.exe "${launcherPath}"`, { stdio: "ignore" });
  } catch { /* non-fatal */ }
}

// ── Detection loop ───────────────────────────────────────────────────────────
async function detectSoftware() {
  let warned = false;
  while (true) {
    const detected = await detect();
    if (detected) return detected;
    if (!warned) {
      console.log("  En attente du logiciel de présentation (ProPresenter ou FreeShow)…");
      console.log("  Ouvrez le logiciel et activez son API, puis patientez.");
      warned = true;
    }
    await sleep(DETECT_RETRY_MS);
  }
}

// ── Pairing loop ─────────────────────────────────────────────────────────────
// Announce until the admin approves (status 'active' → we receive the agentToken).
async function pair(serverUrl, installId, hostname, detected) {
  let waiting = false;
  while (true) {
    let data;
    try {
      const res = await fetch(`${serverUrl}/api/pp-bridge/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installId,
          hostname,
          type: detected.type,
          detected: {
            freeShowPort: detected.freeShowPort,
            freeShowShowsPath: detected.freeShowShowsPath,
          },
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn(`⚠  Connexion au serveur impossible: ${err.message} — nouvelle tentative…`);
      await sleep(PAIR_RETRY_MS);
      continue;
    }

    if (data.status === "active" && data.agentToken) {
      return data.agentToken;
    }
    if (data.status === "rejected") {
      console.error("\n❌  Cet appareil a été rejeté dans ProSendWorship. Arrêt.");
      process.exit(1);
    }
    if (!waiting) {
      console.log("");
      console.log("  ✓ Appareil détecté et signalé au serveur.");
      console.log("  → Ouvrez ProSendWorship et cliquez « Approuver » pour cet appareil.");
      console.log("    (En attente d'approbation…)");
      waiting = true;
    }
    await sleep(PAIR_RETRY_MS);
  }
}

// ── Agent loop ───────────────────────────────────────────────────────────────
async function main() {
  // The long-running poller (hidden --bg, or dev foreground) must be unique.
  // The setup foreground only pairs then hands off, so it doesn't take the lock.
  if (BACKGROUND) {
    const lock = await acquireSingleInstance();
    if (!lock) process.exit(0); // another agent is already running — bow out
  }

  const installId = loadOrCreateInstallId();
  const serverUrl = resolveServerUrl();
  const hostname  = os.hostname();

  if (!BACKGROUND) {
    console.log("");
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║      ProSendWorship — Agent local (Bridge v2)      ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log(`  Serveur : ${serverUrl}`);
    console.log(`  PC      : ${hostname}`);
    console.log("─────────────────────────────────────────────────────");
  }

  // Outer loop: (re-)pair whenever our token becomes invalid (e.g. admin rejects).
  while (true) {
    const detected = await detectSoftware();
    if (!BACKGROUND) console.log(`  Logiciel détecté : ${detected.type}`);

    const agentToken = await pair(serverUrl, installId, hostname, detected);

    const config = {
      serverUrl,
      agentToken,
      installId,
      hostname,
      type: detected.type,
      ppHost: "127.0.0.1",
      ppPort: 1025,
      ...(detected.type === "freeshow"
        ? { freeShowPort: detected.freeShowPort, freeShowShowsPath: detected.freeShowShowsPath }
        : {}),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");

    // Foreground (plain double-click): install background autostart, launch a
    // HIDDEN instance, then close this window so nothing stays visible.
    if (!BACKGROUND) {
      const launcher = installAutostart();
      if (typeof launcher === "string" && launcher !== "failed" && launcher !== "skip") {
        console.log("");
        console.log("  ✓ Appareil approuvé — connexion établie.");
        console.log("  L'agent passe en arrière-plan : cette fenêtre va se fermer,");
        console.log("  il continue tout seul (invisible) et redémarrera automatiquement.");
        console.log("");
        await sleep(3000);
        startHidden(launcher);
        process.exit(0); // window closes; the hidden --bg instance takes over
      }
      // Non-Windows / dev / install failed → run in this window instead.
      console.log("");
      console.log("  ✓ Appareil approuvé — connexion établie.");
      console.log("  En attente de commandes…  (laissez cette fenêtre ouverte)");
      console.log("");
    }

    const reason = await runPollLoop(config);
    if (reason === "unauthorized") {
      if (!BACKGROUND) console.log("\n⚠  Accès révoqué. Nouvelle demande d'appairage…");
      try { fs.unlinkSync(CONFIG_FILE); } catch { /* ignore */ }
      errors = 0; polls = 0;
      continue;
    }
    break;
  }
}

// Returns "unauthorized" if the token stops working, so main() can re-pair.
async function runPollLoop(config) {
  const driverFactory = DRIVERS[config.type] || DRIVERS.propresenter;
  const { dispatch } = driverFactory();

  while (true) {
    const reason = await poll(config, dispatch);
    if (reason === "unauthorized") return reason;
    await sleep(POLL_MS);
  }
}

async function poll(config, dispatch) {
  const { serverUrl, agentToken } = config;
  let data;
  try {
    const res = await fetch(`${serverUrl}/api/pp-bridge/poll`, {
      headers: { Authorization: `Bearer ${agentToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 401) return "unauthorized";
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

main().catch(e => { console.error("Erreur fatale:", e.message); process.exit(1); });
