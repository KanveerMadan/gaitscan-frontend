// Optional floor calibration (backend gaitcore/calibration.py): two points on the floor along the
// walking line, a known distance apart, marked on a frame of the video. Points are sent in the video's
// own pixels. Step length and walking speed from it are labelled "not yet validated" by the API.
import { useEffect, useMemo, useState } from "react";

const box = { background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem" };

export function CalibrationStep({ file, onAnalyse, onCancel }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [size, setSize] = useState(null); // video pixels
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState("");

  const mark = (e) => {
    if (!size) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const p = {
      x: Math.round(((e.clientX - r.left) / r.width) * size.width),
      y: Math.round(((e.clientY - r.top) / r.height) * size.height),
    };
    setPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
  };

  const metres = Number(distance);
  const ready = points.length === 2 && metres > 0;

  return (
    <section style={box} aria-label="Floor calibration">
      <h2 style={{ fontSize: 18, margin: "0 0 6px", color: "#1a1a2e" }}>Mark two points on the floor</h2>
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px", lineHeight: 1.5 }}>
        Tap two marks on the floor along the walking line (for example two pieces of tape), as far apart as
        possible, then enter the distance between them. Tap again to start over.
      </p>
      <div
        data-testid="calibration-surface"
        onClick={mark}
        style={{
          position: "relative",
          cursor: "crosshair",
          lineHeight: 0,
          background: "#000",
          borderRadius: 8,
        }}
      >
        <video
          data-testid="calibration-video"
          src={url}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            setSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight });
            e.currentTarget.currentTime = 0.5;
          }}
          style={{ width: "100%", borderRadius: 8, pointerEvents: "none" }}
        />
        {size &&
          points.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${(p.x / size.width) * 100}%`,
                top: `${(p.y / size.height) * 100}%`,
                width: 14,
                height: 14,
                marginLeft: -7,
                marginTop: -7,
                borderRadius: "50%",
                border: "2px solid #fff",
                background: "#378ADD",
              }}
            />
          ))}
      </div>
      <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 12px" }}>
        {points.length} of 2 points marked
      </p>
      <label style={{ display: "block", fontSize: 13, color: "#1a1a2e", marginBottom: 12 }}>
        Distance between the points (metres)
        <input
          type="number"
          min="0.2"
          max="50"
          step="0.01"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          style={{ display: "block", marginTop: 4, padding: "6px 8px", width: 140 }}
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={!ready}
          onClick={() =>
            onAnalyse({
              calib_x1: points[0].x,
              calib_y1: points[0].y,
              calib_x2: points[1].x,
              calib_y2: points[1].y,
              calib_distance_m: metres,
            })
          }
          style={{
            background: ready ? "#378ADD" : "#cbd5e1",
            color: "#fff",
            border: "none",
            padding: "8px 18px",
            borderRadius: 8,
            cursor: ready ? "pointer" : "not-allowed",
          }}
        >
          Analyse with calibration
        </button>
        <button type="button" onClick={onCancel} style={{ padding: "8px 18px", borderRadius: 8 }}>
          Cancel
        </button>
      </div>
    </section>
  );
}
