import { test, expect } from "vitest";
import { generateShow } from "./show-generator";

const song = {
  title: "Amazing Grace",
  lyrics: "Amazing grace how sweet\nThat saved a wretch\n\nWas blind but now I see",
};

test("show has the song name", () => {
  const show = generateShow(song);
  expect(show.name).toBe("Amazing Grace");
});

test("one slide per blank-line-separated section", () => {
  const show = generateShow(song);
  expect(Object.keys(show.slides)).toHaveLength(2);
});

test("layout orders all slides", () => {
  const show = generateShow(song);
  const layoutId = Object.keys(show.layouts)[0];
  expect(show.layouts[layoutId].slides).toHaveLength(2);
});

test("first slide carries its lyric lines", () => {
  const show = generateShow(song);
  const firstSlideId = Object.keys(show.slides)[0];
  const text = JSON.stringify(show.slides[firstSlideId]);
  expect(text).toContain("Amazing grace how sweet");
  expect(text).toContain("That saved a wretch");
});

test("blank-only lyrics produce zero slides and an empty layout", () => {
  const show = generateShow({ title: "Empty", lyrics: "\n  \n\n\t\n" });
  expect(Object.keys(show.slides)).toHaveLength(0);
  const layoutId = Object.keys(show.layouts)[0];
  expect(show.layouts[layoutId].slides).toHaveLength(0);
});

test("multiple consecutive blank lines collapse to a single section break", () => {
  const show = generateShow({ title: "Gaps", lyrics: "Line A\n\n\n\nLine B" });
  expect(Object.keys(show.slides)).toHaveLength(2);
});
