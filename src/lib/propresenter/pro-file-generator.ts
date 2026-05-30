/**
 * Generate ProPresenter 7 .pro files from song lyrics.
 *
 * When a theme slide UUID is provided, reads the existing PP-created file
 * as a template and clones its exact element structure (background image position,
 * text zone, etc.), only replacing the lyrics text.
 *
 * Each blank line in the lyrics creates a new slide (cue).
 */
import protobuf from "protobufjs";
import { randomUUID } from "crypto";
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "fs";
import { join } from "path";

const PP_DATA_PATH =
  process.env.PP_DATA_PATH || "C:\\Users\\HP\\Documents\\ProPresenter";

function resolveLibDir(customLibPath?: string): string {
  if (customLibPath && customLibPath.trim().length > 0) {
    if (existsSync(customLibPath)) return customLibPath;
    const withLib = join(customLibPath, "Libraries", "Default");
    if (existsSync(withLib)) return withLib;
    mkdirSync(customLibPath, { recursive: true });
    return customLibPath;
  }
  return join(PP_DATA_PATH, "Libraries", "Default");
}

const PROTO_DIR = "C:/Users/HP/AppData/Local/Temp/pp7proto/Proto 19beta";
const PP_MEDIA_ASSETS = join(PP_DATA_PATH, "Media", "Assets");

function splitVerses(lyrics: string): string[] {
  return lyrics
    .split(/\n\s*\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function makeUUID(uuidStr?: string) {
  return { string: uuidStr || randomUUID() };
}

function escapeRTF(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (char === "\\") out += "\\\\";
    else if (char === "{") out += "\\{";
    else if (char === "}") out += "\\}";
    else if (code > 127) out += `\\u${code}?`;
    else out += char;
  }
  return out;
}

/**
 * Build RTF for lyrics, using the header format from a template RTF string.
 * This preserves the exact font, color, and formatting from the theme.
 * Returns a base64 string (matching protobuf bytes field convention).
 */
function buildRTFFromTemplate(text: string, templateRTFBase64: string): string {
  // Decode the template RTF
  const templateBuf = Buffer.from(templateRTFBase64, "base64");
  const templateStr = templateBuf.toString("utf-8");

  // Extract everything up to and including the first \cb# (the header + paragraph format)
  // Then strip the old text content and replace with new lyrics
  const cbMatch = templateStr.match(/([\s\S]*?\\cb\d)\s*/);
  if (!cbMatch) {
    // Fallback: use our own RTF format
    return buildDefaultRTF(text).toString("base64");
  }

  const header = cbMatch[1];

  // Extract the full paragraph format block (\pard...\cb#) for subsequent paragraphs
  const parFmtMatch = templateStr.match(/(\\pard[\s\S]*?\\cb\d)\s*/);
  const parFmt = parFmtMatch ? parFmtMatch[1] + " " : "";

  const lines = text.split("\n");
  let body = "";
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      body += "\\par\n" + parFmt;
    }
    body += escapeRTF(lines[i]);
  }

  const rtfStr = header + " " + body + "}";
  console.log("[pro-gen] RTF template format:", header.includes("\\b\\") ? "bold" : "not-bold",
    header.match(/\\fs(\d+)/)?.[1] ? `fs${header.match(/\\fs(\d+)/)?.[1]}` : "no-fs",
    header.match(/\\sl(\d+)/)?.[1] ? `sl${header.match(/\\sl(\d+)/)?.[1]}` : "no-sl"
  );
  return Buffer.from(rtfStr, "utf-8").toString("base64");
}

