// Pure helpers for the zero-config agent pairing flow. Kept free of DB/IO so the
// announce decision logic can be unit-tested directly; the route wires these to prisma.

export type DeviceStatus = "pending" | "active" | "rejected";

export interface AnnounceInput {
  installId: string;
  hostname?: string | null;
  type?: string | null;
  detected?: { freeShowPort?: number | string | null; freeShowShowsPath?: string | null } | null;
}

const SOFTWARE_LABELS: Record<string, string> = {
  propresenter: "ProPresenter",
  freeshow: "FreeShow",
};

function normalizeType(type?: string | null): string {
  const t = (type ?? "").toLowerCase();
  return t === "freeshow" ? "freeshow" : "propresenter";
}

/** Human-friendly device name shown on the approval card, e.g. "FreeShow — PC-LOUANGE". */
export function deviceNameFor(type: string | null | undefined, hostname?: string | null): string {
  const label = SOFTWARE_LABELS[normalizeType(type)] ?? "Appareil";
  const host = (hostname ?? "").trim();
  return host ? `${label} — ${host}` : label;
}

/** Build the per-software `config` JSON string from what the agent detected (null when nothing to store). */
export function buildConfig(input: AnnounceInput): string | null {
  if (normalizeType(input.type) !== "freeshow") return null;
  const d = input.detected ?? {};
  const config: Record<string, unknown> = {};
  if (d.freeShowPort != null && d.freeShowPort !== "") config.freeShowPort = String(d.freeShowPort);
  if (d.freeShowShowsPath) config.freeShowShowsPath = String(d.freeShowShowsPath);
  return Object.keys(config).length ? JSON.stringify(config) : null;
}

/**
 * Fields for a brand-new pending device when an unknown installId announces itself.
 * The caller provides the freshly minted agentToken (kept out of this pure fn for testability).
 */
export function newPendingDevice(input: AnnounceInput, agentToken: string) {
  const type = normalizeType(input.type);
  const freeShowPort = input.detected?.freeShowPort;
  // host/port are required NOT NULL columns. The agent runs ON the presentation
  // PC, so the software is always reachable at localhost from the agent's side.
  const port =
    type === "freeshow" && freeShowPort != null && freeShowPort !== ""
      ? Number(freeShowPort)
      : 1025;
  return {
    name: deviceNameFor(input.type, input.hostname),
    type,
    config: buildConfig(input),
    installId: input.installId,
    hostname: (input.hostname ?? "").trim() || null,
    host: "127.0.0.1",
    port: Number.isFinite(port) ? port : 1025,
    libraryPath: "",
    agentToken,
    status: "pending" as const,
    agentOnline: false,
  };
}

/**
 * What to send back to an agent that announced an installId we already know.
 * The agentToken is revealed ONLY once the admin has approved the device.
 */
export function announceResponse(device: { status?: string | null; agentToken?: string | null }) {
  const status = (device.status ?? "active") as DeviceStatus;
  if (status === "active") {
    return { status, agentToken: device.agentToken ?? null };
  }
  return { status };
}
