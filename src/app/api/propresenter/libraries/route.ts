import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";

/**
 * GET /api/propresenter/libraries?deviceId=xxx
 * Lists available PP library folders for a given device.
 * Returns the folder names inside the Libraries/ directory.
 */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  let basePath: string;

  if (deviceId) {
    const device = await prisma.pPDevice.findUnique({ where: { id: deviceId } });
    if (!device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    if (device.libraryPath) {
      // libraryPath is like "C:\...\Libraries\Default" — go up one level to get Libraries/
      basePath = dirname(device.libraryPath);
    } else {
      // No library path configured — try common locations
      const host = device.host;
      const isLocal = host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";
      if (isLocal) {
        const ppData = process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";
        basePath = join(ppData, "Libraries");
      } else {
        return NextResponse.json({
          libraries: [],
          message: "Chemin bibliothèque non configuré pour cet appareil",
        });
      }
    }
  } else {
    // No device specified — use local PP
    const ppData = process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";
    basePath = join(ppData, "Libraries");
  }

  try {
    if (!existsSync(basePath)) {
      return NextResponse.json({
        libraries: [],
        message: `Dossier introuvable : ${basePath}`,
      });
    }

    const entries = readdirSync(basePath);
    const libraries: Array<{ name: string; path: string; songCount: number }> = [];

    for (const entry of entries) {
      const fullPath = join(basePath, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          // Count .pro files in this library
          let songCount = 0;
          try {
            const files = readdirSync(fullPath);
            songCount = files.filter((f) => f.endsWith(".pro")).length;
          } catch {
            // Can't read contents
          }
          libraries.push({
            name: entry,
            path: fullPath,
            songCount,
          });
        }
      } catch {
        // Skip inaccessible entries
      }
    }

    return NextResponse.json({ libraries });
  } catch (err) {
    return NextResponse.json({
      libraries: [],
      message: `Erreur d'accès : ${err instanceof Error ? err.message : "inconnue"}`,
    });
  }
}
