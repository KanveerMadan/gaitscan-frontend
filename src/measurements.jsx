// Display of v2 analysis results (Plan V3 Phase 2). Only measurements the API returns are shown,
// with their units; there are no reference colours, scores or labels. Phase 4 redesigns this.
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const ROWS = [
  ["cadence", "Cadence"],
  ["step_time", "Step time"],
  ["peak_knee_flexion", "Peak knee bend (per stride)"],
  ["step_length", "Step length"],
  ["walking_speed", "Walking speed"],
];

// No reference check yet (backend gaitcore/accuracy.py): knee angles until Phase 8, calibrated
// distances on simulated walking only. Used for results stored before the API sent `accuracy`.
const NOT_YET_VALIDATED = new Set(["peak_knee_flexion", "step_length", "walking_speed"]);

function notYetValidated(result, key) {
  const status = result?.accuracy?.[key]?.status;
  return status ? status === "not_yet_validated" : NOT_YET_VALIDATED.has(key);
}

const unvalidated = { fontSize: 12, color: "#92400e" };

function accuracyText(result, key) {
  const a = result?.accuracy?.[key];
  if (a?.status === "validated") return `± ${a.error_95}${UNIT[a.unit] ?? ` ${a.unit}`}`;
  if (notYetValidated(result, key)) return <span style={unvalidated}>Not yet validated</span>;
  return "—";
}

const UNIT = { deg: "°", "steps/min": " steps/min", s: " s", m: " m", "m/s": " m/s" };

function formatValue(item) {
  if (!item || item.value === null || item.value === undefined) return "not measured";
  const sd = item.sd !== null && item.sd !== undefined ? ` ± ${item.sd}` : "";
  return `${item.value}${sd}${UNIT[item.unit] ?? ` ${item.unit}`}`;
}

const card = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: "1.5rem",
  marginBottom: 16,
};
const th = {
  textAlign: "left",
  fontSize: 12,
  color: "#64748b",
  padding: "6px 8px",
  borderBottom: "1px solid #eee",
};
const td = { fontSize: 14, color: "#1a1a2e", padding: "8px", borderBottom: "1px solid #f3f4f6" };

export function MeasurementTable({ result }) {
  const m = result?.metrics ?? {};
  return (
    <section style={card} aria-label="Measurements">
      <h2 style={{ fontSize: 18, margin: "0 0 12px", color: "#1a1a2e" }}>Measurements</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Measurement</th>
            <th style={th}>Left leg</th>
            <th style={th}>Right leg</th>
            <th style={th}>Both legs</th>
            <th style={th}>Error range</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.filter(([key]) => key in m).map(([key, label]) => {
            const item = m[key];
            const perLeg = item && ("left" in item || "right" in item);
            return (
              <tr key={key}>
                <td style={td}>{label}</td>
                <td style={td}>{perLeg ? formatValue(item.left) : ""}</td>
                <td style={td}>{perLeg ? formatValue(item.right) : ""}</td>
                <td style={td}>{perLeg ? "" : formatValue(item)}</td>
                <td style={td}>{accuracyText(result, key)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(result?.notes ?? []).map((note) => (
        <p key={note} style={{ fontSize: 13, color: "#1a1a2e", marginTop: 12, lineHeight: 1.5 }}>
          {note}
        </p>
      ))}
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, lineHeight: 1.5 }}>
        Values are the median (angles) or mean (times) over the strides measured, ± their spread. Error range:
        in an accuracy check on side-view walks from a public dataset (LJMU, Topham et al. 2023), 95% of
        measurements were within this much of the reference.
        {!("step_length" in m) &&
          " Step length and walking speed need a floor calibration and were not measured."}
      </p>
    </section>
  );
}

const DIRECTION = { left_to_right: "Left to right", right_to_left: "Right to left" };

export function PassTable({ result }) {
  const passes = result?.passes ?? [];
  if (!passes.length) return null;
  const v = result.pass_variability;
  return (
    <section style={card} aria-label="Each pass">
      <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "#1a1a2e" }}>Each pass</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Pass</th>
            <th style={th}>Direction</th>
            <th style={th}>Steps</th>
            <th style={th}>Cadence</th>
            <th style={th}>Step time</th>
          </tr>
        </thead>
        <tbody>
          {passes.map((p) => (
            <tr key={p.pass}>
              <td style={td}>{p.pass}</td>
              <td style={td}>{DIRECTION[p.direction] ?? p.direction}</td>
              <td style={td}>{p.steps}</td>
              <td style={td}>{formatValue(p.cadence)}</td>
              <td style={td}>{formatValue(p.step_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {v && (
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, lineHeight: 1.5 }}>
          Spread between passes (SD): cadence {formatValue(v.cadence_sd)}, step time{" "}
          {formatValue(v.step_time_sd)}.
        </p>
      )}
    </section>
  );
}

export function QualitySummary({ quality }) {
  if (!quality) return null;
  const pct = quality.usable_frame_fraction != null ? Math.round(quality.usable_frame_fraction * 100) : null;
  return (
    <section style={card} aria-label="Recording quality">
      <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "#1a1a2e" }}>Recording quality</h2>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
        <li>
          {quality.steady_walking_s} s of steady walking in {quality.passes} pass
          {quality.passes === 1 ? "" : "es"}
          {pct !== null && ` (${pct}% of the video)`}
        </li>
        <li>
          {quality.steps_detected} steps; strides measured: left {quality.strides?.left ?? 0}, right{" "}
          {quality.strides?.right ?? 0}
        </li>
        <li>{quality.fps} frames per second</li>
      </ul>
    </section>
  );
}

const LEGACY_LABEL = "Earlier version — measurements not shown";

export function SessionSummary({ session }) {
  if (session.legacy) {
    return (
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
        <span
          style={{
            background: "#f1f5f9",
            borderRadius: 6,
            padding: "1px 6px",
            marginRight: 6,
            fontWeight: 600,
          }}
        >
          {LEGACY_LABEL}
        </span>
        {session.note}
      </div>
    );
  }
  const m = session.result?.metrics ?? {};
  return (
    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, display: "flex", gap: 16, flexWrap: "wrap" }}>
      <span>
        Cadence: <strong>{formatValue(m.cadence)}</strong>
      </span>
      <span>
        Peak knee bend L/R{notYetValidated(session.result, "peak_knee_flexion") && " (not yet validated)"}:{" "}
        <strong>{formatValue(m.peak_knee_flexion?.left)}</strong> /{" "}
        <strong>{formatValue(m.peak_knee_flexion?.right)}</strong>
      </span>
    </div>
  );
}

// Trends use current-version sessions only; legacy sessions are never mixed in.
export function CadenceTrend({ sessions }) {
  const data = [...(sessions || [])]
    .filter((s) => !s.legacy && s.result?.metrics?.cadence?.value != null)
    .reverse()
    .map((s) => ({
      date: new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      cadence: s.result.metrics.cadence.value,
    }));
  if (data.length < 2) return null;
  return (
    <section style={{ ...card, padding: "1.25rem" }} aria-label="Cadence over time">
      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>Cadence over time</div>
      <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>
        Steps per minute, current-version sessions only.
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip formatter={(v) => [`${v} steps/min`, "Cadence"]} />
          <Line type="monotone" dataKey="cadence" stroke="#378ADD" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
