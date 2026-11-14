// The result page for a v3 result (Plan V3 Phase 11, FE-A; the owner's brief §4.1): summary, timing and
// rhythm, joint movement, recording quality. The verdict and its words come from the API (English and
// Hindi, owner decision D4: general wellness, says what to do next, never what is wrong); this file only
// lays them out.
// - Both legs pooled: no left/right toggle and no symmetry section (leg identity can't be checked on a
//   side view, decision A); the joint section says why. Pelvis oscillation is never shown.
// - Colour is never the only signal: every level has a shape and a word, the verdict an icon and text,
//   and every chart a text summary.
import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DownloadSimple, Info } from "@phosphor-icons/react";
import { api, downloadReport } from "@/api/client";
import { AXIS, GRID, SERIES, TOOLTIP } from "@/components/chart-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { num } from "@/lib/gait-profile";

const TIMING_ROWS = ["cadence", "step_time", "step_time_cv", "stance_pct", "swing_pct", "double_support_pct"];
const EVENT_ROWS = ["knee_ic", "knee_peak_swing", "hip_peak_ext", "hip_peak_flex", "ankle_ic"];
const ROM_ROWS = ["knee_rom", "hip_rom", "ankle_rom"];
const POSTURE_ROWS = ["trunk_lean_deg", "arm_swing_deg"];
const JOINTS = ["knee", "hip", "ankle"];

// Level shapes (circle, triangle, square) and colours, as in the PDF.
const LEVEL = {
  typical: { key: "profile.levelTypical", colour: "var(--level-typical, #15803d)" },
  slightly_outside: { key: "profile.levelSlightly", colour: "var(--level-slightly, #b45309)" },
  clearly_outside: { key: "profile.levelClearly", colour: "var(--level-clearly, #b91c1c)" },
};
const OVERALL = {
  typical: { key: "profile.iconTypical", colour: LEVEL.typical.colour, tint: "bg-emerald-500/5" },
  keep_an_eye: {
    key: "profile.iconKeepAnEye",
    colour: LEVEL.slightly_outside.colour,
    tint: "bg-amber-500/5",
  },
  outside: { key: "profile.iconOutside", colour: LEVEL.clearly_outside.colour, tint: "bg-red-500/5" },
};

// ---- formatting -------------------------------------------------------------------------------------

const UNIT = { deg: "°", "%": " %", "steps/min": " steps/min", s: " s" };

function withUnit(v, unit, digits) {
  return `${num(v, digits)}${UNIT[unit] ?? ` ${unit}`}`;
}

function pick(both, lang) {
  return both ? (both[lang] ?? both.en) : null;
}

// ---- small marks ------------------------------------------------------------------------------------
export function LevelMark({ level, size = 10 }) {
  const t = useT();
  const l = LEVEL[level];
  if (!l) return null;
  const shape =
    level === "typical" ? (
      <circle cx="5" cy="5" r="4.5" />
    ) : level === "slightly_outside" ? (
      <polygon points="0.5,9.5 9.5,9.5 5,0.5" />
    ) : (
      <rect x="0.5" y="0.5" width="9" height="9" />
    );
  return (
    <svg
      role="img"
      aria-label={t(l.key)}
      width={size}
      height={size}
      viewBox="0 0 10 10"
      className="inline-block shrink-0"
      style={{ fill: l.colour }}
    >
      {shape}
    </svg>
  );
}

function LevelCell({ level }) {
  const t = useT();
  if (!level) return <span className="text-muted-foreground">{t("profile.information")}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <LevelMark level={level} />
      {t(LEVEL[level].key)}
    </span>
  );
}

function OverallIcon({ overall }) {
  const t = useT();
  const o = OVERALL[overall];
  const label = t(o ? o.key : "profile.iconNone");
  const colour = o ? o.colour : "var(--muted-foreground)";
  return (
    <svg role="img" aria-label={label} width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      {overall === "typical" && (
        <>
          <circle cx="20" cy="20" r="19" fill={colour} />
          <polyline points="11,21 17,27 29,14" fill="none" stroke="white" strokeWidth="3.5" />
        </>
      )}
      {overall === "keep_an_eye" && (
        <>
          <polygon points="20,2 38,37 2,37" fill={colour} />
          <line x1="20" y1="14" x2="20" y2="26" stroke="white" strokeWidth="3.5" />
          <circle cx="20" cy="31.5" r="2" fill="white" />
        </>
      )}
      {overall === "outside" && (
        <>
          <rect x="2" y="2" width="36" height="36" fill={colour} />
          <line x1="20" y1="9" x2="20" y2="24" stroke="white" strokeWidth="3.5" />
          <circle cx="20" cy="30" r="2.2" fill="white" />
        </>
      )}
      {!o && (
        <>
          <circle cx="20" cy="20" r="18" fill="none" stroke={colour} strokeWidth="2.5" />
          <line x1="12" y1="20" x2="28" y2="20" stroke={colour} strokeWidth="3.5" />
        </>
      )}
    </svg>
  );
}

