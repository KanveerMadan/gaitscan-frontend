import { countPeople, framingChecks } from "./framing";

// A side-on, upright person in a 1280x720 frame (normalised MediaPipe landmarks).
function person({ shoulderGap = 0.01, feetVis = 0.9, tilt = 0, dx = 0 } = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5 + dx, y: 0.2, z: 0, visibility: 0.9 }));
  const set = (i, x, y, v = 0.9) => (lm[i] = { x: x + dx, y, z: 0, visibility: v });
  const lean = Math.tan((tilt * Math.PI) / 180) * 0.3;
  set(11, 0.5 + lean, 0.3);
  set(12, 0.5 + lean + shoulderGap, 0.3);
  set(23, 0.5, 0.6);
  set(24, 0.5, 0.6);
  for (const [i, x] of [
    [25, 0.48],
    [26, 0.52],
    [27, 0.47],
    [28, 0.53],
    [29, 0.46],
    [30, 0.54],
    [31, 0.5],
    [32, 0.56],
  ])
    set(i, x, i < 27 ? 0.75 : 0.9, i >= 27 ? feetVis : 0.9);
  return lm;
}

const ok = (checks) => Object.fromEntries(checks.map((c) => [c.id, c.ok]));

test("a side-on upright person with feet in view passes every check", () => {
  expect(ok(framingChecks([person()]))).toEqual({
    person: true,
    one_person: true,
    feet: true,
    upright: true,
    side_on: true,
  });
});

test("each problem fails its own check with a message", () => {
  expect(ok(framingChecks([]))).toMatchObject({ person: false });
  expect(ok(framingChecks([person({ feetVis: 0.2 })])).feet).toBe(false);
  expect(ok(framingChecks([person({ tilt: 60 })])).upright).toBe(false);
  // Shoulders 0.12 apart (x 16/9) over a 0.3 trunk: ratio ~0.7 > 0.35, facing the camera too much.
  expect(ok(framingChecks([person({ shoulderGap: 0.12 })])).side_on).toBe(false);
  for (const c of framingChecks([])) expect(c.message.length).toBeGreaterThan(10);
});

test("a second skeleton inside the first person counts once; a second person beside counts twice", () => {
  expect(countPeople([person(), person()])).toBe(1);
  expect(countPeople([person(), person({ dx: 0.3 })])).toBe(2);
  expect(ok(framingChecks([person(), person({ dx: 0.3 })])).one_person).toBe(false);
});
