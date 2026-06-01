import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Export songs as JSON or plain text.
 * ?format=json (default) | text
 */
export async function GET(request: NextRequest) {
  const format = new URL(request.url).searchParams.get("format") || "json";

  const songs = await prisma.song.findMany({
    orderBy: { title: "asc" },
    select: {
      title: true,
      author: true,
      lyrics: true,
      defaultKey: true,
      tempo: true,
      tags: true,
      ccliNumber: true,
    },
  });

  if (format === "text") {
    const text = songs
      .map((s: any) => {
        const header = [s.title, s.author || ""].filter(Boolean).join("\n");
        return `${header}\n${s.lyrics}`;
      })
      .join("\n\n---\n\n");

    return new Response(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="prosendworship-chants-${new Date().toISOString().slice(0, 10)}.txt"`,
      },
    });
  }

  // JSON export
  return new Response(JSON.stringify(songs, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="prosendworship-chants-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
