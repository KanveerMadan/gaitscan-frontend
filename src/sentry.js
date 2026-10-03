import * as Sentry from "@sentry/react";

// Error tracking only; off unless VITE_SENTRY_DSN is set. No replays, no PII.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: import.meta.env.MODE, sendDefaultPii: false, tracesSampleRate: 0 });
}
