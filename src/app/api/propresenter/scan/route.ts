import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanLibrary } from "@/lib/propresenter/scanner";
import { join } from "path";
import { networkInterfaces } from "os";

/**
 * GET /api/propresenter/scan
 * Scan the local network for ProPresenter instances.
 * Returns a list of found devices with their name, IP, port.
 */
export async function GET() {
  // Get local network prefix from this machine's IP
  const nets = networkInterfaces();
  const localIPs: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        localIPs.push(net.address);
      }
    }
  }

  if (localIPs.length === 0) {
    return NextResponse.json({ devices: [], error: "Pas de réseau détecté" });
  }

  // Scan common ports on the local subnet
  const found: Array<{ name: string; host: string; port: number; description: string }> = [];
  const portsToScan = [12345, 1025, 50001];

  for (const localIP of localIPs) {
    const parts = localIP.split(".");
    const prefix = parts.slice(0, 3).join(".");

    const promises: Promise<void>[] = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${prefix}.${i}`;
      for (const port of portsToScan) {
        promises.push(
          fetch(`http://${ip}:${port}/version`, {
            signal: AbortSignal.timeout(1500),
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                // Only add if it looks like ProPresenter
                if (data.host_description?.includes("ProPresenter") || data.api_version) {
                  found.push({
                    name: data.name || ip,
                    host: ip,
                    port,
                    description: data.host_description || "ProPresenter",
                  });
                }
              }
            })
            .catch(() => {
              // Not responding — skip
            })
        );
      }
    }

    await Promise.all(promises);
  }

  return NextResponse.json({ devices: found });
}

/**
 * POST /api/propresenter/scan
 * Scan the local PP library and import songs.
 */
export async function POST() {
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

  const librariesDir = ppDataPath.toLowerCase().includes("libraries")
    ? ppDataPath
    : join(ppDataPath, "Libraries");

  const presentations = await scanLibrary(librariesDir);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const pres of presentations) {
    const lyrics = pres.slides.map((s) => s.text).join("\n\n---\n\n");

    if (!lyrics.trim()) {
      skipped++;
      continue;
    }

    const normalizedPath = pres.filePath.replace(/\\/g, "/");

    try {
      const existing = await prisma.song.findFirst({
        where: { proPresenterPath: normalizedPath },
      });

      if (existing) {
        await prisma.song.update({
          where: { id: existing.id },
          data: { lyrics, title: pres.title },
        });
        updated++;
      } else {
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
