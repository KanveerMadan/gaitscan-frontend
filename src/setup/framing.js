// Live framing checks on one camera frame's pose landmarks (normalised, as MediaPipe returns them).
// The thresholds mirror the backend's quality gate (gaitscan gaitcore/signals.py and quality.py); keep
// them in step. This is guidance only: the uploaded video is checked again, fully, on the server.
const VIS_MIN = 0.5; // signals.VIS_MIN: a landmark is used only at visibility >= 0.5
const MAX_TRUNK_TILT = 45; // quality.MAX_TRUNK_TILT, degrees from vertical
const MAX_VIEW_RATIO = 0.35; // quality.MAX_VIEW_RATIO: shoulder width / trunk length
const FEET = [27, 28, 29, 30]; // ankles and heels

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const inFrame = (p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

// landmarks.count_people: a second skeleton whose hip midpoint lies inside the first person's
// landmark box is MediaPipe's duplicate of that person, not another person.
export function countPeople(poses) {
  if (!poses.length) return 0;
  const xs = poses[0].map((p) => p.x);
  const ys = poses[0].map((p) => p.y);
  let others = 0;
  for (const p of poses.slice(1)) {
    const h = mid(p[23], p[24]);
    if (!(
      Math.min(...xs) <= h.x &&
      h.x <= Math.max(...xs) &&
      Math.min(...ys) <= h.y &&
      h.y <= Math.max(...ys)
    ))
      others += 1;
  }
  return 1 + others;
}

// poses: MediaPipe PoseLandmarker result.landmarks (one array of 33 points per person).
export function framingChecks(poses, aspect = 16 / 9) {
  const p = poses[0];
  const checks = [
    {
      id: "person",
      ok: Boolean(p),
      message: p ? "Person found" : "No one in view yet: step into the frame, whole body visible",
    },
  ];
  if (!p) return checks;
  const people = countPeople(poses);
  checks.push({
    id: "one_person",
    ok: people <= 1,
    message:
      people <= 1
        ? "Only one person in view"
        : "More than one person in view: only the walker should be in the frame",
  });
  const feet = FEET.every((i) => p[i].visibility >= VIS_MIN && inFrame(p[i]));
  checks.push({
    id: "feet",
    ok: feet,
    message: feet
      ? "Both feet in view"
      : "Feet not clearly visible: keep both feet in the frame, nothing in front of the legs",
  });
  // Trunk angle in pixels (x scaled by the frame's aspect ratio), from the downward vertical.
  const sh = mid(p[11], p[12]);
  const hip = mid(p[23], p[24]);
  const dx = (hip.x - sh.x) * aspect;
  const dy = hip.y - sh.y;
  const tilt = Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
  checks.push({
    id: "upright",
    ok: tilt <= MAX_TRUNK_TILT,
    message:
      tilt <= MAX_TRUNK_TILT
        ? "Person upright on screen"
        : "The picture looks sideways: hold the phone so the person is upright",
  });
  const trunk = Math.hypot(dx, dy);
  const ratio = trunk > 0 ? (Math.abs(p[11].x - p[12].x) * aspect) / trunk : Infinity;
  const side = ratio <= MAX_VIEW_RATIO;
  checks.push({
    id: "side_on",
    ok: side,
    message: side
      ? "Side-on view"
      : "The camera isn't side-on: place the phone at right angles to the walking direction",
  });
  return checks;
}
