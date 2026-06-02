/**
 * sync.ts — Auto-sync a single song to the PP "ProSendWorship" library.
 * Called fire-and-forget after every song create/update.
 * Silently skips if no device is online.
 */

import { prisma } from "@/lib/db";
import { executeViaAgent } from "@/lib/propresenter/bridge";

export async function autoSyncSong(song: { id: string; title: string; lyrics?: string | null; author?: string | null; publisher?: string | null; ccliNumber?: string | null }) {
  if (!song.lyrics?.trim()) return;

  const device = await prisma.ppDevice.findFirst({
    where: { isDefault: true },
  });
  if (!device || !(device as any).agentOnline) return;

  await executeViaAgent(
    (device as any).id,
    "sync-library",
    {
      songs: [{
        id: song.id,
        title: song.title,
        lyrics: song.lyrics,
        author: (song as any).author ?? null,
        publisher: (song as any).publisher ?? null,
        ccliNumber: (song as any).ccliNumber ?? null,
      }],
      theme: null,
      slideUuid: null,
      libraryPath: null,
    },
    20_000
  );
}
