import { prisma } from "@/lib/db";

/**
 * Resolve the base URL for a ProPresenter device.
 * Priority: specific deviceId > default device > env vars
 */
export async function getDeviceBaseUrl(deviceId?: string): Promise<string> {
  if (deviceId) {
    const device = await prisma.pPDevice.findUnique({ where: { id: deviceId } });
    if (device) return `http://${device.host}:${device.port}`;
  }

  const defaultDevice = await prisma.pPDevice.findFirst({
    where: { isDefault: true },
  });
  if (defaultDevice) return `http://${defaultDevice.host}:${defaultDevice.port}`;

  const host = process.env.PP_API_HOST || "127.0.0.1";
  const port = process.env.PP_API_PORT || "1025";
  return `http://${host}:${port}`;
}
