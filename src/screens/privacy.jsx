// Privacy center (ADR-007): consent status and withdrawal, data export, account deletion.
import { useEffect, useState } from "react";
import { DownloadSimple, Trash } from "@phosphor-icons/react";
import { api, errorMessage, formatDate, saveBlob } from "@/api/client";
import { useAuth } from "@/auth-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CODES_IN_A_SET, MakeCodes } from "@/components/recovery-codes";

function ConsentSection() {
  const [consent, setConsent] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api
      .consent()
      .then(setConsent)
      .catch((e) => setError(errorMessage(e, "Could not load your consent.")));
  }, []);
  const withdraw = async () => {
    try {
      setConsent(await api.withdrawConsent());
    } catch (e) {
      setError(errorMessage(e, "Could not withdraw consent. Please try again."));
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consent</CardTitle>
        <CardDescription>You're asked again before your next analysis if you withdraw it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {error && <Alert variant="destructive">{error}</Alert>}
        {consent &&
          (consent.active ? (
            <>
              <p>Consent given {formatDate(consent.accepted_at)}.</p>
              <Button variant="outline" size="sm" className="self-start" onClick={withdraw}>
                Withdraw consent
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">No active consent. New analyses will ask for it first.</p>
          ))}
      </CardContent>
    </Card>
  );
}

function ExportSection() {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      saveBlob(await api.exportData(), "gaitscan-export.json");
    } catch (e) {
      setError(errorMessage(e, "Could not export your data. Please try again."));
    }
    setBusy(false);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          Everything your account holds (sessions with their measurements, notes and tags, consent records) as
          one file.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <Alert variant="destructive">{error}</Alert>}
        <Button variant="outline" className="self-start" onClick={download} disabled={busy}>
          <DownloadSimple aria-hidden />
          {busy ? "Preparing…" : "Download my data"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DeleteAccountSection() {
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [sure, setSure] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      logout();
    } catch (e) {
      setError(errorMessage(e, "Could not delete the account. Please try again."));
      setBusy(false);
    }
  };
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Delete your account</CardTitle>
        <CardDescription>
          Deletes your account, every session and measurement, your notes and consent records, and your links
          with clinicians. This can't be undone; download your data first if you want a copy.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="delete-password">Password</Label>
          <Input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--destructive)]"
            checked={sure}
            onChange={(e) => setSure(e.target.checked)}
          />
          I understand my account and all its data will be deleted permanently
        </label>
        <Button
          variant="destructive"
          className="self-start"
          onClick={remove}
          disabled={!password || !sure || busy}
        >
          <Trash aria-hidden />
          {busy ? "Deleting…" : "Delete my account"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RecoveryCodesSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const left = user?.recoveryCodesLeft;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery codes</CardTitle>
        <CardDescription>
          The way back in if you forget your password: GaitScan doesn't send email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {typeof left === "number" && (
          <p>
            {left} of {CODES_IN_A_SET} recovery codes left.
          </p>
        )}
        {open ? (
          <MakeCodes onDone={() => setOpen(false)} />
        ) : (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
            Make a new set
          </Button>
        )}
        {!open && <p className="text-xs text-muted-foreground">A new set replaces the old one.</p>}
      </CardContent>
    </Card>
  );
}

export function PrivacyScreen() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <ConsentSection />
      <RecoveryCodesSection />
      <ExportSection />
      <DeleteAccountSection />
    </div>
  );
}
