import type { OutputType, Capabilities } from "./types";

export const CAPABILITIES: Record<OutputType, Capabilities> = {
  propresenter: { sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: true },
  freeshow:     { sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: false },
  // OpenLP can't receive arbitrary lyrics via its API — sendSong searches OpenLP's
  // own song database by title and goes live. No .pro sync, no theme picker here.
  openlp:       { sendSong: true, sendService: false, liveControl: true, status: true, syncLibrary: false, themes: false },
};

export function getCapabilities(type: string): Capabilities {
  return CAPABILITIES[type as OutputType] ?? CAPABILITIES.propresenter;
}