/** Default RTF format when no template is available. */
function buildDefaultRTF(text: string): Buffer {
  const lines = text.split("\n");
  const parFmt =
    "\\pard\\li0\\fi0\\ri0\\qc\\sb0\\sa0\\sl192\\slmult1\\slleading0" +
    "\\f0\\b\\i0\\ul0\\strike0\\fs200\\expnd0\\expndtw0" +
    "\\CocoaLigature1\\cf1\\strokewidth0\\strokec1\\nosupersub\\ulc0\\highlight2\\cb2 ";

  let body = "";
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) body += "\\par\n" + parFmt;
    body += escapeRTF(lines[i]);
  }

  return Buffer.from(
    "{\\rtf0\\ansi\\ansicpg1252" +
      "{\\fonttbl\\f0\\fnil ArialMT;}" +
      "{\\colortbl;\\red255\\green255\\blue255;\\red255\\green255\\blue255;}" +
      "{\\*\\expandedcolortbl;\\csgenericrgb\\c100000\\c100000\\c100000\\c100000;" +
      "\\csgenericrgb\\c100000\\c100000\\c100000\\c0;}" +
      "{\\*\\listtable}{\\*\\listoverridetable}" +
      "\\uc1\\paperw28800\\margl0\\margr0\\margt0\\margb0" +
      parFmt +
      body +
      "}",
    "utf-8"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _root: any = null;

async function getProtoRoot() {
  if (_root) return _root;
  _root = await protobuf.load([
    join(PROTO_DIR, "presentation.proto"),
    join(PROTO_DIR, "presentationSlide.proto"),
    join(PROTO_DIR, "cue.proto"),
    join(PROTO_DIR, "slide.proto"),
    join(PROTO_DIR, "graphicsData.proto"),
    join(PROTO_DIR, "uuid.proto"),
    join(PROTO_DIR, "color.proto"),
    join(PROTO_DIR, "groups.proto"),
    join(PROTO_DIR, "action.proto"),
  ]);
  return _root;
}

/**
 * Load slide template directly from a PP Theme file.
 *
 * Reads Themes/{themeName}/Theme as Template.Document, finds the slide
 * matching slideUuid, and returns its elements adapted for .pro files:
 * - info:2 text elements become info:3 (lyrics target)
 * - Media paths are converted from theme-relative to Media/Assets/ with UUID prefix
 * - An empty full-screen text placeholder (info:0) is added
 */
async function loadSlideTemplate(
  slideUuid: string,
  themeName: string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (!slideUuid) return null;

  const root = await getProtoRoot();

  // Load Template.Document proto type
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

  // Find the theme directory
  const themesDir = join(PP_DATA_PATH, "Themes");
  let themeDirs: string[] = [];

  if (themeName) {
    // Try exact name first
    const exact = join(themesDir, themeName, "Theme");
    if (existsSync(exact)) {
      themeDirs = [exact];
    }
  }

  // If not found by name, scan all themes
  if (themeDirs.length === 0 && existsSync(themesDir)) {
    try {
      const dirs = readdirSync(themesDir);
      themeDirs = dirs
        .map((d) => join(themesDir, d, "Theme"))
        .filter((p) => existsSync(p));
    } catch {
      // skip
    }
  }

  for (const themeFile of themeDirs) {
    try {
      const buf = readFileSync(themeFile);
      const decoded = TemplateDoc.decode(buf);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = TemplateDoc.toObject(decoded, {
        defaults: false,
        bytes: String,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;

      if (!obj.slides) continue;

      // Find the slide matching our UUID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchedSlide = obj.slides.find((s: any) => {
        return s.baseSlide?.uuid?.string === slideUuid;
      });

      if (!matchedSlide) continue;

      const themeElements = matchedSlide.baseSlide.elements || [];
      const themeDir = join(themeFile, "..");
      const themeFolderName = themeDir.split(/[/\\]/).pop() || "";

      console.log(
        `[pro-gen] Found theme slide in "${themeFolderName}" (${themeElements.length} elements)`
      );

      // Adapt theme elements for .pro file usage:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adaptedElements: any[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const el of themeElements) {
        const clone = JSON.parse(JSON.stringify(el));

        // Convert info:2 (IS_TEXT_ELEMENT) to info:3 (text + lyrics target)
        if (clone.info === 2) {
          clone.info = 3;
        }

        // Convert theme-relative media paths to Media/Assets/ with UUID prefix
        if (clone.element?.fill?.media?.url?.local?.path) {
          const origPath = clone.element.fill.media.url.local.path;
          // Theme paths are like "Assets/Fichier 5.png"
          const filename = origPath.split("/").pop() || origPath;
          const newPath = `Media/Assets/${slideUuid}${filename}`;
          const absPath = join(PP_DATA_PATH, newPath);

          clone.element.fill.media.url.local.path = newPath;
          clone.element.fill.media.url.absoluteString = absPath;

          // Ensure the asset exists in Media/Assets (copy from theme if needed)
          if (!existsSync(absPath)) {
            const srcPath = join(themeDir, origPath);
            if (existsSync(srcPath)) {
              const assetDir = join(PP_DATA_PATH, "Media", "Assets");
              if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true });
              const { copyFileSync } = require("fs");
              copyFileSync(srcPath, absPath);
              console.log(`[pro-gen] Copied theme asset: ${filename} -> ${newPath}`);
            }
          }

          // Set info to 1 (IS_TEMPLATE_ELEMENT) for media elements without text info
          if (clone.info === undefined || clone.info === 0) {
            clone.info = 1;
          }
        }

        adaptedElements.push(clone);
      }

      // Add an empty full-screen text placeholder (info:0) if not already present
      // PP expects this between the lyrics element and the background
      const hasEmptyPlaceholder = adaptedElements.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (el: any) =>
          (el.info === undefined || el.info === 0) &&
          el.element?.bounds?.size?.width === 1920
      );

      if (!hasEmptyPlaceholder) {
        // Insert empty placeholder before the background element
        const emptyPlaceholder = {
          element: {
            uuid: makeUUID(),
            bounds: { origin: {}, size: { width: 1920, height: 1080 } },
            opacity: 1,
            path: rectPath(),
            fill: {
              color: {
                red: 0.117647,
                green: 0.564706,
                blue: 1,
                alpha: 1,
              },
            },
            stroke: {
              color: { red: 1, green: 1, blue: 1, alpha: 1 },
            },
            shadow: { color: { alpha: 1 } },
            feather: {},
            text: {
              attributes: {
                font: {
                  name: "ArialMT",
                  size: 50,
                  family: "Arial",
                  face: "Regular",
                },
                textSolidFill: { alpha: 1 },
                paragraphStyle: {
                  alignment: 2,
                  lineHeightMultiple: 1,
                  textList: {},
                },
                strokeColor: { red: 1, green: 1, blue: 1, alpha: 1 },
              },
              shadow: {
                angle: 315,
                offset: 5,
                radius: 5,
                color: { alpha: 1 },
                opacity: 0.75,
              },
              rtfData: buildDefaultRTF("").toString("base64"),
              verticalAlignment: 1,
              margins: {},
              isSuperscriptStandardized: true,
              transformDelimiter: "  •  ",
              chordPro: { color: { alpha: 1 } },
            },
            textLineMask: {},
          },
          textScroller: {
            scrollRate: 0.5,
            shouldRepeat: true,
            repeatDistance: 0.052,
          },
        };

        // Insert after lyrics (info:3) and before background (info:1)
        const bgIndex = adaptedElements.findIndex(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (el: any) => el.info === 1
        );
        if (bgIndex > 0) {
          adaptedElements.splice(bgIndex, 0, emptyPlaceholder);
        } else {
          adaptedElements.push(emptyPlaceholder);
        }
      }

      return {
        elements: adaptedElements,
        backgroundColor: matchedSlide.baseSlide.backgroundColor || {
          alpha: 1,
        },
        size: matchedSlide.baseSlide.size || { width: 1920, height: 1080 },
      };
    } catch (err) {
      console.log(`[pro-gen] Failed to read theme: ${themeFile}`, err);
    }
  }

  console.log("[pro-gen] No matching theme slide found, using default");
  return null;
}

