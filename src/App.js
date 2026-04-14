import { useState } from "react";
import axios from "axios";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const API = "https://gaitscan.onrender.com";

export default function App() {
  const [stage, setStage] = useState("upload");
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");

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
      const res = await axios.post(`${API}/analyze`, form, {
        headers: { "Content-Type": "multipart/form-data" },
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

  const riskColors = { green: "#1D9E75", amber: "#BA7517", red: "#E24B4A" };
  const statusColors = { good: "#1D9E75", mild: "#BA7517", flagged: "#E24B4A" };
  const statusIcons = { good: "✓", mild: "!", flagged: "✕" };

  const symmetryData = results ? [
    { name: "Knee", value: parseFloat(results.scores.knee_symmetry_index), fill: results.scores.knee_symmetry_index < 10 ? "#1D9E75" : results.scores.knee_symmetry_index < 20 ? "#BA7517" : "#E24B4A" },
    { name: "Hip", value: parseFloat(results.scores.hip_symmetry_index), fill: results.scores.hip_symmetry_index < 10 ? "#1D9E75" : results.scores.hip_symmetry_index < 20 ? "#BA7517" : "#E24B4A" },
  ] : [];

  const flexionData = results ? [
    { name: "Left knee", value: parseFloat(results.scores.knee_flexion_range_L), fill: results.scores.knee_flexion_range_L > 50 ? "#1D9E75" : "#E24B4A" },
    { name: "Right knee", value: parseFloat(results.scores.knee_flexion_range_R), fill: results.scores.knee_flexion_range_R > 50 ? "#1D9E75" : "#E24B4A" },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 2rem" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.5 }}>GaitScan</span>
          <span style={{ marginLeft: 10, fontSize: 12, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>Beta</span>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#888" }}>AI Gait Analysis</span>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Upload */}
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
                ["🚶", "Walking", "Normal pace"],
                ["🚶‍♂️", "Brisk walking", "Fast pace"],
                ["🏃", "Running", "Jogging or sprinting"],
                ["🦿", "Limping", "Injury or pain patterns"]
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

        {/* Processing */}
        {stage === "processing" && (
          <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
            <div style={{ width: 56, height: 56, border: "3px solid #E6F1FB", borderTop: "3px solid #378ADD", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 2rem" }} />
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>Analysing your video...</h2>
            <p style={{ fontSize: 14, color: "#888" }}>{progress}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Results */}
        {stage === "results" && results && (
          <div>
            <button onClick={() => { setStage("upload"); setResults(null); }}
              style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#666", marginBottom: 24 }}>
              ← Analyse another video
            </button>

            {/* Activity detected */}
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

            {/* Risk score */}
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
              <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
                {results.risk_meaning}
              </div>
              <div style={{ marginTop: 16 }}>
                <a href={`${API}/report/${jobId}`} target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", background: "#378ADD", color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  Download Full PDF Report
                </a>
              </div>
            </div>

            {/* Findings */}
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

            {/* Charts */}
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

            {/* Recommendations */}
            {results.recommendations.length > 0 && (
              <div style={{ background: "#fffbf0", border: "1px solid #fce8a0", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#854F0B", marginBottom: 12 }}>Recommendations</div>
                {results.recommendations.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#633806", alignItems: "flex-start" }}>
                    <span style={{ marginTop: 1 }}>→</span> {r}
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