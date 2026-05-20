import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanLibrary } from "@/lib/propresenter/scanner";
import { join } from "path";

export async function POST() {
  // Resolve the library path from AppSettings or env
  let ppDataPath = process.env.PP_DATA_PATH || "";

  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: "pp_data_path" },
    });
    if (setting?.value) {
      ppDataPath = setting.value;
    }
  } catch {
    // AppSettings may not have the key yet
  }

  if (!ppDataPath) {
    return NextResponse.json(
      {
        error:
          "Chemin ProPresenter non configuré. Définissez pp_data_path dans les paramètres.",
      },
      { status: 400 }
    );
  }

  // The Libraries dir is typically inside the PP data path
  const librariesDir = ppDataPath.toLowerCase().includes("libraries")
    ? ppDataPath
    : join(ppDataPath, "Libraries");

  const presentations = await scanLibrary(librariesDir);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const pres of presentations) {
    // Join slide texts as lyrics
    const lyrics = pres.slides.map((s) => s.text).join("\n\n---\n\n");

    if (!lyrics.trim()) {
      skipped++;
      continue;
    }

    // Normalize the file path for comparison
    const normalizedPath = pres.filePath.replace(/\\/g, "/");

    try {
      // Check if a song with this proPresenterPath already exists
      const existing = await prisma.song.findFirst({
        where: { proPresenterPath: normalizedPath },
      });

      if (existing) {
        // Update lyrics
        await prisma.song.update({
          where: { id: existing.id },
          data: {
            lyrics,
            title: pres.title,
          },
        });
        updated++;
      } else {
        // Create new song
        await prisma.song.create({
          data: {
            title: pres.title,
            lyrics,
            proPresenterPath: normalizedPath,
            tags: "import-propresenter",
            defaultKey: "Do",
          },
        });
        imported++;
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    total: presentations.length,
    imported,
    updated,
    skipped,
    message: `Scan terminé : ${imported} importés, ${updated} mis à jour, ${skipped} ignorés sur ${presentations.length} fichiers.`,
  });
}