/**
 * Deep clone an object, replacing all UUIDs with fresh ones
 * and optionally injecting new RTF text into the info:3 text element.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cloneSlideElements(templateElements: any[], verseText: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return templateElements.map((el: any) => {
    // Deep clone
    const clone = JSON.parse(JSON.stringify(el));

    // Replace UUIDs with fresh ones
    if (clone.element?.uuid) clone.element.uuid = makeUUID();
    if (clone.element?.fill?.media?.uuid)
      clone.element.fill.media.uuid = makeUUID();

    // If this is the text content element (info:3), inject our lyrics
    if (clone.info === 3 && clone.element?.text?.rtfData) {
      clone.element.text.rtfData = buildRTFFromTemplate(
        verseText,
        clone.element.text.rtfData
      );
    }

    return clone;
  });
}

/** Standard path shape (rectangle). */
function rectPath() {
  return {
    closed: true,
    points: [
      { point: {}, q0: {}, q1: {} },
      { point: { x: 1 }, q0: { x: 1 }, q1: { x: 1 } },
      { point: { x: 1, y: 1 }, q0: { x: 1, y: 1 }, q1: { x: 1, y: 1 } },
      { point: { y: 1 }, q0: { y: 1 }, q1: { y: 1 } },
    ],
    shape: { type: 1 },
  };
}

