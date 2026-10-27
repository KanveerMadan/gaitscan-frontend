// Read-only links to one session (backend app/api/shares.py): the link is shown once, when created.
import { useEffect, useState } from "react";
import { Copy, LinkSimple } from "@phosphor-icons/react";
import { api, errorMessage, formatDate } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ShareCard({ sessionId }) {
  const [shares, setShares] = useState([]);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    api
      .shares(sessionId)
      .then(setShares)
      .catch(() => setShares([]));
  useEffect(() => {
    load();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setError(null);
    try {
      setCreated(await api.createShare(sessionId, 7));
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not create a link. Please try again."));
    }
  };
  const revoke = async (id) => {
    try {
      await api.revokeShare(id);
      if (created?.id === id) setCreated(null);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not withdraw the link. Please try again."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share</CardTitle>
        <CardDescription>
          A read-only link to these measurements (no name, email or notes), valid for 7 days. Anyone with the
          link can open it until it expires or you withdraw it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <Alert variant="destructive">{error}</Alert>}
        <Button variant="outline" className="self-start" onClick={create}>
          <LinkSimple aria-hidden />
          Create a link
        </Button>
        {created && (
          <div className="flex gap-2">
            <Input readOnly value={created.url} aria-label="Share link" className="tabular text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigator.clipboard?.writeText(created.url)}
              aria-label="Copy link"
            >
              <Copy aria-hidden />
            </Button>
          </div>
        )}
        {shares.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {shares.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>Created {formatDate(s.created_at)}</span>
                {s.revoked ? (
                  <Badge variant="muted">Withdrawn</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => revoke(s.id)}>
                    Withdraw
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
