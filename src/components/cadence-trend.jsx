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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Trends use current-version sessions only; legacy sessions are never mixed in.
export function CadenceTrend({ sessions, goal = null }) {
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
        <CardDescription>
          Steps per minute, current-version sessions only.
          {goal != null && ` The dashed line is your goal (${goal}).`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} />
            <Tooltip formatter={(v) => [`${v} steps/min`, "Cadence"]} />
            {goal != null && (
              <ReferenceLine
                y={goal}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            <Line type="monotone" dataKey="cadence" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