/** Fallback: build a simple text-only slide element (no theme). */
function buildFallbackTextElement(verseText: string) {
  return {
    element: {
      uuid: makeUUID(),
      name: "",
      bounds: {
        origin: { x: 78, y: 228 },
        size: { width: 1764, height: 624 },
      },
      opacity: 1,
      path: rectPath(),
      fill: {},
      stroke: {
        width: 3,
        color: { red: 1, green: 1, blue: 1, alpha: 1 },
      },
      shadow: {
        angle: 315,
        offset: 5,
        radius: 5,
        color: { alpha: 1 },
        opacity: 0.75,
      },
      feather: { radius: 0.05 },
      text: {
        attributes: {
          font: {
            name: "ArialMT",
            size: 100,
            family: "Arial",
            face: "Regular",
          },
          textSolidFill: { red: 1, green: 1, blue: 1, alpha: 1 },
          paragraphStyle: { alignment: 2, lineHeightMultiple: 1 },
          strokeColor: { red: 1, green: 1, blue: 1, alpha: 1 },
        },
        shadow: {
          angle: 315,
          offset: 5,
          radius: 5,
          color: { alpha: 1 },
          opacity: 0.75,
        },
        rtfData: buildDefaultRTF(verseText).toString("base64"),
        verticalAlignment: 1,
        scaleBehavior: 1,
        margins: {},
        isSuperscriptStandardized: true,
        transformDelimiter: "  •  ",
        chordPro: { color: { alpha: 1 } },
      },
      textLineMask: {},
    },
    info: 3,
    textScroller: {
      scrollRate: 0.5,
      shouldRepeat: true,
      repeatDistance: 0.05,
    },
  };
}

/**
 * Generate a .pro file for a song and write it to the PP library.
 *
 * When themeName + slideUuid are provided, finds an existing PP file
 * that uses this theme slide and clones its exact element structure,
 * only injecting the new lyrics text.
 */
export interface CcliMetadata {
  author?: string;
  artistCredits?: string;
  songTitle?: string;
  publisher?: string;
  copyrightYear?: number;
  songNumber?: string;
  display?: boolean;
  album?: string;
}

