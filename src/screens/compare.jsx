// Two sessions side by side. A difference is compared with the repeatability the API reports
// (accuracy.mdc_95: two walks of the same person in the same session differ by less 95% of the time,
// LJMU). Day-to-day variation is likely larger, and the page says so.
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import { api, errorMessage, formatDate } from "@/api/client";
import { KneeCurves } from "@/components/knee-curves";
import { StrideReplay } from "@/components/stride-replay";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const UNIT = { "steps/min": " steps/min", s: " s", deg: "°" };
const ROWS = [
  ["cadence", "Cadence", 1],
  ["step_time", "Step time", 3],
];

function fmt(v, unit, digits) {
  return v == null ? "-" : `${Number(v).toFixed(digits)}${UNIT[unit] ?? ` ${unit}`}`;
}

function signed(d, unit, digits) {
  const s = d > 0 ? "+" : d < 0 ? "-" : "±";
  return `${s}${Math.abs(d).toFixed(digits)}${UNIT[unit] ?? ` ${unit}`}`;
}

function Verdict({ diff, mdc, unit }) {
  if (mdc == null) return <span className="text-muted-foreground">-</span>;
  const range = `±${mdc}${UNIT[unit] ?? ` ${unit}`}`;
  return Math.abs(diff) > mdc ? (
    <Badge>Larger than repeat walks usually differ ({range})</Badge>
  ) : (
    <Badge variant="muted">Within the usual difference between repeat walks ({range})</Badge>
  );
}

export function CompareScreen() {
  const { a, b } = useParams();
  const [pair, setPair] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.session(a), api.session(b)])
      .then((both) => setPair(both.sort((x, y) => new Date(x.created_at) - new Date(y.created_at))))
      .catch((e) => setError(errorMessage(e, "Could not load these sessions.")));
  }, [a, b]);

  const back = (
    <Button asChild variant="outline" size="sm" className="self-start">
      <Link to="/history">
        <ArrowLeft aria-hidden />
        All sessions
      </Link>
    </Button>
  );
  if (error)
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Alert variant="destructive">{error}</Alert>
      </div>
    );
  if (!pair) return <PageSkeleton label="Loading comparison" />;

  const [earlier, later] = pair;
  const m0 = earlier.result?.metrics ?? {};
  const m1 = later.result?.metrics ?? {};
  const acc = later.result?.accuracy ?? {};
  return (
    <div className="flex flex-col gap-4">
      {back}
      <h1 className="text-2xl font-semibold tracking-tight">Compare sessions</h1>
      <Card role="region" aria-label="Comparison">
        <CardHeader>
          <CardTitle>
            {formatDate(earlier.created_at, false)} and {formatDate(later.created_at, false)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Measurement</TableHead>
                <TableHead>Earlier</TableHead>
                <TableHead>Later</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Compared with repeat walks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.filter(([k]) => m0[k]?.value != null && m1[k]?.value != null).map(
                ([k, label, digits]) => {
                  const unit = m1[k].unit;
                  const diff = m1[k].value - m0[k].value;
                  return (
                    <TableRow key={k}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell className="tabular">{fmt(m0[k].value, unit, digits)}</TableCell>
                      <TableCell className="tabular">{fmt(m1[k].value, unit, digits)}</TableCell>
                      <TableCell className="tabular">{signed(diff, unit, digits)}</TableCell>
                      <TableCell>
                        <Verdict diff={diff} mdc={acc[k]?.mdc_95} unit={unit} />
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Repeat walks: in a public dataset (LJMU), two walks by the same person in the same session
            differed by less than this 95% of the time. Walks on different days can differ more, so a
            difference inside this range is not a measured change, and one outside it may still be ordinary
            day-to-day variation.
          </p>
        </CardContent>
      </Card>
      <KneeCurves
        series={[
          { label: formatDate(earlier.created_at, false), result: earlier.result },
          { label: formatDate(later.created_at, false), result: later.result },
        ]}
      />
      <StrideReplay
        series={[
          { label: formatDate(earlier.created_at, false), outline: earlier.result?.curves?.stride_outline },
          { label: formatDate(later.created_at, false), outline: later.result?.curves?.stride_outline },
        ]}
      />
    </div>
  );
}
