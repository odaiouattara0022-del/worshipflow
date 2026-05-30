/**
 * Generate ProPresenter 7 .pro files by cloning a working template
 * and replacing the text content.
 */
import protobuf from "protobufjs";
import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

const PROTO_DIR = "C:/Users/HP/AppData/Local/Temp/pp7proto/Proto 19beta";
const LIB_DIR = "C:/Users/HP/Documents/ProPresenter/Libraries/Default";

function splitVerses(lyrics) {
  return lyrics
    .split(/\n\s*\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function makeUUID(uuidStr) {
  return { string: uuidStr || randomUUID() };
}

/**
 * Create RTF matching ProPresenter's exact internal format.
 */
function makeRTF(text, fontSize = 100) {
  let rtfBody = "";
  const lines = text.split("\n");

  for (let li = 0; li < lines.length; li++) {
    if (li > 0) {
      // New paragraph with full formatting repeat (PP does this)
      rtfBody += `\\par\n\\pard\\li0\\fi0\\ri0\\qc\\sb0\\sa0\\sl240\\slmult1\\slleading0` +
        `\\f0\\b0\\i0\\ul0\\strike0\\fs${fontSize * 2}\\expnd0\\expndtw0` +
        `\\CocoaLigature1\\cf1\\strokewidth0\\strokec1\\nosupersub\\ulc0\\highlight2\\cb2 `;
    }
    for (const char of lines[li]) {
      const code = char.codePointAt(0);
      if (char === "\\") rtfBody += "\\\\";
      else if (char === "{") rtfBody += "\\{";
      else if (char === "}") rtfBody += "\\}";
      else if (code > 127) rtfBody += `\\u${code}?`;
      else rtfBody += char;
    }
  }

  const paperw = Math.round(fontSize * 2 * 14); // Approximate paper width

  return Buffer.from(
    `{\\rtf0\\ansi\\ansicpg1252` +
    `{\\fonttbl\\f0\\fnil ArialMT;}` +
    `{\\colortbl;\\red255\\green255\\blue255;\\red255\\green255\\blue255;}` +
    `{\\*\\expandedcolortbl;\\csgenericrgb\\c100000\\c100000\\c100000\\c100000;` +
    `\\csgenericrgb\\c100000\\c100000\\c100000\\c0;}` +
    `{\\*\\listtable}{\\*\\listoverridetable}` +
    `\\uc1\\paperw${paperw}\\margl0\\margr0\\margt0\\margb0` +
    `\\pard\\li0\\fi0\\ri0\\qc\\sb0\\sa0\\sl240\\slmult1\\slleading0` +
    `\\f0\\b0\\i0\\ul0\\strike0\\fs${fontSize * 2}\\expnd0\\expndtw0` +
    `\\CocoaLigature1\\cf1\\strokewidth0\\strokec1` +
    `\\nosupersub\\ulc0\\highlight2\\cb2 ` +
    rtfBody +
    `}`,
    "utf-8"
  );
}

async function generateFromTemplate(songTitle, lyrics, outputPath) {
  const root = await protobuf.load([
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

  const Presentation = root.lookupType("rv.data.Presentation");

  // Find and decode the user's working template
  const files = readdirSync(LIB_DIR);
  const templateFile = files.find((f) => f.includes("digne grand"));
  if (!templateFile) {
    console.error("Template file not found!");
    return;
  }

  const templateBuf = readFileSync(join(LIB_DIR, templateFile));
  const template = Presentation.decode(templateBuf);

  // Get the template slide element (the one with fill/image)
  const templateCue = template.cues[0];
  const templateAction = templateCue.actions[0];
  const templateSlide = templateAction.slide.presentation.baseSlide;
  const templateElement = templateSlide.elements[0];

  const verses = splitVerses(lyrics);
  const presentationUUID = randomUUID();
  const arrangementUUID = randomUUID();
  const groupUUIDs = [];
  const cueObjects = [];
  const cueGroupObjects = [];

  const groupColors = [
    { red: 0.0, green: 0.0, blue: 1.0, alpha: 1.0 },
    { red: 0.53, green: 0.81, blue: 0.92, alpha: 1.0 },
    { red: 0.75, green: 0.0, blue: 0.75, alpha: 1.0 },
  ];

  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    const cueUUID = randomUUID();
    const groupUUID = randomUUID();
    groupUUIDs.push(groupUUID);

    const groupName = `Couplet ${i + 1}`;

    // Clone the template element and replace the text
    const newElement = Presentation.decode(
      Presentation.encode(
        Presentation.create({
          cues: [{
            uuid: makeUUID(randomUUID()),
            actions: [{
              uuid: makeUUID(randomUUID()),
              slide: { presentation: { baseSlide: templateSlide } }
            }]
          }]
        })
      ).finish()
    ).cues[0].actions[0].slide.presentation.baseSlide.elements[0];

    // Replace text content
    newElement.element.uuid = makeUUID(randomUUID());
    newElement.element.text.rtfData = makeRTF(verse, 50);

    // Build slide with cloned element
    const slide = {
      elements: [newElement],
      size: { width: 1920, height: 1080 },
      uuid: makeUUID(randomUUID()),
      drawsBackgroundColor: false,
      backgroundColor: { alpha: 1 },
    };

    const cue = {
      uuid: makeUUID(cueUUID),
      name: groupName,
      isEnabled: true,
      actions: [
        {
          uuid: makeUUID(randomUUID()),
          isEnabled: true,
          slide: {
            presentation: {
              baseSlide: slide,
            },
          },
        },
      ],
    };

    cueObjects.push(cue);

    cueGroupObjects.push({
      group: {
        uuid: makeUUID(groupUUID),
        name: groupName,
        color: groupColors[i % groupColors.length],
      },
      cueIdentifiers: [makeUUID(cueUUID)],
    });
  }

  const arrangement = {
    uuid: makeUUID(arrangementUUID),
    name: songTitle,
    groupIdentifiers: groupUUIDs.map((id) => makeUUID(id)),
  };

  const presentation = {
    applicationInfo: {
      platform: 2,
      versionNumber: 26200,
    },
    uuid: makeUUID(presentationUUID),
    name: songTitle,
    selectedArrangement: makeUUID(arrangementUUID),
    arrangements: [arrangement],
    cueGroups: cueGroupObjects,
    cues: cueObjects,
    ccli: {
      songTitle: songTitle,
      display: false,
    },
  };

  const message = Presentation.create(presentation);
  const buffer = Presentation.encode(message).finish();

  writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath} (${buffer.length} bytes, ${verses.length} slides)`);
}

const songs = [
  {
    title: "Tu es digne",
    lyrics:
      "Tu es digne, Tu es digne\nTu es digne Seigneur\nDe recevoir la gloire\nLa louange et l'honneur\n\nTu es saint, Tu es saint\nTu es saint Seigneur\nDe recevoir la gloire\nLa louange et l'honneur\n\nTu es grand, Tu es grand\nTu es grand Seigneur\nDe recevoir la gloire\nLa louange et l'honneur",
  },
  {
    title: "Jésus est le chemin",
    lyrics:
      "Jésus est le chemin\nLa vérité et la vie\nNul ne vient au Père\nQue par Lui seul\n\nIl est la porte ouverte\nLe bon berger fidèle\nCelui qui croit en Lui\nNe périra point\n\nVenez à Lui vous tous\nQui êtes fatigués\nEt Il vous donnera\nLe repos de vos âmes",
  },
];

for (const song of songs) {
  await generateFromTemplate(song.title, song.lyrics, join(LIB_DIR, `${song.title}.pro`));
}

console.log("\nDone! Ferme et rouvre ProPresenter pour voir les chants mis à jour.");
