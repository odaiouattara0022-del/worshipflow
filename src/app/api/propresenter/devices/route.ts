import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/propresenter/devices
 * List all PP devices with their online status.
 */
export async function GET() {
  const devices = await prisma.pPDevice.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  // Check online status for each device in parallel
  const devicesWithStatus = await Promise.all(
    devices.map(async (device: any) => {
      let online = false;
      let version: string | null = null;
      try {
        const res = await fetch(
          `http://${device.host}:${device.port}/version`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (res.ok) {
          online = true;
          const data = await res.json();
          version = data.host_description ?? data.name ?? null;
        }
      } catch {
        // offline
      }
      return { ...device, online, version };
    })
  );

  return NextResponse.json({ devices: devicesWithStatus });
}

/**
 * POST /api/propresenter/devices
 * Add a new PP device.
 * Body: { name: string, host: string, port?: number, isDefault?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { name, host, port, isDefault, libraryPath } = await request.json();

    if (!name || !host) {
      return NextResponse.json(
        { error: "Nom et adresse IP requis" },
        { status: 400 }
      );
    }

    // If this device is set as default, unset others
    if (isDefault) {
      await prisma.pPDevice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const device = await prisma.pPDevice.create({
      data: {
        name,
        host,
        port: port || 1025,
        isDefault: isDefault ?? false,
        libraryPath: libraryPath || "",
      },
    });

    // If this is the first device, make it default
    const count = await prisma.pPDevice.count();
    if (count === 1) {
      await prisma.pPDevice.update({
        where: { id: device.id },
        data: { isDefault: true },
      });
      device.isDefault = true;
    }

    return NextResponse.json(device, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
