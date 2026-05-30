import { NextRequest, NextResponse } from "next/server";
import protobuf from "protobufjs";
import { join } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";

const PP_DATA_PATH =
  process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";
const PROTO_DIR = "C:/Users/HP/AppData/Local/Temp/pp7proto/Proto 19beta";

/**
 * POST /api/propresenter/preview
 * Body: { lyrics: string, themeName?: string, slideUuid?: string }
 *
 * Returns slide preview data: text positioning, background info,
 * and slide breakdown for client-side rendering.
 */
export async function POST(request: NextRequest) {
  try {
    const { lyrics, themeName, slideUuid } = await request.json();

    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({ error: "Paroles requises" }, { status: 400 });
    }

    // Split lyrics into slides (same logic as pro-file-generator)
    const verses = lyrics
      .split(/\n\s*\n/)
      .map((v: string) => v.trim())
      .filter(Boolean);

    // Try to load theme data for accurate positioning
    let themeData: ThemeSlideData | null = null;
    if (slideUuid && themeName) {
      themeData = await loadThemeSlideData(slideUuid, themeName);
    }

    // Build slide previews
    const slides = verses.map((verse: string, i: number) => {
      const lines = verse.split("\n");
      return {
        index: i,
        label: `Slide ${i + 1}`,
        text: verse,
        lines,
        lineCount: lines.length,
      };
    });

    return NextResponse.json({
      slides,
      theme: themeData
        ? {
            name: themeName,
            textPosition: themeData.textPosition,
            backgroundImage: themeData.backgroundImage,
            textStyle: themeData.textStyle,
            slideSize: themeData.slideSize,
          }
        : null,
      totalSlides: slides.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface ThemeSlideData {
  textPosition: { x: number; y: number; width: number; height: number };
  backgroundImage: string | null;
  backgroundPosition: { x: number; y: number; width: number; height: number } | null;
  textBgColor: string | null;
  textStyle: {
    fontSize: number;
    bold: boolean;
    color: string;
    alignment: string;
  };
  slideSize: { width: number; height: number };
}

async function loadThemeSlideData(
  slideUuid: string,
  themeName: string
): Promise<ThemeSlideData | null> {
  try {
    const templateRoot = await protobuf.load([
      join(PROTO_DIR, "template.proto"),
      join(PROTO_DIR, "slide.proto"),
      join(PROTO_DIR, "graphicsData.proto"),
      join(PROTO_DIR, "action.proto"),
      join(PROTO_DIR, "applicationInfo.proto"),
      join(PROTO_DIR, "uuid.proto"),
      join(PROTO_DIR, "color.proto"),
      join(PROTO_DIR, "effects.proto"),
    ]);
    const TemplateDoc = templateRoot.lookupType("rv.data.Template.Document");

    const themesDir = join(PP_DATA_PATH, "Themes");
    let themeFile = join(themesDir, themeName, "Theme");

    if (!existsSync(themeFile)) {
      // Scan all themes
      if (!existsSync(themesDir)) return null;
      const dirs = readdirSync(themesDir);
      const found = dirs
        .map((d) => join(themesDir, d, "Theme"))
        .find((p) => existsSync(p));
      if (!found) return null;
      themeFile = found;
    }

    const buf = readFileSync(themeFile);
    const decoded = TemplateDoc.decode(buf);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = TemplateDoc.toObject(decoded, { defaults: false, bytes: String }) as any;

    if (!obj.slides) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedSlide = obj.slides.find((s: any) => s.baseSlide?.uuid?.string === slideUuid);
    if (!matchedSlide) return null;

    const elements = matchedSlide.baseSlide.elements || [];
    const size = matchedSlide.baseSlide.size || { width: 1920, height: 1080 };

    // Find text element (info:2 in theme = text element)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textEl = elements.find((el: any) => el.info === 2);
    // Find background element: any element with a media fill (info can be 1, undefined, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bgEl = elements.find((el: any) =>
      el !== textEl && (el.element?.fill?.media?.url?.local?.path || el.element?.fill?.media?.url?.absoluteString)
    );

    const textBounds = textEl?.element?.bounds || {
      origin: { x: 78, y: 228 },
      size: { width: 1764, height: 624 },
    };

    // Parse RTF for font size
    let fontSize = 100;
    let bold = true;
    if (textEl?.element?.text?.rtfData) {
      const rtfStr = Buffer.from(textEl.element.text.rtfData, "base64").toString("utf-8");
      const fsMatch = rtfStr.match(/\\fs(\d+)/);
      if (fsMatch) fontSize = Math.round(parseInt(fsMatch[1]) / 2);
      bold = /\\b[^0]/.test(rtfStr) || /\\b /.test(rtfStr) || /\\b\\/.test(rtfStr);
    }

    // Background image path — try relative path first, then absolute
    let bgImagePath: string | null = null;
    if (bgEl?.element?.fill?.media?.url) {
      const mediaUrl = bgEl.element.fill.media.url;
      const relPath = mediaUrl.local?.path;
      const absString = mediaUrl.absoluteString;

      let resolvedPath: string | null = null;

      // Try relative path from theme directory
      if (relPath) {
        const themeDirPath = join(themeFile, "..");
        const candidate = join(themeDirPath, relPath);
        if (existsSync(candidate)) resolvedPath = candidate;
      }
      // Fallback: try absoluteString directly
      if (!resolvedPath && absString && existsSync(absString)) {
        resolvedPath = absString;
      }

      if (resolvedPath) {
        const imgBuf = readFileSync(resolvedPath);
        const ext = resolvedPath.split(".").pop()?.toLowerCase() || "png";
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
        bgImagePath = `data:${mime};base64,${imgBuf.toString("base64")}`;
      }
    }

    // Background element bounds (may differ from text bounds)
    const bgBounds = bgEl?.element?.bounds;

    // Text fill color (used as text-background tint)
    const textFillColor = textEl?.element?.fill?.color;
    let textBgColor: string | null = null;
    if (textFillColor) {
      const r = Math.round((textFillColor.red || 0) * 255);
      const g = Math.round((textFillColor.green || 0) * 255);
      const b = Math.round((textFillColor.blue || 0) * 255);
      const a = textFillColor.alpha ?? 1;
      textBgColor = `rgba(${r},${g},${b},${a})`;
    }

    return {
      textPosition: {
        x: textBounds.origin?.x || 0,
        y: textBounds.origin?.y || 0,
        width: textBounds.size?.width || 1764,
        height: textBounds.size?.height || 624,
      },
      backgroundImage: bgImagePath,
      backgroundPosition: bgBounds ? {
        x: bgBounds.origin?.x || 0,
        y: bgBounds.origin?.y || 0,
        width: bgBounds.size?.width || 1920,
        height: bgBounds.size?.height || 1080,
      } : null,
      textBgColor,
      textStyle: {
        fontSize,
        bold,
        color: "#ffffff",
        alignment: "center",
      },
      slideSize: { width: size.width || 1920, height: size.height || 1080 },
    };
  } catch (err) {
    console.error("[preview] Failed to load theme data:", err);
    return null;
  }
}
