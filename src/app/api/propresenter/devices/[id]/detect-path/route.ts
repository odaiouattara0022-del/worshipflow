import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { existsSync } from "fs";
import { join } from "path";

/**
 * POST /api/propresenter/devices/:id/detect-path
 * Try to auto-detect the ProPresenter library path for a device.
 * Tries common UNC paths and updates the device if found.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const device = await prisma.pPDevice.findUnique({ where: { id } });
  if (!device) {
    return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
  }

  const host = device.host;
  const isLocal =
    host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";

  // For local device, use the local PP_DATA_PATH
  if (isLocal) {
    const localPath =
      process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";
    const libPath = join(localPath, "Libraries", "Default");
    if (existsSync(libPath)) {
      await prisma.pPDevice.update({
        where: { id },
        data: { libraryPath: libPath },
      });
      return NextResponse.json({
        found: true,
        path: libPath,
        message: `Chemin local détecté : ${libPath}`,
      });
    }
  }

  // For remote devices, try common Windows share paths
  const name = device.name; // Computer name like DESKTOP-NO7GLVN
  const commonUsers = ["HP", "User", "Admin", "Administrateur"];

  const pathsToTry: string[] = [];

  // Try by computer name
  for (const user of commonUsers) {
    pathsToTry.push(
      `\\\\${name}\\Users\\${user}\\Documents\\ProPresenter\\Libraries\\Default`
    );
  }
  // Try by IP address
  for (const user of commonUsers) {
    pathsToTry.push(
      `\\\\${host}\\Users\\${user}\\Documents\\ProPresenter\\Libraries\\Default`
    );
  }
  // Also try direct share names
  pathsToTry.push(`\\\\${name}\\ProPresenter\\Libraries\\Default`);
  pathsToTry.push(`\\\\${host}\\ProPresenter\\Libraries\\Default`);
  pathsToTry.push(`\\\\${name}\\Documents\\ProPresenter\\Libraries\\Default`);
  pathsToTry.push(`\\\\${host}\\Documents\\ProPresenter\\Libraries\\Default`);

  for (const tryPath of pathsToTry) {
    try {
      if (existsSync(tryPath)) {
        await prisma.pPDevice.update({
          where: { id },
          data: { libraryPath: tryPath },
        });
        return NextResponse.json({
          found: true,
          path: tryPath,
          message: `Chemin réseau détecté : ${tryPath}`,
        });
      }
    } catch {
      // Access denied or path doesn't exist — continue
    }
  }

  return NextResponse.json({
    found: false,
    tried: pathsToTry.length,
    message: `Aucun chemin trouvé. Assurez-vous que le dossier ProPresenter est partagé sur ${name} (${host}).`,
  });
}
