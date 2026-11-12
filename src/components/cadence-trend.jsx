import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { AXIS, GRID, SERIES, TOOLTIP } from "@/components/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTreadmill } from "@/lib/results";

// Trends use current-version walks over the ground only; legacy sessions and treadmill tests (other
// conditions, not validated) are never mixed in.
export function CadenceTrend({ sessions, goal = null }) {
  const data = [...(sessions || [])]
    .filter((s) => !s.legacy && !isTreadmill(s.result) && s.result?.metrics?.cadence?.value != null)
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
        <CardDescription>
          Steps per minute, current-version sessions only.
          {goal != null && ` The dashed line is your goal (${goal}).`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} />
            <YAxis {...AXIS} width={36} domain={["auto", "auto"]} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v} steps/min`, "Cadence"]} />
            {goal != null && (
              <ReferenceLine
                y={goal}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            <Line
              type="monotone"
              dataKey="cadence"
              stroke={SERIES[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: SERIES[0] }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
