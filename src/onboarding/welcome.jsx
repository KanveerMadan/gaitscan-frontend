// First-test walkthrough: what GaitScan measures, how to set up, and what a result looks like (the
// pipeline's real output for the simulated walker used in its tests: example-result.json).
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";
import { Brand, Disclaimer, DISCLAIMER } from "@/components/app-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasurementTable, PassTable } from "@/measurements";
import example from "./example-result.json";

const STEPS = ["What it measures", "Set up", "Example result"];

function Measures() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What GaitScan measures</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          From a side-on video of you walking, GaitScan measures your cadence (steps per minute) and step
          time, with the error range found when it was checked against a public walking dataset. It also shows
          how far each knee bends, marked as not yet validated.
        </p>
        <p className="text-muted-foreground">{DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
}

function Setup() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up the recording</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>Prop the phone in landscape at hip height, 3-4 m from where you'll walk.</li>
          <li>Point it at right angles to the walking direction, with nothing in front of your legs.</li>
          <li>Record yourself walking across the frame and back at your usual pace for 10-20 seconds.</li>
        </ol>
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link to="/setup">Check your setup with the camera</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Public page (no account): the example result, for anyone deciding whether to sign up.
export function DemoPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Brand />
          <Button asChild size="sm">
            <Link to="/">Create an account</Link>
          </Button>
        </div>
      </header>
      <Disclaimer />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Example result</h1>
        <Example />
      </main>
    </div>
  );
}

function Example() {
  return (
    <div className="flex flex-col gap-4">
      <Alert>
        This example comes from a simulated walker (no real person): it shows what a result looks like.
      </Alert>
      <MeasurementTable result={example} />
      <PassTable result={example} />
    </div>
  );
}

export function WelcomeScreen() {
  const [step, setStep] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">How GaitScan works</h1>
        <ol className="mt-3 flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={
                i === step
                  ? "rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                  : "rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              }
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </div>
      {step === 0 && <Measures />}
      {step === 1 && <Setup />}
      {step === 2 && <Example />}
      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button asChild>
            <Link to="/">
              Upload your first video
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
