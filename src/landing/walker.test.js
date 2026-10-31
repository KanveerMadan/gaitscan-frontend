// The figure's data and the events drawn on it come from GaitScan's simulated walker and gaitcore.
import { EVENT_PHASES, STRIDE, STRIDE_S, TRACE, point, separation } from "./walker";

test("one step event per half stride, at the heel-separation peaks next to the heel strikes", () => {
  expect(EVENT_PHASES).toHaveLength(2);
  const [a, b] = [...EVENT_PHASES].sort((x, y) => x - y);
  expect(b - a).toBeCloseTo(0.5, 1);
  const strikes = [STRIDE.strikes.L[0], STRIDE.strikes.R[0]];
  for (const ev of EVENT_PHASES) {
    const nearest = Math.min(...strikes.map((s) => Math.min(Math.abs(ev - s), 1 - Math.abs(ev - s))));
    expect(nearest).toBeLessThan(0.1); // double support follows each heel strike
  }
});

test("the stride loops seamlessly and shows the walker's real cadence and the pipeline's measurement", () => {
  for (const name of ["hip", "knee", "heel", "toe"]) {
    const [a, b] = [point("L", name, 0), point("L", name, 0.9999)];
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(0.03);
  }
  expect(STRIDE_S).toBeCloseTo(120 / TRACE.true_cadence, 6);
  expect(Math.abs(TRACE.cadence - TRACE.true_cadence)).toBeLessThan(2);
  expect(separation(EVENT_PHASES[0])).toBeGreaterThan(separation(EVENT_PHASES[0] + 0.25));
});
