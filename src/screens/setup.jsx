// "Check your setup": the camera preview with live framing checks, before recording with the phone's
// camera app. Nothing is recorded or uploaded here. (Recording in the browser is not offered yet: its
// frame timing has to be checked on real phones first.)
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Camera, CheckCircle, XCircle } from "@phosphor-icons/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { framingChecks } from "@/setup/framing";
import { createPoseLandmarker, ModelMismatch } from "@/setup/pose";

function cameraError(e) {
  if (e?.name === "NotAllowedError")
    return "Camera access was blocked. Allow the camera for this site in your browser settings, then try again.";
  if (e?.name === "NotFoundError") return "No camera was found on this device.";
  if (e instanceof ModelMismatch)
    return "The pose model didn't match the expected file, so the check was stopped.";
  return "The camera check couldn't start. Please try again, or record with your camera app and upload the video.";
}

export function SetupScreen() {
  const video = useRef(null);
  const stream = useRef(null);
  const frame = useRef(0);
  const [state, setState] = useState("idle"); // idle | starting | running | error
  const [error, setError] = useState(null);
  const [checks, setChecks] = useState([]);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);

  const start = async () => {
    setState("starting");
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const el = video.current;
      el.srcObject = stream.current;
      await el.play();
      const landmarker = await createPoseLandmarker();
      setState("running");
      let last = -Infinity;
      const tick = (now = performance.now()) => {
        // ~5 checks a second is plenty for framing guidance and spares the phone's battery.
        if (el.readyState >= 2 && now - last >= 200) {
          last = now;
          const result = landmarker.detectForVideo(el, performance.now());
          setChecks(framingChecks(result.landmarks, el.videoWidth / el.videoHeight || 16 / 9));
        }
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      stop();
      setError(cameraError(e));
      setState("error");
    }
  };

  const allOk = checks.length === 5 && checks.every((c) => c.ok);
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link to="/">
          <ArrowLeft aria-hidden />
          Back to upload
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check your setup</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
          Put the phone where you'll record, start the camera and stand in the walking path. Nothing is
          recorded here; when every check is green, record with your camera app and upload the video.
        </p>
      </div>
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-lg border bg-foreground/90">
          <video ref={video} muted playsInline className="aspect-video w-full object-contain" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Framing</CardTitle>
            <CardDescription>
              {state === "running"
                ? allOk
                  ? "Good to record."
                  : "Adjust until every check is green."
                : "Checks appear once the camera is on."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {state !== "running" && (
              <Button onClick={start} disabled={state === "starting"}>
                <Camera aria-hidden />
                {state === "starting" ? "Starting…" : "Start camera"}
              </Button>
            )}
            <ul className="flex flex-col gap-2" aria-live="polite">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle weight="fill" className="mt-0.5 shrink-0 text-primary" aria-label="OK" />
                  ) : (
                    <XCircle
                      weight="fill"
                      className="mt-0.5 shrink-0 text-destructive"
                      aria-label="Not yet"
                    />
                  )}
                  {c.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
