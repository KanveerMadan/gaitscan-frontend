// The published cadence reference for the walker's age and sex (src/lib/norms.js), beside their own
// cadence. Shown only when both are given (Settings, or the person's profile), never for a treadmill
// test, and with no verdict: it is the study's spread, not a target.
import { Link } from "react-router";
import { isTreadmill } from "@/lib/results";
import { MOBBS_2025, ageAt, cadenceReference } from "@/lib/norms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SCALE = [80, 140]; // steps/min shown on the bar: every band in the table fits

function Bar({ low, high, value }) {
  const at = (v) => `${Math.min(100, Math.max(0, ((v - SCALE[0]) / (SCALE[1] - SCALE[0])) * 100))}%`;
  return (
    <div aria-hidden className="relative mt-3 h-2 rounded-full bg-muted">
      <div
        className="absolute inset-y-0 rounded-full bg-primary/25"
        style={{ left: at(low), right: `calc(100% - ${at(high)})` }}
      />
      <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground" style={{ left: at(value) }} />
      <div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{SCALE[0]}</span>
        <span>{SCALE[1]} steps/min</span>
      </div>
    </div>
  );
}

export function CadenceReference({ result, person, when }) {
  const value = result?.metrics?.cadence?.value;
  if (value == null || isTreadmill(result) || !person) return null;
  const ref = cadenceReference({ sex: person.sex, age: ageAt(person.birth_year, when) });
  if (!ref) return null;
  const who = ref.sex === "female" ? "women" : "men";
  return (
    <Card role="region" aria-label="Cadence reference">
      <CardHeader>
        <CardTitle>Cadence reference</CardTitle>
        <CardDescription>For context only: not a target, and not a judgement of this walk.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          In a published study, {ref.n} {who} aged {ref.group} walked at an average of{" "}
          <span className="tabular">
            {ref.mean.toFixed(0)} ± {ref.sd.toFixed(0)}
          </span>{" "}
          steps/min; about two in three of them were between{" "}
          <strong className="tabular font-medium">
            {ref.low}–{ref.high} steps/min
          </strong>
          . This walk: <strong className="tabular font-medium">{value} steps/min</strong>.
        </p>
        <Bar low={ref.low} high={ref.high} value={value} />
        <p className="text-xs text-muted-foreground">
          The study measured a 50 m walk with a sensor worn on the chest, not with video, and cadence also
          changes with height, walking speed and the day. Age is worked out from the year of birth.
        </p>
        <p className="text-xs text-muted-foreground">
          Source:{" "}
          <a
            href={MOBBS_2025.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {MOBBS_2025.short}
          </a>
          , <i>Sensors</i> 25(2):581 ({MOBBS_2025.licence}). Uses the sex and year of birth in{" "}
          <Link to="/settings" className="text-primary underline underline-offset-4">
            Settings
          </Link>
          ; remove them there and this isn't shown.
        </p>
      </CardContent>
    </Card>
  );
}
