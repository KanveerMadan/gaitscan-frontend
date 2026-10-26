// Mean knee bend over the stride (0-100%, heel strike to heel strike), per leg, from the result's
// curves block; several sessions can be overlaid. Not yet validated, like peak knee flexion.
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Warning } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STROKES = ["var(--chart-1)", "var(--chart-2)"];
const DASH = { left: undefined, right: "5 4" };

// series: [{ label, result }]
export function KneeCurves({ series }) {
  const lines = [];
  series.forEach(({ label, result }, i) => {
    const k = result?.curves?.knee_flexion;
    for (const side of ["left", "right"]) {
      if (k?.[side])
        lines.push({ key: `${label} ${side}`, values: k[side], stroke: STROKES[i % 2], dash: DASH[side] });
    }
  });
  if (!lines.length) return null;
  const data = Array.from({ length: lines[0].values.length }, (_, i) => {
    const row = { pct: i };
    for (const l of lines) row[l.key] = l.values[i];
    return row;
  });
  return (
    <Card role="region" aria-label="Knee bend over the stride">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Knee bend over the stride</CardTitle>
          <Badge variant="warning">
            <Warning aria-hidden />
            Not yet validated
          </Badge>
        </div>
        <CardDescription>
          Average over the strides measured, from one heel strike to the next. Dashed: right leg.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="pct" unit="%" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis unit="°" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v) => [`${v}°`]} labelFormatter={(l) => `${l}% of stride`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {lines.map((l) => (
              <Line
                key={l.key}
                dataKey={l.key}
                stroke={l.stroke}
                strokeDasharray={l.dash}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
