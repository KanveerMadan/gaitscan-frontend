import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import {
  CadenceTrend,
  MeasurementTable,
  PassTable,
  QualitySummary,
  SessionSummary,
} from "./measurements.jsx";

const API = import.meta.env.VITE_API_BASE_URL;

// One place to turn an API error into text a person can read.
function errorMessage(err, fallback) {
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
async function downloadReport(id) {
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

const linkButton = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontSize: 11,
  color: "#378ADD",
  marginTop: 4,
  display: "block",
  marginLeft: "auto",
};

const DISCLAIMER =
  "GaitScan is an experimental measurement tool, not a medical device. It does not diagnose " +
  "conditions or predict outcomes, and its measurements have not been clinically validated.";

function Disclaimer() {
  return (
    <div
      role="note"
      style={{
        background: "#FFFBEB",
        borderBottom: "1px solid #FCE8A0",
        color: "#633806",
        fontSize: 12,
        lineHeight: 1.5,
        padding: "8px 16px",
        textAlign: "center",
      }}
    >
      {DISCLAIMER}
    </div>
  );
}

const AuthContext = createContext(null);
function useAuth() {
  return useContext(AuthContext);
}

// Set synchronously (not in an effect) so child components' first requests carry the token.
function setAuthHeader(user) {
  if (user?.token) axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
  else delete axios.defaults.headers.common["Authorization"];
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Earlier versions saved the plaintext password here; remove it from every browser.
    localStorage.removeItem("gaitscan_creds");
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem("gaitscan_user"));
    } catch {
      stored = null;
    }
    setAuthHeader(stored);
    return stored;
  });

  const login = (userData) => {
    localStorage.setItem("gaitscan_user", JSON.stringify(userData));
    setAuthHeader(userData);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("gaitscan_user");
    setAuthHeader(null);
    setUser(null);
  };

  // Tokens expire (12 h); any 401 returns the user to the sign-in screen.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) logout();
        return Promise.reject(err);
      },
    );
    return () => axios.interceptors.response.eject?.(id);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

function LoginPage({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/auth/login`, form);
      login({ token: res.data.access_token, role: res.data.role, name: res.data.full_name });
    } catch (e) {
      setError(errorMessage(e, "Login failed. Please try again."));
    }
    setLoading(false);
  };

  return (
    <div style={S.authPage}>
      <div style={S.authCard}>
        <div style={S.authLogo}>GaitScan</div>
        <div style={S.authBeta}>Beta</div>
        <h2 style={S.authHeading}>Sign in to your account</h2>
        {error && <div style={S.authError}>{error}</div>}
        <div style={S.formGroup}>
          <label style={S.label}>Email</label>
          <input
            style={S.input}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <button
          style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p style={S.switchText}>
          Don't have an account?{" "}
          <span style={S.switchLink} onClick={onSwitch}>
            Create one
          </span>
        </p>
      </div>
    </div>
  );
}

function RegisterPage({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/auth/register`, form);
      login({ token: res.data.access_token, role: res.data.role, name: res.data.full_name });
    } catch (e) {
      setError(errorMessage(e, "Registration failed. Please try again."));
    }
    setLoading(false);
  };

  return (
    <div style={S.authPage}>
      <div style={S.authCard}>
        <div style={S.authLogo}>GaitScan</div>
        <div style={S.authBeta}>Beta</div>
        <h2 style={S.authHeading}>Create your account</h2>
        {error && <div style={S.authError}>{error}</div>}
        <div style={S.formGroup}>
          <label style={S.label}>Full name</label>
          <input
            style={S.input}
            type="text"
            placeholder="Dr. Priya Sharma"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Email</label>
          <input
            style={S.input}
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="At least 10 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button
          style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p style={S.switchText}>
          Already have an account?{" "}
          <span style={S.switchLink} onClick={onSwitch}>
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}

