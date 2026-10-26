import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowClockwise, DownloadSimple, Tray } from "@phosphor-icons/react";
import { API, downloadReport, errorMessage, formatDate } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CadenceTrend, SessionSummary } from "@/measurements";

export function SessionList({ sessions }) {
  return (
    <ul className="divide-y rounded-lg border bg-surface">
      {sessions.map((s) => (
        <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            {s.patient_name && <div className="text-sm font-medium">{s.patient_name}</div>}
            <div className="text-xs text-muted-foreground">{formatDate(s.created_at)}</div>
            <SessionSummary session={s} />
          </div>
          {!s.legacy && (
            <Button variant="ghost" size="sm" onClick={() => downloadReport(s.id)}>
              <DownloadSimple aria-hidden />
              Download report
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
      <Tray size={28} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="max-w-[45ch] text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

function JoinClinicianCard() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.length !== 6) {
      setStatus({ type: "error", msg: "Code must be 6 characters" });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await axios.post(`${API}/patient/join`, { code });
      setStatus({ type: "success", msg: res.data.message });
      setCode("");
    } catch (e) {
      setStatus({ type: "error", msg: errorMessage(e, "Failed to join") });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share with a clinician</CardTitle>
        <CardDescription>
          If your physiotherapist or doctor uses GaitScan, enter their invite code to share your sessions with
          them.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status && (
          <Alert variant={status.type === "success" ? "default" : "destructive"}>{status.msg}</Alert>
        )}
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            aria-label="Invite code"
            placeholder="6-character code"
            className="tabular max-w-48 uppercase tracking-[0.3em]"
          />
          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "Joining..." : "Join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HistoryScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/sessions`);
      setSessions(res.data || []);
    } catch {
      setSessions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Session history</h1>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          <ArrowClockwise aria-hidden />
          Refresh
        </Button>
      </div>
      {loading && (
        <div className="grid gap-3" aria-label="Loading history">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}
      {!loading && sessions.length === 0 && (
        <EmptyState title="No sessions yet.">
          Analyse a video to start tracking your walking over time.
        </EmptyState>
      )}
      {!loading && <CadenceTrend sessions={sessions} />}
      {!loading && sessions.length > 0 && <SessionList sessions={sessions} />}
      <JoinClinicianCard />
    </div>
  );
}
