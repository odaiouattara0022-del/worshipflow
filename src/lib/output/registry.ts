import { executeViaAgent } from "@/lib/propresenter/bridge";
import { getCapabilities } from "./capabilities";
import type { OutputType, Capabilities } from "./types";

export interface OutputDriver {
  type: OutputType;
  capabilities: Capabilities;
  sendSong(deviceId: string, payload: unknown): Promise<unknown>;
  next(deviceId: string): Promise<unknown>;
  previous(deviceId: string): Promise<unknown>;
  clear(deviceId: string, target?: string): Promise<unknown>;
  getStatus(deviceId: string): Promise<unknown>;
}

export function getDriver(type: string): OutputDriver {
  const t = (type as OutputType) ?? "propresenter";
  return {
    type: t,
    capabilities: getCapabilities(t),
    sendSong: (deviceId, payload) => executeViaAgent(deviceId, "send-song", { payload }),
    next: (deviceId) => executeViaAgent(deviceId, "control", { action: "next" }),
    previous: (deviceId) => executeViaAgent(deviceId, "control", { action: "previous" }),
    clear: (deviceId, target) => executeViaAgent(deviceId, "control", { action: "clear", target }),
    getStatus: (deviceId) => executeViaAgent(deviceId, "status", {}),
  };
}
