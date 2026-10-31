// Settings (backend app/api/settings.py): re-test reminders, display units and theme. Each change is
// saved at once; the copy on the signed-in user (from sign-in) is updated so every screen sees it.
import { useEffect, useState } from "react";
import { CalendarPlus } from "@phosphor-icons/react";
import { api, errorMessage } from "@/api/client";
import { useAuth } from "@/auth-context";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INTERVALS, downloadCalendar, nextTestDue } from "@/lib/reminders";
import { cn } from "@/lib/utils";

function Choice({ name, value, options, onChange, label }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="inline-flex w-fit rounded-md border bg-muted p-0.5">
        {options.map(([v, text]) => (
          <label
            key={v}
            className={cn(
              "cursor-pointer rounded-[6px] px-3 py-1.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              value === v
                ? "bg-surface font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              className="sr-only"
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReminderButton({ due, weeks, size = "sm" }) {
  return (
    <Button variant="outline" size={size} onClick={() => downloadCalendar(due, weeks)}>
      <CalendarPlus aria-hidden />
      Add to calendar
    </Button>
  );
}

function GoalCard({ goal, save }) {
  const [value, setValue] = useState(goal ?? "");
  const n = Number(value);
  const valid = value !== "" && n >= 60 && n <= 180;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadence goal</CardTitle>
        <CardDescription>
          A number of steps per minute you'd like to walk at; the dashboard compares your latest walk with it.
          It's your own target: GaitScan doesn't suggest one.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <label htmlFor="goal-cadence" className="text-sm font-medium">
            Cadence goal (steps/min)
          </label>
          <Input
            id="goal-cadence"
            type="number"
            inputMode="numeric"
            min="60"
            max="180"
            className="tabular w-32"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button size="sm" disabled={!valid} onClick={() => save({ goal_cadence: n })}>
          Save goal
        </Button>
        {goal != null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setValue("");
              save({ goal_cadence: null });
            }}
          >
            Clear goal
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsScreen() {
  const { user, login } = useAuth();
  const [settings, setSettings] = useState(user?.settings ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .settings()
      .then(setSettings)
      .catch((e) => setError(errorMessage(e, "Could not load your settings.")));
  }, []);

  const save = async (change) => {
    setError(null);
    try {
      const next = await api.updateSettings(change);
      setSettings(next);
      login({ ...user, settings: next });
    } catch (e) {
      setError(errorMessage(e, "Could not save the setting. Please try again."));
    }
  };

  const weeks = settings?.retest_weeks ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      {error && <Alert variant="destructive">{error}</Alert>}
      {settings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Re-test reminders</CardTitle>
              <CardDescription>
                Measuring the same way at regular intervals is how changes show up. GaitScan sends no email:
                add the reminder to your own calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="grid max-w-xs gap-2">
                <label htmlFor="retest-weeks" className="font-medium">
                  Walk again every
                </label>
                <select
                  id="retest-weeks"
                  className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
                  value={weeks ?? ""}
                  onChange={(e) => save({ retest_weeks: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">No reminders</option>
                  {INTERVALS.map((w) => (
                    <option key={w} value={w}>
                      {w === 1 ? "week" : `${w} weeks`}
                    </option>
                  ))}
                </select>
              </div>
              {weeks && (
                <div className="flex flex-wrap items-center gap-3">
                  <ReminderButton due={nextTestDue(new Date().toISOString(), weeks)} weeks={weeks} />
                  <span className="text-muted-foreground">
                    A repeating all-day event, every {weeks === 1 ? "week" : `${weeks} weeks`} from today.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          <GoalCard goal={settings.goal_cadence} save={save} />
          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <Choice
                name="theme"
                label="Theme"
                value={settings.theme}
                onChange={(theme) => save({ theme })}
                options={[
                  ["system", "System"],
                  ["light", "Light"],
                  ["dark", "Dark"],
                ]}
              />
              <Choice
                name="units"
                label="Distances and speed"
                value={settings.units}
                onChange={(units) => save({ units })}
                options={[
                  ["metric", "Metres"],
                  ["imperial", "Feet and mph"],
                ]}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