function AuthGate({ children }) {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  if (!user) {
    return (
      <>
        <Disclaimer />
        {showLogin ? (
          <LoginPage onSwitch={() => setShowLogin(false)} />
        ) : (
          <RegisterPage onSwitch={() => setShowLogin(true)} />
        )}
      </>
    );
  }
  return children;
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await axios.post(`${API}/auth/change-password`, form);
      setStatus({ ok: true, msg: res.data?.message || "Password changed." });
      setForm({ current_password: "", new_password: "" });
    } catch (err) {
      setStatus({ ok: false, msg: errorMessage(err, "Could not change the password. Please try again.") });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 920, margin: "0 auto", padding: "12px 0 16px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={S.formGroup}>
          <label style={S.label} htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            style={S.input}
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          />
        </div>
        <div style={S.formGroup}>
          <label style={S.label} htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            style={S.input}
            type="password"
            autoComplete="new-password"
            placeholder="At least 10 characters"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
        </div>
        <button
          type="submit"
          style={{ ...S.primaryBtn, width: "auto", padding: "10px 18px" }}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </div>
      {status && (
        <div role="status" style={{ marginTop: 10, fontSize: 13, color: status.ok ? "#0F6E56" : "#A32D2D" }}>
          {status.msg}
        </div>
      )}
    </form>
  );
}

function Navbar({ tab, setTab }) {
  const { user, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const roleColor = user?.role === "clinician" ? "#185FA5" : "#0F6E56";
  const roleBg = user?.role === "clinician" ? "#E6F1FB" : "#E1F5EE";

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 2rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.5 }}>GaitScan</span>
        <span
          style={{
            marginLeft: 10,
            fontSize: 12,
            background: "#E6F1FB",
            color: "#185FA5",
            padding: "2px 8px",
            borderRadius: 10,
            fontWeight: 500,
          }}
        >
          Beta
        </span>

        {/* Nav tabs */}
        <div style={{ marginLeft: 32, display: "flex", gap: 4 }}>
          {user?.role === "clinician" ? (
            <span style={{ padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#378ADD" }}>
              🩺 Dashboard
            </span>
          ) : (
            [
              ["analyse", "🎥 Analyse"],
              ["history", "📈 History"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s",
                  background: tab === key ? "#378ADD" : "transparent",
                  color: tab === key ? "#fff" : "#888",
                }}
              >
                {label}
              </button>
            ))
          )}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: roleBg,
                color: roleColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{user?.name || "User"}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "1px 6px",
                  borderRadius: 6,
                  display: "inline-block",
                  background: roleBg,
                  color: roleColor,
                }}
              >
                {user?.role === "clinician" ? "Clinician" : "Patient"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPassword((v) => !v)}
            aria-expanded={showPassword}
            style={{
              background: "none",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              padding: "5px 12px",
              fontSize: 12,
              color: "#888",
              cursor: "pointer",
            }}
          >
            Change password
          </button>
          <button
            onClick={logout}
            style={{
              background: "none",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              padding: "5px 12px",
              fontSize: 12,
              color: "#888",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {showPassword && <ChangePasswordForm />}
    </div>
  );
}

