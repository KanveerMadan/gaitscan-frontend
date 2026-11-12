import { useState } from "react";
import { Link, useLocation } from "react-router";
import { api, errorMessage } from "@/api/client";
import { useAuth } from "@/auth-context";
import { GoogleSignIn } from "@/components/google-signin";
import { CodeList, SaveCodesNotice } from "@/components/recovery-codes";
import { BrandMark } from "@/components/brand-mark";
import { WalkerCanvas } from "@/landing/walker-canvas";
import { Landing } from "@/screens/landing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The sign-in / register / recovery forms; AuthScreen frames them beside the walking figure.
function AuthLayout({ heading, children }) {
  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{heading}</h1>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function AuthScreen({ children }) {
  return (
    <div className="grid min-h-[100svh] bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative flex h-44 flex-col bg-stage text-stage-foreground lg:h-auto">
        <Link
          to="/"
          className="absolute top-5 left-5 z-10 flex items-center gap-2"
          aria-label="GaitScan home"
        >
          <BrandMark className="size-6 text-stage-accent" />
          <span className="text-[17px] font-semibold tracking-tight">GaitScan</span>
        </Link>
        <div className="flex-1 pt-10 lg:pt-0">
          <WalkerCanvas skeleton events label="A person walking, drawn as the points GaitScan tracks" />
        </div>
        <p className="hidden px-8 pb-8 text-sm leading-relaxed text-stage-muted lg:block">
          Your walk, as GaitScan sees it: twelve points followed through every frame.
        </p>
      </aside>
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
        <p role="note" className="mt-10 max-w-sm text-xs leading-relaxed text-muted-foreground">
          GaitScan is an experimental measurement tool, not a medical device. It does not diagnose conditions
          or predict outcomes, and its measurements have not been clinically validated.
        </p>
      </main>
    </div>
  );
}

function Field({ id, label, ...props }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}

// Where to go next is the router's job (App.jsx): signed in at /signup leads to the walkthrough.
// After any sign-in or sign-up response: a new account first shows its recovery codes.
function useFinish(onCodes) {
  const { login } = useAuth();
  return (res) => {
    const session = {
      token: res.access_token,
      role: res.role,
      name: res.full_name,
      recoveryCodesLeft: res.recovery_codes?.length ?? res.recovery_codes_left,
      settings: res.settings ?? null,
      profiles: res.profiles ?? [],
    };
    if (res.recovery_codes && onCodes) onCodes(res.recovery_codes, () => login(session));
    else login(session);
  };
}

function useSubmit(call, fallback, onCodes = null) {
  const finish = useFinish(onCodes);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (form) => {
    setLoading(true);
    setError("");
    try {
      finish(await call(form));
    } catch (e) {
      setError(errorMessage(e, fallback));
    }
    setLoading(false);
  };
  return { error, loading, submit, setError, finish };
}

function RecoverAccount({ onBack }) {
  const [form, setForm] = useState({ email: "", code: "", new_password: "" });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const recover = async () => {
    setBusy(true);
    try {
      setStatus({ ok: true, msg: (await api.recover(form)).message });
    } catch (e) {
      setStatus({ ok: false, msg: errorMessage(e, "Could not change the password. Please try again.") });
    }
    setBusy(false);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <AuthLayout heading="Recover your account">
      <p className="text-sm text-muted-foreground">
        Use one of the recovery codes you saved when you created your account.
      </p>
      {status && <Alert variant={status.ok ? "default" : "destructive"}>{status.msg}</Alert>}
      <Field
        id="recover-email"
        label="Email"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={set("email")}
      />
      <Field
        id="recover-code"
        label="Recovery code"
        autoComplete="one-time-code"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        className="font-mono"
        value={form.code}
        onChange={set("code")}
      />
      <Field
        id="recover-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 10 characters"
        value={form.new_password}
        onChange={set("new_password")}
      />
      <Button onClick={recover} disabled={!form.email || !form.code || !form.new_password || busy}>
        {busy ? "Saving…" : "Set new password"}
      </Button>
      <Button variant="link" className="h-auto p-0" onClick={onBack}>
        Back to sign in
      </Button>
    </AuthLayout>
  );
}

function SaveCodes({ codes, onContinue }) {
  const [saved, setSaved] = useState(false);
  return (
    <AuthLayout heading="Save your recovery codes">
      <SaveCodesNotice />
      <CodeList codes={codes} />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--primary)]"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        I've saved these codes somewhere safe
      </label>
      <Button onClick={onContinue} disabled={!saved}>
        Continue
      </Button>
    </AuthLayout>
  );
}

// Sign-in and sign-up read the fields when the form is submitted, not from React state: autofill
// and password managers can fill a field without the change event a controlled input needs, and
// the next render then wiped the field and sent "" (2026-11-12: "An email address must have an
// @-sign"). A real <form> also gives Enter-to-submit, the browser's own email check and lets
// password managers offer to save the new account.
function AuthForm({ onSubmit, children }) {
  const handle = (e) => {
    e.preventDefault();
    onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
  };
  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      {children}
    </form>
  );
}

function LoginPage({ onForgot, onCodes }) {
  const { error, loading, submit, setError, finish } = useSubmit(
    api.login,
    "Login failed. Please try again.",
    onCodes,
  );
  return (
    <AuthLayout heading="Sign in to your account">
      {error && <Alert variant="destructive">{error}</Alert>}
      <AuthForm onSubmit={submit}>
        <Field
          id="login-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <Field
          id="login-password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </AuthForm>
      <GoogleSignIn onResult={finish} onError={setError} />
      <Button variant="link" className="h-auto self-center p-0 text-sm" onClick={onForgot}>
        Forgot password?
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link to="/demo" className="text-primary underline-offset-4 hover:underline">
          See an example result
        </Link>
      </p>
    </AuthLayout>
  );
}

function RegisterPage({ onCodes }) {
  const { error, loading, submit, setError, finish } = useSubmit(
    api.register,
    "Registration failed. Please try again.",
    onCodes,
  );
  return (
    <AuthLayout heading="Create your account">
      {error && <Alert variant="destructive">{error}</Alert>}
      <AuthForm onSubmit={submit}>
        <Field id="register-name" name="full_name" label="Full name" type="text" autoComplete="name" />
        <Field
          id="register-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <Field
          id="register-password"
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 10 characters"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </AuthForm>
      <GoogleSignIn onResult={finish} onError={setError} />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthGate({ children }) {
  const { user, expired } = useAuth();
  const { pathname } = useLocation();
  // /signup and /signin pick the form; recovering a password and saving codes are steps within it,
  // forgotten when the address changes.
  const [step, setStep] = useState({ path: null, name: null, codes: null });
  if (user) return children;
  if (pathname === "/" && !expired) return <Landing />;
  const current = step.path === pathname ? step : { name: null };
  const go = (name, codes = null) => setStep({ path: pathname, name, codes });
  return (
    <AuthScreen>
      {current.name === "codes" && <SaveCodes codes={current.codes.list} onContinue={current.codes.go} />}
      {current.name === "forgot" && <RecoverAccount onBack={() => go(null)} />}
      {!current.name &&
        (pathname === "/signup" ? (
          <RegisterPage onCodes={(list, done) => go("codes", { list, go: done })} />
        ) : (
          <LoginPage
            onForgot={() => go("forgot")}
            onCodes={(list, done) => go("codes", { list, go: done })}
          />
        ))}
    </AuthScreen>
  );
}
