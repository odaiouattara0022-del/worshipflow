import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const tag = searchParams.get("tag") || "";
  const key = searchParams.get("key") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { author: { contains: search } },
      { lyrics: { contains: search } },
    ];
  }
  if (tag) {
    where.tags = { contains: tag };
  }
  if (key) {
    where.defaultKey = key;
  }

  const songs = await prisma.song.findMany({
    where,
    include: { arrangements: true, _count: { select: { serviceItems: true } } },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(songs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    title, author, lyrics, defaultKey, tempo, tags,
    ccliNumber, publisher, copyrightYear, artistCredits, album, copyrightDisplay,
    proPresenterPath,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
  }

  const song = await prisma.song.create({
    data: {
      title,
      author: author || null,
      lyrics: lyrics || "",
      defaultKey: defaultKey || "Do",
      tempo: tempo ? parseInt(tempo) : null,
      tags: tags || "",
      ccliNumber: ccliNumber || null,
      publisher: publisher || null,
      copyrightYear: copyrightYear ? parseInt(copyrightYear) : null,
      artistCredits: artistCredits || null,
      album: album || null,
      copyrightDisplay: copyrightDisplay !== undefined ? copyrightDisplay : true,
      proPresenterPath: proPresenterPath || null,
    },
    include: { arrangements: true },
  });

  return NextResponse.json(song, { status: 201 });
}
