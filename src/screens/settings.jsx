// Settings (backend app/api/settings.py): re-test reminders, display units and theme. Each change is
// saved at once; the copy on the signed-in user (from sign-in) is updated so every screen sees it.
import { useEffect, useState } from "react";
import { CalendarPlus, Trash, UserPlus } from "@phosphor-icons/react";
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

const ADULT_AGE = 18;

// Other adults on the account (backend app/api/profiles.py). Adults only: the year is self-declared
// and checked here and again on the server. Removing someone removes their sessions too.
function PeopleCard() {
  const { user, login } = useAuth();
  const [people, setPeople] = useState(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [adult, setAdult] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState(null);
  const latestYear = new Date().getFullYear() - ADULT_AGE;

  const keep = (next) => {
    setPeople(next);
    login({ ...user, profiles: next });
  };
  useEffect(() => {
    api
      .profiles()
      .then((p) => setPeople(Array.isArray(p) ? p : []))
      .catch(() => setError("Couldn't load the people on your account."));
  }, []);

  const born = Number(year);
  const tooYoung = year.length === 4 && born > latestYear;
  const valid = name.trim() && year.length === 4 && born >= 1900 && !tooYoung && adult;

  const add = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const p = await api.addProfile({ name: name.trim(), birth_year: born, is_adult: true });
      keep([...(people ?? []), p]);
      setName("");
      setYear("");
      setAdult(false);
    } catch (err) {
      setError(errorMessage(err, "Couldn't add them. Please try again."));
    }
  };
  const remove = async (id) => {
    setError(null);
    try {
      await api.deleteProfile(id);
      keep(people.filter((p) => p.id !== id));
    } catch (err) {
      setError(errorMessage(err, "Couldn't remove them. Please try again."));
    }
    setConfirming(null);
  };

  return (
    <Card role="region" aria-label="People you measure">
      <CardHeader>
        <CardTitle>People you measure</CardTitle>
        <CardDescription>
          Measure another adult, such as a partner or a parent, on this account. Their walking is kept apart
          from yours, and clinicians you link with see only yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {error && <Alert variant="destructive">{error}</Alert>}
        {people?.length > 0 && (
          <ul className="divide-y rounded-md border">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground"> · born {p.birth_year}</span>
                </span>
                {confirming === p.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span>Remove {p.name} and all their sessions?</span>
                    <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
                      Remove
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirming(null)}>
                      Keep
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirming(p.id)}>
                    <Trash aria-hidden />
                    Remove {p.name}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_9rem] sm:items-end">
          <div className="grid gap-2">
            <label htmlFor="person-name" className="font-medium">
              Name
            </label>
            <Input id="person-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="person-year" className="font-medium">
              Year of birth
            </label>
            <Input
              id="person-year"
              inputMode="numeric"
              maxLength={4}
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
              aria-describedby={tooYoung ? "person-year-note" : undefined}
            />
          </div>
          {tooYoung && (
            <p id="person-year-note" className="text-destructive sm:col-span-2">
              GaitScan is for adults: they need to be born in {latestYear} or earlier.
            </p>
          )}
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            They are 18 or over, and they've agreed to be measured
          </label>
          <Button type="submit" size="sm" className="w-fit" disabled={!valid}>
            <UserPlus aria-hidden />
            Add person
          </Button>
        </form>
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
          <PeopleCard />
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
