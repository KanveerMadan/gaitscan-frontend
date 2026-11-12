// Typed API client (ADR-008): request and response types come from src/api/schema.d.ts, generated from
// the backend's contracts/openapi.json (npm run gen:api; CI fails if they drift). axios carries the
// bearer token set by auth.jsx.
import axios, { type AxiosError } from "axios";
import type { components } from "./schema";

type S = components["schemas"];
export type Result = S["Result"];
export type AnalyzeResponse = S["AnalyzeResponse"];
export type JobQueued = S["JobQueued"];
export type JobStatus = S["JobStatus"];
export type SessionOut = S["SessionOut"];
export type SessionDetail = S["SessionDetail"];
export type PatientSummary = S["PatientSummary"];
export type PatientSessions = S["PatientSessions"];
export type TokenResponse = S["TokenResponse"];
export type SignupResponse = S["SignupResponse"];
export type Settings = S["Settings"];
export type ConsentStatus = S["ConsentStatus"];
export type ShareOut = S["ShareOut"];
export type ShareCreated = S["ShareCreated"];
export type SharedSession = S["SharedSession"];

export const API: string = import.meta.env.VITE_API_BASE_URL;

export type Calibration = Partial<
  Record<"calib_x1" | "calib_y1" | "calib_x2" | "calib_y2" | "calib_distance_m", number>
>;

