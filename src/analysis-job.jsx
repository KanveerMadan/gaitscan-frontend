// The analysis in progress, kept above the pages (2026-11-12): it used to live in the Analyse page's
// state, so opening Settings mid-analysis threw away the upload's job id and the page came back
// empty, while the server finished the job anyway. Here the job outlives the page: you can move
// around the app (a note in the page says how it is going), and its job id is kept in sessionStorage,
// so reloading the tab picks it up again. The server needs nothing new: POST /analyses already
// returns a job id and GET /analyses/{id} its status.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { api, AnalysisWaitError, errorMessage, waitForAnalysis } from "@/api/client";
import { AnalysisContext, useAnalysis } from "@/analysis-context";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";

const SAVED = "gaitscan_job";
const IDLE = { stage: "upload", progress: "", results: null, error: null, needsConsent: null };
const PROGRESS = {
  queued: "Waiting for the analysis to start…",
  running: "Finding the body in every frame and measuring the steps…",
};
const FAILED = "Analysis failed. Please try again.";
const NOT_SENT = "The upload didn't reach the server. Check your connection and try again.";
const DONE_NOTE = "Your walk has been measured.";
const FAILED_NOTE = "Your video couldn't be measured: see why.";

// Storage can be unavailable (private windows, blocked site data): the job then lasts as long as the
// page does.
function savedJob() {
  try {
    return JSON.parse(sessionStorage.getItem(SAVED))?.jobId ?? null;
  } catch {
    return null;
  }
}
function saveJob(jobId) {
  try {
    if (jobId) sessionStorage.setItem(SAVED, JSON.stringify({ jobId }));
    else sessionStorage.removeItem(SAVED);
  } catch {
    /* nothing to keep it in */
  }
}

export function AnalysisProvider({ children }) {
  const [job, setJob] = useState(() =>
    savedJob() ? { ...IDLE, stage: "processing", progress: "Checking on your analysis…" } : IDLE,
  );
  const [seen, setSeen] = useState(true); // the outcome has been shown on the Analyse page
  const [notifying, setNotifying] = useState(false);
  const notifyRef = useRef(false);
  const watching = useRef(false); // the Analyse page is open
  const run = useRef({ id: 0, ctrl: null }); // only the latest upload's poll may change anything

  const notify = (body) => {
    const away = typeof document !== "undefined" && (document.hidden || !watching.current);
    if (notifyRef.current && away && Notification.permission === "granted")
      new Notification("GaitScan", { body });
  };

  const follow = async (jobId, { resumed = false } = {}) => {
    run.current.ctrl?.abort();
    const ctrl = new AbortController();
    const id = run.current.id + 1;
    run.current = { id, ctrl };
    const current = () => run.current.id === id;
    saveJob(jobId);
    try {
      const done = await waitForAnalysis(
        jobId,
        (s) => current() && PROGRESS[s.status] && setJob((j) => ({ ...j, progress: PROGRESS[s.status] })),
        ctrl.signal,
      );
      if (!current()) return;
      setSeen(watching.current);
      if (done.status === "done" && done.analysis) {
        setJob({ ...IDLE, stage: "results", results: done.analysis });
        notify(DONE_NOTE);
      } else {
        setJob({ ...IDLE, error: done.rejection?.message || done.error || FAILED });
        notify(FAILED_NOTE);
      }
    } catch (err) {
      if (!current() || err?.reason === "cancelled") return;
      // A job id kept from an earlier sign-in that this account can't see: nothing to report.
      if (resumed && err?.response?.status === 404) {
        setJob(IDLE);
        return;
      }
      setSeen(watching.current);
      setJob({ ...IDLE, error: err instanceof AnalysisWaitError ? err.message : errorMessage(err, FAILED) });
      notify(FAILED_NOTE);
    } finally {
      if (current()) saveJob(null);
    }
  };

  // A job kept from before a reload. Cleanup stops the poll (signing out, or StrictMode's re-mount).
  useEffect(() => {
    const jobId = savedJob();
    if (jobId) follow(jobId, { resumed: true });
    return () => {
      run.current.ctrl?.abort();
      run.current = { id: run.current.id + 1, ctrl: null };
    };
    // once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (file, calibration = null, fields = {}, profileId = null) => {
    run.current.ctrl?.abort();
    const id = run.current.id + 1;
    run.current = { id, ctrl: null };
    setSeen(true);
    setJob({ ...IDLE, stage: "processing", progress: "Uploading video…" });
    let queued;
    try {
      queued = await api.submitAnalysis(file, calibration ?? undefined, profileId, fields);
    } catch (err) {
      if (run.current.id !== id) return;
      if (err?.response?.status === 403 && err.response.data?.detail?.code === "consent_required") {
        setJob({ ...IDLE, stage: "consent", needsConsent: { file, calibration, fields, profileId } });
        return;
      }
      setJob({ ...IDLE, error: err?.response ? errorMessage(err, FAILED) : NOT_SENT });
      return;
    }
    if (run.current.id !== id) return;
    setJob((j) => ({ ...j, progress: PROGRESS.queued }));
    await follow(queued.job_id);
  };

  const askToNotify = async () => {
    notifyRef.current = (await Notification.requestPermission()) === "granted";
    setNotifying(notifyRef.current);
  };

  // The Analyse page runs this while it is open (an effect): the outcome is then seen where it appears.
  const watch = useCallback(() => {
    watching.current = true;
    setSeen(true);
    return () => {
      watching.current = false;
    };
  }, []);

  const value = {
    ...job,
    seen,
    notifying,
    start,
    askToNotify,
    watch,
    reset: () => setJob(IDLE),
    showError: (error) => setJob({ ...IDLE, error }),
  };
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

// On every other page: how the analysis is going, and its outcome until it has been looked at.
export function AnalysisNote() {
  const t = useT();
  const { pathname } = useLocation();
  const { stage, progress, results, error, seen } = useAnalysis();
  if (pathname === "/") return null;
  let text, link;
  if (stage === "processing") [text, link] = [`${t("analyse.analysing")} ${progress}`, "See progress"];
  else if (!seen && results) [text, link] = [DONE_NOTE, "View the result"];
  else if (!seen && error) [text, link] = ["Your video couldn't be measured.", "See why"];
  else return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-sm"
    >
      <span>{text}</span>
      <Button asChild size="sm" variant={stage === "processing" ? "outline" : "default"}>
        <Link to="/">{link}</Link>
      </Button>
    </div>
  );
}