// ---- summary ----------------------------------------------------------------------------------------
function SummaryCard({ profile, sessionId }) {
  const t = useT();
  const lang = useLanguage();
  const v = profile.verdict;
  const overall = v.overall;
  const findings = v.observations ?? [];
  const tips = pick(v.tips, lang) ?? [];
  const next = pick(v.next_steps, lang) ?? [];
  const gps = v.gps;
  return (
    <Card role="region" aria-label={t("profile.summary")}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{t("profile.summary")}</CardTitle>
        {sessionId && (
          <Button size="sm" onClick={() => downloadReport(sessionId, lang)}>
            <DownloadSimple aria-hidden />
            {t("profile.download")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          className={cn(
            "flex items-start gap-4 rounded-lg p-4",
            overall ? OVERALL[overall].tint : "bg-muted/40",
            overall === "keep_an_eye" && "border-2 border-dashed",
            overall === "outside" && "border-4 border-double",
            overall === "typical" && "border-2",
            !overall && "border border-dotted",
          )}
          style={{ borderColor: overall ? OVERALL[overall].colour : undefined }}
        >
          <OverallIcon overall={overall} />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold tracking-tight">
              {overall ? pick(v.headline, lang) : t("profile.noVerdict")}
            </p>
            <p className="text-sm">{pick(v.summary, lang)}</p>
            <p className="text-xs text-muted-foreground">{pick(v.notice, lang)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("profile.findings")}</h3>
          {findings.length ? (
            <ul aria-label={t("profile.findings")} className="flex flex-col gap-1.5 text-sm">
              {findings.slice(0, 5).map((f) => (
                <li key={f.metric} className="flex items-start gap-2">
                  <span className="mt-1.5">
                    <LevelMark level={f.level} />
                  </span>
                  {pick(f.text, lang)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">{t(overall ? "profile.noFindings" : "profile.noFindingsNoVerdict")}</p>
          )}
        </div>

        {(next.length > 0 || tips.length > 0) && (
          <div className="flex flex-col gap-2">
            {next.length > 0 && (
              <>
                <h3 className="text-sm font-semibold">{t("profile.next")}</h3>
                <ul className="list-disc pl-5 text-sm">
                  {next.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}
            {tips.length > 0 && (
              <>
                <h3 className="text-sm font-semibold">{t("profile.tips")}</h3>
                <ul aria-label={t("profile.tips")} className="list-disc pl-5 text-sm">
                  {tips.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        {(pick(v.notes, lang) ?? []).map((n) => (
          <p key={n} className="flex gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 shrink-0" aria-hidden />
            {n}
          </p>
        ))}

        {gps?.typical && (
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">{t("profile.gps")}</h3>
            <p className="text-sm">
              {t("profile.gpsLine", {
                value: num(gps.value),
                lo: num(gps.typical[0]),
                hi: num(gps.typical[1]),
                label: pick(gps.label, lang),
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- metric tables ----------------------------------------------------------------------------------
function Meaning({ metric, name }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={t("profile.whatMeans", { metric: name })}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
      >
        <Info aria-hidden />
      </button>
      {open && (
        <span className="mt-0.5 block text-xs text-muted-foreground">{t(`profile.meaning.${metric}`)}</span>
      )}
    </>
  );
}

function errorText(result, profile, metric, t) {
  const acc = result?.accuracy?.[metric];
  if ((metric === "cadence" || metric === "step_time") && acc?.error_95 != null)
    return `±${acc.error_95}${UNIT[acc.unit] ?? ` ${acc.unit}`}`;
  const err = profile.verdict.metrics[metric]?.error;
  if (err) return `±${err.mae_deg.toFixed(1)}°`;
  return t("profile.notValidated");
}

function MetricTable({ result, profile, metrics, label }) {
  const t = useT();
  const lang = useLanguage();
  const confidence = { high: "profile.confHigh", medium: "profile.confMedium", low: "profile.confLow" };
  const rows = metrics
    .map((m) => [m, profile.timing[m] ?? profile.kinematics[m]])
    .filter(([, stat]) => stat !== undefined);
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead>{t("profile.colMetric")}</TableHead>
          <TableHead>{t("profile.colValue")}</TableHead>
          <TableHead>{t("profile.colTypical")}</TableHead>
          <TableHead>{t("profile.colLevel")}</TableHead>
          <TableHead>{t("profile.colError")}</TableHead>
          <TableHead>{t("profile.colConfidence")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([m, stat]) => {
          const row = profile.verdict.metrics[m];
          const name =
            m === "step_time" ? t("profile.stepTime") : (pick(row?.name, lang) ?? t(`profile.name.${m}`));
          const has = stat?.value !== null && stat?.value !== undefined;
          return (
            <TableRow key={m}>
              <TableCell className="min-w-44 font-medium">
                {name}
                <Meaning metric={m} name={name} />
              </TableCell>
              <TableCell className="tabular whitespace-nowrap">
                {has ? (
                  withUnit(stat.value, stat.unit, m === "step_time" ? 3 : undefined)
                ) : (
                  <span className="text-muted-foreground">{t("profile.notEnough")}</span>
                )}
              </TableCell>
              <TableCell className="tabular whitespace-nowrap">
                {row?.typical
                  ? t("profile.range", { lo: num(row.typical[0]), hi: withUnit(row.typical[1], stat.unit) })
                  : "–"}
              </TableCell>
              <TableCell>{has ? <LevelCell level={row?.level} /> : "–"}</TableCell>
              <TableCell className="whitespace-nowrap">{errorText(result, profile, m, t)}</TableCell>
              <TableCell>{row?.data_confidence ? t(confidence[row.data_confidence]) : "–"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TimingSection({ result, profile }) {
  const t = useT();
  return (
    <Card role="region" aria-label={t("profile.timing")}>
      <CardHeader>
        <CardTitle>{t("profile.timing")}</CardTitle>
        <CardDescription>{t("profile.bothLegs")}</CardDescription>
      </CardHeader>
      <CardContent>
        <MetricTable result={result} profile={profile} metrics={TIMING_ROWS} label={t("profile.timing")} />
      </CardContent>
    </Card>
  );
}

// ---- joint movement ---------------------------------------------------------------------------------
function useReferences() {
  const [refs, setRefs] = useState(null);
  useEffect(() => {
    let live = true;
    api
      .references()
      .then((r) => live && setRefs(r))
      .catch(() => {}); // the charts work without the band
    return () => {
      live = false;
    };
  }, []);
  return refs;
}

function JointChart({ joint, curve, reference, toeOff }) {
  const t = useT();
  const name = t(`profile.${joint}`);
  if (!curve?.mean?.length) {
    return (
      <figure aria-label={t("profile.chartLabel", { joint: name })} className="m-0">
        <figcaption className="text-sm text-muted-foreground">{t("profile.chartNone")}</figcaption>
      </figure>
    );
  }
  const data = curve.mean.map((v, i) => ({
    pct: i,
    walk: v,
    band: reference ? [reference.lo[i], reference.hi[i]] : undefined,
    mean: reference?.mean[i],
  }));
  const summary = t("profile.chartSummary", {
    min: num(Math.min(...curve.mean)),
    max: num(Math.max(...curve.mean)),
    toeOff: toeOff != null ? Math.round(toeOff) : "–",
  });
  return (
    <figure aria-label={t("profile.chartLabel", { joint: name })} className="m-0 flex flex-col gap-2">
      <div className="text-sm font-medium">{name}</div>
      <div aria-hidden className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="pct" type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...AXIS} />
            <YAxis {...AXIS} width={34} domain={["auto", "auto"]} />
            <Tooltip
              {...TOOLTIP}
              labelFormatter={(x) => `${x}${t("profile.cycle")}`}
              formatter={(v, key) =>
                key === "band"
                  ? [`${num(v[0])}–${num(v[1])}°`, t("profile.typicalBand")]
                  : [`${num(v)}°`, key === "walk" ? t("profile.thisWalk") : t("profile.typicalMean")]
              }
            />
            {reference && (
              <Area
                dataKey="band"
                stroke="none"
                fill="var(--muted-foreground)"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
            )}
            {reference && (
              <Line
                dataKey="mean"
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                dot={false}
                strokeWidth={1}
                isAnimationActive={false}
              />
            )}
            <ReferenceLine x={0} stroke="var(--foreground)" strokeDasharray="4 3" />
            {toeOff != null && (
              <ReferenceLine x={Math.round(toeOff)} stroke="var(--foreground)" strokeDasharray="4 3" />
            )}
            <Line dataKey="walk" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-xs leading-relaxed text-muted-foreground">{summary}</figcaption>
    </figure>
  );
}

function Skeleton({ pose, label }) {
  // Pelvis-centred, in leg lengths, x forward and y up (backend gaitcore/kinematics.py _pose).
  const S = 60;
  const P = ([x, y]) => [80 + x * S, 70 - y * S];
  const leg = (side) => [pose.pelvis, ...["knee", "ankle", "heel", "toe"].map((n) => pose[side][n])].map(P);
  const [sx, sy] = P(pose.shoulders);
  const [px, py] = P(pose.pelvis);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 160 140"
      className="h-40 w-full max-w-44 rounded-md border bg-muted/30"
    >
      <line x1={px} y1={py} x2={sx} y2={sy} stroke="var(--foreground)" strokeWidth="3" />
      <circle cx={sx} cy={sy - 9} r="7" fill="none" stroke="var(--foreground)" strokeWidth="2" />
      <polyline
        points={leg("trail").join(" ")}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth="2.5"
        strokeDasharray="4 3"
      />
      <polyline points={leg("lead").join(" ")} fill="none" stroke={SERIES[0]} strokeWidth="3" />
      <circle cx={px} cy={py} r="3" fill="var(--foreground)" />
    </svg>
  );
}

function JointSection({ result, profile }) {
  const t = useT();
  const lang = useLanguage();
  const refs = useReferences();
  const curves = profile.kinematics.curves ?? {};
  const toeOff = profile.timing.stance_pct?.value;
  const notes = [
    ...new Set(
      [...EVENT_ROWS, ...ROM_ROWS]
        .map((m) => pick(profile.verdict.metrics[m]?.error?.note_text, lang))
        .filter(Boolean),
    ),
  ];
  const poses = profile.poses ?? {};
  return (
    <Card role="region" aria-label={t("profile.joints")}>
      <CardHeader>
        <CardTitle>{t("profile.joints")}</CardTitle>
        <CardDescription>{t("profile.bothLegs")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-3">
          {JOINTS.map((j) => (
            <JointChart key={j} joint={j} curve={curves[j]} reference={refs?.curves?.[j]} toeOff={toeOff} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("profile.keyEvents")}</h3>
          <MetricTable
            result={result}
            profile={profile}
            metrics={EVENT_ROWS}
            label={t("profile.keyEvents")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("profile.rom")}</h3>
          <MetricTable result={result} profile={profile} metrics={ROM_ROWS} label={t("profile.rom")} />
          {notes.map((n) => (
            <p key={n} className="text-xs text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("profile.posture")}</h3>
          <MetricTable
            result={result}
            profile={profile}
            metrics={POSTURE_ROWS}
            label={t("profile.posture")}
          />
          <p className="text-xs text-muted-foreground">{t("profile.armNote")}</p>
        </div>
        {(poses.heel_strike || poses.toe_off) && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("profile.snapshots")}</h3>
            <div className="flex flex-wrap gap-4">
              {poses.heel_strike && (
                <div className="flex flex-col gap-1 text-xs">
                  <Skeleton pose={poses.heel_strike} label={t("profile.skeletonHeelStrike")} />
                  {t("profile.heelStrike")}
                </div>
              )}
              {poses.toe_off && (
                <div className="flex flex-col gap-1 text-xs">
                  <Skeleton pose={poses.toe_off} label={t("profile.skeletonToeOff")} />
                  {t("profile.toeOff")}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("profile.snapshotCaption")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- quality ----------------------------------------------------------------------------------------
function QualityDetails({ result, profile }) {
  const t = useT();
  const q = result?.quality ?? {};
  const gq = profile.quality ?? {};
  const rows = [
    [t("profile.qSteady"), t("profile.qSteadyValue", { s: q.steady_walking_s, passes: q.passes })],
    [
      t("profile.qFrames"),
      q.usable_frame_fraction != null
        ? t("profile.qFramesValue", { pct: Math.round(q.usable_frame_fraction * 100), total: q.frames_total })
        : "–",
    ],
    [t("profile.qSteps"), t("profile.qStepsValue", { steps: gq.steps, strides: gq.strides })],
    [t("profile.qFps"), t("profile.qFpsValue", { fps: q.fps })],
    [t("profile.qVisibility"), num(gq.leg_visibility, 2)],
  ];
  return (
    <details
      aria-label={t("profile.quality")}
      open={!profile.verdict.overall}
      className="rounded-lg border bg-surface p-5 [&_summary]:cursor-pointer"
    >
      <summary className="text-base font-semibold tracking-tight">{t("profile.quality")}</summary>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="m-0 tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("profile.confidenceNote")}</p>
    </details>
  );
}

/** The v3 result page sections. `sessionId` enables the report download. */
export function GaitProfileView({ result, sessionId }) {
  const profile = result?.gait_profile;
  if (!profile?.verdict) return null;
  return (
    <div className="flex flex-col gap-4">
      <SummaryCard profile={profile} sessionId={sessionId} />
      <TimingSection result={result} profile={profile} />
      <JointSection result={result} profile={profile} />
      <QualityDetails result={result} profile={profile} />
    </div>
  );
}
