import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import protobuf from "protobufjs";

const PP_DATA_PATH =
  process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";
const PROTO_DIR = "C:/Users/HP/AppData/Local/Temp/pp7proto/Proto 19beta";

interface PPThemeSlide {
  id: { uuid: string; name: string; index: number };
  size: { width: number; height: number };
}

interface PPTheme {
  id: { uuid: string; name: string; index: number };
  slides: PPThemeSlide[];
}

async function getDeviceUrl(deviceId?: string | null): Promise<string> {
  if (deviceId) {
    const device = await prisma.pPDevice.findUnique({ where: { id: deviceId } });
    if (device) return `http://${device.host}:${device.port}`;
  }
  const defaultDevice = await prisma.pPDevice.findFirst({ where: { isDefault: true } });
  if (defaultDevice) return `http://${defaultDevice.host}:${defaultDevice.port}`;

  const host = process.env.PP_API_HOST || "127.0.0.1";
  const port = process.env.PP_API_PORT || "1025";
  return `http://${host}:${port}`;
}

/**
 * Fallback: read themes directly from disk (PP_DATA_PATH/Themes/).
 * Each subfolder contains a protobuf "Theme" file.
 */
async function readThemesFromDisk(): Promise<
  { name: string; index: number; slides: { uuid: string; name: string; index: number }[] }[]
> {
  const themesDir = join(PP_DATA_PATH, "Themes");
  if (!existsSync(themesDir)) return [];

  let TemplateDoc: protobuf.Type;
  try {
    const root = await protobuf.load([
      join(PROTO_DIR, "template.proto"),
      join(PROTO_DIR, "slide.proto"),
      join(PROTO_DIR, "graphicsData.proto"),
      join(PROTO_DIR, "action.proto"),
      join(PROTO_DIR, "applicationInfo.proto"),
      join(PROTO_DIR, "uuid.proto"),
      join(PROTO_DIR, "color.proto"),
      join(PROTO_DIR, "effects.proto"),
    ]);
    TemplateDoc = root.lookupType("rv.data.Template.Document");
  } catch {
    return [];
  }

  const dirs = readdirSync(themesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const results: { name: string; index: number; slides: { uuid: string; name: string; index: number }[] }[] = [];

  for (let i = 0; i < dirs.length; i++) {
    const dirName = dirs[i];
    const themeFile = join(themesDir, dirName, "Theme");
    if (!existsSync(themeFile)) continue;

    try {
      const buf = readFileSync(themeFile);
      const decoded = TemplateDoc.decode(buf);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = TemplateDoc.toObject(decoded, { defaults: false, bytes: String }) as any;

      const slides = (obj.slides || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any, si: number) => ({
          uuid: s.baseSlide?.uuid?.string || `slide-${si}`,
          name: s.baseSlide?.name || `Slide ${si + 1}`,
          index: si,
        })
      );

      results.push({ name: dirName, index: i, slides });
    } catch {
      // skip corrupt theme
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  // Try PP REST API first
  try {
    const baseUrl = await getDeviceUrl(deviceId);
    const res = await fetch(`${baseUrl}/v1/themes`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const apiThemes = (data.themes ?? []).map((t: PPTheme) => ({
        name: t.id.name,
        index: t.id.index,
        slides: (t.slides ?? []).map((s: PPThemeSlide) => ({
          uuid: s.id.uuid,
          name: s.id.name,
          index: s.id.index,
        })),
      }));

      if (apiThemes.length > 0) {
        return NextResponse.json({ themes: apiThemes, source: "api" });
      }
    }
  } catch {
    // API not available, fall through to disk
  }

  // Fallback: read from disk
  try {
    const diskThemes = await readThemesFromDisk();
    return NextResponse.json({ themes: diskThemes, source: "disk" });
  } catch {
    return NextResponse.json({ themes: [], source: "none" });
  }
}
