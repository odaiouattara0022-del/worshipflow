import { prisma } from "@/lib/db";

export interface PlaylistItem {
  type: "song" | "media" | "header";
  title: string;
  proPresenterPath?: string | null;
  duration: number;
  notes?: string | null;
}

export interface PlaylistManifest {
  name: string;
  date: string;
  items: PlaylistItem[];
}

/**
 * Build a playlist manifest from a WorshipFlow service.
 * Items with a linked song use the song's proPresenterPath.
 * Other items become headers or media placeholders.
 */
export async function buildPlaylistManifest(
  serviceId: string
): Promise<PlaylistManifest> {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { song: true },
      },
    },
  });

  const items: PlaylistItem[] = service.items.map((item) => {
    if (item.song) {
      return {
        type: "song" as const,
        title: item.song.title,
        proPresenterPath: item.song.proPresenterPath,
        duration: item.duration,
        notes: item.notes,
      };
    }
    return {
      type: item.type === "VIDEO" ? ("media" as const) : ("header" as const),
      title: item.title,
      duration: item.duration,
      notes: item.notes,
    };
  });

  return {
    name: `WorshipFlow — ${service.title}`,
    date: service.date.toISOString().slice(0, 10),
    items,
  };
}
