// What a signed-out visitor sees. The walking figure is GaitScan's own simulated walker (backend
// tests/synthetic.py) and the numbers shown for it are what the real pipeline measured
// (tools/export_walker.py); accuracy figures are the API's accuracy block, from make evaluate.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Warning } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand-mark";
import { WalkerCanvas } from "@/landing/walker-canvas";
import { TRACE } from "@/landing/walker";
import { accuracy } from "@/onboarding/example-result.json";
import { cn } from "@/lib/utils";

function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 text-sm text-stage-muted sm:px-6"
      >
        <Link
          to="/"
          className="mr-auto flex items-center gap-2 text-stage-foreground"
          aria-label="GaitScan home"
        >
          <BrandMark className="size-6 text-stage-accent" />
          <span className="text-[17px] font-semibold tracking-tight">GaitScan</span>
        </Link>
        <a href="#how" className="hidden hover:text-stage-foreground sm:block">
          How it works
        </a>
        <a href="#accuracy" className="hidden hover:text-stage-foreground sm:block">
          Accuracy
        </a>
        <Link to="/learn" className="hidden hover:text-stage-foreground md:block">
          Learn
        </Link>
        <Link to="/signin" className="font-medium text-stage-foreground hover:text-stage-accent">
          Sign in
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-stage text-stage-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_70%_45%,oklch(0.85_0.09_185/0.09),transparent_70%)]" />
      <div className="mx-auto grid min-h-[100svh] max-w-6xl grid-rows-[1fr_auto] px-4 pt-16 sm:px-6 lg:grid-cols-12 lg:grid-rows-1 lg:gap-8">
        <div className="relative h-[52svh] min-h-80 lg:order-2 lg:col-span-6 lg:h-auto">
          <WalkerCanvas
            skeleton
            events
            label="A person walking, drawn as the points GaitScan tracks; each step flashes where the heel lands"
          />
          <p className="absolute inset-x-0 bottom-3 hidden text-center font-mono text-[10px] tracking-[0.14em] text-stage-muted uppercase sm:block">
            Simulated walker · {TRACE.true_cadence} steps/min · bright points are measured
          </p>
        </div>
        <div className="flex flex-col justify-center gap-6 pb-14 lg:order-1 lg:col-span-6 lg:pb-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-stage-accent uppercase">
            Gait measurement from video
          </p>
          <h1 className="max-w-[13ch] text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[4.1rem]">
            The way you walk, measured from a phone video.
          </h1>
          <p className="max-w-[44ch] text-[17px] leading-relaxed text-stage-muted">
            GaitScan follows your joints through every frame, finds each step, and gives your cadence and step
            time, with how far to trust them.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-stage-foreground px-5 text-sm font-medium text-stage transition-transform hover:bg-white active:translate-y-px"
            >
              Measure my walk <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex h-11 items-center rounded-md px-4 text-sm font-medium text-stage-foreground ring-1 ring-stage-border hover:bg-stage-raised"
            >
              See an example result
            </Link>
          </div>
          <p role="note" className="text-xs leading-relaxed text-stage-muted">
            For general wellness and information. An experimental measurement tool, not a medical device: it
            does not assess health conditions or predict outcomes, and its measurements have not been
            clinically validated.
          </p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    kicker: "Film",
    title: "A phone, propped side-on.",
    text: "Walk across the frame and back for 10 to 20 seconds, the phone at waist height, 3 to 4 metres away. The video is deleted as soon as it has been analysed.",
    layers: { frame: true },
  },
  {
    kicker: "Find the body",
    title: "Twelve points, every frame.",
    text: "A pose model (MediaPipe Pose, a pinned version) finds 33 landmarks in each frame. GaitScan measures with twelve: shoulders, hips, knees, ankles, heels and toes. A point it can't see clearly is left out, never guessed.",
    layers: { skeleton: true, labels: true },
  },
  {
    kicker: "Follow the movement",
    title: "Points become paths.",
    text: "Each point is followed from frame to frame and smoothed. Speeding up, slowing down and turning are cut away: only steady walking across the frame is measured.",
    layers: { skeleton: true, trails: true },
  },
  {
    kicker: "Find each step",
    title: "One peak, one step.",
    text: "The distance between your heels along the walk peaks once per step, when both feet are on the floor. It doesn't depend on which leg the model calls left or right, a label pose models often swap.",
    layers: { skeleton: true, signal: true, events: true },
  },
  {
    kicker: "Measure",
    title: "Cadence and step time.",
    text: `Steps over time give your cadence and step time. For this simulated walker, set to ${TRACE.true_cadence} steps per minute, the pipeline measured ${TRACE.cadence}.`,
    layers: { skeleton: true, signal: true, events: true },
    readout: true,
  },
  {
    kicker: "Check",
    title: "Then it checks itself.",
    text: "Was the camera side-on? Were there at least six steps, and were they regular? If not, you get no numbers, just the reason and what to change. Numbers that pass come with their error range.",
    layers: { skeleton: true },
    checks: true,
  },
];

function Readout({ className }) {
  return (
    <dl
      className={cn(
        "grid w-max grid-cols-[auto_auto] gap-x-5 gap-y-1 rounded-md bg-stage-raised/80 px-4 py-3 font-mono text-xs backdrop-blur",
        className,
      )}
    >
      <dt className="text-stage-muted">MEASURED</dt>
      <dd className="tabular text-stage-foreground">{TRACE.cadence} steps/min</dd>
      <dt className="text-stage-muted">TRUE</dt>
      <dd className="tabular text-stage-foreground">{TRACE.true_cadence} steps/min</dd>
      <dt className="text-stage-muted">STEP TIME</dt>
      <dd className="tabular text-stage-foreground">{TRACE.step_time} s</dd>
      <dd className="col-span-2 pt-1 text-[10px] text-stage-muted">
        Simulated walker · real pipeline output
      </dd>
    </dl>
  );
}

