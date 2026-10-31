// Canvas renderer for the walking figure (src/landing/walker.js). The figure walks in place over a
// floor that moves under the stance foot, so the planted foot stays planted. Layers switch on with
// props as the story explains each stage. Paused off screen; a still frame for reduced motion.
import { useEffect, useRef, useState } from "react";
import {
  BONES,
  EVENT_PHASES,
  MEASURED,
  STRIDE_LENGTH,
  STRIDE_S,
  point,
  separation,
  unmeasured,
} from "@/landing/walker";

const C = {
  dot: "#7ee0d6",
  dotFar: "rgba(126, 224, 214, 0.5)",
  bone: "rgba(126, 224, 214, 0.42)",
  boneFar: "rgba(126, 224, 214, 0.2)",
  ghost: "rgba(236, 240, 245, 0.34)",
  ghostLine: "rgba(236, 240, 245, 0.14)",
  floor: "rgba(236, 240, 245, 0.16)",
  tick: "rgba(236, 240, 245, 0.22)",
  label: "rgba(236, 240, 245, 0.62)",
  trail: "rgba(126, 224, 214, 0.22)",
  event: "#ffffff",
  signal: "#7ee0d6",
};
const STILL_PHASE = 0.32;

function useReducedMotion() {
  const [reduced] = useState(() => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  return reduced;
}

export function WalkerCanvas({
  skeleton = false,
  labels = false,
  trails = false,
  signal = false,
  frame = false,
  events = false,
  headroom = 0.05, // share of the height kept clear above the head (for overlays)
  className = "",
  label = "A walking figure drawn as the points a pose model tracks",
  decorative = false, // inside a control that has its own name
}) {
  const canvasRef = useRef(null);
  const layers = useRef({});
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return undefined; // e.g. jsdom
    let raf = 0;
    let visible = true;
    let size = { w: 0, h: 0 };
    const pulses = [];
    let lastPhase = 0;
    const start = performance.now();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = { w: r.width, h: r.height };
    };

    const draw = (t) => {
      const L = layers.current;
      const { w, h } = size;
      if (!w || !h) return;
      const phase = reduced ? STILL_PHASE : (t / STRIDE_S) % 1;
      ctx.clearRect(0, 0, w, h);

      const plotH = L.signal ? Math.min(110, h * 0.2) : 0;
      const floorY = h - plotH - Math.max(28, h * 0.08);
      const scale = Math.min((floorY - h * headroom) / 1.95, w / 1.55);
      const cx = w * 0.5;
      const X = (p) => cx + p[0] * scale;
      const Y = (p) => floorY - p[1] * scale;

      // Floor: ticks move back at the stance foot's speed.
      ctx.strokeStyle = C.floor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.06, floorY + 0.5);
      ctx.lineTo(w * 0.94, floorY + 0.5);
      ctx.stroke();
      const spacing = 0.25 * scale;
      const travel = reduced ? 0 : ((t / STRIDE_S) * STRIDE_LENGTH * scale) % spacing;
      ctx.strokeStyle = C.tick;
      for (let x = w * 0.06 - travel + spacing; x < w * 0.94; x += spacing) {
        const fade = 1 - Math.abs(x - cx) / (w * 0.46);
        ctx.globalAlpha = Math.max(0, fade);
        ctx.beginPath();
        ctx.moveTo(x, floorY + 4);
        ctx.lineTo(x, floorY + 9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (L.frame) {
        const fw = Math.min(w * 0.82, scale * 2.6);
        const fh = Math.min(floorY - h * 0.02 + 18, scale * 2.2);
        const fx = cx - fw / 2;
        const fy = floorY + 18 - fh;
        const k = 18;
        ctx.strokeStyle = "rgba(236, 240, 245, 0.5)";
        ctx.lineWidth = 1.5;
        for (const [x, y, dx, dy] of [
          [fx, fy, 1, 1],
          [fx + fw, fy, -1, 1],
          [fx, fy + fh, 1, -1],
          [fx + fw, fy + fh, -1, -1],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x, y + dy * k);
          ctx.lineTo(x, y);
          ctx.lineTo(x + dx * k, y);
          ctx.stroke();
        }
        ctx.fillStyle = "#ff5a52";
        ctx.beginPath();
        ctx.arc(fx + 14, fy + 14, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (L.trails) {
        ctx.strokeStyle = C.trail;
        ctx.lineWidth = 1;
        for (const name of ["knee", "ankle", "toe"]) {
          ctx.beginPath();
          for (let i = 0; i <= 60; i++) {
            const p = point("L", name, i / 60);
            if (i) ctx.lineTo(X(p), Y(p));
            else ctx.moveTo(X(p), Y(p));
          }
          ctx.stroke();
        }
      }

      const extra = unmeasured(phase);
      // Volume: the body as faint light along each segment, so the points read as a person.
      ctx.lineCap = "round";
      ctx.shadowColor = C.dot;
      ctx.shadowBlur = scale * 0.08;
      const limb = (a, b, width, alpha) => {
        ctx.strokeStyle = `rgba(126, 224, 214, ${alpha})`;
        ctx.lineWidth = width * scale;
        ctx.beginPath();
        ctx.moveTo(X(a), Y(a));
        ctx.lineTo(X(b), Y(b));
        ctx.stroke();
      };
      for (const side of ["R", "L"]) {
        const near = side === "L";
        const k = near ? 1 : 0.55;
        limb(point(side, "hip", phase), point(side, "knee", phase), 0.13, 0.07 * k);
        limb(point(side, "knee", phase), point(side, "ankle", phase), 0.09, 0.07 * k);
        limb(point(side, "heel", phase), point(side, "toe", phase), 0.06, 0.06 * k);
        const s0 = point(side, "shoulder", phase);
        limb(s0, extra[side].elbow, 0.07, 0.05 * k);
        limb(extra[side].elbow, extra[side].wrist, 0.06, 0.05 * k);
      }
      limb(point("L", "hip", phase), point("L", "shoulder", phase), 0.19, 0.05);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(126, 224, 214, 0.06)";
      ctx.beginPath();
      ctx.arc(X(extra.head), Y(extra.head), scale * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Not measured (head, arms): hollow points.
      ctx.strokeStyle = C.ghostLine;
      ctx.lineWidth = 1;
      for (const side of ["R", "L"]) {
        const s0 = point(side, "shoulder", phase);
        const a = extra[side];
        ctx.beginPath();
        ctx.moveTo(X(s0), Y(s0));
        ctx.lineTo(X(a.elbow), Y(a.elbow));
        ctx.lineTo(X(a.wrist), Y(a.wrist));
        ctx.stroke();
      }
      ctx.strokeStyle = C.ghost;
      ctx.lineWidth = 1.25;
      for (const [p, r] of [
        [extra.L.elbow, 3],
        [extra.L.wrist, 3],
        [extra.R.elbow, 2.4],
        [extra.R.wrist, 2.4],
        [extra.head, Math.max(5, scale * 0.065)],
      ]) {
        ctx.beginPath();
        ctx.arc(X(p), Y(p), r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Far leg first, near leg on top.
      for (const side of ["R", "L"]) {
        const near = side === "L";
        if (L.skeleton) {
          ctx.strokeStyle = near ? C.bone : C.boneFar;
          ctx.lineWidth = near ? 2 : 1.5;
          ctx.lineCap = "round";
          for (const [a, b] of BONES) {
            const p = point(side, a, phase);
            const q = point(side, b, phase);
            ctx.beginPath();
            ctx.moveTo(X(p), Y(p));
            ctx.lineTo(X(q), Y(q));
            ctx.stroke();
          }
        }
        for (const [name] of MEASURED) {
          const p = point(side, name, phase);
          const r = near ? Math.max(3.2, scale * 0.024) : Math.max(2.4, scale * 0.018);
          ctx.shadowColor = C.dot;
          ctx.shadowBlur = near ? 14 : 6;
          ctx.fillStyle = near ? C.dot : C.dotFar;
          ctx.beginPath();
          ctx.arc(X(p), Y(p), r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      if (L.labels) {
        ctx.font = "500 10px 'Geist Mono Variable', ui-monospace, monospace";
        ctx.fillStyle = C.label;
        ctx.textBaseline = "middle";
        for (const [name, iL] of MEASURED) {
          const p = point("L", name, phase);
          const text = `${iL} ${name}`;
          const right = name === "heel" ? -1 : 1;
          const tx = right > 0 ? X(p) + 10 : X(p) - 10 - ctx.measureText(text).width;
          ctx.fillText(text, tx, Y(p) - (name === "toe" ? 10 : 0));
        }
      }

      // Step events: the peaks of the heel separation, at the leading heel.
      if (!reduced) {
        for (const ev of EVENT_PHASES) {
          const crossed = lastPhase <= phase ? lastPhase < ev && ev <= phase : ev > lastPhase || ev <= phase;
          if (crossed && L.events) {
            const l = point("L", "heel", ev);
            const r = point("R", "heel", ev);
            pulses.push({ at: t, p: l[0] > r[0] ? l : r });
          }
        }
        lastPhase = phase;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const age = (t - pulses[i].at) / 0.7;
        if (age > 1) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - age)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(X(pulses[i].p), floorY, 6 + age * 26, 2 + age * 7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (L.signal) {
        const top = h - plotH;
        const span = 2 * STRIDE_S; // seconds shown, newest on the right
        const x0 = w * 0.06;
        const pw = w * 0.88;
        const px = (age) => x0 + pw * (1 - age / span);
        const py = (v) => top + plotH - 16 - (v / 0.75) * (plotH - 32);
        const phaseAt = (tt) => (reduced ? STILL_PHASE : (tt / STRIDE_S) % 1);
        ctx.font = "500 10px 'Geist Mono Variable', ui-monospace, monospace";
        ctx.fillStyle = C.label;
        ctx.textBaseline = "alphabetic";
        ctx.fillText("HEEL SEPARATION", x0, top + 10);
        if (L.events) {
          const label = "STEP EVENTS";
          ctx.fillText(label, x0 + pw - ctx.measureText(label).width, top + 10);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          const first = Math.floor((t - span) / STRIDE_S);
          for (let k = first; k <= first + 3; k++)
            for (const ev of EVENT_PHASES) {
              const tt = (k + ev) * STRIDE_S;
              const age = t - tt;
              if (age < 0 || age > span) continue;
              ctx.fillRect(px(age) - 0.5, top + 18, 1, plotH - 34);
            }
        }
        ctx.strokeStyle = C.signal;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= 160; i++) {
          const age = (span * i) / 160;
          const v = separation(phaseAt(t - age));
          if (i) ctx.lineTo(px(age), py(v));
          else ctx.moveTo(px(age), py(v));
        }
        ctx.stroke();
      }
    };

    const loop = (now) => {
      draw((now - start) / 1000);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced || !visible) draw((performance.now() - start) / 1000);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const redraw = () => draw((performance.now() - start) / 1000);
    canvas.addEventListener("redraw", redraw);
    draw(0);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("redraw", redraw);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduced, headroom]);

  // The animation reads the layers on every frame; a still frame (reduced motion) is redrawn.
  useEffect(() => {
    layers.current = { skeleton, labels, trails, signal, frame, events };
    if (reduced) canvasRef.current?.dispatchEvent?.(new Event("redraw"));
  }, [reduced, skeleton, labels, trails, signal, frame, events]);

  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label };
  return <canvas ref={canvasRef} {...a11y} className={`block h-full w-full ${className}`} />;
}
