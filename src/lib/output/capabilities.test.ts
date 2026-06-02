import { test, expect } from "vitest";
import { getCapabilities } from "./capabilities";

test("propresenter supports everything", () => {
  const c = getCapabilities("propresenter");
  expect(c).toEqual({ sendSong: true, sendService: true, liveControl: true, status: true, syncLibrary: true, themes: true });
});

test("freeshow supports all but themes", () => {
  const c = getCapabilities("freeshow");
  expect(c.liveControl).toBe(true);
  expect(c.sendSong).toBe(true);
  expect(c.themes).toBe(false);
});

test("unknown type falls back to propresenter caps", () => {
  // @ts-expect-error testing runtime fallback
  expect(getCapabilities("nope").liveControl).toBe(true);
});
