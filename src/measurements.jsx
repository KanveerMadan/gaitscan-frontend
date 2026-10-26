// Display of analysis results. Only measurements the API returns are shown, with their units and the
// error range from the API's accuracy block; there are no reference colours, scores or labels.
import { Info, Warning } from "@phosphor-icons/react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const UNIT = { deg: "°", "steps/min": " steps/min", s: " s", m: " m", "m/s": " m/s" };

function accuracyText(result, key) {
  const a = result?.accuracy?.[key];
  if (a?.status === "validated")
    return <span className="tabular">{`± ${a.error_95}${UNIT[a.unit] ?? ` ${a.unit}`}`}</span>;
  if (notYetValidated(result, key))
    return (
      <Badge variant="warning">
        <Warning aria-hidden />
        Not yet validated
      </Badge>
    );
  return <span className="text-muted-foreground">-</span>;
}

function formatValue(item) {
  if (!item || item.value === null || item.value === undefined) return "not measured";
  const sd = item.sd !== null && item.sd !== undefined ? ` ± ${item.sd}` : "";
  return `${item.value}${sd}${UNIT[item.unit] ?? ` ${item.unit}`}`;
}

function Value({ item }) {
  const text = formatValue(item);
  return <span className={text === "not measured" ? "text-muted-foreground" : "tabular"}>{text}</span>;
}

export function MeasurementTable({ result }) {
  const m = result?.metrics ?? {};
  return (
    <Card aria-label="Measurements" role="region">
      <CardHeader>
        <CardTitle>Measurements</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Measurement</TableHead>
              <TableHead>Left leg</TableHead>
              <TableHead>Right leg</TableHead>
              <TableHead>Both legs</TableHead>
              <TableHead>Error range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.filter(([key]) => key in m).map(([key, label]) => {
              const item = m[key];
              const perLeg = item && ("left" in item || "right" in item);
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell>{perLeg && <Value item={item.left} />}</TableCell>
                  <TableCell>{perLeg && <Value item={item.right} />}</TableCell>
                  <TableCell>{!perLeg && <Value item={item} />}</TableCell>
                  <TableCell>{accuracyText(result, key)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {(result?.notes ?? []).map((note) => (
          <p key={note} className="flex gap-2 text-sm">
            <Info className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
            {note}
          </p>
        ))}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Values are the median (angles) or mean (times) over the strides measured, ± their spread. Error
          range: in an accuracy check on side-view walks from a public dataset (LJMU, Topham et al. 2023), 95%
          of measurements were within this much of the reference.
          {!("step_length" in m) &&
            " Step length and walking speed need a floor calibration and were not measured."}
        </p>
      </CardContent>
    </Card>
  );
}

const DIRECTION = { left_to_right: "Left to right", right_to_left: "Right to left" };

export function PassTable({ result }) {
  const passes = result?.passes ?? [];
  if (!passes.length) return null;
  const v = result.pass_variability;
  return (
    <Card aria-label="Each pass" role="region">
      <CardHeader>
        <CardTitle>Each pass</CardTitle>
        <CardDescription>Each walk across the frame, timed on its own.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pass</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Step time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passes.map((p) => (
              <TableRow key={p.pass}>
                <TableCell className="tabular">{p.pass}</TableCell>
                <TableCell>{DIRECTION[p.direction] ?? p.direction}</TableCell>
                <TableCell className="tabular">{p.steps}</TableCell>
                <TableCell>
                  <Value item={p.cadence} />
                </TableCell>
                <TableCell>
                  <Value item={p.step_time} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {v && (
          <p className="text-xs text-muted-foreground">
            Spread between passes (SD): cadence {formatValue(v.cadence_sd)}, step time{" "}
            {formatValue(v.step_time_sd)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function QualitySummary({ quality }) {
  if (!quality) return null;
  const pct = quality.usable_frame_fraction != null ? Math.round(quality.usable_frame_fraction * 100) : null;
  const items = [
    [
      "Steady walking",
      `${quality.steady_walking_s} s in ${quality.passes} pass${quality.passes === 1 ? "" : "es"}${pct !== null ? ` (${pct}% of the video)` : ""}`,
    ],
    [
      "Steps",
      `${quality.steps_detected}; strides left ${quality.strides?.left ?? 0}, right ${quality.strides?.right ?? 0}`,
    ],
    ["Frame rate", `${quality.fps} frames per second`],
  ];
  return (
    <Card aria-label="Recording quality" role="region">
      <CardHeader>
        <CardTitle>Recording quality</CardTitle>
        <CardDescription>The video passed every recording check.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          {items.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="m-0">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

const LEGACY_LABEL = "Earlier version: measurements not shown";

export function SessionSummary({ session }) {
  if (session.legacy) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="muted">{LEGACY_LABEL}</Badge>
        {session.note}
      </div>
    );
  }
  const m = session.result?.metrics ?? {};
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>
        Cadence: <strong className="tabular font-medium text-foreground">{formatValue(m.cadence)}</strong>
      </span>
      <span>
        Peak knee bend L/R{notYetValidated(session.result, "peak_knee_flexion") && " (not yet validated)"}:{" "}
        <strong className="tabular font-medium text-foreground">
          {formatValue(m.peak_knee_flexion?.left)}
        </strong>{" "}
        /{" "}
        <strong className="tabular font-medium text-foreground">
          {formatValue(m.peak_knee_flexion?.right)}
        </strong>
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
    <Card aria-label="Cadence over time" role="region">
      <CardHeader>
        <CardTitle>Cadence over time</CardTitle>
        <CardDescription>Steps per minute, current-version sessions only.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} />
            <Tooltip formatter={(v) => [`${v} steps/min`, "Cadence"]} />
            <Line type="monotone" dataKey="cadence" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