export const api = {
  login: async (body: S["LoginRequest"]) => (await axios.post<TokenResponse>(`${API}/auth/login`, body)).data,
  register: async (body: S["RegisterRequest"]) =>
    (await axios.post<SignupResponse>(`${API}/auth/register`, body)).data,
  googleSignIn: async (credential: string) =>
    (await axios.post<SignupResponse | TokenResponse>(`${API}/auth/google`, { credential })).data,
  recover: async (body: S["RecoverRequest"]) =>
    (await axios.post<{ message: string }>(`${API}/auth/recover`, body)).data,
  makeRecoveryCodes: async (password: string) =>
    (await axios.post<{ recovery_codes: string[] }>(`${API}/auth/recovery-codes`, { password })).data,
  changePassword: async (body: S["ChangePasswordRequest"]) =>
    (await axios.post<{ message?: string } & Partial<TokenResponse>>(`${API}/auth/change-password`, body))
      .data,
  requestPasswordReset: async (email: string) =>
    (await axios.post<{ message: string }>(`${API}/auth/password-reset`, { email })).data,
  confirmPasswordReset: async (token: string, new_password: string) =>
    (await axios.post<{ message: string }>(`${API}/auth/password-reset/confirm`, { token, new_password }))
      .data,
  verifyEmail: async (token: string) =>
    (await axios.post<{ message: string }>(`${API}/auth/verify-email`, { token })).data,
  settings: async () => (await axios.get<Settings>(`${API}/me/settings`)).data,
  updateSettings: async (body: S["SettingsUpdate"]) =>
    (await axios.patch<Settings>(`${API}/me/settings`, body)).data,
  consent: async () => (await axios.get<ConsentStatus>(`${API}/consent`)).data,
  acceptConsent: async (version: string) =>
    (await axios.post<ConsentStatus>(`${API}/consent`, { version })).data,
  withdrawConsent: async () => (await axios.delete<ConsentStatus>(`${API}/consent`)).data,
  exportData: async () => (await axios.get<Blob>(`${API}/me/export`, { responseType: "blob" })).data,
  deleteSession: async (id: string) => {
    await axios.delete(`${API}/sessions/${id}`);
  },
  shares: async (sessionId: string) =>
    (await axios.get<ShareOut[]>(`${API}/sessions/${sessionId}/shares`)).data,
  createShare: async (sessionId: string, days = 7) =>
    (await axios.post<ShareCreated>(`${API}/sessions/${sessionId}/shares`, { days })).data,
  revokeShare: async (shareId: number) => {
    await axios.delete(`${API}/shares/${shareId}`);
  },
  openShared: async (token: string) => (await axios.post<SharedSession>(`${API}/shared`, { token })).data,
  deleteAccount: async (password: string) => {
    await axios.delete(`${API}/me`, { data: { password } });
  },
  // `fields`: other form fields, e.g. { test: "treadmill", belt_speed_kmh: "4.5" }.
  submitAnalysis: async (
    video: File,
    calibration?: Calibration,
    profileId?: number | null,
    fields: Record<string, string> = {},
  ) => {
    const form = new FormData();
    form.append("video", video);
    for (const [k, v] of Object.entries(calibration ?? {})) form.append(k, String(v));
    if (profileId != null) form.append("profile_id", String(profileId));
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return (await axios.post<JobQueued>(`${API}/analyses`, form, { timeout: polling.uploadTimeoutMs })).data;
  },
  analysisStatus: async (jobId: string, signal?: AbortSignal) =>
    (await axios.get<JobStatus>(`${API}/analyses/${jobId}`, { timeout: polling.requestTimeoutMs, signal }))
      .data,
  comments: async (sessionId: string) =>
    (await axios.get<S["CommentOut"][]>(`${API}/sessions/${sessionId}/comments`)).data,
  addComment: async (sessionId: string, body: string) =>
    (await axios.post<S["CommentOut"]>(`${API}/sessions/${sessionId}/comments`, { body })).data,
  inbox: async () => (await axios.get<S["Inbox"]>(`${API}/clinician/inbox`)).data,
  inboxSeen: async () => {
    await axios.post(`${API}/clinician/inbox/seen`);
  },
  profiles: async () => (await axios.get<S["ProfileOut"][]>(`${API}/profiles`)).data,
  addProfile: async (body: S["ProfileIn"]) =>
    (await axios.post<S["ProfileOut"]>(`${API}/profiles`, body)).data,
  updateProfile: async (id: number, body: S["ProfileUpdate"]) =>
    (await axios.patch<S["ProfileOut"]>(`${API}/profiles/${id}`, body)).data,
  deleteProfile: async (id: number) => {
    await axios.delete(`${API}/profiles/${id}`);
  },
  sessions: async () => (await axios.get<SessionOut[]>(`${API}/sessions`)).data,
  session: async (id: string) => (await axios.get<SessionDetail>(`${API}/sessions/${id}`)).data,
  labelSession: async (id: string, body: S["SessionLabels"]) =>
    (await axios.patch<SessionOut>(`${API}/sessions/${id}`, body)).data,
  joinClinician: async (body: S["JoinRequest"]) =>
    (await axios.post<{ message: string }>(`${API}/patient/join`, body)).data,
  patients: async () => (await axios.get<PatientSummary[]>(`${API}/clinician/patients`)).data,
  patientSessions: async (patientId: number) =>
    (await axios.get<PatientSessions>(`${API}/clinician/patients/${patientId}/sessions`)).data,
  invite: async () => (await axios.post<{ code: string }>(`${API}/clinician/invite`, {})).data,
};

const TERMINAL = new Set(["done", "rejected", "failed"]);
// How long to wait (tests shorten these). A status check that hasn't answered in requestTimeoutMs is
// abandoned. Failed checks (no answer, or 502-504 while Render restarts the server after a deploy or
// running out of memory) are retried for retryForMs; the restarted server then reports the job as
// failed. deadlineMs bounds the whole wait, so the app never shows "Analysing…" forever
// (2026-11-12). Uploads get uploadTimeoutMs: a 100 MB video on a slow phone connection takes minutes.
export const polling = {
  intervalMs: 1500,
  requestTimeoutMs: 20_000,
  retryForMs: 120_000,
  deadlineMs: 15 * 60_000,
  uploadTimeoutMs: 10 * 60_000,
};

export const LOST_CONTACT =
  "We lost contact with the server while your video was being analysed. If the analysis finishes, it " +
  "will be in your History; if it isn't there in a few minutes, please upload the video again.";
export const TOO_LONG =
  "This analysis is taking much longer than it should, so we've stopped waiting. If it finishes, it " +
  "will be in your History; if it isn't, please upload the video again.";