const CHECKS = ["Side-on view", "At least 6 steps", "Steps regular", "Steady walking"];

function Checks({ className }) {
  return (
    <ul
      className={cn(
        "flex w-max flex-col gap-1.5 rounded-md bg-stage-raised/80 px-4 py-3 font-mono text-xs backdrop-blur",
        className,
      )}
    >
      {CHECKS.map((c) => (
        <li key={c} className="flex items-center gap-2 text-stage-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-stage-accent" />
          {c}
        </li>
      ))}
    </ul>
  );
}

function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const step = STEPS[active];
  return (
    <section id="how" aria-label="How it works" className="bg-stage text-stage-foreground">
      <div className="mx-auto grid max-w-6xl px-4 sm:px-6 lg:grid-cols-2 lg:gap-12">
        <div className="sticky top-0 z-10 h-[46svh] bg-stage lg:order-2 lg:h-[100svh]">
          <div className="relative h-full">
            <WalkerCanvas {...step.layers} headroom={0.22} label={`${step.kicker}: ${step.title}`} />
            {step.readout && <Readout className="absolute top-6 right-6 hidden lg:grid" />}
            {step.checks && <Checks className="absolute top-6 right-6 hidden lg:flex" />}
          </div>
        </div>
        <ol className="lg:order-1">
          {STEPS.map((s, i) => (
            <li
              key={s.kicker}
              data-step={i}
              ref={(el) => (refs.current[i] = el)}
              className="flex min-h-[64svh] flex-col justify-center py-10 lg:min-h-[100svh]"
            >
              <p className="font-mono text-[11px] tracking-[0.18em] text-stage-accent uppercase">
                {String(i + 1).padStart(2, "0")} · {s.kicker}
              </p>
              <h2
                className={cn(
                  "mt-4 text-3xl font-semibold tracking-[-0.03em] transition-colors duration-500 sm:text-4xl",
                  i === active ? "text-stage-foreground" : "text-stage-muted/60",
                )}
              >
                {s.title}
              </h2>
              <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-stage-muted">{s.text}</p>
              {s.readout && <Readout className="mt-6 lg:hidden" />}
              {s.checks && <Checks className="mt-6 lg:hidden" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Accuracy() {
  const c = accuracy.cadence;
  const s = accuracy.step_time;
  return (
    <section id="accuracy" aria-label="How accurate it is" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">Accuracy</p>
        <h2 className="mt-4 max-w-[22ch] text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          Every number comes with its error range.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
          {[
            [
              "Cadence",
              `± ${c.error_95} steps/min`,
              `A change under ${c.mdc_95} steps/min between two sessions is within measurement noise.`,
            ],
            [
              "Step time",
              `± ${s.error_95} s`,
              `A change under ${s.mdc_95} s between two sessions is within measurement noise.`,
            ],
          ].map(([name, range, note]) => (
            <div key={name} className="bg-surface p-6 sm:p-8">
              <div className="text-sm text-muted-foreground">{name}</div>
              <div className="tabular mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{range}</div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-8 text-sm leading-relaxed text-muted-foreground lg:grid-cols-3">
          <p>
            In an accuracy check on 97 side-view walks by 57 adults, 95% of measurements were at least this
            close to the reference. Dataset: LJMU gait dataset (Topham et al. 2023, Scientific Data, CC BY
            4.0).
          </p>
          <p>
            Accuracy on your video depends on the recording. In heavily degraded video (very low light, heavy
            compression) about 6% of the measurements that passed the checks were more than 5 steps/min off.
          </p>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Warning aria-hidden className="size-4 text-warning" /> Not yet validated
            </span>
            Step length and walking speed (with a floor calibration) and the treadmill test are shown labelled
            as such: there is no reference to check them against.
          </div>
        </div>
        <Link
          to="/learn"
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          How each measurement is taken <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  );
}

const FILMING = [
  ["Side-on", "The phone at right angles to your path, at waist height, held still."],
  ["Whole body", "Head to feet in view, both feet included, nothing in front of the legs."],
  ["Across and back", "10 to 20 seconds at your usual pace, in even light."],
];

function Filming() {
  return (
    <section aria-label="How to film" className="border-t bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">Filming</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">Twenty seconds, three rules.</h2>
        </div>
        <ol className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
          {FILMING.map(([t, d], i) => (
            <li key={t} className="border-t pt-5">
              <span className="tabular font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-medium">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="bg-stage text-stage-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
        <h2 className="max-w-[20ch] text-3xl font-semibold tracking-[-0.03em]">
          Twenty seconds of walking is enough.
        </h2>
        <Link
          to="/signup"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-stage-foreground px-5 text-sm font-medium text-stage hover:bg-white active:translate-y-px"
        >
          Measure my walk <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      <footer className="border-t border-stage-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-xs text-stage-muted sm:px-6">
          <span className="mr-auto flex items-center gap-2 text-stage-foreground">
            <BrandMark className="size-5 text-stage-accent" /> GaitScan
          </span>
          <Link to="/learn" className="hover:text-stage-foreground">
            Learn
          </Link>
          <Link to="/demo" className="hover:text-stage-foreground">
            Example result
          </Link>
          <Link to="/signin" className="hover:text-stage-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </section>
  );
}

export function Landing() {
  return (
    <div className="min-h-[100svh] bg-stage">
      <Nav />
      <main>
        <Hero />
        <Story />
        <Accuracy />
        <Filming />
      </main>
      <Closing />
    </div>
  );
}