export async function generateProFile(
  songTitle: string,
  lyrics: string,
  themeName?: string,
  slideUuid?: string,
  customLibPath?: string,
  ccli?: CcliMetadata
): Promise<{ path: string; slides: number }> {
  const root = await getProtoRoot();
  const Presentation = root.lookupType("rv.data.Presentation");
  const libDir = resolveLibDir(customLibPath);

  const verses = splitVerses(lyrics);
  const presentationUUID = randomUUID();
  const arrangementUUID = randomUUID();

  // Load slide template directly from PP Theme file
  const template =
    slideUuid ? await loadSlideTemplate(slideUuid, themeName) : null;

  console.log(
    `[pro-gen] Theme: ${themeName || "none"}, slideUuid: ${slideUuid || "none"}, template: ${template ? "FOUND" : "fallback"}`
  );

  const groupUUIDs: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cueObjects: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cueGroupObjects: any[] = [];

  const groupColors = [
    { red: 0.0, green: 0.0, blue: 1.0, alpha: 1.0 },
    { red: 0.53, green: 0.81, blue: 0.92, alpha: 1.0 },
    { red: 0.75, green: 0.0, blue: 0.75, alpha: 1.0 },
    { red: 0.0, green: 0.75, blue: 0.0, alpha: 1.0 },
    { red: 1.0, green: 0.55, blue: 0.0, alpha: 1.0 },
  ];

  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    const cueUUID = randomUUID();
    const groupUUID = randomUUID();
    groupUUIDs.push(groupUUID);
    const groupName = `Couplet ${i + 1}`;

    // Build slide elements: clone from template or use fallback
    let slideElements;
    if (template) {
      slideElements = cloneSlideElements(template.elements, verse);
    } else {
      slideElements = [buildFallbackTextElement(verse)];
    }

    const emptyRTF = buildDefaultRTF("").toString("base64");

    cueObjects.push({
      uuid: makeUUID(cueUUID),
      name: groupName,
      completionTargetUuid: makeUUID(
        "00000000-0000-0000-0000-000000000000"
      ),
      completionActionType: 1,
      completionActionUuid: makeUUID(
        "00000000-0000-0000-0000-000000000000"
      ),
      triggerTime: {},
      isEnabled: true,
      actions: [
        {
          uuid: makeUUID(),
          isEnabled: true,
          type: 11, // ACTION_TYPE_PRESENTATION_SLIDE
          slide: {
            presentation: {
              baseSlide: {
                elements: slideElements,
                backgroundColor: template?.backgroundColor || { alpha: 1 },
                size: template?.size || { width: 1920, height: 1080 },
                uuid: makeUUID(),
              },
              notes: {
                rtfData: emptyRTF,
                attributes: {
                  font: {
                    name: "ArialMT",
                    size: 50,
                    family: "Arial",
                    face: "Regular",
                  },
                  textSolidFill: { alpha: 1 },
                  paragraphStyle: { lineHeightMultiple: 1 },
                  strokeColor: { red: 1, green: 1, blue: 1, alpha: 1 },
                },
              },
              chordChart: {},
            },
          },
        },
      ],
    });

    cueGroupObjects.push({
      group: {
        uuid: makeUUID(groupUUID),
        name: groupName,
        color: groupColors[i % groupColors.length],
      },
      cueIdentifiers: [makeUUID(cueUUID)],
    });
  }

  const presentation = {
    applicationInfo: { platform: 2, versionNumber: 26200 },
    uuid: makeUUID(presentationUUID),
    name: songTitle,
    background: template?.background || { color: { red: 1, green: 1, blue: 1 } },
    selectedArrangement: makeUUID(arrangementUUID),
    arrangements: [
      {
        uuid: makeUUID(arrangementUUID),
        name: songTitle,
        groupIdentifiers: groupUUIDs.map((id) => makeUUID(id)),
      },
    ],
    cueGroups: cueGroupObjects,
    cues: cueObjects,
    ccli: {
      author: ccli?.author || "",
      artistCredits: ccli?.artistCredits || "",
      songTitle: ccli?.songTitle || songTitle,
      publisher: ccli?.publisher || "",
      copyrightYear: ccli?.copyrightYear || 0,
      songNumber: ccli?.songNumber ? parseInt(ccli.songNumber) : 0,
      display: ccli?.display ?? false,
      album: ccli?.album || "",
    },
  };

  const message = Presentation.create(presentation);
  const buffer = Presentation.encode(message).finish();
  const outPath = join(libDir, `${songTitle}.pro`);
  writeFileSync(outPath, buffer);

  console.log(
    `[pro-gen] Created ${outPath} (${buffer.length} bytes, ${verses.length} slides)`
  );
  return { path: outPath, slides: verses.length };
}
