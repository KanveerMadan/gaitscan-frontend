// Published cadence reference by age and sex (owner decision 2026-11-12).
//
// Source: Mobbs L, Fernando V, Fonseka RD, Natarajan P, Maharaj M, Mobbs RJ. Normative Database of
// Spatiotemporal Gait Metrics Across Age Groups: An Observational Case-Control Study. Sensors 2025;
// 25(2):581. doi:10.3390/s25020581. Open access, CC BY 4.0 (MDPI). Read from the full text on
// 2026-11-12: cadence mean and SD per age group from Table 4 (females) and Table 5 (males); people per
// group from Table 2.
//
// What it is: 313 adults without conditions known to change gait, a 50 m walk on a flat path at
// their own pace, measured with a chest-worn IMU (MetaMotionC at the sternal angle, IMUGaitPY). Not
// video, and the authors note the method's own accuracy isn't validated. So the band is context for
// the person's own number, never a target, a pass mark or a judgement, and it isn't shown for a
// treadmill test (the study walked over the ground).
//
// The band is mean ± 1 SD (about two in three of the study's people, if cadence is roughly normal).
// Groups with fewer than MIN_PEOPLE people get no band: 6 men aged 61-70 and 3 of each sex aged 71-80
// are too few for a spread to mean anything.
export const MOBBS_2025 = {
  short: "Mobbs et al. 2025",
  citation:
    "Mobbs L, Fernando V, Fonseka RD, Natarajan P, Maharaj M, Mobbs RJ. Normative Database of " +
    "Spatiotemporal Gait Metrics Across Age Groups: An Observational Case–Control Study. " +
    "Sensors 2025;25(2):581.",
  url: "https://doi.org/10.3390/s25020581",
  licence: "CC BY 4.0",
};

export const MIN_PEOPLE = 10;

// [lowest age, highest age, label]; ages are whole years.
const GROUPS = [
  [18, 20, "18–20"],
  [21, 30, "21–30"],
  [31, 40, "31–40"],
  [41, 50, "41–50"],
  [51, 60, "51–60"],
  [61, 70, "61–70"],
  [71, 80, "71–80"],
];

// steps/min: [mean, SD, people], in GROUPS order.
const CADENCE = {
  female: [
    [109.68, 9.95, 11],
    [111.88, 9.25, 43],
    [114.41, 9.45, 34],
    [115.14, 8.75, 26],
    [114.35, 8.36, 18],
    [118.87, 8.21, 11],
    [111.03, 17.04, 3],
  ],
  male: [
    [103.42, 5.63, 15],
    [105.22, 7.77, 42],
    [109.76, 7.86, 41],
    [109.26, 8.91, 34],
    [107.08, 9.19, 26],
    [110.99, 4.16, 6],
    [111.08, 9.99, 3],
  ],
};

/** The study's cadence for this sex and age, or null when there is none to show. */
export function cadenceReference({ sex, age }) {
  const rows = CADENCE[sex];
  if (!rows || !Number.isFinite(age)) return null;
  const g = GROUPS.findIndex(([lo, hi]) => age >= lo && age <= hi);
  if (g < 0) return null;
  const [mean, sd, n] = rows[g];
  if (n < MIN_PEOPLE) return null;
  return { sex, group: GROUPS[g][2], mean, sd, n, low: Math.round(mean - sd), high: Math.round(mean + sd) };
}

/** Age in whole years at `when` from a birth year (the year only, so it can be a year off). */
export function ageAt(birthYear, when) {
  if (!Number.isFinite(birthYear)) return null;
  const year = new Date(when ?? Date.now()).getFullYear();
  return Number.isFinite(year) ? year - birthYear : null;
}
