import protobuf from "protobufjs";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const PROTO_DIR = "C:/Users/HP/AppData/Local/Temp/pp7proto/Proto 19beta";
const LIB_DIR = "C:/Users/HP/Documents/ProPresenter/Libraries/Default";

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

// Find the user's manually created file
const files = readdirSync(LIB_DIR);
const target = files.find((f) => f.includes("digne grand"));
console.log("Reading:", target);

const buf = readFileSync(join(LIB_DIR, target));
const pres = Presentation.decode(buf);

const cue0 = pres.cues[0];
const action0 = cue0.actions[0];
const slide = action0.slide.presentation.baseSlide;

console.log("\n=== SLIDE ===");
console.log("Size:", JSON.stringify(slide.size));
console.log("drawsBg:", slide.drawsBackgroundColor);
console.log("bgColor:", JSON.stringify(slide.backgroundColor));
console.log("Elements:", slide.elements.length);

for (let i = 0; i < slide.elements.length; i++) {
  const el = slide.elements[i];
  console.log(`\n--- Element ${i} ---`);
  console.log("info:", el.info);
  console.log("bounds:", JSON.stringify(el.element.bounds));
  console.log("opacity:", el.element.opacity);
  console.log("path:", JSON.stringify(el.element.path));
  console.log("fill:", JSON.stringify(el.element.fill));
  if (el.element.text) {
    console.log("vAlign:", el.element.text.verticalAlignment);
    console.log("scaleBehavior:", el.element.text.scaleBehavior);
    console.log("margins:", JSON.stringify(el.element.text.margins));
    console.log("font:", JSON.stringify(el.element.text.attributes?.font));
    console.log("textFill:", JSON.stringify(el.element.text.attributes?.textSolidFill));
    console.log("para:", JSON.stringify(el.element.text.attributes?.paragraphStyle));
    console.log("RTF:", el.element.text.rtfData?.toString("utf-8"));
  }
}