function MainApp() {
  const { user } = useAuth();
  const [stage, setStage] = useState("upload");
  const [tab, setTab] = useState("analyse");
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/sessions`);
      setSessions(res.data || []);
    } catch {
      setSessions([]); // 🔥 fallback
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(mp4|mov|avi)$/i)) {
      setError("Please upload a .mp4, .mov or .avi video file.");
      return;
    }
    setError(null);
    setStage("processing");
    setProgress("Uploading video...");
    const form = new FormData();
    form.append("video", file);
    try {
      setProgress("Finding the body in every frame...");
      const res = await axios.post(`${API}/analyze`, form, {
        onUploadProgress: (e) => {
          if (e.loaded === e.total) setProgress("Measuring steps and knee angles...");
        },
      });
      setResults(res.data);
      setJobId(res.data.job_id);
      setStage("results");
    } catch (err) {
      setError(errorMessage(err, "Analysis failed. Please try again."));
      setStage("upload");
    }
  };

  if (user?.role === "clinician") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f8fc",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <Navbar tab="dashboard" setTab={() => {}} />
        <Disclaimer />
        <ClinicianDashboard />
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      <Navbar tab={tab} setTab={setTab} />
      <Disclaimer />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {tab === "analyse" && (
          <div>
            {stage === "upload" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                  <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>
                    Upload a walking video
                  </h1>
                  <p
                    style={{ fontSize: 14, color: "#666", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}
                  >
                    Film from the side, phone held still in landscape, whole body in view, walking across the
                    frame and back. Videos that can't be measured are rejected with the reason.
                  </p>
                </div>

                {error && (
                  <div
                    style={{
                      background: "#fff0f0",
                      border: "1px solid #fcc",
                      borderRadius: 10,
                      padding: "12px 16px",
                      marginBottom: 20,
                      color: "#c00",
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFile(e.dataTransfer.files[0]);
                      }}
                      onClick={() => document.getElementById("file-input").click()}
                      style={{
                        border: `2px dashed ${dragOver ? "#378ADD" : "#ddd"}`,
                        borderRadius: 16,
                        padding: "4rem 2rem",
                        textAlign: "center",
                        cursor: "pointer",
                        background: dragOver ? "#f0f7ff" : "#fff",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🎥</div>
                      <p style={{ fontSize: 18, fontWeight: 600, color: "#333", marginBottom: 8 }}>
                        Drop your video here
                      </p>
                      <p style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>or click to browse</p>
                      <div
                        style={{
                          display: "inline-block",
                          background: "#378ADD",
                          color: "#fff",
                          padding: "10px 24px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Choose video
                      </div>
                      <p style={{ fontSize: 12, color: "#888", marginTop: 16, lineHeight: 1.6 }}>
                        .mp4 .mov .avi, up to 100 MB · Film side-on, phone in landscape, whole body in frame,
                        about 3–4 m away, walking across the camera for 10–20 s
                      </p>
                      <input
                        id="file-input"
                        type="file"
                        accept=".mp4,.mov,.avi"
                        style={{ display: "none" }}
                        onChange={(e) => handleFile(e.target.files[0])}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {stage === "processing" && (
              <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    border: "3px solid #E6F1FB",
                    borderTop: "3px solid #378ADD",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 2rem",
                  }}
                />
                <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>
                  Analysing your video...
                </h2>
                <p style={{ fontSize: 14, color: "#888" }}>{progress}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {stage === "results" && results && (
              <div>
                <button
                  onClick={() => {
                    setStage("upload");
                    setResults(null);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#666",
                    marginBottom: 24,
                  }}
                >
                  ← Analyse another video
                </button>

                <MeasurementTable result={results.result} />
                <PassTable result={results.result} />
                <QualitySummary quality={results.result?.quality} />
                <button
                  onClick={() => downloadReport(jobId)}
                  style={{ ...linkButton, fontSize: 14, marginLeft: 0, display: "inline-block" }}
                >
                  Download PDF report →
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            <JoinClinicianCard />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>Session History</h2>
              <button
                onClick={fetchHistory}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                ↻ Refresh
              </button>
            </div>

            {loadingHistory && (
              <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>Loading history...</div>
            )}

            {!loadingHistory && (sessions || []).length === 0 && (
              <div style={{ textAlign: "center", padding: "5rem 2rem", color: "#94a3b8" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
                <p style={{ fontSize: 16 }}>No sessions yet.</p>
                <p style={{ fontSize: 14 }}>Analyse a video to start tracking your progress.</p>
              </div>
            )}

            {!loadingHistory && <CadenceTrend sessions={sessions} />}

            {!loadingHistory && (sessions || []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(sessions || []).map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#E6F1FB",
                          color: "#185FA5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {sessions.length - i}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", marginBottom: 3 }}>
                          {s.patient_name}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {s.created_at &&
                            new Date(s.created_at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </div>
                        <SessionSummary session={s} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {!s.legacy && (
                        <button onClick={() => downloadReport(s.id)} style={linkButton}>
                          Download report →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  authPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f7f8fc",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: "2rem",
  },
  authCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "2.5rem",
    width: "100%",
    maxWidth: 400,
    border: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  authLogo: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a2e",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  authBeta: {
    fontSize: 12,
    background: "#E6F1FB",
    color: "#185FA5",
    padding: "2px 8px",
    borderRadius: 10,
    fontWeight: 500,
    textAlign: "center",
    width: "fit-content",
    margin: "-8px auto 0",
  },
  authHeading: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: "4px 0 0",
    textAlign: "center",
  },
  authError: {
    background: "#fff0f0",
    border: "1px solid #fcc",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#c00",
    fontSize: 13,
  },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#444" },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
    color: "#1a1a2e",
    fontFamily: "inherit",
  },
  primaryBtn: {
    padding: "11px",
    borderRadius: 8,
    background: "#378ADD",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  switchText: { textAlign: "center", fontSize: 13, color: "#888", margin: 0 },
  switchLink: { color: "#378ADD", cursor: "pointer", fontWeight: 600 },
};
function ClinicianDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSessions, setPatientSessions] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem("gaitscan_user"))?.token;
      const res = await axios.get(`${API}/clinician/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients(res.data);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchPatients();
  }, []);
  const generateInvite = async () => {
    setGeneratingCode(true);
    try {
      const token = JSON.parse(localStorage.getItem("gaitscan_user"))?.token;
      const res = await axios.post(
        `${API}/clinician/invite`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setInviteCode(res.data.code);
    } catch {
      /* ponytail: no code is shown; error states arrive with TanStack Query (ADR-008) */
    }
    setGeneratingCode(false);
  };

  const viewPatient = async (patient) => {
    setSelectedPatient(patient);
    setLoadingSessions(true);
    try {
      const token = JSON.parse(localStorage.getItem("gaitscan_user"))?.token;
      const res = await axios.get(`${API}/clinician/patients/${patient.patient_id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatientSessions(res.data);
    } catch {
      /* ponytail: list stays empty; error states arrive with TanStack Query (ADR-008) */
    }
    setLoadingSessions(false);
  };

  if (selectedPatient) {
    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <button
          onClick={() => {
            setSelectedPatient(null);
            setPatientSessions(null);
          }}
          style={{
            background: "none",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 13,
            cursor: "pointer",
            color: "#666",
            marginBottom: 24,
          }}
        >
          ← Back to patients
        </button>

        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 16,
            padding: "1.5rem",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Patient
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>{selectedPatient.name}</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{selectedPatient.email}</div>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Sessions: <strong>{selectedPatient.session_count}</strong>
            </div>
          </div>
        </div>

        {loadingSessions && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Loading sessions...</div>
        )}

        {!loadingSessions && <CadenceTrend sessions={patientSessions?.sessions} />}

        {!loadingSessions && patientSessions?.sessions?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(patientSessions.sessions || []).map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {new Date(s.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <SessionSummary session={s} />
                </div>
                <div style={{ textAlign: "right" }}>
                  {!s.legacy && (
                    <button onClick={() => downloadReport(s.id)} style={linkButton}>
                      Download report →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingSessions && (!patientSessions?.sessions || patientSessions.sessions.length === 0) && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p>No sessions yet for this patient.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#1a1a2e" }}>Your Patients</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#888" }}>
            {patients.length} patient{patients.length !== 1 ? "s" : ""} linked to your account
          </p>
        </div>
        <button
          onClick={generateInvite}
          disabled={generatingCode}
          style={{
            background: "#378ADD",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {generatingCode ? "Generating..." : "+ Invite Patient"}
        </button>
      </div>

      {inviteCode && (
        <div
          style={{
            background: "#E6F1FB",
            border: "1px solid #B5D4F4",
            borderRadius: 14,
            padding: "1.25rem 1.5rem",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#185FA5",
                fontWeight: 600,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Invite Code — share with your patient
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#0C447C", letterSpacing: 6 }}>
              {inviteCode}
            </div>
            <div style={{ fontSize: 12, color: "#378ADD", marginTop: 6 }}>
              Patient enters this in History tab → Join Clinician
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(inviteCode)}
            style={{
              background: "#fff",
              border: "1px solid #B5D4F4",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              color: "#185FA5",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Copy
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>Loading patients...</div>
      )}

      {!loading && patients.length === 0 && (
        <div style={{ textAlign: "center", padding: "5rem 2rem", color: "#94a3b8" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🩺</div>
          <p style={{ fontSize: 16 }}>No patients yet.</p>
          <p style={{ fontSize: 14 }}>
            Click "Invite Patient" to generate a code and share it with your first patient.
          </p>
        </div>
      )}

      {!loading && patients.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {patients.map((p) => (
            <div
              key={p.patient_id}
              onClick={() => viewPatient(p)}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 14,
                padding: "18px 20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "#E6F1FB",
                    color: "#185FA5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e" }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{p.email}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                    {p.session_count} session{p.session_count !== 1 ? "s" : ""}
                    {p.latest_session_at &&
                      ` · Latest: ${new Date(p.latest_session_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <span style={{ color: "#ccc", fontSize: 18 }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 16,
        padding: "1.5rem",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        Join a Clinician
      </div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
        If your physiotherapist or doctor uses GaitScan, enter their invite code below to share your sessions
        with them.
      </p>
      {status && (
        <div
          style={{
            background: status.type === "success" ? "#f6fdf9" : "#fff0f0",
            border: `1px solid ${status.type === "success" ? "#d0f0e0" : "#fcc"}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: status.type === "success" ? "#1D9E75" : "#c00",
          }}
        >
          {status.msg}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Enter 6-digit code"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 15,
            fontFamily: "monospace",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        />
        <button
          onClick={handleJoin}
          disabled={loading}
          style={{
            background: "#378ADD",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Joining..." : "Join"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <MainApp />
      </AuthGate>
    </AuthProvider>
  );
}
