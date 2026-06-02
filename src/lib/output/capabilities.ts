import type { OutputType, Capabilities } from "./types";

export const CAPABILITIES: Record<OutputType, Capabilities> = {
  propresenter: { sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: true },
  freeshow:     { sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: false },
};

export function getCapabilities(type: string): Capabilities {
  return CAPABILITIES[type as OutputType] ?? CAPABILITIES.propresenter;
}
