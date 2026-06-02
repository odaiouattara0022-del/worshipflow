import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * GET /api/propresenter/scan?deviceId=xxx
 * Ask the local agent to scan the network for ProPresenter instances.
 */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  const device = deviceId
    ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
    : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

  if (!device) {
    return NextResponse.json({
      devices: [],
      error: "Aucun appareil configuré. Ajoutez d'abord un appareil dans Paramètres → Appareils ProPresenter.",
    });
  }

  try {
    const result = await executeViaAgent((device as any).id, "scan-network", {}, 30_000);
    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}

/**
 * POST /api/propresenter/scan?deviceId=xxx
 * Ask the local agent to scan the PP library, then import songs into DB.
 */
export async function POST(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  const device = deviceId
    ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
    : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

  if (!device) {
    return NextResponse.json(
      { error: "Aucun appareil configuré. Ajoutez d'abord un appareil dans Paramètres → Appareils ProPresenter." },
      { status: 404 }
    );
  }

  const libraryPath = (device as any).libraryPath || null;

  let scanResult: any;
  try {
    scanResult = await executeViaAgent(
      (device as any).id,
      "scan-library",
      { libraryPath },
      60_000
    ) as any;
  } catch (err) {
    return bridgeErrorResponse(err);
  }

  const presentations: Array<{ title: string; filePath: string; slides: Array<{ text: string }> }> =
    scanResult?.presentations ?? [];

  let imported = 0, updated = 0, skipped = 0;

  for (const pres of presentations) {
    const lyrics = pres.slides.map((s) => s.text).join("\n\n---\n\n");
    if (!lyrics.trim()) { skipped++; continue; }

    const normalizedPath = pres.filePath.replace(/\\/g, "/");

    try {
      const existing = await prisma.song.findFirst({ where: { proPresenterPath: normalizedPath } });
      if (existing) {
        await prisma.song.update({ where: { id: (existing as any).id }, data: { lyrics, title: pres.title } });
        updated++;
      } else {
        await prisma.song.create({
          data: { title: pres.title, lyrics, proPresenterPath: normalizedPath, tags: "import-propresenter", defaultKey: "Do" },
        });
        imported++;
      }
    } catch { skipped++; }
  }

  return NextResponse.json({
    total: presentations.length, imported, updated, skipped,
    message: `Scan terminé : ${imported} importés, ${updated} mis à jour, ${skipped} ignorés sur ${presentations.length} fichiers.`,
  });
}
