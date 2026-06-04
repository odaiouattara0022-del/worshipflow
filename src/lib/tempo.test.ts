import { test, expect } from "vitest";
import { bpmFromTaps } from "./tempo";

test("returns null with fewer than two taps", () => {
  expect(bpmFromTaps([])).toBeNull();
  expect(bpmFromTaps([1000])).toBeNull();
});

test("computes 120 BPM from taps 500ms apart", () => {
  expect(bpmFromTaps([0, 500, 1000, 1500])).toBe(120);
});

test("computes 60 BPM from taps 1s apart", () => {
  expect(bpmFromTaps([0, 1000, 2000])).toBe(60);
});

test("averages intervals to smooth an irregular tap", () => {
  // 500, 520, 480 → avg 500 → 120 BPM
  expect(bpmFromTaps([0, 500, 1020, 1500])).toBe(120);
});

test("resets the run after a gap longer than 2s (new count-in)", () => {
  // The 3s gap discards the old slow taps; only the last 500ms taps count → 120.
  expect(bpmFromTaps([0, 2000, 5000, 5500, 6000])).toBe(120);
});

test("clamps to the musical range", () => {
  expect(bpmFromTaps([0, 100])).toBe(220); // 600 BPM clamped down
  expect(bpmFromTaps([0, 1900])).toBe(40); // ~31 BPM clamped up
});
