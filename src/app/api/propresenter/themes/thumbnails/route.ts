import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import protobuf from "protobufjs";
import sharp from "sharp";

const PP_DATA_PATH =
  process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";
const PROTO_DIR = "C:/Users/HP/AppData/Local/Temp/pp7proto/Proto 19beta";

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;

/**
 * GET /api/propresenter/themes/thumbnails?themeName=Chant
 *
 * Returns thumbnails for each slide in a theme.
 * Each thumbnail is a small 160×90 image showing the slide's background
 * with the slide name overlaid.
 */
export async function GET(request: NextRequest) {
  const themeName = request.nextUrl.searchParams.get("themeName");
  if (!themeName) {
    return NextResponse.json({ error: "themeName required" }, { status: 400 });
  }

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
    const TemplateDoc = root.lookupType("rv.data.Template.Document");

    const themesDir = join(PP_DATA_PATH, "Themes");
    const themeFile = join(themesDir, themeName, "Theme");

    if (!existsSync(themeFile)) {
      return NextResponse.json({ thumbnails: [] });
    }

    const buf = readFileSync(themeFile);
    const decoded = TemplateDoc.decode(buf);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = TemplateDoc.toObject(decoded, { defaults: false, bytes: String }) as any;

    if (!obj.slides) {
      return NextResponse.json({ thumbnails: [] });
    }

    const themeDirPath = join(themesDir, themeName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thumbnails = await Promise.all(obj.slides.map(async (slide: any, index: number) => {
      const uuid = slide.baseSlide?.uuid?.string || `slide-${index}`;
      const name = slide.baseSlide?.name || `Slide ${index + 1}`;
      const elements = slide.baseSlide?.elements || [];
      const size = slide.baseSlide?.size || { width: 1920, height: 1080 };

      // Find text element
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textEl = elements.find((el: any) => el.info === 2);

      // Find background element (any element with media fill, excluding text)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bgEl = elements.find((el: any) =>
        el !== textEl &&
        (el.element?.fill?.media?.url?.local?.path || el.element?.fill?.media?.url?.absoluteString)
      );

      let thumbnail: string | null = null;

      if (bgEl?.element?.fill?.media?.url) {
        const mediaUrl = bgEl.element.fill.media.url;
        const relPath = mediaUrl.local?.path;
        const absString = mediaUrl.absoluteString;

        let resolvedPath: string | null = null;
        if (relPath) {
          const candidate = join(themeDirPath, relPath);
          if (existsSync(candidate)) resolvedPath = candidate;
        }
        if (!resolvedPath && absString && existsSync(absString)) {
          resolvedPath = absString;
        }

        if (resolvedPath) {
          try {
            // Get bg element bounds for compositing
            const bgBounds = bgEl.element?.bounds;
            const slideW = size.width || 1920;
            const slideH = size.height || 1080;

            const imgBuf = readFileSync(resolvedPath);

            if (bgBounds) {
              // Composite bg image at its protobuf position on a black canvas
              const bx = Math.round((bgBounds.origin?.x || 0) / slideW * THUMB_WIDTH);
              const by = Math.round((bgBounds.origin?.y || 0) / slideH * THUMB_HEIGHT);
              const bw = Math.round((bgBounds.size?.width || slideW) / slideW * THUMB_WIDTH);
              const bh = Math.round((bgBounds.size?.height || slideH) / slideH * THUMB_HEIGHT);

              const resizedBg = await sharp(imgBuf)
                .resize(Math.max(1, bw), Math.max(1, bh), { fit: "fill" })
                .png()
                .toBuffer();

              const thumbBuf = await sharp({
                create: {
                  width: THUMB_WIDTH,
                  height: THUMB_HEIGHT,
                  channels: 4,
                  background: { r: 10, g: 10, b: 30, alpha: 1 },
                },
              })
                .composite([{ input: resizedBg, left: bx, top: by }])
                .png({ quality: 60 })
                .toBuffer();

              thumbnail = `data:image/png;base64,${thumbBuf.toString("base64")}`;
            } else {
              // Full-slide background
              const thumbBuf = await sharp(imgBuf)
                .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
                .png({ quality: 60 })
                .toBuffer();

              thumbnail = `data:image/png;base64,${thumbBuf.toString("base64")}`;
            }
          } catch {
            // Image processing failed, leave null
          }
        }
      }

      // If no bg image, create a dark gradient placeholder
      if (!thumbnail) {
        try {
          const thumbBuf = await sharp({
            create: {
              width: THUMB_WIDTH,
              height: THUMB_HEIGHT,
              channels: 4,
              background: { r: 26, g: 16, b: 64, alpha: 1 },
            },
          })
            .png()
            .toBuffer();
          thumbnail = `data:image/png;base64,${thumbBuf.toString("base64")}`;
        } catch {
          // leave null
        }
      }

      return { uuid, name, index, thumbnail };
    }));

    return NextResponse.json({ thumbnails });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
