# GaitScan — Frontend

[![CI](https://github.com/KanveerMadan/gaitscan-frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/KanveerMadan/gaitscan-frontend/actions/workflows/ci.yml)
![React 19](https://img.shields.io/badge/react-19-149eca)
![Vite 8](https://img.shields.io/badge/vite-8-646cff)
![Accessibility: axe WCAG 2.1 AA](https://img.shields.io/badge/axe-WCAG%202.1%20AA-2e7d32)
![Status: experimental](https://img.shields.io/badge/status-experimental-orange)

The web app for GaitScan: film yourself walking side-on, and get your cadence and step time with
their error ranges. The API and the measurement pipeline are in the
[backend repository](https://github.com/KanveerMadan/GaitScan).

> **Not a medical device.** GaitScan is an experimental measurement tool. It does not diagnose
> conditions or predict outcomes, and its measurements have not been clinically validated.

Live: https://gaitscan-frontend-mnt9.vercel.app

## What it does

- **Upload and results.**
  - Upload a walking video, or record one in the browser; the analysis runs on the server and the
    app polls until it's done, with an optional "notify me when it's done".
  - A treadmill test at an entered belt speed (not yet validated).
  - Results show cadence and step time with the error range from the backend's accuracy check
    (LJMU, Topham et al. 2023).
  - Knee bend, and step length and speed (with a floor calibration), are labelled "not yet
    validated".
  - Each walk across the frame is listed on its own, with a recording-quality summary.
- **Turned-down videos** come with the reason and what to change.
- **Before filming:** a setup check (live framing guidance in the browser), a first-test walkthrough,
  an example result (`/demo`) and Learn pages for each measurement (`/learn`).
- **Your sessions:**
  - History with a cadence trend, search and tag filters, and session notes and tags.
  - A cadence goal, re-test reminders as a calendar file, and a "next walking test" card.
  - Ghost replay: two sessions' averaged strides, one over the other.
  - Comparing two sessions, with "real change" vs "within measurement error".
  - Knee-angle curves and an authenticated PDF report.
- **Accounts and privacy:**
  - Consent before the first analysis.
  - Privacy center: export, delete sessions, delete the account.
  - Recovery codes, change password, Sign in with Google (when configured).
  - Password reset and email verification pages (unused until the backend sends email).
  - Other adults on one account (profiles), each with their own history.
  - Settings: units, theme, language (English, Hindi draft), reminders.
  - Read-only share links for one session.
- **Clinicians** see the sessions of patients who linked to them with an invite code, in an inbox
  that marks what's new, and can comment on a session with the patient.

## Stack

React 19, Vite 8, React Router 7, Tailwind v4 with owned shadcn/ui primitives (Radix), Phosphor
icons, Geist, Recharts, Axios, optional Sentry. The API client is typed from the backend's OpenAPI
contract.

## Local setup

Node 22.13+.

```bash
npm ci
cp .env.example .env.local      # VITE_API_BASE_URL=http://localhost:8000 for a local backend
npm run dev                     # http://localhost:3000
```

| Script                                  | What it does                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                              | Vitest (unit and screen tests, API mocked)                                                                                                                 |
| `npm run e2e`                           | Playwright on the production build, API mocked at the network layer: the main flow, phone-width layout, and axe (WCAG 2.1 AA) scans in light and dark mode |
| `npm run lint` / `npm run format:check` | ESLint / Prettier                                                                                                                                          |
| `npm run typecheck`                     | `tsc --noEmit`                                                                                                                                             |
| `npm run gen:api`                       | Regenerate `src/api/schema.d.ts` from `contracts/openapi.json`                                                                                             |
| `npm run build`                         | Production build into `dist/` (needs `VITE_API_BASE_URL`)                                                                                                  |

**API contract.** `contracts/openapi.json` is a byte-identical copy of the backend's. When the API
changes, copy the new file over, run `npm run gen:api` and commit both; CI fails if they drift.

Pre-commit hooks (ESLint, Prettier): `pre-commit install` (git ≥ 2.35).

## Layout

| Path                   | What                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `src/App.jsx`          | Routes; screens other than sign-in and upload load on demand                         |
| `src/screens/`         | One file per screen (landing, analyse, history, session, compare, privacy, learn, …) |
| `src/measurements.jsx` | Result tables: values, error ranges, "not yet validated" labels                      |
| `src/components/ui/`   | The design system's primitives (owned shadcn/ui)                                     |
| `src/api/`             | Typed client and generated schema                                                    |
| `src/i18n/`            | Interface text: `en.js`, and `hi.js` (draft, under review)                           |
| `e2e/`                 | Playwright specs                                                                     |

## Configuration and deployment

- **Configuration.** See [.env.example](.env.example). Only `VITE_*` variables reach the browser;
  never put secrets there.
- **Deployment.** Vercel (Vite preset, output `dist`). Set `VITE_API_BASE_URL` (and optionally
  `VITE_SENTRY_DSN`) for Production and Preview. The backend's `CORS_ORIGINS` must list the deployed
  origin, and its `FRONTEND_URL` must point here for links in emails.

## License

No licence has been chosen yet, so the default applies: all rights reserved.

## More

- [Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md)
- Changelog, architecture and model card: in the [backend repository](https://github.com/KanveerMadan/GaitScan/tree/main/docs)