/** Why waitForAnalysis stopped without an outcome: "lost_contact", "too_long" or "cancelled". */
export class AnalysisWaitError extends Error {
  reason: "lost_contact" | "too_long" | "cancelled";
  constructor(reason: AnalysisWaitError["reason"], message = "") {
    super(message);
    this.reason = reason;
  }
}

// A request that may succeed if tried again: no answer at all, or the proxy saying the server is down.
function transient(err: unknown): boolean {
  const status = (err as AxiosError)?.response?.status;
  return status === undefined || status === 502 || status === 503 || status === 504;
}

// axios's own timeout, plus a timer of ours: a request can also hang where axios doesn't see it.
function statusWithin(jobId: string, signal?: AbortSignal): Promise<JobStatus> {
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  signal?.addEventListener("abort", stop, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(Object.assign(new Error("status check timed out"), { code: "ECONNABORTED" }));
    }, polling.requestTimeoutMs);
  });
  return Promise.race([api.analysisStatus(jobId, ctrl.signal), timeout]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  });
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

// Poll a queued analysis until it finishes: at once, then every `intervalMs`. Throws AnalysisWaitError
// when it gives up (see `polling`) or `signal` aborts, and the request's own error for anything a retry
// won't fix (401, 404, 500).
export async function waitForAnalysis(
  jobId: string,
  onStatus: (s: JobStatus) => void = () => {},
  signal?: AbortSignal,
): Promise<JobStatus> {
  const deadline = Date.now() + polling.deadlineMs;
  let failingSince: number | null = null;
  for (;;) {
    if (signal?.aborted) throw new AnalysisWaitError("cancelled");
    try {
      const status = await statusWithin(jobId, signal);
      failingSince = null;
      onStatus(status);
      if (TERMINAL.has(status.status)) return status;
    } catch (err) {
      if (signal?.aborted) throw new AnalysisWaitError("cancelled");
      if (!transient(err)) throw err;
      failingSince ??= Date.now();
      if (Date.now() - failingSince >= polling.retryForMs)
        throw new AnalysisWaitError("lost_contact", LOST_CONTACT);
    }
    if (Date.now() >= deadline) throw new AnalysisWaitError("too_long", TOO_LONG);
    await pause(polling.intervalMs, signal);
  }
}

type Detail =
  string | { code?: string; message?: string } | { msg: string; loc?: (string | number)[] }[] | undefined;

const BAD_EMAIL = "Enter a valid email address, like name@example.com.";

// One place to turn an API error into text a person can read.
export function errorMessage(err: unknown, fallback: string): string {
  const res = (err as AxiosError<{ detail?: Detail }>)?.response;
  if (!res) return fallback;
  const detail = res.data?.detail;
  if (typeof detail === "string") return detail;
  // Quality gate / calibration rejections: { code, message }
  if (detail && !Array.isArray(detail) && typeof detail.message === "string") return detail.message;
  // FastAPI validation errors: [{ msg, loc, ... }]. The validator's wording ("value is not a valid
  // email address: An email address must have an @-sign.") isn't written for people, so name the
  // field when it's the email, otherwise use the form's own message.
  if (Array.isArray(detail)) return detail.some((d) => d?.loc?.at(-1) === "email") ? BAD_EMAIL : fallback;
  if (res.status === 429) {
    const seconds = Number(res.headers?.["retry-after"]);
    const minutes = Math.max(1, Math.round(seconds / 60));
    return Number.isFinite(seconds) && seconds > 0
      ? `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
      : "Too many attempts. Please wait a few minutes and try again.";
  }
  return fallback;
}

// The report endpoint requires the bearer token, so a plain <a href> can't be used.
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The token in a link from an email (#token=...). Reading has no side effect (React may call an
// initializer twice); forgetLinkToken() then removes it from the address bar.
export function takeLinkToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}

export function forgetLinkToken(): void {
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
}

export async function downloadReport(id: string): Promise<void> {
  try {
    const res = await axios.get<Blob>(`${API}/report/${id}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gaitscan_report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.alert("Could not download the report. Please try again.");
  }
}

export function formatDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
