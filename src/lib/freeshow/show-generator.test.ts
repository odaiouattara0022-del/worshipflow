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
