import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, errorMessage } from "@/api/client";
import { useAuth } from "@/auth-context";
import { CodeList, SaveCodesNotice } from "@/components/recovery-codes";
import { Landing } from "@/screens/landing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The sign-in / register / reset card; the landing page places it beside its hero.
function AuthLayout({ heading, children }) {
  return (
    <div className="w-full rounded-lg border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
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

function useSubmit(call, fallback, then = "", onCodes = null) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (form) => {
    setLoading(true);
    setError("");
    try {
      const res = await call(form);
      const session = {
        token: res.access_token,
        role: res.role,
        name: res.full_name,
        recoveryCodesLeft: res.recovery_codes?.length ?? res.recovery_codes_left,
      };
      if (res.recovery_codes) {
        onCodes?.(res.recovery_codes, () => {
          navigate(then);
          login(session);
        });
      } else {
        if (then) navigate(then);
        login(session);
      }
    } catch (e) {
      setError(errorMessage(e, fallback));
    }
    setLoading(false);
  };
  return { error, loading, submit };
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

function LoginPage({ onSwitch, onForgot }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const { error, loading, submit } = useSubmit(api.login, "Login failed. Please try again.");
  const onKeyDown = (e) => e.key === "Enter" && submit(form);
  return (
    <AuthLayout heading="Sign in to your account">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Field
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        onKeyDown={onKeyDown}
      />
      <Field
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        onKeyDown={onKeyDown}
      />
      <Button onClick={() => submit(form)} disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <Button variant="link" className="h-auto self-center p-0 text-sm" onClick={onForgot}>
        Forgot password?
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Button variant="link" className="h-auto p-0" onClick={onSwitch}>
          Create one
        </Button>
      </p>
      <p className="text-center text-sm">
        <Link to="/demo" className="text-primary underline-offset-4 hover:underline">
          See an example result
        </Link>
      </p>
    </AuthLayout>
  );
}

function RegisterPage({ onSwitch, onCodes }) {
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const { error, loading, submit } = useSubmit(
    api.register,
    "Registration failed. Please try again.",
    "/welcome",
    onCodes,
  );
  return (
    <AuthLayout heading="Create your account">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Field
        id="register-name"
        label="Full name"
        type="text"
        autoComplete="name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
      />
      <Field
        id="register-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <Field
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 10 characters"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <Button onClick={() => submit(form)} disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Button variant="link" className="h-auto p-0" onClick={onSwitch}>
          Sign in
        </Button>
      </p>
    </AuthLayout>
  );
}

export function AuthGate({ children }) {
  const { user } = useAuth();
  const [view, setView] = useState("login"); // login | register | forgot | codes
  const [codes, setCodes] = useState(null); // { list, go } after sign-up
  if (user) return children;
  return (
    <Landing
      card={
        <>
          {view === "login" && (
            <LoginPage onSwitch={() => setView("register")} onForgot={() => setView("forgot")} />
          )}
          {view === "register" && (
            <RegisterPage
              onSwitch={() => setView("login")}
              onCodes={(list, go) => {
                setCodes({ list, go });
                setView("codes");
              }}
            />
          )}
          {view === "forgot" && <RecoverAccount onBack={() => setView("login")} />}
          {view === "codes" && codes && <SaveCodes codes={codes.list} onContinue={codes.go} />}
        </>
      }
    />
  );
}
