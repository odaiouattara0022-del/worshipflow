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
const path = require("path");
const { randomUUID } = require("crypto");
const { detect } = require("./detect");

// ── Path resolution ──────────────────────────────────────────────────────────
const IS_PKG   = typeof process.pkg !== "undefined";
const BASE_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const ID_FILE     = path.join(BASE_DIR, "pp-agent-id.json");
const CONFIG_FILE = path.join(BASE_DIR, "pp-agent-config.json");
const SERVER_FILE = path.join(BASE_DIR, "serveur.txt");
const AUTOSTART_MARKER = path.join(BASE_DIR, ".autostart-installed");

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

// ── Background autostart (Windows, packaged exe only) ────────────────────────
// Installs a hidden "watchdog" that relaunches the agent (hidden, with --bg)
// whenever FreeShow/ProPresenter is running and the agent isn't. Registered to
// run at logon, and started immediately. Done once (marker file).
function installAutostart() {
  if (process.platform !== "win32" || !IS_PKG) return "skip";
  try {
    const { execSync } = require("child_process");
    const exePath  = process.execPath;
    const exeDir   = path.dirname(exePath);
    const taskName = "ProSendWorship Agent";
    const watchdogPath = path.join(exeDir, "_watchdog.vbs");

    const watchedProcessQuery =
      `"SELECT * FROM Win32_Process WHERE Name LIKE 'FreeShow%' OR Name LIKE 'ProPresenter%'"`;
    const watchdogContent = [
      `Dim shell, wmi, agentDir`,
      `Set shell = CreateObject("WScript.Shell")`,
      `agentDir = "${exeDir.replace(/\\/g, "\\\\")}"`,
      `Set wmi = GetObject("winmgmts:\\\\\\\\.\\\\root\\\\cimv2")`,
      `Do While True`,
      `  Dim appRunning, agentRunning`,
      `  appRunning = False : agentRunning = False`,
      `  Set appProcs = wmi.ExecQuery(${watchedProcessQuery})`,
      `  appRunning = (appProcs.Count > 0)`,
      `  Set agentProcs = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name = 'pp-agent.exe'")`,
      `  agentRunning = (agentProcs.Count > 0)`,
      `  If appRunning And Not agentRunning Then`,
      `    shell.CurrentDirectory = agentDir`,
      `    shell.Run Chr(34) & agentDir & "\\pp-agent.exe" & Chr(34) & " --bg", 0, False`,
      `  End If`,
      `  WScript.Sleep 5000`,
      `Loop`,
    ].join("\n");
    fs.writeFileSync(watchdogPath, watchdogContent, "utf8");

    try { execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: "ignore" }); } catch { /* none yet */ }
    execSync(
      `schtasks /create /tn "${taskName}" /tr "wscript.exe \\"${watchdogPath}\\"" /sc ONLOGON /delay 0000:10 /rl HIGHEST /f /ru "${os.userInfo().username}"`,
      { stdio: "ignore" }
    );

    // Start the watchdog now (hidden) only once, so repeated double-clicks don't
    // stack watchdog processes. It relaunches us hidden after this window closes.
    if (!fs.existsSync(AUTOSTART_MARKER)) {
      execSync(`start "" wscript.exe "${watchdogPath}"`, { stdio: "ignore", shell: true });
      fs.writeFileSync(AUTOSTART_MARKER, new Date().toISOString(), "utf8");
    }
    return "installed";
  } catch {
    return "failed";
  }
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
  const installId = loadOrCreateInstallId();
  const serverUrl = resolveServerUrl();
  const hostname  = os.hostname();

  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║      ProSendWorship — Agent local (Bridge v2)      ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Serveur : ${serverUrl}`);
  console.log(`  PC      : ${hostname}`);
  console.log("─────────────────────────────────────────────────────");

  // Outer loop: (re-)pair whenever our token becomes invalid (e.g. admin rejects).
  while (true) {
    const detected = await detectSoftware();
    console.log(`  Logiciel détecté : ${detected.type}`);

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

    // Foreground (plain double-click): install background autostart, then hand
    // off to a hidden instance and close this window so nothing stays visible.
    if (!BACKGROUND) {
      const res = installAutostart();
      if (res === "installed") {
        console.log("");
        console.log("  ✓ Appareil approuvé — connexion établie.");
        console.log("  L'agent passe en arrière-plan : cette fenêtre va se fermer,");
        console.log("  l'agent continue tout seul (invisible) et redémarrera automatiquement.");
        console.log("");
        await sleep(3000);
        process.exit(0); // window closes; watchdog relaunches us hidden with --bg
      }
      // Non-Windows / dev / install failed → just run in this window.
      console.log("");
      console.log("  ✓ Appareil approuvé — connexion établie.");
      console.log("  En attente de commandes…  (laissez cette fenêtre ouverte)");
      console.log("");
    } else {
      console.log("  ✓ Connecté (arrière-plan). En attente de commandes…");
    }

    const reason = await runPollLoop(config);
    if (reason === "unauthorized") {
      console.log("\n⚠  Accès révoqué. Nouvelle demande d'appairage…");
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
