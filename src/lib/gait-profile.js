// Helpers for the v3 result page (src/components/gait-profile.jsx).

/** A number as the report writes it: 0 decimals from 100 up, else 1; a real minus sign. */
export function num(v, digits) {
  if (v === null || v === undefined) return "–";
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : 1);
  return v.toFixed(d).replace("-", "−");
}

/** Whether a result carries the gait profile with its verdict (results from pipeline 3.0.0 on). */
export function hasGaitProfile(result) {
  return Boolean(result?.gait_profile?.verdict);
}
