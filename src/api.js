// API access shared by the screens. A typed client replaces this in Phase 4 (ADR-008).
import axios from "axios";

export const API = import.meta.env.VITE_API_BASE_URL;

// One place to turn an API error into text a person can read.
export function errorMessage(err, fallback) {
  const res = err?.response;
  if (!res) return fallback;
  const detail = res.data?.detail;
  if (typeof detail === "string") return detail;
  // Quality gate / calibration rejections: { code, message }
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
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
export async function downloadReport(id) {
  try {
    const res = await axios.get(`${API}/report/${id}`, { responseType: "blob" });
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

export function formatDate(iso, withTime = true) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
