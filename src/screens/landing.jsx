// What a signed-out visitor sees: what GaitScan does, how accurate it is (the real figures from the
// backend's `make evaluate`), and the sign-in card right there for people who already have an account.
import { Camera, ChartLineUp, PersonSimpleWalk } from "@phosphor-icons/react";
import { Brand, Disclaimer } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
// The accuracy block the API sends with every result (backend gaitcore/accuracy.py, from make evaluate).
import { accuracy } from "@/onboarding/example-result.json";

const STEPS = [
  {
    icon: Camera,
    title: "Film from the side",
    text: "Prop your phone at hip height, 3-4 m away, and walk across the frame and back for 10-20 seconds.",
  },
  {
    icon: PersonSimpleWalk,
    title: "Upload the video",
    text: "It's checked first: a video that can't be measured is turned down with the reason. The video is deleted after the analysis.",
  },
  {
    icon: ChartLineUp,
    title: "Read your measurements",
    text: "Cadence and step time with their error ranges, each walk across the frame on its own, and your history over time.",
  },
];

export function Landing({ card }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Brand />
        </div>
      </header>
      <Disclaimer />
      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:py-20">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Measure how you walk, from a phone video
            </h1>
            <p className="max-w-[46ch] text-base leading-relaxed text-muted-foreground">
              Film yourself walking side-on. GaitScan measures your cadence and step time, and says how
              accurate each number is.
            </p>
          </div>
          <div className="w-full max-w-sm justify-self-center md:justify-self-end">{card}</div>
        </section>

        <section className="border-t bg-surface" aria-label="How it works">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4 md:flex-col">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon size={20} aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14" aria-label="How accurate it is">
          <h2 className="text-2xl font-semibold tracking-tight">How accurate it is</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1fr_1.2fr]">
            <div className="rounded-lg border bg-surface p-5">
              <div className="text-sm text-muted-foreground">Cadence</div>
              <div className="tabular mt-2 text-3xl font-semibold">
                ± {accuracy.cadence.error_95} steps/min
              </div>
            </div>
            <div className="rounded-lg border bg-surface p-5">
              <div className="text-sm text-muted-foreground">Step time</div>
              <div className="tabular mt-2 text-3xl font-semibold">± {accuracy.step_time.error_95} s</div>
            </div>
            <div className="rounded-lg border bg-primary-soft p-5 text-sm leading-relaxed">
              In 95% of 97 side-view walks from a public dataset, the measurement was at least this close to
              the reference.
              <span className="mt-3 flex items-center gap-2">
                <Badge variant="warning">Knee bend: not yet validated</Badge>
              </span>
            </div>
          </div>
          <p className="mt-6 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
            Checked on the LJMU gait dataset (Topham et al. 2023, Scientific Data, CC BY 4.0): side-view walks
            of 57 adults. Accuracy on your own phone video depends on following the recording guidance.
          </p>
        </section>
      </main>
    </div>
  );
}
