import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/ccli-report?from=2026-01-01&to=2026-12-31
 *
 * Returns CCLI usage report data: each song used in the date range,
 * with CCLI metadata and usage count/dates.
 * Supports ?format=csv to download as CSV file.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format");

  const now = new Date();
  const dateFrom = from ? new Date(from) : new Date(now.getFullYear(), 0, 1);
  const dateTo = to ? new Date(to) : new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  // Get all usage logs in the date range, grouped by song
  const logs = await prisma.songUsageLog.findMany({
    where: {
      usedAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      song: {
        select: {
          id: true,
          title: true,
          author: true,
          ccliNumber: true,
          publisher: true,
          copyrightYear: true,
          artistCredits: true,
        },
      },
    },
    orderBy: { usedAt: "asc" },
  });

  // Group by song
  const songMap = new Map<
    string,
    {
      title: string;
      author: string;
      ccliNumber: string;
      publisher: string;
      copyrightYear: number | null;
      artistCredits: string;
      useCount: number;
      dates: string[];
    }
  >();

  for (const log of logs) {
    const key = log.song.id;
    if (!songMap.has(key)) {
      songMap.set(key, {
        title: log.song.title,
        author: log.song.author || "",
        ccliNumber: log.song.ccliNumber || "",
        publisher: log.song.publisher || "",
        copyrightYear: log.song.copyrightYear,
        artistCredits: log.song.artistCredits || "",
        useCount: 0,
        dates: [],
      });
    }
    const entry = songMap.get(key)!;
    entry.useCount++;
    entry.dates.push(log.usedAt.toISOString().slice(0, 10));
  }

  const report = Array.from(songMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  // CSV export
  if (format === "csv") {
    const header = "Date,Titre,Auteur,Artiste,N° CCLI,Éditeur,Année Copyright,Nombre d'utilisations";
    const rows = report.map((r) =>
      [
        r.dates.join("; "),
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.author.replace(/"/g, '""')}"`,
        `"${r.artistCredits.replace(/"/g, '""')}"`,
        r.ccliNumber,
        `"${r.publisher.replace(/"/g, '""')}"`,
        r.copyrightYear || "",
        r.useCount,
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ccli-report-${dateFrom.toISOString().slice(0, 10)}-${dateTo.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    period: {
      from: dateFrom.toISOString().slice(0, 10),
      to: dateTo.toISOString().slice(0, 10),
    },
    totalSongs: report.length,
    totalUses: report.reduce((sum, r) => sum + r.useCount, 0),
    songs: report,
  });
}
