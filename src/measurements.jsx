// Display of analysis results. Only measurements the API returns are shown, with their units and the
// error range from the API's accuracy block; there are no reference colours, scores or labels.
import { Link } from "react-router";
import { useAuth } from "@/auth-context";
import { Info, Warning } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { isTreadmill } from "@/lib/results";
import { hasGaitProfile, num } from "@/lib/gait-profile";
import { OverallMark } from "@/components/gait-profile";
import { useT } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// [metric, i18n key of its label, /learn page]
const ROWS = [
  ["cadence", "metric.cadence", "cadence"],
  ["step_time", "metric.stepTime", "step-time"],
  ["step_length", "metric.stepLength", "step-length"],
  ["walking_speed", "metric.speed", "walking-speed"],
];
// A treadmill test (backend gaitcore pipeline): the belt speed is entered, and step length comes from it.
const TREADMILL_ROWS = [
  ["cadence", "metric.cadence", "cadence"],
  ["step_time", "metric.stepTime", "step-time"],
  ["belt_speed", "metric.belt", null],
  ["step_length", "metric.stepLengthBelt", "step-length"],
];

// No reference check (backend gaitcore/accuracy.py): calibrated distances, checked on simulated walking
// only, for good (no more video will be collected, 2026-11-12). Used for results stored before the API
// sent `accuracy`. Knee angle was removed on 2026-11-12 and isn't shown even if an old result has it.
const NOT_YET_VALIDATED = new Set(["step_length", "walking_speed"]);

function notYetValidated(result, key) {
  const status = result?.accuracy?.[key]?.status;
  return status ? status === "not_yet_validated" : NOT_YET_VALIDATED.has(key);
}

const UNIT = { deg: "°", "steps/min": " steps/min", s: " s", m: " m", "m/s": " m/s", ft: " ft", mph: " mph" };

// Display units (Settings): calibrated distances and speeds in feet and mph; the API stays metric.
const IMPERIAL = { m: ["ft", 3.28084], "m/s": ["mph", 2.236936] };

function inUnits(item, units) {
  const to = units === "imperial" && item && IMPERIAL[item.unit];
  if (!to) return item;
  const [unit, k] = to;
  const fix = (v) => (v === null || v === undefined ? v : (v * k).toFixed(2));
  return { ...item, unit, value: fix(item.value), sd: fix(item.sd) };
}

function useUnits() {
  return useAuth()?.user?.settings?.units ?? "metric";
}

function accuracyText(result, key, t) {
  const a = result?.accuracy?.[key];
  if (a?.status === "validated")
    return <span className="tabular">{`± ${a.error_95}${UNIT[a.unit] ?? ` ${a.unit}`}`}</span>;
  if (notYetValidated(result, key))
    return (
      <Badge variant="warning">
        <Warning aria-hidden />
        {t("results.notValidated")}
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
  const text = formatValue(inUnits(item, useUnits()));
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
          {isTreadmill(result) ? (
            <>
              From {q.steps_detected} steps
              {q.in_place_s != null ? ` in ${q.in_place_s} s` : ""} of walking on a treadmill.
            </>
          ) : (
            <>
              From {q.steps_detected} steps in {q.passes ?? 1} pass{q.passes === 1 ? "" : "es"} of steady
              walking
              {q.steady_walking_s != null ? ` (${q.steady_walking_s} s)` : ""}.
            </>
          )}
        </p>
      )}
    </section>
  );
}

export function MeasurementTable({ result }) {
  const t = useT();
  const m = result?.metrics ?? {};
  const treadmill = isTreadmill(result);
  return (
    <Card aria-label="Measurements" role="region">
      <CardHeader>
        <CardTitle>{t("results.measurements")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("results.measurement")}</TableHead>
              <TableHead>{t("results.value")}</TableHead>
              <TableHead>{t("results.errorRange")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(treadmill ? TREADMILL_ROWS : ROWS)
              .filter(([key]) => key in m)
              .map(([key, label, slug]) => {
                const item = m[key];
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      {slug ? (
                        <Link to={`/learn/${slug}`} className="underline-offset-4 hover:underline">
                          {t(label)}
                        </Link>
                      ) : (
                        t(label)
                      )}
                    </TableCell>
                    <TableCell>
                      <Value item={item} />
                    </TableCell>
                    <TableCell>{accuracyText(result, key, t)}</TableCell>
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
        {treadmill ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Values are the mean over the steps measured, ± their spread. The accuracy check behind GaitScan's
            error ranges used walks over the ground, so none of these is validated on a treadmill yet. Step
            length is the belt speed you entered times the step time.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Values are the mean over the steps measured, ± their spread. Error range: in an accuracy check on
            side-view walks from a public dataset (LJMU, Topham et al. 2023), 95% of measurements were within
            this much of the reference.
            {!("step_length" in m) &&
              " Step length and walking speed need a floor calibration and were not measured."}
          </p>
        )}
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

// A v3 result's row (Phase 11 FE-B): the overall verdict and the key numbers, both legs.
function ProfileSummary({ result }) {
  const t = useT();
  const gp = result.gait_profile;
  const cv = gp.timing?.step_time_cv?.value;
  const knee = gp.kinematics?.knee_rom?.value;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <strong className="font-medium text-foreground">
        <OverallMark overall={gp.verdict.overall} />
      </strong>
      <span>
        Cadence:{" "}
        <strong className="tabular font-medium text-foreground">
          {formatValue(result.metrics?.cadence)}
        </strong>
      </span>
      {cv != null && (
        <span>
          {t("history.stepCv")}: <strong className="tabular font-medium text-foreground">{num(cv)} %</strong>
        </span>
      )}
      {knee != null && (
        <span>
          {t("history.kneeRange")}:{" "}
          <strong className="tabular font-medium text-foreground">{num(knee)}°</strong>
        </span>
      )}
    </div>
  );
}

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
  if (hasGaitProfile(session.result)) return <ProfileSummary result={session.result} />;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {isTreadmill(session.result) && <Badge variant="muted">Treadmill</Badge>}
      <span>
        Cadence: <strong className="tabular font-medium text-foreground">{formatValue(m.cadence)}</strong>
      </span>
      <span>
        Step time: <strong className="tabular font-medium text-foreground">{formatValue(m.step_time)}</strong>
      </span>
    </div>
  );
}
