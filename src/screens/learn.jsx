// Learn pages: what each measurement is, how GaitScan measures it, how far to trust it, and the
// sources. Error ranges come from the API's accuracy block (backend gaitcore/accuracy.py, from make
// evaluate); every source below is cited in the backend code it supports.
import { Link, useParams } from "react-router";
import { ArrowLeft, Warning } from "@phosphor-icons/react";
import { Brand, Disclaimer } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accuracy } from "@/onboarding/example-result.json";

const SOURCES = {
  topham: {
    text: "Topham LK, Khan W, Al-Jumeily D, Waraich A, Hussain AJ. A diverse and multi-modal gait dataset of indoor and outdoor walks acquired using multiple cameras and sensors. Scientific Data 2023;10:320 (CC BY 4.0).",
    doi: "10.1038/s41597-023-02161-8",
  },
  tudorLocke: {
    text: "Tudor-Locke C, et al. Walking cadence (steps/min) and intensity in 21–40 year olds: CADENCE-adults. International Journal of Behavioral Nutrition and Physical Activity 2019;16:8.",
    doi: "10.1186/s12966-019-0769-6",
  },
  stenum: {
    text: "Stenum J, Rossi C, Roemmich RT. Two-dimensional video-based analysis of human gait using pose estimation. PLoS Computational Biology 2021;17(4):e1008935.",
    doi: "10.1371/journal.pcbi.1008935",
  },
  zeni: {
    text: "Zeni JA, Richards JG, Higginson JS. Two simple methods for determining gait events during treadmill and overground walking using kinematic data. Gait & Posture 2008;27(4):710–714.",
    doi: "10.1016/j.gaitpost.2007.07.007",
  },
};

const CHECK =
  "In an accuracy check on 97 side-view walks by 57 adults from a public dataset (LJMU, Topham et al. 2023), 95% of GaitScan's values were within";

function repeatability(a) {
  return `Two walks by the same person in the same session differed by less than ${a.mdc_95} ${a.unit} 95% of the time, so a change smaller than that between two of your sessions can't be told apart from measurement noise. Variation from day to day is likely larger and hasn't been measured.`;
}

const METRICS = [
  {
    slug: "cadence",
    name: "Cadence",
    unit: "steps/min",
    validated: accuracy.cadence,
    what: "How many steps you take per minute. Each foot's step counts, so one stride (left and right) is two steps.",
    how: [
      "GaitScan finds the steady part of each walk across the frame, leaving out speeding up, slowing down and turning.",
      "The distance between your heels along the walking direction peaks once per step, when both feet are on the floor. Counting those peaks over time gives the cadence, whichever leg the pose model calls left or right.",
    ],
    context:
      "In a laboratory study of 21–40 year olds, about 100 steps/min corresponded to moderate-intensity walking and about 130 steps/min to vigorous (Tudor-Locke et al. 2019). These are intensity thresholds for that age group, not health norms.",
    sources: ["topham", "tudorLocke", "stenum"],
  },
  {
    slug: "step-time",
    name: "Step time",
    unit: "s",
    validated: accuracy.step_time,
    what: "The time from one step to the next, in seconds: 60 divided by the cadence. The value shown is the mean over the steps measured, ± their spread.",
    how: [
      "The same step events as cadence: peaks in the distance between the heels, timed to a fraction of a frame, inside the steady part of each walk across the frame.",
      "A missed or extra event never turns into a double or half step: steps are only counted between events a plausible step time apart.",
    ],
    context:
      "Pose estimation on ordinary 2D video can time gait events closely enough to measure step times; in a comparison with motion capture the mean error of temporal parameters was about 0.01 s (Stenum et al. 2021).",
    sources: ["topham", "stenum"],
  },
  {
    slug: "peak-knee-flexion",
    name: "Peak knee bend",
    unit: "°",
    what: "The largest bend of each knee during a stride (in the swing, when the foot is off the floor), per leg. The value shown is the median over the strides measured.",
    how: [
      "The angle between the thigh (hip to knee) and the shank (knee to ankle), measured in the video picture, so it needs a side-on camera: in our projection check, a true 60° bend read 53.5° with the camera 30° off side-on.",
      "Strides run from one heel strike of a foot to its next, found where the heel is furthest ahead of the pelvis (Zeni et al. 2008). A leg's value is only shown when its strides can be timed reliably.",
    ],
    caveat:
      "Not yet validated: there is no knee-angle reference to check it against yet. Use it to compare your own recordings, not as an exact angle.",
    sources: ["zeni", "stenum"],
  },
  {
    slug: "step-length",
    name: "Step length",
    unit: "m",
    what: "The distance along the floor from one heel to the other at each step.",
    how: [
      "Only measured when you mark two points on the floor a known distance apart (floor calibration); without it, pixels can't be turned into metres.",
      "Each heel's floor position is its median position while the foot is on the floor, so the exact heel-strike frame matters little.",
    ],
    caveat:
      "Not yet validated: checked only on simulated walking. The public dataset GaitScan was checked on has no distance reference.",
    sources: ["stenum"],
  },
  {
    slug: "walking-speed",
    name: "Walking speed",
    unit: "m/s",
    what: "How far you walk per second: the measured steps' total length divided by their total time.",
    how: [
      "Needs the same floor calibration as step length, and comes from the same steps.",
      "Only the steady part of each walk across the frame is used, so it is your steady speed, not an average that includes starting and stopping.",
    ],
    caveat: "Not yet validated: checked only on simulated walking.",
    sources: ["stenum"],
  },
];

