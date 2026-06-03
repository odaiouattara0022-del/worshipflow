"use strict";
// Auto-detection of the presentation software running on THIS PC.
//
// The most reliable "ready to receive commands" signal is the software's local
// API port being open: FreeShow REST = 5506, ProPresenter = 1025. We probe those
// first. If neither is open we fall back to checking whether the app process is
// running (the user may not have enabled the API yet) so we can still pair and
// show a helpful pending state.

const fs = require("fs");
const os = require("os");
const net = require("net");
const path = require("path");
const { execSync } = require("child_process");

const FREESHOW_PORT = 5506;
const PROPRESENTER_PORT = 1025;
const OPENLP_PORT = 4316;

function probePort(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch { /* ignore */ }
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => finish(true));
    sock.once("timeout", () => finish(false));
    sock.once("error", () => finish(false));
    sock.connect(port, host);
  });
}

function processRunning(imageName) {
  if (process.platform !== "win32") return false;
  try {
    const out = execSync(`tasklist /fi "imagename eq ${imageName}" /nh`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.toLowerCase().includes(imageName.toLowerCase());
  } catch {
    return false;
  }
}

function freeShowDetails() {
  const showsPath = path.join(os.homedir(), "Documents", "FreeShow", "Shows");
  return {
    type: "freeshow",
    freeShowPort: FREESHOW_PORT,
    freeShowShowsPath: showsPath, // reported even if not yet created; agent writes there
    showsPathExists: fs.existsSync(showsPath),
  };
}

/**
 * Returns the detected software descriptor, or null if nothing is found yet.
 * Caller should retry on null.
 */
async function detect(host = "127.0.0.1") {
  if (await probePort(host, FREESHOW_PORT)) return freeShowDetails();
  if (await probePort(host, OPENLP_PORT)) return { type: "openlp", openLpPort: OPENLP_PORT };
  if (await probePort(host, PROPRESENTER_PORT)) return { type: "propresenter" };

  // Ports closed — the app may be open without its API enabled yet.
  if (processRunning("FreeShow.exe")) return freeShowDetails();
  if (processRunning("OpenLP.exe")) return { type: "openlp", openLpPort: OPENLP_PORT };
  if (processRunning("ProPresenter.exe")) return { type: "propresenter" };

  return null;
}

module.exports = { detect, probePort, FREESHOW_PORT, PROPRESENTER_PORT, OPENLP_PORT };
