import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PUT /api/propresenter/devices/:id
 * Update a device.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { name, host, port, isDefault, libraryPath } = await request.json();

    // If setting as default, unset others first
    if (isDefault) {
      await prisma.pPDevice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const device = await prisma.pPDevice.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(host !== undefined && { host }),
        ...(port !== undefined && { port }),
        ...(isDefault !== undefined && { isDefault }),
        ...(libraryPath !== undefined && { libraryPath }),
      },
    });

    return NextResponse.json(device);
  } catch {
    return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
  }
}

/**
 * DELETE /api/propresenter/devices/:id
 * Remove a device.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.pPDevice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
  }
}
