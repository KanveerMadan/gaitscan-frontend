# Security

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability).
Please don't open a public issue. Expect an acknowledgement within a week; this is a one-person
project. The threat model for the whole system, and what is knowingly left open, is in the
[backend's SECURITY.md](https://github.com/KanveerMadan/GaitScan/blob/main/SECURITY.md).

## What the web app does

- **No secrets in the bundle.** Only `VITE_*` variables reach the browser: the API URL, and optionally
  the Sentry DSN and the Google OAuth client ID, which are public by design.
- **Sign-in token.** The API's token (12 h) is kept in `localStorage` with the user's name and
  settings, and sent as a bearer token. Any 401 signs the user out. Signing out removes it.
- **Videos.** An uploaded or recorded video goes straight to the API, which deletes it after the
  analysis. The setup check's live pose tracking runs in the browser; no frame leaves the device.
- **Share links.** The token is in the link's `#fragment`, which browsers never send to a server; the
  app posts it to the API in a request body, then removes it from the address bar.
- **Error tracking.** Sentry only when `VITE_SENTRY_DSN` is set: errors only, no session replays, no
  personal data.
- **Dependencies.** Exact versions in `package-lock.json`; Dependabot proposes updates and CI runs
  `npm audit`.
