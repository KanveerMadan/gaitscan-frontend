// Display of analysis results. Only measurements the API returns are shown, with their units and the
// error range from the API's accuracy block; there are no reference colours, scores or labels.
import { Link } from "react-router";
import { Info, Warning } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROWS = [
  ["cadence", "Cadence", "cadence"],
  ["step_time", "Step time", "step-time"],
  ["peak_knee_flexion", "Peak knee bend (per stride)", "peak-knee-flexion"],
  ["step_length", "Step length", "step-length"],
  ["walking_speed", "Walking speed", "walking-speed"],
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

// The two validated measurements, large, each with the range the accuracy check supports.
export function ResultHeadline({ result }) {
  const m = result?.metrics ?? {};
  const q = result?.quality ?? {};
  const items = [
    ["cadence", "Cadence"],
    ["step_time", "Step time"],
  ].filter(([key]) => m[key]?.value != null);
  if (!items.length) return null;
  return (
    <section aria-label="Headline results" className="overflow-hidden rounded-lg border">
      <div className="grid gap-px bg-border sm:grid-cols-2">
        {items.map(([key, label]) => {
          const item = m[key];
          const a = result?.accuracy?.[key];
          return (
            <div key={key} className="bg-surface p-5 sm:p-6">
              <div className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="tabular text-4xl font-semibold tracking-tight">{item.value}</span>
                <span className="text-sm text-muted-foreground">{UNIT[item.unit]?.trim() ?? item.unit}</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {a?.status === "validated" ? (
                  <span className="tabular">
                    ± {a.error_95}
                    {UNIT[a.unit] ?? ` ${a.unit}`} (95% of checked measurements)
                  </span>
                ) : (
                  "Not yet validated"
                )}
              </div>
            </div>
          );
        })}
      </div>
      {q.steps_detected != null && (
        <p className="border-t bg-surface px-5 py-3 text-xs text-muted-foreground sm:px-6">
          From {q.steps_detected} steps in {q.passes ?? 1} pass{q.passes === 1 ? "" : "es"} of steady walking
          {q.steady_walking_s != null ? ` (${q.steady_walking_s} s)` : ""}.
        </p>
      )}
    </section>
  );
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
            {ROWS.filter(([key]) => key in m).map(([key, label, slug]) => {
              const item = m[key];
              const perLeg = item && ("left" in item || "right" in item);
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    <Link to={`/learn/${slug}`} className="underline-offset-4 hover:underline">
                      {label}
                    </Link>
                  </TableCell>
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
  // Parts the analysis left out instead of rejecting the video (backend gaitcore/quality.py).
  const leftOut = [
    ["Another person in view", quality.second_person_s],
    ["Heels out of view", quality.heels_hidden_s],
  ].filter(([, s]) => s > 0);
  for (const [what, s] of leftOut) items.push([what, `${s} s, not measured`]);
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
