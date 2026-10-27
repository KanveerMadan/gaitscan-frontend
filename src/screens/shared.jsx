// A session opened from a share link: read-only measurements, no account needed.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, errorMessage, forgetLinkToken, formatDate, takeLinkToken } from "@/api/client";
import { Brand, Disclaimer } from "@/components/app-shell";
import { KneeCurves } from "@/components/knee-curves";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MeasurementTable, PassTable, QualitySummary } from "@/measurements";

export function SharedPage() {
  const [token] = useState(takeLinkToken);
  const [shared, setShared] = useState(null);
  const [error, setError] = useState(null);
  useEffect(forgetLinkToken, []);
  useEffect(() => {
    if (!token) {
      setError("This link is incomplete. Please use the whole link you were sent.");
      return;
    }
    api
      .openShared(token)
      .then(setShared)
      .catch((e) => setError(errorMessage(e, "This link couldn't be opened.")));
  }, [token]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Brand />
          <Button asChild variant="outline" size="sm">
            <Link to="/">Sign in</Link>
          </Button>
        </div>
      </header>
      <Disclaimer />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
        {error && <Alert variant="destructive">{error}</Alert>}
        {!shared && !error && <div className="h-40 animate-pulse rounded-lg bg-muted" aria-label="Loading" />}
        {shared && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Walking measurements</h1>
              <p className="text-sm text-muted-foreground">
                Shared with you, read-only. Recorded {formatDate(shared.created_at)}.
              </p>
            </div>
            <MeasurementTable result={shared.result} />
            <KneeCurves series={[{ label: "This session", result: shared.result }]} />
            <PassTable result={shared.result} />
            <QualitySummary quality={shared.result?.quality} />
          </>
        )}
      </main>
    </div>
  );
}
