import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, DownloadSimple, Trash } from "@phosphor-icons/react";
import { api, downloadReport, errorMessage, formatDate } from "@/api/client";
import { KneeCurves } from "@/components/knee-curves";
import { StrideReplay } from "@/components/stride-replay";
import { ShareCard } from "@/components/share-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MeasurementTable, ResultHeadline, PassTable, QualitySummary } from "@/measurements";

function Labels({ session }) {
  const [notes, setNotes] = useState(session.notes ?? "");
  const [tags, setTags] = useState((session.tags ?? []).join(", "));
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const out = await api.labelSession(session.id, {
        notes,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setNotes(out.notes ?? "");
      setTags((out.tags ?? []).join(", "));
      setStatus({ ok: true, msg: "Saved." });
    } catch (e) {
      setStatus({ ok: false, msg: errorMessage(e, "Could not save. Please try again.") });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes and tags</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-2">
          <Label htmlFor="session-notes">Notes</Label>
          <Textarea
            id="session-notes"
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="session-tags">Tags (comma-separated)</Label>
          <Input
            id="session-tags"
            autoComplete="off"
            placeholder="new shoes, morning…"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save notes"}
          </Button>
          {status && (
            <p role="status" className={status.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
              {status.msg}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteSession({ id }) {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const remove = async () => {
    try {
      await api.deleteSession(id);
      navigate("/history");
    } catch (e) {
      setError(errorMessage(e, "Could not delete the session. Please try again."));
    }
  };
  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="destructive">{error}</Alert>}
      {asking ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Delete this session and its measurements for good?</span>
          <Button variant="destructive" size="sm" onClick={remove}>
            Yes, delete it
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAsking(false)}>
            Keep it
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-destructive"
          onClick={() => setAsking(true)}
        >
          <Trash aria-hidden />
          Delete this session
        </Button>
      )}
    </div>
  );
}

export function SessionScreen() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSession(null);
    api
      .session(id)
      .then(setSession)
      .catch((e) => setError(errorMessage(e, "Could not load this session.")));
  }, [id]);

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link to="/history">
          <ArrowLeft aria-hidden />
          All sessions
        </Link>
      </Button>
      {error && <Alert variant="destructive">{error}</Alert>}
      {!session && !error && (
        <div className="h-40 animate-pulse rounded-lg bg-muted" aria-label="Loading session" />
      )}
      {session && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{formatDate(session.created_at)}</h1>
            {!session.legacy && (
              <Button size="sm" onClick={() => downloadReport(session.id)}>
                <DownloadSimple aria-hidden />
                Download PDF report
              </Button>
            )}
          </div>
          {session.legacy ? (
            <Alert>{session.note}</Alert>
          ) : (
            <>
              <ResultHeadline result={session.result} />
              <MeasurementTable result={session.result} />
              <KneeCurves series={[{ label: "This session", result: session.result }]} />
              <StrideReplay
                series={[{ label: "This session", outline: session.result?.curves?.stride_outline }]}
              />
              <PassTable result={session.result} />
              <QualitySummary quality={session.result?.quality} />
            </>
          )}
          <Labels session={session} />
          {!session.legacy && <ShareCard sessionId={session.id} />}
          <DeleteSession id={session.id} />
        </>
      )}
    </div>
  );
}
