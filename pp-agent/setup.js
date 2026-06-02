/**
 * setup.js — Wizard de configuration de pp-agent.
 *
 * Demande uniquement ce qui est strictement nécessaire :
 *   1. URL de ProSendWorship
 *   2. ID de l'appareil
 *   3. Type de logiciel (propresenter | freeshow)
 *
 * ProPresenter tourne sur le même ordinateur → hôte/port auto-détectés.
 * Dossier PP auto-détecté depuis le profil Windows courant.
 * FreeShow : port et dossier Shows à confirmer manuellement.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const os = require("os");

const IS_PKG = typeof process.pkg !== "undefined";
const BASE_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const CONFIG_FILE = path.join(BASE_DIR, "pp-agent-config.json");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(label, defaultValue) {
  return new Promise((resolve) => {
    const hint = defaultValue ? ` [${defaultValue}]` : "";
    process.stdout.write(`  ${label}${hint} : `);
    rl.once("line", (line) => {
      const val = line.trim();
      resolve(val || defaultValue || "");
    });
  });
}

function detectPPDataPath() {
  const username = os.userInfo().username;
  const candidates = [
    path.join("C:", "Users", username, "Documents", "ProPresenter"),
    path.join(os.homedir(), "Documents", "ProPresenter"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function detectProtoDir() {
  const username = os.userInfo().username;
  // Common locations where PP7 proto files may exist
  const candidates = [
    // Developer / existing extraction
    path.join("C:", "Users", username, "AppData", "Local", "Temp", "pp7proto", "Proto 19beta"),
    path.join(os.homedir(), "AppData", "Local", "Temp", "pp7proto", "Proto 19beta"),
    // Inside ProPresenter app bundle (various versions)
    "C:\\Program Files\\ProPresenter\\proto",
    "C:\\Program Files (x86)\\ProPresenter\\proto",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.existsSync(path.join(c, "presentation.proto"))) return c;
  }
  return null;
}

async function testPPConnection(host, port) {
  try {
    const res = await fetch(`http://${host}:${port}/version`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const d = await res.json();
      return d.versionString || d.version || "OK";
    }
  } catch { /* ignore */ }
  return null;
}

