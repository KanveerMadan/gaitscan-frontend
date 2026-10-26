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

export const API: string = import.meta.env.VITE_API_BASE_URL;

export type Calibration = Partial<
  Record<"calib_x1" | "calib_y1" | "calib_x2" | "calib_y2" | "calib_distance_m", number>
>;

export const api = {
  login: async (body: S["LoginRequest"]) => (await axios.post<TokenResponse>(`${API}/auth/login`, body)).data,
  register: async (body: S["RegisterRequest"]) =>
    (await axios.post<TokenResponse>(`${API}/auth/register`, body)).data,
  changePassword: async (body: S["ChangePasswordRequest"]) =>
    (await axios.post<{ message?: string }>(`${API}/auth/change-password`, body)).data,
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

// Poll a queued analysis until it finishes: at once, then every `intervalMs`.
export async function waitForAnalysis(
  jobId: string,
  onStatus: (s: JobStatus) => void = () => {},
  intervalMs = 1500,
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
