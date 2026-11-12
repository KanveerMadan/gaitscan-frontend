// "Check your setup": the camera preview with live framing checks, then (where the browser can record
// MP4) recording in the browser. The recording is reviewed, then analysed like an uploaded video.
// Recording in the browser hasn't been checked on phones yet (its frame timing matters for cadence),
// and the screen says so.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Camera, CheckCircle, Record, Stop, XCircle } from "@phosphor-icons/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { framingChecks } from "@/setup/framing";
import { createPoseLandmarker, ModelMismatch } from "@/setup/pose";
import { handOver, MAX_RECORDING_S, recordingType } from "@/setup/record";

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
  const navigate = useNavigate();
  const recorder = useRef(null);
  const timer = useRef(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recorded, setRecorded] = useState(null); // { file, url }
  const type = recordingType();

  const stop = () => {
    clearInterval(timer.current);
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

  const record = () => {
    const chunks = [];
    const r = new MediaRecorder(stream.current, { mimeType: type });
    r.ondataavailable = (e) => e.data?.size !== 0 && chunks.push(e.data);
    r.onstop = () => {
      const file = new File(chunks, "recording.mp4", { type: "video/mp4" });
      stop();
      setState("idle");
      setRecording(false);
      setRecorded({ file, url: URL.createObjectURL(file) });
    };
    recorder.current = r;
    r.start();
    setRecording(true);
    setSeconds(0);
    const began = Date.now();
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - began) / 1000);
      setSeconds(s);
      if (s >= MAX_RECORDING_S) recorder.current?.stop();
    }, 250);
  };
  const finish = () => recorder.current?.state === "recording" && recorder.current.stop();
  const discard = () => {
    if (recorded) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
  };
  const analyseRecording = () => {
    handOver(recorded.file);
    navigate("/");
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
            {recorded && (
              <div className="flex flex-col gap-2">
                <video
                  src={recorded.url}
                  controls
                  playsInline
                  className="aspect-video w-full rounded-md bg-foreground"
                />
                <Button onClick={analyseRecording}>Analyse this recording</Button>
                <Button variant="outline" onClick={discard}>
                  Discard
                </Button>
              </div>
            )}
            {!recorded && state !== "running" && (
              <Button onClick={start} disabled={state === "starting"}>
                <Camera aria-hidden />
                {state === "starting" ? "Starting…" : "Start camera"}
              </Button>
            )}
            {state === "running" &&
              (type ? (
                <div className="flex flex-col gap-2">
                  {recording ? (
                    <Button variant="destructive" onClick={finish}>
                      <Stop aria-hidden />
                      Stop ({seconds} s of {MAX_RECORDING_S})
                    </Button>
                  ) : (
                    <Button onClick={record}>
                      <Record aria-hidden />
                      Record
                    </Button>
                  )}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Walk across the frame and back, 10 to 20 seconds. Recording in the browser is new and
                    hasn't been checked on phones yet: if a result looks wrong, film with your camera app
                    instead.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This browser can't record a video GaitScan can measure (MP4). When every check is green,
                  film with your camera app and upload the video.
                </p>
              ))}
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
