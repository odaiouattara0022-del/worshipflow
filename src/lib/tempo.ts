// Tap-tempo: derive a BPM from the timestamps (ms) of successive taps.
//
// Design choices:
// - A gap longer than RESET_MS means the musician started over, so we only
//   average the most recent uninterrupted run of taps.
// - We average intervals (not just first-to-last) so an outlier tap is smoothed.
// - Result is clamped to a sane musical range.

export const RESET_MS = 2000;
export const MIN_BPM = 40;
export const MAX_BPM = 220;

export function bpmFromTaps(taps: number[]): number | null {
  if (taps.length < 2) return null;

  // Intervals between consecutive taps.
  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);

  // Keep only the trailing run of intervals shorter than the reset threshold.
  const run: number[] = [];
  for (let i = intervals.length - 1; i >= 0; i--) {
    if (intervals[i] > RESET_MS || intervals[i] <= 0) break;
    run.unshift(intervals[i]);
  }
  if (run.length === 0) return null;

  const avg = run.reduce((a, b) => a + b, 0) / run.length;
  const bpm = Math.round(60000 / avg);
  return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}
