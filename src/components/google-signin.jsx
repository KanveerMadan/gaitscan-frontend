// Sign in with Google (backend app/api/google_auth.py): Google Identity Services gives an ID token,
// which the API checks. Nothing is shown unless VITE_GOOGLE_CLIENT_ID is set.
import { useEffect, useRef } from "react";
import { api, errorMessage } from "@/api/client";

const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript(onLoad) {
  let s = document.querySelector(`script[src="${SCRIPT}"]`);
  if (!s) {
    s = Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    document.head.appendChild(s);
  }
  s.addEventListener("load", onLoad, { once: true });
}

export function GoogleSignIn({ onResult, onError }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const ref = useRef(null);
  const handlers = useRef({ onResult, onError });
  useEffect(() => {
    handlers.current = { onResult, onError };
  }, [onResult, onError]);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    const start = () => {
      const id = window.google?.accounts?.id;
      if (cancelled || !id || !ref.current) return;
      id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            handlers.current.onResult(await api.googleSignIn(credential));
          } catch (e) {
            handlers.current.onError(errorMessage(e, "Google sign-in failed. Please try again."));
          }
        },
      });
      id.renderButton(ref.current, { theme: "outline", size: "large", text: "continue_with", width: 320 });
    };
    if (window.google?.accounts?.id) start();
    else loadScript(start);
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <div data-testid="google-signin" ref={ref} className="flex min-h-10 justify-center" />
    </div>
  );
}
