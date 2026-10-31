// The walking figure: GaitScan's own simulated walker (backend tests/synthetic.py), exported by the
// backend's tools/export_walker.py with what gaitcore measures for it. Units: leg lengths; x relative
// to the pelvis (walking towards +x), y above the floor.
import data from "./walker.json";

export const STRIDE = data.stride;
export const TRACE = data.trace;
export const STRIDE_S = 120 / STRIDE.spm; // one stride = two steps
const N = STRIDE.phases;
const P = STRIDE.points;

// The landmarks the measurement uses (gaitcore/signals.py SIDES), with MediaPipe's indices.
export const MEASURED = [
  ["shoulder", 11, 12],
  ["hip", 23, 24],
  ["knee", 25, 26],
  ["ankle", 27, 28],
  ["heel", 29, 30],
  ["toe", 31, 32],
];
export const BONES = [
  ["shoulder", "hip"],
  ["hip", "knee"],
  ["knee", "ankle"],
  ["ankle", "heel"],
  ["heel", "toe"],
  ["ankle", "toe"],
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** A landmark at stride phase 0..1 (linear between the exported samples, wrapping round). */
export function point(side, name, phase) {
  const f = (((phase % 1) + 1) % 1) * N;
  const i = Math.floor(f);
  const t = f - i;
  const a = P[`${side}_${name}`][i % N];
  const b = P[`${side}_${name}`][(i + 1) % N];
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

/** Head and arms aren't measured (and aren't in the simulated walker): drawn for a recognisable
 *  figure, swinging opposite the same-side leg. */
export function unmeasured(phase) {
  const sh = point("L", "shoulder", phase);
  const head = [sh[0] + 0.02, sh[1] + 0.27];
  const arm = (side) => {
    const swing = (side === "L" ? -1 : 1) * 0.42 * Math.cos(2 * Math.PI * phase);
    const s = point(side, "shoulder", phase);
    const elbow = [s[0] + 0.33 * Math.sin(swing), s[1] - 0.33 * Math.cos(swing)];
    const fore = swing + 0.35 + 0.25 * Math.max(0, Math.sin(swing));
    const wrist = [elbow[0] + 0.3 * Math.sin(fore), elbow[1] - 0.3 * Math.cos(fore)];
    return { elbow, wrist };
  };
  return { head, L: arm("L"), R: arm("R") };
}

/** Heel separation along the walking direction (gaitcore/gait.py heel_separation), leg lengths. */
export function separation(phase) {
  return Math.abs(point("L", "heel", phase)[0] - point("R", "heel", phase)[0]);
}

/** Phases of the step events in a stride: the peak of the heel separation in each half stride (one
 *  per step), as gaitcore finds them. The peak is a plateau in double support; its middle is used. */
export const EVENT_PHASES = [-0.25, 0.25].map((from) => {
  // Half strides centred on each heel strike, so a plateau around a strike isn't cut in two.
  const idx = Array.from({ length: N / 2 }, (_, i) => i + from * N);
  const best = Math.max(...idx.map((i) => separation(i / N)));
  const top = idx.filter((i) => separation(i / N) >= best - 1e-4);
  return ((((top[0] + top[top.length - 1]) / 2 / N) % 1) + 1) % 1;
});

/** Ground speed of the stance foot, leg lengths per stride (the floor scrolls by this much). */
export const STRIDE_LENGTH = (() => {
  const a = point("L", "heel", 0)[0];
  const b = point("L", "heel", 0.3)[0]; // still in stance: the heel moves back relative to the pelvis
  return ((a - b) / 0.3) * 1.0;
})();
