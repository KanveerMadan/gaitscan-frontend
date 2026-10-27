// Pages opened from links in emails (no sign-in needed): choose a new password, confirm an address.
// The token is in the URL fragment (#token=...), which browsers never send to a server.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, errorMessage, forgetLinkToken, takeLinkToken } from "@/api/client";
import { Brand, Disclaimer } from "@/components/app-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LinkLayout({ heading, children }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Disclaimer />
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-lg border bg-surface p-8">
          <Brand />
          <h1 className="mt-6 text-xl font-semibold tracking-tight">{heading}</h1>
          <div className="mt-6 flex flex-col gap-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

const toSignIn = (
  <Button asChild variant="outline">
    <Link to="/">Go to sign in</Link>
  </Button>
);

export function ResetPasswordPage() {
  const [token] = useState(takeLinkToken);
  useEffect(forgetLinkToken, []);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      setStatus({ ok: true, msg: (await api.confirmPasswordReset(token, password)).message });
    } catch (e) {
      setStatus({ ok: false, msg: errorMessage(e, "Could not change the password. Please try again.") });
    }
    setBusy(false);
  };
  return (
    <LinkLayout heading="Choose a new password">
      {!token && (
        <Alert variant="destructive">This link is incomplete. Please use the link from the email.</Alert>
      )}
      {status && <Alert variant={status.ok ? "default" : "destructive"}>{status.msg}</Alert>}
      {status?.ok ? (
        toSignIn
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={submit} disabled={!token || !password || busy}>
            {busy ? "Saving…" : "Set new password"}
          </Button>
        </>
      )}
    </LinkLayout>
  );
}

export function VerifyEmailPage() {
  const [token] = useState(takeLinkToken);
  useEffect(forgetLinkToken, []);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!token) {
      setStatus({ ok: false, msg: "This link is incomplete. Please use the link from the email." });
      return;
    }
    api
      .verifyEmail(token)
      .then((r) => setStatus({ ok: true, msg: r.message }))
      .catch((e) => setStatus({ ok: false, msg: errorMessage(e, "Could not confirm the address.") }));
  }, [token]);
  return (
    <LinkLayout heading="Confirm your email address">
      {!status && <p className="text-sm text-muted-foreground">Confirming…</p>}
      {status && <Alert variant={status.ok ? "default" : "destructive"}>{status.msg}</Alert>}
      {status && toSignIn}
    </LinkLayout>
  );
}
