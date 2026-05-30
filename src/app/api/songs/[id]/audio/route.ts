import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "audio");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string) || "Piste audio";

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/mp4", "audio/x-m4a"];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    return NextResponse.json({ error: "Format audio non supporté (mp3, wav, ogg, m4a)" }, { status: 400 });
  }

  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name) || ".mp3";
  const filename = `${id}-${Date.now()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Update song record
  const audioUrl = `/audio/${filename}`;
  const song = await prisma.song.update({
    where: { id },
    data: { audioUrl, audioLabel: label },
  });

  return NextResponse.json({ audioUrl: song.audioUrl, audioLabel: song.audioLabel });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const song = await prisma.song.update({
    where: { id },
    data: { audioUrl: null, audioLabel: null },
  });

  return NextResponse.json({ success: true, song });
}
