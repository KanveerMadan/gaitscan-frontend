import { useState } from "react";
import axios from "axios";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
const API = "https://gaitscan.onrender.com";

export default function App() {
  const [stage, setStage] = useState("upload"); // upload | processing | results
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
          if (e.loaded === e.total) setProgress("Analysing gait patterns...");
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

  const getRiskColor = (score) => {
    if (score === 0) return "#1D9E75";
    if (score <= 30) return "#BA7517";
    return "#E24B4A";
  };

  const getRiskLabel = (score) => {
    if (score === 0) return "Low Risk";
    if (score <= 30) return "Moderate Risk";
    return "High Risk";
  };

  const formatKey = (key) => key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace("Steps Per Min", "steps/min")
    .replace("Knee Flexion Range L", "Left Knee Flexion Range")
    .replace("Knee Flexion Range R", "Right Knee Flexion Range");

  const getStatusColor = (key, val) => {
    if (key.includes("symmetry")) return val < 10 ? "#1D9E75" : val < 20 ? "#BA7517" : "#E24B4A";
    if (key.includes("flexion_range")) return val > 50 ? "#1D9E75" : "#E24B4A";
    if (key.includes("cadence")) return val >= 80 && val <= 140 ? "#1D9E75" : "#BA7517";
    return "#1D9E75";
  };

  const getStatusLabel = (key, val) => {
    if (key.includes("symmetry")) return val < 10 ? "Normal" : val < 20 ? "Mild" : "Flagged";
    if (key.includes("flexion_range")) return val > 50 ? "Normal" : "Limited";
    if (key.includes("cadence")) return val >= 80 && val <= 140 ? "Normal" : "Check";
    return "Normal";
  };

  const symmetryData = results ? [
    { name: "Knee symmetry", value: parseFloat(results.scores.knee_symmetry_index), threshold: 10 },
    { name: "Hip symmetry", value: parseFloat(results.scores.hip_symmetry_index), threshold: 10 },
  ] : [];

  const flexionData = results ? [
    { name: "Left knee", value: parseFloat(results.scores.knee_flexion_range_L) },
    { name: "Right knee", value: parseFloat(results.scores.knee_flexion_range_R) },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.5 }}>GaitScan</span>
          <span style={{ marginLeft: 10, fontSize: 12, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>Beta</span>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#888" }}>AI Gait Analysis</span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Upload stage */}
        {stage === "upload" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h1 style={{ fontSize: 36, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>
                Upload your walking video
              </h1>
              <p style={{ fontSize: 16, color: "#666", maxWidth: 500, margin: "0 auto" }}>
                GaitScan analyses your gait using AI — detecting joint angles, symmetry, and clinical risk factors in seconds.
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
                borderRadius: 16,
                padding: "4rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "#f0f7ff" : "#fff",
                transition: "all 0.2s"
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎥</div>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#333", marginBottom: 8 }}>
                Drag and drop your video here
              </p>
              <p style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>or click to browse</p>
              <div style={{ display: "inline-block", background: "#378ADD", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                Choose video
              </div>
              <p style={{ fontSize: 12, color: "#bbb", marginTop: 16 }}>Supports .mp4 .mov .avi — max 100MB</p>
              <input id="file-input" type="file" accept=".mp4,.mov,.avi" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])} />
            </div>

            {/* Tips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 24 }}>
              {[
                ["Side view", "Walk left to right across the camera for best results"],
                ["Full body", "Make sure head to feet are visible in the frame"],
                ["Good lighting", "Well-lit room, avoid standing in front of bright windows"]
              ].map(([title, desc]) => (
                <div key={title} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1rem" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing stage */}
        {stage === "processing" && (
          <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
            <div style={{ width: 64, height: 64, border: "4px solid #E6F1FB", borderTop: "4px solid #378ADD", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 2rem" }} />
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Analysing your gait...</h2>
            <p style={{ fontSize: 15, color: "#888" }}>{progress}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Results stage */}
        {stage === "results" && results && (
          <div>
            {/* Back button */}
            <button onClick={() => { setStage("upload"); setResults(null); }}
              style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#666", marginBottom: 24 }}>
              ← Analyse another video
            </button>

            {/* Risk score hero */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "2rem", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Overall Assessment</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: getRiskColor(results.scores.overall_risk_score), lineHeight: 1.1 }}>
                {getRiskLabel(results.scores.overall_risk_score)}
              </div>
              <div style={{ fontSize: 15, color: "#aaa", marginTop: 6 }}>Risk score: {results.scores.overall_risk_score}/100</div>
              <a href={`${API}/report/${jobId}`} target="_blank" rel="noreferrer"
                style={{ display: "inline-block", marginTop: 20, background: "#378ADD", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Download PDF Report
              </a>
            </div>

            {/* Scores grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {Object.entries(results.scores)
                .filter(([k]) => k !== "overall_risk_score")
                .map(([key, val]) => (
                  <div key={key} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1rem" }}>
                    <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>{formatKey(key)}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>{val}{key.includes("index") ? "%" : key.includes("cadence") ? "" : "°"}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(key, val), marginTop: 4 }}>
                      {getStatusLabel(key, val)}
                    </div>
                  </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 16 }}>Symmetry Index (%)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={symmetryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 20]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#378ADD" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="threshold" fill="#eee" radius={[4, 4, 0, 0]} name="Normal threshold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 16 }}>Knee Flexion Range (°)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={flexionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 120]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Findings */}
            {results.findings.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 12 }}>Findings</div>
                {results.findings.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14, color: "#444", alignItems: "flex-start" }}>
                    <span style={{ color: "#378ADD", marginTop: 2 }}>•</span> {f}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations.length > 0 && (
              <div style={{ background: "#fffbf0", border: "1px solid #fce8a0", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#854F0B", marginBottom: 12 }}>Recommendations</div>
                {results.recommendations.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14, color: "#633806", alignItems: "flex-start" }}>
                    <span style={{ marginTop: 2 }}>→</span> {r}
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