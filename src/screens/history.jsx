import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowClockwise, ArrowsLeftRight, DownloadSimple } from "@phosphor-icons/react";
import { api, downloadReport, errorMessage, formatDate } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CadenceTrend } from "@/components/cadence-trend";
import { useAuth } from "@/auth-context";
import { nextTestDue } from "@/lib/reminders";
import { ReminderButton } from "@/screens/settings";
import { SessionSummary } from "@/measurements";
import { isTreadmill } from "@/lib/results";
import { cn } from "@/lib/utils";
import { EmptyState, LoadError } from "@/components/states";
import { ListSkeleton } from "@/components/ui/skeleton";

// sessions: newest first. `linkTo(s)` makes each date a link; `selected`/`onToggle` add checkboxes.
export function SessionList({ sessions, linkTo, selected, onToggle }) {
  return (
    <ul aria-label="Sessions" className="divide-y rounded-lg border bg-surface">
      {sessions.map((s) => {
        const date = formatDate(s.created_at);
        return (
          <li key={s.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
            {onToggle && !s.legacy && (
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--primary)]"
                aria-label={`Select ${date}`}
                checked={selected?.includes(s.id) ?? false}
                onChange={() => onToggle(s.id)}
              />
            )}
            <div className="min-w-0 flex-1">
              {linkTo && !s.legacy ? (
                <Link to={linkTo(s)} className="text-sm font-medium hover:underline">
                  {date}
                </Link>
              ) : (
                <div className="text-sm font-medium">{date}</div>
              )}
              <SessionSummary session={s} />
              {(s.tags?.length > 0 || s.notes) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {s.tags?.map((t) => (
                    <Badge key={t} variant="muted">
                      {t}
                    </Badge>
                  ))}
                  {s.notes && <span className="truncate text-xs text-muted-foreground">{s.notes}</span>}
                </div>
              )}
            </div>
            {!s.legacy && (
              <Button variant="ghost" size="sm" onClick={() => downloadReport(s.id)}>
                <DownloadSimple aria-hidden />
                Download report
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function daysAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function Latest({ session }) {
  const m = session.result?.metrics ?? {};
  const tiles = [
    ["Cadence", m.cadence],
    ["Step time", m.step_time],
  ];
  return (
    <Card role="region" aria-label="Latest results">
      <CardHeader>
        <CardTitle>Latest results</CardTitle>
        <CardDescription>
          Last test {formatDate(session.created_at, false)} ({daysAgo(session.created_at)})
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {tiles.map(([label, item]) => (
          <div key={label}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="tabular mt-1 text-2xl font-semibold">
              {item?.value ?? "-"}{" "}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{item?.unit}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NextTest({ latest }) {
  const { user } = useAuth();
  const weeks = user?.settings?.retest_weeks ?? null;
  const due = nextTestDue(latest?.created_at, weeks);
  const [now] = useState(() => Date.now()); // read once: rendering stays pure
  const days = due ? Math.ceil((due.getTime() - now) / 86_400_000) : null;
  return (
    <Card role="region" aria-label="Next walking test">
      <CardHeader>
        <CardTitle>Next walking test</CardTitle>
        <CardDescription>
          {!weeks && "Measuring at regular intervals is how changes show up."}
          {weeks && !due && "Due once you've done your first test."}
          {due &&
            `Due ${formatDate(due.toISOString(), false)} (${
              days > 1
                ? `in ${days} days`
                : days === 1
                  ? "tomorrow"
                  : days === 0
                    ? "today"
                    : `${-days} days ago`
            }), ${weeks === 1 ? "a week" : `${weeks} weeks`} after your last test.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {due ? (
          <ReminderButton due={due} weeks={weeks} />
        ) : (
          !weeks && (
            <Link to="/settings" className="text-sm font-medium text-primary hover:underline">
              Set a reminder
            </Link>
          )
        )}
      </CardContent>
    </Card>
  );
}

function GoalCard({ latest }) {
  const { user } = useAuth();
  const goal = user?.settings?.goal_cadence ?? null;
  const value = latest?.result?.metrics?.cadence?.value;
  if (goal == null || value == null) return null;
  const diff = value - goal;
  const away = Math.round(Math.abs(diff) * 10) / 10;
  const mdc = latest.result?.accuracy?.cadence?.mdc_95;
  const noise = mdc != null && Math.abs(diff) < mdc;
  return (
    <Card role="region" aria-label="Cadence goal">
      <CardHeader>
        <CardTitle>Cadence goal</CardTitle>
        <CardDescription>Your goal: {goal} steps/min (change it in Settings).</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        <p>
          Your latest walk: <span className="tabular font-medium">{value} steps/min</span>,{" "}
          {away === 0 ? "exactly on your goal" : `${away} steps/min ${diff < 0 ? "below" : "above"} it`}.
        </p>
        {noise && (
          <p className="mt-1 text-muted-foreground">
            That's within measurement noise: two walks by the same person differ by up to {mdc} steps/min.
          </p>
        )}
      </CardContent>
    </Card>
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
      const res = await api.joinClinician({ code });
      setStatus({ type: "success", msg: res.message });
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
            autoComplete="off"
            spellCheck={false}
            placeholder="6-character code"
            className="tabular max-w-48 uppercase tracking-[0.3em]"
          />
          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "Joining…" : "Join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HistoryScreen() {
  const { user } = useAuth();
  const [allSessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true); // no "no sessions yet" flash before the first load
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState(null);
  const profiles = user?.profiles ?? [];
  const [who, setWho] = useState(""); // "": the account holder; else a profile's id

  const [failed, setFailed] = useState(false);
  const fetchHistory = async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSessions((await api.sessions()) || []);
    } catch {
      setFailed(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)));
  // One person at a time: trends and goals mixing two people's walking would mean nothing.
  const theirs = allSessions.filter((s) => String(s.profile_id ?? "") === who);
  const sessions = profiles.length > 0 ? theirs : allSessions;
  const latest = sessions.find((s) => !s.legacy && !isTreadmill(s.result)); // the latest walk over the ground
  const tags = [...new Set(sessions.flatMap((s) => s.tags ?? []))].sort();
  const q = query.trim().toLowerCase();
  const shown = sessions.filter(
    (s) =>
      (!tag || s.tags?.includes(tag)) &&
      (!q ||
        [s.notes ?? "", ...(s.tags ?? []), formatDate(s.created_at)].join(" ").toLowerCase().includes(q)),
  );
  const canCompare = selected.length === 2;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Your walking</h1>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          <ArrowClockwise aria-hidden />
          Refresh
        </Button>
      </div>
      {profiles.length > 0 && (
        <div className="grid max-w-xs gap-2">
          <label htmlFor="whose-walking" className="text-sm font-medium">
            Whose walking
          </label>
          <select
            id="whose-walking"
            className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
            value={who}
            onChange={(e) => {
              setWho(e.target.value);
              setSelected([]);
            }}
          >
            <option value="">You</option>
            {profiles.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {loading && <ListSkeleton label="Loading history" />}
      {!loading && failed && <LoadError message="Couldn't load your sessions." onRetry={fetchHistory} />}
      {!loading && !failed && sessions.length === 0 && (
        <EmptyState title="No sessions yet.">
          Analyse a video to start tracking your walking over time.
        </EmptyState>
      )}
      {!loading && latest && <Latest session={latest} />}
      {!loading && <GoalCard latest={latest} />}
      {!loading && <NextTest latest={latest} />}
      {!loading && <CadenceTrend sessions={sessions} goal={user?.settings?.goal_cadence ?? null} />}
      {!loading && sessions.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Sessions">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Sessions</h2>
            <Button asChild={canCompare} size="sm" variant="outline" disabled={!canCompare}>
              {canCompare ? (
                <Link to={`/compare/${selected[0]}/${selected[1]}`}>
                  <ArrowsLeftRight aria-hidden />
                  Compare selected
                </Link>
              ) : (
                <span className={cn(!canCompare && "text-muted-foreground")}>
                  Select two sessions to compare
                </span>
              )}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="search"
              aria-label="Search sessions"
              placeholder="Search notes, tags or dates"
              className="sm:max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Filter by tag" role="group">
                {tags.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={tag === t ? "default" : "outline"}
                    aria-pressed={tag === t}
                    onClick={() => setTag(tag === t ? null : t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {shown.length > 0 ? (
            <SessionList
              sessions={shown}
              linkTo={(s) => `/sessions/${s.id}`}
              selected={selected}
              onToggle={toggle}
            />
          ) : (
            <EmptyState title="No sessions match.">Try other words, or clear the tag filter.</EmptyState>
          )}
        </section>
      )}
      <JoinClinicianCard />
    </div>
  );
}