function PublicPage({ children }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" aria-label="GaitScan home">
            <Brand />
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/demo">Example result</Link>
          </Button>
        </div>
      </header>
      <Disclaimer />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">{children}</main>
    </div>
  );
}

export function LearnIndex() {
  return (
    <PublicPage>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">How GaitScan measures</h1>
        <p className="mt-3 max-w-[60ch] leading-relaxed text-muted-foreground">
          What each measurement means, how it is taken from a side-on video, and how far to trust it.
        </p>
      </div>
      <ul aria-label="Measurements" className="divide-y rounded-lg border bg-surface">
        {METRICS.map((m) => (
          <li key={m.slug}>
            <Link
              to={`/learn/${m.slug}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted"
            >
              <span className="font-medium">{m.name}</span>
              {m.validated ? (
                <span className="tabular text-sm text-muted-foreground">
                  ± {m.validated.error_95} {m.unit}
                </span>
              ) : (
                <Badge variant="warning">Not yet validated</Badge>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </PublicPage>
  );
}

export function LearnMetric() {
  const { metric } = useParams();
  const m = METRICS.find((x) => x.slug === metric);
  if (!m)
    return (
      <PublicPage>
        <p>There's no page for that measurement.</p>
        <Link to="/learn" className="text-primary underline underline-offset-4">
          All measurements
        </Link>
      </PublicPage>
    );
  return (
    <PublicPage>
      <Link
        to="/learn"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft aria-hidden /> All measurements
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{m.name}</h1>
      {m.caveat && (
        <p className="flex gap-2 rounded-md border border-warning/30 bg-warning-soft p-4 text-sm leading-relaxed [&_svg]:text-warning">
          <Warning className="mt-0.5 shrink-0" aria-hidden />
          {m.caveat}
        </p>
      )}
      <section aria-labelledby="what">
        <h2 id="what" className="text-lg font-semibold">
          What it is
        </h2>
        <p className="mt-2 leading-relaxed">{m.what}</p>
      </section>
      <section aria-labelledby="how">
        <h2 id="how" className="text-lg font-semibold">
          How GaitScan measures it
        </h2>
        {m.how.map((p) => (
          <p key={p} className="mt-2 leading-relaxed">
            {p}
          </p>
        ))}
      </section>
      {m.validated && (
        <section aria-labelledby="trust">
          <h2 id="trust" className="text-lg font-semibold">
            How accurate it is
          </h2>
          <p className="mt-2 leading-relaxed">
            {CHECK}{" "}
            <strong className="tabular">
              ± {m.validated.error_95} {m.unit}
            </strong>{" "}
            of the reference. {repeatability(m.validated)}
          </p>
        </section>
      )}
      {m.context && (
        <section aria-labelledby="context">
          <h2 id="context" className="text-lg font-semibold">
            For context
          </h2>
          <p className="mt-2 leading-relaxed">{m.context}</p>
        </section>
      )}
      <section aria-label="Sources" className="border-t pt-6">
        <h2 className="text-sm font-semibold">Sources</h2>
        <ol className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
          {m.sources.map((k) => (
            <li key={k}>
              {SOURCES[k].text}{" "}
              <a
                className="text-primary underline underline-offset-4"
                href={`https://doi.org/${SOURCES[k].doi}`}
                target="_blank"
                rel="noreferrer"
              >
                {SOURCES[k].doi}
              </a>
            </li>
          ))}
        </ol>
      </section>
    </PublicPage>
  );
}
