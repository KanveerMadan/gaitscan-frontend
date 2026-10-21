# GaitScan — Frontend

React web app for GaitScan, an experimental video-based gait **measurement** tool.

> **Not a medical device.** GaitScan does not diagnose conditions or predict injury, and its
> measurements have not been clinically validated. A qualified clinician should interpret them.

## Live app

https://gaitscan-frontend-mnt9.vercel.app

## Features

- Sign in / create account (password at least 10 characters), change password
- Video upload with the capture protocol shown up front (side view, landscape, full body)
- Reference-range modes (Clinical / Runner / Athlete / Elderly) and per-measurement findings
- Exercise suggestions from a fixed template list
- Session history with trend charts; clinician dashboard for linked patients
- Authenticated PDF report download

For how to record a usable video, see the capture protocol in the
[backend README](https://github.com/KanveerMadan/GaitScan#video-capture-protocol).

## Tech stack

React 19 · Vite · Vitest + Testing Library · TypeScript (`allowJs` while files migrate) · Recharts ·
Axios · optional Sentry. Planned (ADR-008): React Router, TanStack Query, a typed API client.

## Local setup

Requires Node 22.13+.

```bash
npm ci
cp .env.example .env.local      # VITE_API_BASE_URL=http://localhost:8000 for a local backend
npm run dev                     # http://localhost:3000
```

| Script                                  | What it does                                                      |
| --------------------------------------- | ----------------------------------------------------------------- |
| `npm test`                              | Vitest, once                                                      |
| `npm run lint` / `npm run format:check` | ESLint / Prettier                                                 |
| `npm run typecheck`                     | `tsc --noEmit`                                                    |
| `npm run build`                         | Production build into `dist/` (fails without `VITE_API_BASE_URL`) |

Pre-commit hooks (ESLint + Prettier) use the [pre-commit](https://pre-commit.com) framework:
`pre-commit install` (needs git ≥ 2.35).

## Configuration

See [.env.example](.env.example). Only `VITE_*` variables reach the browser; never put secrets there.

## Deployment

Vercel (Vite preset, output `dist`). Set `VITE_API_BASE_URL` (and optionally `VITE_SENTRY_DSN`)
for the Production and Preview environments; the backend's `CORS_ORIGINS` must list the deployed
origin.
