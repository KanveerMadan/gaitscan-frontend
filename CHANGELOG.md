# Changelog

The web app's side of the GaitScan rebuild, phase by phase. The plan, the audit and the backend's
changelog are in the [backend repository](https://github.com/KanveerMadan/GaitScan) (`_audit/`,
`CHANGELOG.md`). PR numbers below are this repository's.

## Phase 11 — Gait profile and report (2026-11-14; #37, #38)

Results from pipeline 3.0.0 carry a gait profile and a verdict, worked out by the API in English and
Hindi. The app lays them out; it doesn't word them.

**Result page (#37)**

- **Summary card:**
  - the overall verdict as an icon, words and a border style: "Looks typical", "Worth keeping an eye
    on" or "Outside the typical range" (never colour alone);
  - key findings and what to do next, with recording tips when there's no verdict;
  - reference notes ("No age-specific reference for your age; compared with all adults") and the Gait
    Profile Score;
  - "Experimental estimate from a phone video, not a medical assessment";
  - **Download report (PDF)** in the user's language.
- **Timing and rhythm:** cadence, step time, step-time variability, stance, swing and double support,
  each with a level mark (circle, triangle or square plus a word), the typical range, the error range,
  data confidence, and a "what this means" toggle.
- **Joint movement:**
  - knee, hip and ankle curves over the gait cycle (Recharts) on the typical band of healthy adults
    measured by the app (`GET /references`);
  - heel-strike and toe-off markers, a hover readout, and a text summary per chart;
  - key events, ranges of motion, trunk lean and arm swing;
  - skeleton snapshots drawn from the stored pose points (no video frames).
- **Recording quality and data confidence:** collapsible, and open when there's no verdict.
- **What's left out, by design:** no left/right values or symmetry, because the app can't tell the
  legs apart in a side view (the page says so), and no pelvis oscillation. A missing measure says "Not
  enough data". Earlier results keep the earlier page.
- Disclaimers in the shell, landing and sign-in pages say "for general wellness and information".

**History, progress, Settings, clinicians (#38)**

- **History rows:** the verdict mark and the key numbers (cadence, step-time variability, knee range).
- **Progress** (`GET /me/trends`, once two tests have a gait profile):
  - charts for cadence (with the cadence-goal line), step-time variability, knee and hip range, and
    the Gait Profile Score, each with a text summary;
  - "change since last test" as a shape and a word, where a change smaller than the error range shows
    as no change.
- **Settings prompt:** "Add your birth year and sex in Settings for age-matched comparisons" when
  either is missing. Settings now says where age and sex are used: comparisons and PDF reports,
  including a linked clinician's. Shared links compare with all adults.
- **Clinician view:** clinicians open a patient's session from the patient list. That page has every
  section, the report download and the comments.
- New strings are in `src/i18n/en.js`, with a draft Hindi in `src/i18n/hi.js`.
- **After D6 (2026-11-15):** the arm-swing note now says it was checked against an arm-worn sensor and
  how far off it was (about 5° high on average), replacing "not checked yet". It stays information
  only.
- End-to-end test: upload → summary → report → history → progress; the result page at 360 px.

## Owner decisions — 2026-11-12 (#35)

- Knee angle removed from the app. It came back on 2026-11-13 in Phase 11, as an experimental
  estimate for both legs together.
- Optional sex and birth year in Settings, for a published cadence reference by age and sex (Mobbs
  et al. 2025, CC BY 4.0).
- The Privacy page says how long each kind of data is kept. MIT licence.

## Fixes — 2026-11-12 (#33, #34)

- Sign-up and sign-in send what's in the fields, and never show raw validation text.
- An analysis carries on while you move around the app, and never waits forever.

## Phases 9–10 — Owner requests and repository cleanup (#19, #20, #21, #32)

- #19: recovery codes in place of emailed reset links. #20: the walking figure, a new landing page,
  and redesigned sign-in and app. #21: the Settings screen (units, theme, language) and re-test
  reminders as a calendar file.
- #32 carried the rest (stack #22–#31, merged as one):
  - Google sign-in and in-browser recording;
  - a cadence goal, "analysis done" notifications, and history search and filters;
  - the treadmill test (not yet validated), and other adults on one account (profiles);
  - the clinician inbox with comments, and the Hindi interface (draft);
  - loading, empty and error states on every screen;
  - community files and templates (Phase 10).

## Phase 7 — Docs (#16)

The frontend README.

## Phase 6 — Polish (#15)

- Route-level code splitting (first load 808 → 333 kB).
- The landing page, a phone layout with no sideways scrolling at 360 px, and app icons.
- Playwright checks at phone width and axe (WCAG 2.1 AA) in light and dark mode.

## Phases 4–5 — App features, accounts, sharing, privacy (#14)

#14 carried Phase 4 after #13 closed.

- Phase 4:
  - analysis in the background with polling;
  - a first-test walkthrough and the example result (`/demo`);
  - a personal dashboard with trends, session notes and tags, and comparing two sessions ("real
    change" vs "within measurement error");
  - ghost replay, the typed API client, and an end-to-end test of the main flow.
- Phase 5:
  - consent before the first analysis, and the privacy center: export everything, delete a session,
    delete the account;
  - password reset and email verification pages, and read-only share links.

## Phase 3.5 — Design foundation (#12)

Tailwind v4 with owned shadcn/ui primitives, Geist, Phosphor icons, and light and dark themes.

## Phase 3 — Honest results (#11)

- Results show only what the API measures, with units and error ranges.
- "Not yet validated" labels, and rejections that give their reason.
- Risk scores, flags and exercise advice removed.

## Phase 2 — Measurement correctness (#10)

The app follows the API's corrected measurements.

## Phase 1 — Foundations (#2)

Vite, a typed API client generated from the backend's OpenAPI contract, CI, tests and linting.

## Phase 0 — Stop the bleeding (#1)

The security and correctness fixes the audit called urgent.
