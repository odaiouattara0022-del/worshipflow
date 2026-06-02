/**
 * bridge.ts — Vercel-side helper for the ProPresenter Local Agent bridge.
 *
 * Instead of calling ProPresenter's HTTP API directly (impossible from Vercel),
 * we write a command row to Supabase and wait for the local Windows agent to
 * pick it up, execute it, and write back the result.
 */

import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export type BridgeCommand =
  | "status"
  | "control"
  | "themes"
  | "libraries"
  | "playlists"
  | "sync-library"
  | "write-pro"
  | "send-song"
  | "send-service"
  | "detect-path"
  | "scan-network"
  | "scan-library";

export class BridgeError extends Error {
  constructor(
    message: string,
    public readonly code: "OFFLINE" | "TIMEOUT" | "AGENT_ERROR" = "AGENT_ERROR"
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

const POLL_INTERVAL_MS = 400;
const DEFAULT_TIMEOUT_MS = 15_000;
const EXPIRY_BUFFER_MS = 30_000;

/**
 * Sends a command to the local agent and waits for the result.
 * Throws BridgeError on timeout, offline agent, or agent-reported error.
 */
export async function executeViaAgent(
  deviceId: string,
  command: BridgeCommand,
  params: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  // Verify agent is online before enqueuing
  const device = await prisma.ppDevice.findFirst({ where: { id: deviceId } });
  if (!device) throw new BridgeError("Device not found", "OFFLINE");

  const agentLastSeen = device.agentLastSeen
    ? new Date(device.agentLastSeen).getTime()
    : 0;
  const isOnline = device.agentOnline && Date.now() - agentLastSeen < 20_000;
  if (!isOnline) {
    throw new BridgeError(
      "L'agent ProPresenter n'est pas connecté. Lancez pp-agent.exe sur l'ordinateur ProPresenter.",
      "OFFLINE"
    );
  }

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + timeoutMs + EXPIRY_BUFFER_MS);

  await prisma.ppCommand.create({
    data: {
      id,
      deviceId,
      command,
      params: JSON.stringify(params),
      status: "PENDING",
      expiresAt: expiresAt.toISOString(),
    },
  });

  // Poll for result
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const row = await prisma.ppCommand.findFirst({ where: { id } });
    if (!row) break;

    if (row.status === "DONE") {
      return row.result ? JSON.parse(row.result) : null;
    }
    if (row.status === "ERROR") {
      throw new BridgeError(row.error ?? "Agent error", "AGENT_ERROR");
    }
  }

  // Mark as expired
  await prisma.ppCommand.update({
    where: { id },
    data: { status: "EXPIRED", updatedAt: new Date().toISOString() },
  }).catch(() => {});

  throw new BridgeError(
    "L'agent n'a pas répondu dans les délais. Vérifiez que pp-agent.exe tourne.",
    "TIMEOUT"
  );
}

/** Returns a JSON-serializable error response for bridge failures. */
export function bridgeErrorResponse(err: unknown): Response {
  if (err instanceof BridgeError) {
    const status = err.code === "OFFLINE" ? 503 : err.code === "TIMEOUT" ? 504 : 502;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  const msg = err instanceof Error ? err.message : "Erreur inconnue";
  return Response.json({ error: msg }, { status: 500 });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
