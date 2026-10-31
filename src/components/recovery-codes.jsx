// Recovery codes (backend app/api/auth.py): the only way back into an account after a forgotten
// password, since GaitScan sends no email. Shown once; the server keeps only their hashes.
import { useState } from "react";
import { Copy, DownloadSimple, Key } from "@phosphor-icons/react";
import { api, errorMessage } from "@/api/client";
import { useAuth } from "@/auth-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CODES_IN_A_SET = 8;

export function CodeList({ codes }) {
  const [copied, setCopied] = useState(false);
  const text = `GaitScan recovery codes (each works once)\n\n${codes.join("\n")}\n`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "gaitscan-recovery-codes.txt",
    });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-3">
      <ol
        aria-label="Recovery codes"
        className="grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-md border bg-muted p-4 font-mono text-sm sm:grid-cols-2"
      >
        {codes.map((c) => (
          <li key={c} className="tabular">
            {c}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <DownloadSimple aria-hidden />
          Download
        </Button>
      </div>
    </div>
  );
}

export function SaveCodesNotice() {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      GaitScan doesn't send email, so these codes are how you get back in if you forget your password. Each
      works once. Keep them somewhere safe, away from this device. Without your password or a code, the
      account can't be recovered.
    </p>
  );
}

/** Asks for the password, then shows a new set (replacing any earlier one). */
export function MakeCodes({ onDone }) {
  const { user, login } = useAuth();
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const make = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.makeRecoveryCodes(password);
      setCodes(res.recovery_codes);
      login({ ...user, recoveryCodesLeft: res.recovery_codes.length });
    } catch (err) {
      setError(errorMessage(err, "Could not make the codes. Please try again."));
    }
    setBusy(false);
  };
  if (codes)
    return (
      <div className="flex flex-col gap-3">
        <SaveCodesNotice />
        <CodeList codes={codes} />
        {onDone && (
          <Button size="sm" className="self-start" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    );
  return (
    <form onSubmit={make} className="flex flex-col gap-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="grid max-w-sm gap-2">
        <Label htmlFor="codes-password">Your password</Label>
        <Input
          id="codes-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" className="self-start" disabled={!password || busy}>
        <Key aria-hidden />
        {busy ? "Making…" : "Make codes"}
      </Button>
    </form>
  );
}

/** Shown in the app while the account has no unused codes (accounts made before codes existed). */
export function RecoveryPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Stays open after making codes, so the new set can be saved before it goes.
  if (hidden || (!open && user?.recoveryCodesLeft !== 0)) return null;
  return (
    <div role="region" aria-label="Recovery codes" className="border-b bg-warning-soft">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="mr-auto">
            You have no recovery codes. Without them, a forgotten password can't be recovered.
          </p>
          {!open && (
            <Button size="sm" onClick={() => setOpen(true)}>
              Create recovery codes
            </Button>
          )}
        </div>
        {open && <MakeCodes onDone={() => setHidden(true)} />}
      </div>
    </div>
  );
}