async function main() {
  console.log("");
  console.log("  ================================================");
  console.log("    Configuration de l'agent ProPresenter");
  console.log("  ================================================");
  console.log("");
  console.log("  Vous avez besoin de 2 informations :");
  console.log("   • L'URL de votre ProSendWorship");
  console.log("   • L'ID de l'appareil (dans ProSendWorship → Paramètres → Appareils)");
  console.log("");

  // ── URL du serveur ──────────────────────────────────────────
  const serverUrl = (await ask("URL ProSendWorship", "https://prosendworship.vercel.app")).replace(/\/$/, "");

  if (!serverUrl.startsWith("http")) {
    console.error("\n  ERREUR : URL invalide (doit commencer par https://)");
    process.exit(1);
  }

  // ── ID de l'appareil ────────────────────────────────────────
  const deviceId = await ask("ID de l'appareil");

  if (!deviceId) {
    console.error("\n  ERREUR : L'ID de l'appareil est requis.");
    console.error("  Trouvez-le dans ProSendWorship → Paramètres → Appareils ProPresenter.");
    process.exit(1);
  }

  // ── Type de logiciel de présentation ────────────────────────
  console.log("");
  console.log("  Type de logiciel de présentation :");
  console.log("    propresenter  — ProPresenter 7 (défaut)");
  console.log("    freeshow      — FreeShow");
  const deviceType = (await ask("Type", "propresenter")).toLowerCase();

  if (deviceType !== "propresenter" && deviceType !== "freeshow") {
    console.error(`\n  ERREUR : Type invalide « ${deviceType} ». Choisissez propresenter ou freeshow.`);
    process.exit(1);
  }

  // ── Variables spécifiques au type ───────────────────────────
  let ppHost = "127.0.0.1";
  let ppPort = 1025;
  let ppDataPath = null;
  let protoDir = null;
  let freeShowPort = null;
  let freeShowShowsPath = null;

  if (deviceType === "freeshow") {
    // ── FreeShow ─────────────────────────────────────────────
    console.log("");
    console.log("  Configuration FreeShow...");
    const fsPortRaw = await ask("Port FreeShow", "5505");
    freeShowPort = parseInt(fsPortRaw, 10) || 5505;
    freeShowShowsPath = await ask("Dossier Shows FreeShow", path.join(os.homedir(), "Documents", "FreeShow", "Shows"));
    if (!freeShowShowsPath) {
      console.error("\n  ERREUR : Le dossier Shows FreeShow est requis.");
      process.exit(1);
    }
    if (!fs.existsSync(freeShowShowsPath)) {
      console.log(`  ⚠ Dossier Shows non trouvé : ${freeShowShowsPath} (sera créé si besoin)`);
    } else {
      console.log(`  ✓ Dossier Shows FreeShow : ${freeShowShowsPath}`);
    }
  } else {
    // ── ProPresenter ─────────────────────────────────────────
    console.log("");
    console.log("  Détection automatique de ProPresenter...");

    const ppVersion = await testPPConnection(ppHost, ppPort);

    if (ppVersion) {
      console.log(`  ✓ ProPresenter détecté (v${ppVersion})`);
    } else {
      console.log("  ⚠ ProPresenter non accessible sur le port 1025.");
      console.log("    Assurez-vous que ProPresenter est ouvert et que l'API HTTP est activée :");
      console.log("    ProPresenter → Préférences → Réseau → Activer l'API HTTP (port 1025)");
      console.log("    L'agent continuera quand même — ProPresenter peut être lancé plus tard.");
    }

    // ── Dossier de données PP ──────────────────────────────────
    ppDataPath = detectPPDataPath();
    if (fs.existsSync(ppDataPath)) {
      console.log(`  ✓ Dossier ProPresenter détecté : ${ppDataPath}`);
    } else {
      console.log(`  ⚠ Dossier ProPresenter non trouvé (sera créé si besoin)`);
    }

    // ── Dossier proto ──────────────────────────────────────────
    protoDir = detectProtoDir();
    if (protoDir) {
      console.log(`  ✓ Fichiers proto ProPresenter détectés : ${protoDir}`);
    } else {
      console.log(`  ⚠ Fichiers proto non trouvés — génération de fichiers .pro désactivée.`);
      console.log(`    (L'agent fonctionnera pour le contrôle, statut, etc.)`);
    }
  }

  // ── Enregistrement auprès du serveur ────────────────────────
  console.log("");
  console.log("  Connexion à ProSendWorship...");

  let agentToken;
  try {
    const res = await fetch(`${serverUrl}/api/pp-bridge/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, setupKey: deviceId }),
      signal: AbortSignal.timeout(20_000),
    });

    if (res.status === 401) {
      console.error("");
      console.error("  ERREUR : ID d'appareil invalide ou non autorisé.");
      console.error("  Vérifiez l'ID dans ProSendWorship → Paramètres → Appareils ProPresenter.");
      console.error("  L'ID ressemble à : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
      process.exit(1);
    }
    if (res.status === 404) {
      console.error("");
      console.error("  ERREUR : Cet appareil n'existe pas dans ProSendWorship.");
      console.error("  Créez-le dans ProSendWorship → Paramètres → Appareils ProPresenter,");
      console.error("  puis relancez install.bat.");
      process.exit(1);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`\n  ERREUR serveur (${res.status}) : ${text}`);
      process.exit(1);
    }

    const data = await res.json();
    agentToken = data.agentToken;
    console.log("  ✓ Agent enregistré avec succès");
  } catch (err) {
    if (err.name === "TimeoutError" || err.code === "UND_ERR_CONNECT_TIMEOUT") {
      console.error("\n  ERREUR : Le serveur ne répond pas.");
    } else {
      console.error(`\n  ERREUR réseau : ${err.message}`);
    }
    console.error("  Vérifiez l'URL et votre connexion Internet, puis relancez.");
    process.exit(1);
  }

  // ── Sauvegarde de la configuration ──────────────────────────
  const config = {
    serverUrl,
    deviceId,
    agentToken,
    type: deviceType,
    ppHost,
    ppPort,
    ppDataPath,
    protoDir: protoDir || null,
    ...(deviceType === "freeshow" ? { freeShowPort, freeShowShowsPath } : {}),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  console.log("  ✓ Configuration sauvegardée");

  // ── Watchdog + démarrage automatique Windows ────────────────
  const exePath = process.execPath;
  const exeDir  = path.dirname(exePath);
  const taskName = "ProSendWorship PP Agent";
  const { execSync } = require("child_process");

  // Create watchdog VBScript next to the exe
  const watchdogPath = path.join(exeDir, "_watchdog.vbs");
  // Watch for either ProPresenter or FreeShow depending on configured type
  const watchedProcessQuery = deviceType === "freeshow"
    ? `"SELECT * FROM Win32_Process WHERE Name LIKE 'FreeShow%'"`
    : `"SELECT * FROM Win32_Process WHERE Name LIKE 'ProPresenter%'"`;
  const watchdogContent = [
    `Dim shell, wmi, agentDir`,
    `Set shell = CreateObject("WScript.Shell")`,
    `agentDir = "${exeDir.replace(/\\/g, "\\\\")}"`,
    `Set wmi = GetObject("winmgmts:\\\\\\\\.\\\\root\\\\cimv2")`,
    `Do While True`,
    `  Dim ppRunning, agentRunning`,
    `  ppRunning = False : agentRunning = False`,
    `  Set ppProcs = wmi.ExecQuery(${watchedProcessQuery})`,
    `  ppRunning = (ppProcs.Count > 0)`,
    `  Set nodeProcs = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name = 'pp-agent.exe'")`,
    `  agentRunning = (nodeProcs.Count > 0)`,
    `  If ppRunning And Not agentRunning Then`,
    `    shell.CurrentDirectory = agentDir`,
    `    shell.Run Chr(34) & agentDir & "\\pp-agent.exe" & Chr(34), 0, False`,
    `  End If`,
    `  WScript.Sleep 5000`,
    `Loop`,
  ].join("\n");

  fs.writeFileSync(watchdogPath, watchdogContent, "utf8");

  try {
    execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: "ignore" });
  } catch { /* ignore */ }

  try {
    execSync(
      `schtasks /create /tn "${taskName}" /tr "wscript.exe \\"${watchdogPath}\\"" /sc ONLOGON /delay 0000:10 /rl HIGHEST /f /ru "${os.userInfo().username}"`,
      { stdio: "ignore" }
    );
    console.log("  ✓ Démarrage automatique configuré");
    const watchedApp = deviceType === "freeshow" ? "FreeShow" : "ProPresenter";
    console.log(`    → L'agent démarrera automatiquement à l'ouverture de ${watchedApp}`);
    // Start watchdog immediately
    try {
      execSync(`start "" wscript.exe "${watchdogPath}"`, { stdio: "ignore", shell: true });
    } catch { /* ignore */ }
  } catch {
    console.log("  ⚠ Démarrage automatique non configuré (droits insuffisants)");
    console.log("    Relancez en tant qu'Administrateur pour l'activer.");
  }

  console.log("");
  console.log("  ================================================");
  console.log("    Configuration terminée !  L'agent va démarrer.");
  console.log("  ================================================");
  console.log("");

  rl.close();

  // Start the agent immediately after setup
  setTimeout(() => {
    require("./agent.js");
  }, 500);
}

main().catch((err) => {
  console.error("\n  Erreur inattendue :", err.message);
  process.exit(1);
});
