import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line
} from "recharts";

const API = "https://gaitscan.onrender.com";

// ─────────────────────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gaitscan_user")); }
    catch { return null; }
  });

  const login = (userData) => {
    localStorage.setItem("gaitscan_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("gaitscan_user");
    localStorage.removeItem("gaitscan_creds");
    setUser(null);
  };

  useEffect(() => {
  if (user) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
}, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────────────────────
function LoginPage({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
  setLoading(true); setError("");
  try {
    const res = await axios.post(`${API}/auth/login`, form);
    // Save credentials for auto-refresh
    localStorage.setItem("gaitscan_creds", JSON.stringify(form));
    login({ token: res.data.access_token, role: res.data.role, name: res.data.full_name });
  } catch (e) {
    setError(e.response?.data?.detail || "Login failed. Please try again.");
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
          <input style={S.input} type="email" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <button style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p style={S.switchText}>
          Don't have an account?{" "}
          <span style={S.switchLink} onClick={onSwitch}>Create one</span>
        </p>
      </div>
    </div>
  );
}

function RegisterPage({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "patient" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
  setLoading(true); setError("");
  try {
    const res = await axios.post(`${API}/auth/register`, form);
    // Save credentials for auto-refresh
    localStorage.setItem("gaitscan_creds", JSON.stringify({ email: form.email, password: form.password }));
    login({ token: res.data.access_token, role: res.data.role, name: res.data.full_name });
  } catch (e) {
    setError(e.response?.data?.detail || "Registration failed. Please try again.");
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
          <input style={S.input} type="text" placeholder="Dr. Priya Sharma"
            value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="At least 6 characters"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>I am a</label>
          <div style={S.roleRow}>
            {[
              { key: "patient", icon: "🧍", label: "Patient" },
              { key: "clinician", icon: "🩺", label: "Clinician" }
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setForm({ ...form, role: key })}
                style={form.role === key ? S.roleActive : S.roleInactive}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <button style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p style={S.switchText}>
          Already have an account?{" "}
          <span style={S.switchLink} onClick={onSwitch}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

function AuthGate({ children }) {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  if (!user) {
    return showLogin
      ? <LoginPage onSwitch={() => setShowLogin(false)} />
      : <RegisterPage onSwitch={() => setShowLogin(true)} />;
  }
  return children;
}

// ─────────────────────────────────────────────────────────────
// NAVBAR  (replaces the old header)
// ─────────────────────────────────────────────────────────────
function Navbar({ tab, setTab }) {
  const { user, logout } = useAuth();
  const roleColor = user?.role === "clinician" ? "#185FA5" : "#0F6E56";
  const roleBg   = user?.role === "clinician" ? "#E6F1FB" : "#E1F5EE";

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 2rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.5 }}>GaitScan</span>
        <span style={{ marginLeft: 10, fontSize: 12, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>Beta</span>

        {/* Nav tabs */}
        <div style={{ marginLeft: 32, display: "flex", gap: 4 }}>
          {user?.role === "clinician" ? (
            <span style={{ padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#378ADD" }}>
              🩺 Dashboard
            </span>
          ) : (
            [["analyse", "🎥 Analyse"], ["history", "📈 History"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                background: tab === key ? "#378ADD" : "transparent",
                color: tab === key ? "#fff" : "#888",
              }}>{label}</button>
            ))
          )}
        </div>
        {/* User pill + logout */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: roleBg, color: roleColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700
            }}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                {user?.name || "User"}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 500, padding: "1px 6px",
                borderRadius: 6, display: "inline-block",
                background: roleBg, color: roleColor
              }}>
                {user?.role === "clinician" ? "Clinician" : "Patient"}
              </div>
            </div>
          </div>
          <button onClick={logout} style={{
            background: "none", border: "1px solid #e2e8f0", borderRadius: 7,
            padding: "5px 12px", fontSize: 12, color: "#888", cursor: "pointer"
          }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP  (your original logic — completely unchanged)
// ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab]);

  const fetchHistory = async () => {
  setLoadingHistory(true);
  try {
    const res = await axios.get(`${API}/sessions`);
    setSessions(res.data || []);
  } catch {
    setSessions([]);  // 🔥 fallback
  }
  setLoadingHistory(false);
};

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
      setProgress("Extracting body landmarks from every frame...");
      console.log("Token being sent:", axios.defaults.headers.common["Authorization"]);
      const res = await axios.post(`${API}/analyze`, form, {
      onUploadProgress: (e) => {
      if (e.loaded === e.total) setProgress("Classifying activity and analysing gait...");
      }
    });
      setResults(res.data);
      setJobId(res.data.job_id);
      setStage("results");
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed. Please try again.");
      setStage("upload");
    }
  };

  const riskColors   = { green: "#1D9E75", amber: "#BA7517", red: "#E24B4A" };
  const statusColors = { good: "#1D9E75", mild: "#BA7517", flagged: "#E24B4A" };
  const statusIcons  = { good: "✓", mild: "!", flagged: "✕" };

  const symmetryData = results ? [
    { name: "Knee", value: parseFloat(results.scores.knee_symmetry_index), fill: results.scores.knee_symmetry_index < 10 ? "#1D9E75" : results.scores.knee_symmetry_index < 20 ? "#BA7517" : "#E24B4A" },
    { name: "Hip",  value: parseFloat(results.scores.hip_symmetry_index),  fill: results.scores.hip_symmetry_index  < 10 ? "#1D9E75" : results.scores.hip_symmetry_index  < 20 ? "#BA7517" : "#E24B4A" },
  ] : [];

  const flexionData = results ? [
    { name: "Left knee",  value: parseFloat(results.scores.knee_flexion_range_L), fill: results.scores.knee_flexion_range_L > 50 ? "#1D9E75" : "#E24B4A" },
    { name: "Right knee", value: parseFloat(results.scores.knee_flexion_range_R), fill: results.scores.knee_flexion_range_R > 50 ? "#1D9E75" : "#E24B4A" },
  ] : [];

  const trendData = [...sessions].reverse().map(s => ({
    date: new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    risk: s.risk_score,
    knee_si: s.knee_si,
  }));
  // Clinicians go straight to their dashboard
  if (user?.role === "clinician") {
    return (
      <div style={{ minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <Navbar tab="dashboard" setTab={() => {}} />
        <ClinicianDashboard />
      </div>
    );
  }

    return (
      <div style={{ minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <Navbar tab={tab} setTab={setTab} />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── ANALYSE TAB ─────────────────────────────────────────────────── */}
        {tab === "analyse" && (
          <div>
            {stage === "upload" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                  <h1 style={{ fontSize: 34, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>
                    Upload a walking or running video
                  </h1>
                  <p style={{ fontSize: 15, color: "#666", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
                    GaitScan detects whether you're walking, running, or limping — then gives you a plain-English clinical assessment.
                  </p>
                </div>

                {error && (
                  <div style={{ background: "#fff0f0", border: "1px solid #fcc", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#c00", fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => document.getElementById("file-input").click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#378ADD" : "#ddd"}`,
                    borderRadius: 16, padding: "4rem 2rem", textAlign: "center",
                    cursor: "pointer", background: dragOver ? "#f0f7ff" : "#fff", transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎥</div>
                  <p style={{ fontSize: 18, fontWeight: 600, color: "#333", marginBottom: 8 }}>Drop your video here</p>
                  <p style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>or click to browse</p>
                  <div style={{ display: "inline-block", background: "#378ADD", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                    Choose video
                  </div>
                  <p style={{ fontSize: 12, color: "#bbb", marginTop: 16 }}>Supports .mp4 .mov .avi · Phone, CCTV, sports footage · Any angle</p>
                  <input id="file-input" type="file" accept=".mp4,.mov,.avi" style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 24 }}>
                  {[
                    ["🚶",  "Walking",       "Normal pace"],
                    ["🚶‍♂️", "Brisk walking", "Fast pace"],
                    ["🏃",  "Running",        "Jogging or sprinting"],
                    ["🦿",  "Limping",        "Injury or pain patterns"]
                  ].map(([icon, title, desc]) => (
                    <div key={title} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{title}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === "processing" && (
              <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
                <div style={{ width: 56, height: 56, border: "3px solid #E6F1FB", borderTop: "3px solid #378ADD", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 2rem" }} />
                <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>Analysing your video...</h2>
                <p style={{ fontSize: 14, color: "#888" }}>{progress}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {stage === "results" && results && (
              <div>
                <button onClick={() => { setStage("upload"); setResults(null); }}
                  style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#666", marginBottom: 24 }}>
                  ← Analyse another video
                </button>

                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ fontSize: 52 }}>{results.activity.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Activity detected</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e" }}>{results.activity.activity}</div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 4, lineHeight: 1.5 }}>{results.activity.description}</div>
                  </div>
                  <div style={{ textAlign: "center", background: "#f7f8fc", borderRadius: 12, padding: "12px 20px" }}>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Confidence</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#378ADD" }}>{results.activity.confidence}%</div>
                  </div>
                </div>

                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Risk Assessment</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: "#f0f0f0", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 6, transition: "width 1s ease",
                          width: `${results.scores.overall_risk_score}%`,
                          background: riskColors[results.risk_color]
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: riskColors[results.risk_color], minWidth: 70, textAlign: "right" }}>
                      {results.scores.overall_risk_score}/100
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: riskColors[results.risk_color], marginBottom: 8 }}>
                    {results.risk_label}
                  </div>
                  <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{results.risk_meaning}</div>
                  <div style={{ marginTop: 16 }}>
                    <a href={`${API}/report/${jobId}`} target="_blank" rel="noreferrer"
                      style={{ display: "inline-block", background: "#378ADD", color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                      Download Full PDF Report
                    </a>
                  </div>
                </div>

                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Detailed Findings</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {results.findings.map((f, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 14, padding: "14px", borderRadius: 10,
                        background: f.status === "good" ? "#f6fdf9" : f.status === "mild" ? "#fffbf0" : "#fff5f5",
                        border: `1px solid ${f.status === "good" ? "#d0f0e0" : f.status === "mild" ? "#fce8a0" : "#ffd0d0"}`
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          background: statusColors[f.status], color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, marginTop: 2
                        }}>
                          {statusIcons[f.status]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{f.metric}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: statusColors[f.status] }}>{f.value}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{f.plain_english}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Symmetry Index (%)</div>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 16 }}>Lower is better — under 10% is normal</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={symmetryData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 25]} />
                        <Tooltip formatter={(v) => [`${v}%`, "Asymmetry"]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {symmetryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Knee Flexion Range (°)</div>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 16 }}>Higher is better — above 50° is normal for walking</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={flexionData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 120]} />
                        <Tooltip formatter={(v) => [`${v}°`, "Flexion"]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {flexionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {results.recommendations.length > 0 && (
                  <div style={{ background: "#fffbf0", border: "1px solid #fce8a0", borderRadius: 12, padding: "1.25rem", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#854F0B", marginBottom: 12 }}>Recommendations</div>
                    {results.recommendations.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#633806", alignItems: "flex-start" }}>
                        <span style={{ marginTop: 1 }}>→</span> {r}
                      </div>
                    ))}
                  </div>
                )}

                {results.exercises && results.exercises.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      Recommended Exercises
                    </div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
                      Personalised to your specific findings — generated by AI
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {results.exercises.map((ex, i) => (
                        <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: "1.25rem", borderLeft: "3px solid #378ADD" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB",
                                color: "#185FA5", display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0
                              }}>
                                {i + 1}
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{ex.name}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <span style={{
                                fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                                background: ex.difficulty === "Easy" ? "#EAF3DE" : ex.difficulty === "Moderate" ? "#FAEEDA" : "#FAECE7",
                                color:      ex.difficulty === "Easy" ? "#27500A" : ex.difficulty === "Moderate" ? "#633806" : "#712B13"
                              }}>{ex.difficulty}</span>
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#f0f0f0", color: "#666", fontWeight: 500 }}>
                                {ex.muscle}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: "#185FA5", background: "#E6F1FB", padding: "8px 12px", borderRadius: 8, marginBottom: 10, lineHeight: 1.5 }}>
                            <strong>Why for you:</strong> {ex.why}
                          </div>
                          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                            <strong>How to do it:</strong> {ex.instructions}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {tab === "history" && (
          <div>
            {/* ── Join a Clinician ── */}
            <JoinClinicianCard />
            {/* ── existing heading row ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>Session History</h2>
              <button onClick={fetchHistory} style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#555"
              }}>↻ Refresh</button>
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

            {!loadingHistory && (sessions || []).length >= 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Risk Score Over Time</div>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Lower is better</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}/100`, "Risk Score"]} />
                      <Line type="monotone" dataKey="risk" stroke="#E24B4A" strokeWidth={2} dot={{ r: 4 }} name="Risk Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Knee Symmetry Over Time</div>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Lower is better — under 10% is normal</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, "Knee SI"]} />
                      <Line type="monotone" dataKey="knee_si" stroke="#378ADD" strokeWidth={2} dot={{ r: 4 }} name="Knee SI %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!loadingHistory && (sessions || []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(sessions || []).map((s, i) => ( 
                  <div key={s.id} style={{
                    background: "#fff", border: "1px solid #eee", borderRadius: 12,
                    padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: "#E6F1FB",
                        color: "#185FA5", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0
                      }}>
                        {sessions.length - i}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", marginBottom: 3 }}>
                          {s.patient_name} — {s.activity}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {s.created_at && new Date(s.created_at).toLocaleString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, display: "flex", gap: 16 }}>
                          <span>Cadence: <strong>{s.cadence}</strong> steps/min</span>
                          <span>Knee SI: <strong style={{ color: s.knee_si < 10 ? "#1D9E75" : s.knee_si < 20 ? "#BA7517" : "#E24B4A" }}>{s.knee_si}%</strong></span>
                          <span>Hip SI: <strong>{s.hip_si}%</strong></span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: riskColors[s.risk_color] || "#64748b" }}>
                        {s.risk_score}<span style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8" }}>/100</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.risk_label}</div>
                      <a href={`${API}/report/${s.id}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: "#378ADD", textDecoration: "none", marginTop: 4, display: "block" }}>
                        Download report →
                      </a>
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

























// ─────────────────────────────────────────────────────────────
// AUTH PAGE STYLES
// ─────────────────────────────────────────────────────────────
const S = {
  authPage: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#f7f8fc",
    fontFamily: "'Inter', -apple-system, sans-serif", padding: "2rem"
  },
  authCard: {
    background: "#fff", borderRadius: 16, padding: "2.5rem",
    width: "100%", maxWidth: 400,
    border: "1px solid #eee",
    display: "flex", flexDirection: "column", gap: 16
  },
  authLogo: {
    fontSize: 22, fontWeight: 700, color: "#1a1a2e",
    letterSpacing: -0.5, textAlign: "center"
  },
  authBeta: {
    fontSize: 12, background: "#E6F1FB", color: "#185FA5",
    padding: "2px 8px", borderRadius: 10, fontWeight: 500,
    textAlign: "center", width: "fit-content", margin: "-8px auto 0"
  },
  authHeading: {
    fontSize: 18, fontWeight: 700, color: "#1a1a2e",
    margin: "4px 0 0", textAlign: "center"
  },
  authError: {
    background: "#fff0f0", border: "1px solid #fcc",
    borderRadius: 8, padding: "10px 14px",
    color: "#c00", fontSize: 13
  },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#444" },
  input: {
    padding: "10px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 14,
    outline: "none", color: "#1a1a2e",
    fontFamily: "inherit"
  },
  primaryBtn: {
    padding: "11px", borderRadius: 8,
    background: "#378ADD", color: "#fff",
    border: "none", fontSize: 14, fontWeight: 600,
    cursor: "pointer", marginTop: 4
  },
  switchText: { textAlign: "center", fontSize: 13, color: "#888", margin: 0 },
  switchLink: { color: "#378ADD", cursor: "pointer", fontWeight: 600 },
  roleRow: { display: "flex", gap: 10 },
  roleActive: {
    flex: 1, padding: "10px 0", borderRadius: 8,
    background: "#378ADD", color: "#fff",
    border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4
  },
  roleInactive: {
    flex: 1, padding: "10px 0", borderRadius: 8,
    background: "#f8fafc", color: "#64748b",
    border: "1px solid #e2e8f0", cursor: "pointer",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4
  },
};
function ClinicianDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSessions, setPatientSessions] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const riskColors = { green: "#1D9E75", amber: "#BA7517", red: "#E24B4A" };

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
  setLoading(true);
  try {
    const token = JSON.parse(localStorage.getItem("gaitscan_user"))?.token;
    const res = await axios.get(`${API}/clinician/patients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
      setPatients(res.data);
    } catch { setPatients([]); }
    setLoading(false);
  };
  const generateInvite = async () => {
    setGeneratingCode(true);
    try {
      const token = JSON.parse(localStorage.getItem("gaitscan_user"))?.token;
      const res = await axios.post(`${API}/clinician/invite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteCode(res.data.code);
    } catch {}
    setGeneratingCode(false);
  };

  const viewPatient = async (patient) => {
    setSelectedPatient(patient);
    setLoadingSessions(true);
    try {
      const token = JSON.parse(localStorage.getItem("gaitscan_user"))?.token;
      const res = await axios.get(`${API}/clinician/patients/${patient.patient_id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientSessions(res.data);
    } catch {}
    setLoadingSessions(false);
  };
  // trend data derived from patientSessions
  const trendData = patientSessions?.sessions
    ? [...patientSessions.sessions].reverse().map(s => ({
        date: new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        risk: s.risk_score,
        knee_si: s.knee_si
      }))
    : [];

  // ── Patient detail view ──────────────────────────────────────────────
  if (selectedPatient) {
    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <button onClick={() => { setSelectedPatient(null); setPatientSessions(null); }}
          style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#666", marginBottom: 24 }}>
          ← Back to patients
        </button>

        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Patient</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>{selectedPatient.name}</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{selectedPatient.email}</div>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>Sessions: <strong>{selectedPatient.session_count}</strong></div>
            {selectedPatient.flag && (
              <div style={{ fontSize: 12, background: "#fff0f0", color: "#c00", padding: "3px 10px", borderRadius: 20, fontWeight: 600, border: "1px solid #fcc" }}>
                ⚠ Needs attention
              </div>
            )}
          </div>
        </div>

        {loadingSessions && <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Loading sessions...</div>}

        {!loadingSessions && trendData.length >= 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Risk Score Over Time</div>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Lower is better</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}/100`, "Risk"]} />
                  <Line type="monotone" dataKey="risk" stroke="#E24B4A" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Knee Symmetry Over Time</div>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>Lower is better</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Knee SI"]} />
                  <Line type="monotone" dataKey="knee_si" stroke="#378ADD" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loadingSessions && patientSessions?.sessions?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(patientSessions.sessions || []).map((s) => (
              <div key={s.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", marginBottom: 3 }}>{s.activity}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {new Date(s.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, display: "flex", gap: 16 }}>
                    <span>Knee SI: <strong style={{ color: s.knee_si < 10 ? "#1D9E75" : s.knee_si < 20 ? "#BA7517" : "#E24B4A" }}>{s.knee_si}%</strong></span>
                    <span>Hip SI: <strong>{s.hip_si}%</strong></span>
                    <span>Cadence: <strong>{s.cadence}</strong></span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: riskColors[s.risk_color] || "#64748b" }}>
                    {s.risk_score}<span style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8" }}>/100</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.risk_label}</div>
                  <a href={`${API}/report/${s.id}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: "#378ADD", textDecoration: "none", marginTop: 4, display: "block" }}>
                    Download report →
                  </a>
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

  // ── Main dashboard view ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#1a1a2e" }}>Your Patients</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#888" }}>
            {patients.length} patient{patients.length !== 1 ? "s" : ""} linked to your account
          </p>
        </div>
        <button onClick={generateInvite} disabled={generatingCode}
          style={{ background: "#378ADD", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {generatingCode ? "Generating..." : "+ Invite Patient"}
        </button>
      </div>

      {inviteCode && (
        <div style={{ background: "#E6F1FB", border: "1px solid #B5D4F4", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#185FA5", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Invite Code — share with your patient</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#0C447C", letterSpacing: 6 }}>{inviteCode}</div>
            <div style={{ fontSize: 12, color: "#378ADD", marginTop: 6 }}>Patient enters this in History tab → Join Clinician</div>
          </div>
          <button onClick={() => navigator.clipboard.writeText(inviteCode)}
            style={{ background: "#fff", border: "1px solid #B5D4F4", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#185FA5", cursor: "pointer", fontWeight: 600 }}>
            Copy
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>Loading patients...</div>}

      {!loading && patients.length === 0 && (
        <div style={{ textAlign: "center", padding: "5rem 2rem", color: "#94a3b8" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🩺</div>
          <p style={{ fontSize: 16 }}>No patients yet.</p>
          <p style={{ fontSize: 14 }}>Click "Invite Patient" to generate a code and share it with your first patient.</p>
        </div>
      )}

      {!loading && patients.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {patients.map(p => (
            <div key={p.patient_id} onClick={() => viewPatient(p)}
              style={{ background: "#fff", border: `1px solid ${p.flag ? "#ffd0d0" : "#eee"}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: p.flag ? "#fff0f0" : "#E6F1FB",
                  color: p.flag ? "#c00" : "#185FA5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700
                }}>
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e" }}>{p.name}</span>
                    {p.flag && <span style={{ fontSize: 11, background: "#fff0f0", color: "#c00", padding: "2px 8px", borderRadius: 10, fontWeight: 600, border: "1px solid #fcc" }}>⚠ Needs attention</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{p.email}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                    {p.session_count} session{p.session_count !== 1 ? "s" : ""}
                    {p.latest_activity && ` · Latest: ${p.latest_activity}`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {p.trend && p.trend.length >= 2 && (
                  <div style={{ width: 100, height: 40 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={p.trend}>
                        <Line type="monotone" dataKey="risk" stroke={p.flag ? "#E24B4A" : "#378ADD"} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div style={{ textAlign: "right", minWidth: 60 }}>
                  {p.latest_risk !== null ? (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 800, color: riskColors[p.latest_risk_color] || "#64748b" }}>
                        {p.latest_risk}<span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>/100</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>latest risk</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>No sessions</div>
                  )}
                </div>
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
    if (code.length !== 6) { setStatus({ type: "error", msg: "Code must be 6 characters" }); return; }
    setLoading(true); setStatus(null);
    try {
      const res = await axios.post(`${API}/patient/join`, { code });
      setStatus({ type: "success", msg: res.data.message });
      setCode("");
    } catch (e) {
      setStatus({ type: "error", msg: e.response?.data?.detail || "Failed to join" });
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Join a Clinician</div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
        If your physiotherapist or doctor uses GaitScan, enter their invite code below to share your sessions with them.
      </p>
      {status && (
        <div style={{
          background: status.type === "success" ? "#f6fdf9" : "#fff0f0",
          border: `1px solid ${status.type === "success" ? "#d0f0e0" : "#fcc"}`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 12,
          fontSize: 13, color: status.type === "success" ? "#1D9E75" : "#c00"
        }}>
          {status.msg}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Enter 6-digit code"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            border: "1px solid #e2e8f0", fontSize: 15,
            fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase"
          }}
        />
        <button onClick={handleJoin} disabled={loading} style={{
          background: "#378ADD", color: "#fff", border: "none",
          borderRadius: 8, padding: "10px 20px", fontSize: 14,
          fontWeight: 600, cursor: "pointer"
        }}>
          {loading ? "Joining..." : "Join"}
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <MainApp />
      </AuthGate>
    </AuthProvider>
  );
}