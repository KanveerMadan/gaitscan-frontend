// The consent text, shown when the server asks for consent before an analysis (ADR-007).
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConsentCard({ onAccepted, onCancel }) {
  const [consent, setConsent] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .consent()
      .then(setConsent)
      .catch((e) => setError(errorMessage(e, "Could not load the consent text.")));
  }, []);

  const accept = async () => {
    setSaving(true);
    try {
      await api.acceptConsent(consent.version);
      onAccepted();
    } catch (e) {
      setError(errorMessage(e, "Could not save your consent. Please try again."));
      setSaving(false);
    }
  };

  return (
    <Card role="region" aria-label="Consent">
      <CardHeader>
        <CardTitle>Before your first analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        {consent && (
          <div className="max-w-[70ch] whitespace-pre-line rounded-md bg-muted px-4 py-3 text-sm leading-relaxed">
            {consent.text}
          </div>
        )}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={!consent}
          />
          I have read this and I agree
        </label>
        <div className="flex gap-2">
          <Button onClick={accept} disabled={!agreed || !consent || saving}>
            {saving ? "Saving…" : "Agree and analyse"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
