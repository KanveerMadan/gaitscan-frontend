// The GaitScan mark: the landing page's walker at double support (the widest moment of a stride),
// reduced to nine points and stretched sideways so the stride still reads at favicon size.
import { point, unmeasured } from "@/landing/walker";

const PHASE = 0.02;
const { head, L: armL, R: armR } = unmeasured(PHASE);
const POINTS = [
  [head, 2.05],
  [point("L", "shoulder", PHASE), 1.45],
  [point("L", "hip", PHASE), 1.45],
  [point("L", "knee", PHASE), 1.35],
  [point("L", "ankle", PHASE), 1.35],
  [point("R", "knee", PHASE), 1.35],
  [point("R", "heel", PHASE), 1.35],
  [armL.wrist, 1.2],
  [armR.wrist, 1.2],
];
const xs = POINTS.map(([p]) => p[0]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
const SY = 10.2; // ~1.85 leg lengths of figure -> ~19 of 24 units
const SX = SY * 2.1;
const X = (p) => 12 + (p[0] - cx) * SX;
const Y = (p) => 22.2 - p[1] * SY;

export function BrandMark({ className = "size-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      {POINTS.map(([p, r], i) => (
        <circle key={i} cx={X(p).toFixed(2)} cy={Y(p).toFixed(2)} r={r} />
      ))}
    </svg>
  );
}
