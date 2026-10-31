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
  submitAnalysis: async (video: File, calibration?: Calibration) => {
    const form = new FormData();
    form.append("video", video);
    for (const [k, v] of Object.entries(calibration ?? {})) form.append(k, String(v));
    return (await axios.post<JobQueued>(`${API}/analyses`, form)).data;
  },
  analysisStatus: async (jobId: string) => (await axios.get<JobStatus>(`${API}/analyses/${jobId}`)).data,
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
export const polling = { intervalMs: 1500 }; // tests shorten it

// Poll a queued analysis until it finishes: at once, then every `intervalMs`.
export async function waitForAnalysis(
  jobId: string,
  onStatus: (s: JobStatus) => void = () => {},
  intervalMs = polling.intervalMs,
): Promise<JobStatus> {
  for (;;) {
    const status = await api.analysisStatus(jobId);
    onStatus(status);
    if (TERMINAL.has(status.status)) return status;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

type Detail = string | { code?: string; message?: string } | { msg: string }[] | undefined;

// One place to turn an API error into text a person can read.
export function errorMessage(err: unknown, fallback: string): string {
  const res = (err as AxiosError<{ detail?: Detail }>)?.response;
  if (!res) return fallback;
  const detail = res.data?.detail;
  if (typeof detail === "string") return detail;
  // Quality gate / calibration rejections: { code, message }
  if (detail && !Array.isArray(detail) && typeof detail.message === "string") return detail.message;
  // FastAPI validation errors: [{ msg, loc, ... }]
  if (Array.isArray(detail) && detail[0]?.msg) return detail.map((d) => d.msg).join(" ");
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
