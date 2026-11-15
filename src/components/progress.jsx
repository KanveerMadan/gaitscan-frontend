// Progress across tests (Plan V3 Phase 11, FE-B; the owner's brief §4.2): GET /me/trends for one person,
// oldest first. Cadence (with the cadence goal), step-time variability, knee and hip range of motion
// (both legs) and the Gait Profile Score, each with a text summary, and what changed since the last
// test: a change smaller than the error range shows as "no change" (as in the PDF report).
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/api/client";
import { AXIS, GRID, SERIES, TOOLTIP } from "@/components/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/i18n";
import { num } from "@/lib/gait-profile";

// [key, i18n key of the name, unit, a change smaller than this is "no change"]
const SERIES_ROWS = [
  ["cadence", "profile.name.cadence", " steps/min", 4.5], // LJMU error range
  ["step_time_cv", "profile.name.step_time_cv", " %", 1.0],
  ["knee_rom", "profile.name.knee_rom", "°", 5.6], // Stenum 2021
  ["hip_rom", "profile.name.hip_rom", "°", 4.0],
  ["gps", "profile.gps", "°", 1.0],
];

const day = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function ChangeMark({ direction, label }) {
  return (
    <svg
      role="img"
      aria-label={label}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="shrink-0 fill-foreground"
    >
      {direction === "up" && <polygon points="0.5,9 9.5,9 5,0.5" />}
      {direction === "down" && <polygon points="0.5,1 9.5,1 5,9.5" />}
      {direction === "same" && <rect x="0.5" y="4" width="9" height="2" />}
    </svg>
  );
}

function Trend({ name, unit, points, goal }) {
  const t = useT();
  const data = points.map((p) => ({ date: day(p.created_at), value: p.value }));
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <figure aria-label={t("progress.overTime", { metric: name })} className="m-0 flex flex-col gap-2">
      <div className="text-sm font-medium">{name}</div>
      <div aria-hidden className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer={false} // hidden: the caption is the text summary; nothing to focus
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} />
            <YAxis {...AXIS} width={36} domain={["auto", "auto"]} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${num(v)}${unit}`, name]} />
            {goal != null && (
              <ReferenceLine
                y={goal}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            <Line
              dataKey="value"
              stroke={SERIES[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: SERIES[0] }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        {t("progress.chartSummary", {
          first: `${num(first.value)}${unit}`,
          firstDate: day(first.created_at),
          last: `${num(last.value)}${unit}`,
          lastDate: day(last.created_at),
          n: points.length,
        })}
      </figcaption>
    </figure>
  );
}

/** Progress for one person (`profileId` null: the account holder). Shown with two or more tests that
 * have a gait profile; `onAvailable(bool)` says whether it is. */
export function ProgressView({ profileId = null, goal = null, onAvailable }) {
  const t = useT();
  const [series, setSeries] = useState(null);
  useEffect(() => {
    let live = true;
    api
      .trends(profileId)
      .then((r) => live && setSeries(r?.sessions ?? []))
      .catch(() => live && setSeries([]));
    return () => {
      live = false;
    };
  }, [profileId]);
  const profiled = (series ?? []).filter((p) => p.overall !== null && p.overall !== undefined);
  const available = profiled.length >= 2;
  useEffect(() => {
    if (series !== null) onAvailable?.(available);
  }, [series, available, onAvailable]);
  if (!available) return null;

  const rows = SERIES_ROWS.map(([key, nameKey, unit, same]) => {
    const points = series
      .filter((p) => p[key] !== null && p[key] !== undefined)
      .map((p) => ({ created_at: p.created_at, value: p[key] }));
    return { key, name: t(nameKey), unit, same, points };
  }).filter((r) => r.points.length >= 2);
  const latestCadence = [...series].reverse().find((p) => p.cadence != null)?.cadence;

  return (
    <Card role="region" aria-label={t("progress.title")}>
      <CardHeader>
        <CardTitle>{t("progress.title")}</CardTitle>
        <CardDescription>{t("progress.intro")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("progress.change")}</h3>
          <ul aria-label={t("progress.change")} className="grid gap-1.5 text-sm sm:grid-cols-2">
            {rows.map(({ key, name, unit, same, points }) => {
              const a = points[points.length - 2].value;
              const b = points[points.length - 1].value;
              const direction = Math.abs(b - a) < same ? "same" : b > a ? "up" : "down";
              const word = t(`progress.${direction}`);
              return (
                <li key={key} className="flex items-center gap-2">
                  <ChangeMark direction={direction} label={word} />
                  <span>
                    {name}: {word}{" "}
                    <span className="tabular text-muted-foreground">
                      ({`${num(a)}${unit} → ${num(b)}${unit}`})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">{t("progress.sameNote")}</p>
        </div>
        {goal != null && latestCadence != null && (
          <p className="text-sm">{t("progress.goal", { goal, value: num(latestCadence) })}</p>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {rows.map(({ key, name, unit, points }) => (
            <Trend key={key} name={name} unit={unit} points={points} goal={key === "cadence" ? goal : null} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
