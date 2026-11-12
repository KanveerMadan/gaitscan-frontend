// Ghost replay (backend result.curves.stride_outline): one average stride of both legs, heel strike to
// heel strike, pelvis-centred and scaled to leg length. With two sessions, the earlier one is a ghost
// under the later one, both at the same point of the stride. Legs only: that is all that's kept.
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NAMES = ["hip", "knee", "ankle", "heel", "toe"];
const BONES = [
  ["hip", "knee"],
  ["knee", "ankle"],
  ["ankle", "heel"],
  ["heel", "toe"],
  ["ankle", "toe"],
];
const LOOP_S = 1.2; // display speed: every replay runs one stride in the same time, so they line up

function at(track, phase) {
  if (!track) return null;
  const f = (((phase % 1) + 1) % 1) * (track.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  const a = track[i];
  const b = track[Math.min(i + 1, track.length - 1)];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function draw(ctx, w, h, outlines, phase) {
  ctx.clearRect(0, 0, w, h);
  const floorY = h - 28;
  const scale = Math.min((floorY - 20) / 1.05, w / 1.7);
  const X = (p) => w / 2 + p[0] * scale;
  const Y = (p) => floorY - p[1] * scale;
  ctx.strokeStyle = "rgba(236, 240, 245, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, floorY + 0.5);
  ctx.lineTo(w * 0.92, floorY + 0.5);
  ctx.stroke();
  outlines.forEach(({ outline, ghost }) => {
    for (const side of ["R", "L"]) {
      const near = side === "L";
      const p = Object.fromEntries(NAMES.map((n) => [n, at(outline.points[`${side}_${n}`], phase)]));
      ctx.setLineDash(ghost ? [4, 4] : []);
      ctx.lineWidth = ghost ? 1.5 : near ? 2.5 : 1.75;
      ctx.lineCap = "round";
      ctx.strokeStyle = ghost
        ? `rgba(236, 240, 245, ${near ? 0.45 : 0.25})`
        : `rgba(126, 224, 214, ${near ? 0.9 : 0.45})`;
      for (const [a, b] of BONES) {
        if (!p[a] || !p[b]) continue;
        ctx.beginPath();
        ctx.moveTo(X(p[a]), Y(p[a]));
        ctx.lineTo(X(p[b]), Y(p[b]));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const n of NAMES) {
        if (!p[n]) continue;
        ctx.fillStyle = ghost ? "rgba(236, 240, 245, 0.45)" : near ? "#7ee0d6" : "rgba(126, 224, 214, 0.5)";
        ctx.beginPath();
        ctx.arc(X(p[n]), Y(p[n]), ghost ? 2.5 : near ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function why(outline) {
  if (outline === undefined) return "analysed before stride outlines were kept.";
  return "the left and right legs couldn't be told apart, so there is no stride outline.";
}

// series: [{ label, outline }]; with two, the first (earlier) is drawn as the ghost.
export function StrideReplay({ series }) {
  const canvasRef = useRef(null);
  const [reduced] = useState(() => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [playing, setPlaying] = useState(!reduced);
  const [phase, setPhase] = useState(0.3);
  const shown = series
    .map((s, i) => ({ ...s, ghost: series.length > 1 && i === 0 }))
    .filter((s) => s.outline);
  const missing = series.filter((s) => !s.outline);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx || !shown.length) return undefined;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!playing) {
      draw(ctx, r.width, r.height, shown, phase);
      return undefined;
    }
    let raf = 0;
    const start = performance.now() - phase * LOOP_S * 1000;
    const loop = (now) => {
      const p = (((now - start) / 1000) % LOOP_S) / LOOP_S;
      draw(ctx, r.width, r.height, shown, p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      setPhase((((performance.now() - start) / 1000) % LOOP_S) / LOOP_S);
    };
    // shown is derived from series; redraw when the sessions, play state or phase change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, playing, phase]);

  return (
    <Card role="region" aria-label="Stride replay">
      <CardHeader>
        <CardTitle>Stride replay</CardTitle>
        <CardDescription>
          One average stride of your legs, heel strike to heel strike, scaled to your leg length.
          {series.length > 1 &&
            " The earlier session is the dashed ghost; both are at the same point of the stride."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {shown.length > 0 && (
          <>
            <div className="mx-auto h-64 w-full max-w-xl overflow-hidden rounded-lg bg-stage">
              <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setPlaying((v) => !v)}>
                {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                {playing ? "Pause" : "Play"}
              </Button>
              <input
                type="range"
                min="0"
                max="100"
                aria-label="Stride phase"
                className="w-48 accent-[var(--primary)]"
                value={Math.round(phase * 100)}
                onChange={(e) => {
                  setPlaying(false);
                  setPhase(Number(e.target.value) / 100);
                }}
              />
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {shown.map((s) => (
                  <li key={s.label} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={
                        s.ghost
                          ? "w-4 border-t border-dashed border-muted-foreground"
                          : "w-4 border-t-2 border-primary"
                      }
                    />
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        {missing.map((s) => (
          <p key={s.label} className="text-sm text-muted-foreground">
            {s.label}: {why(s.outline)}
          </p>
        ))}
        <p className="text-xs text-muted-foreground">
          The outline is drawn from the points tracked in the video and isn't validated: use it to compare
          your own walks, not to read off angles.
        </p>
      </CardContent>
    </Card>
  );
}
