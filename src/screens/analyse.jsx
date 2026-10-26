import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { api, downloadReport, errorMessage, waitForAnalysis } from "@/api/client";
import { CalibrationStep } from "@/calibration";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeasurementTable, PassTable, QualitySummary } from "@/measurements";

const STEPS = [
  "Film from the side, phone held still in landscape at waist height",
  "Keep the whole body in view, about 3-4 m away",
  "Walk across the frame and back at your usual pace, 10-20 s",
];

export function AnalyseScreen() {
  const [stage, setStage] = useState("upload");
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [calibrate, setCalibrate] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(mp4|mov|avi)$/i)) {
      setError("Please upload a .mp4, .mov or .avi video file.");
      return;
    }
    setError(null);
    if (calibrate) {
      setPendingFile(file);
      setStage("calibrate");
      return;
    }
    analyse(file);
  };

  const analyse = async (file, calibration = null) => {
    setStage("processing");
    setProgress("Uploading video…");
    try {
      const job = await api.submitAnalysis(file, calibration ?? undefined);
      setProgress("Waiting for the analysis to start…");
      const done = await waitForAnalysis(job.job_id, (s) => {
        if (s.status === "running") setProgress("Finding the body in every frame and measuring the steps…");
      });
      if (done.status === "done" && done.analysis) {
        setResults(done.analysis);
        setStage("results");
        return;
      }
      setError(done.rejection?.message || done.error || "Analysis failed. Please try again.");
    } catch (err) {
      setError(errorMessage(err, "Analysis failed. Please try again."));
    }
    setStage("upload");
  };

  if (stage === "calibrate" && pendingFile) {
    return (
      <CalibrationStep
        file={pendingFile}
        onAnalyse={(calibration) => analyse(pendingFile, calibration)}
        onCancel={() => {
          setPendingFile(null);
          setStage("upload");
        }}
      />
    );
  }

  if (stage === "processing") {
    return (
      <div className="flex flex-col gap-3 py-16" role="status" aria-live="polite">
        <h1 className="text-xl font-semibold tracking-tight">Analysing your video…</h1>
        <p className="text-sm text-muted-foreground">{progress}</p>
        <div className="mt-4 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (stage === "results" && results) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStage("upload");
              setResults(null);
            }}
          >
            <ArrowLeft aria-hidden />
            Analyse another video
          </Button>
          <Button size="sm" onClick={() => downloadReport(results.job_id)}>
            <DownloadSimple aria-hidden />
            Download PDF report
          </Button>
        </div>
        <MeasurementTable result={results.result} />
        <PassTable result={results.result} />
        <QualitySummary quality={results.result?.quality} />
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload a walking video</h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            Videos that can't be measured are rejected with the reason, so you know what to change.
          </p>
        </div>
        {error && <Alert variant="destructive">{error}</Alert>}
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById("file-input").click()}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-surface px-6 py-14 text-center transition-colors",
            dragOver ? "border-primary bg-primary-soft" : "border-input hover:border-primary/60",
          )}
        >
          <UploadSimple size={32} className="text-primary" aria-hidden />
          <span className="text-base font-medium">Drop your video here or choose a file</span>
          <span className="text-xs text-muted-foreground">.mp4, .mov or .avi, up to 100 MB</span>
        </button>
        <input
          id="file-input"
          type="file"
          accept=".mp4,.mov,.avi"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={calibrate}
            onChange={(e) => setCalibrate(e.target.checked)}
          />
          I marked two points on the floor a known distance apart (optional: adds step length and walking
          speed)
        </label>
      </div>
      <aside className="self-start rounded-lg border bg-surface p-5">
        <h2 className="text-sm font-semibold">How to record</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-4 text-sm text-muted-foreground">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">This side-on view is what the measurements need.</p>
        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <Link to="/setup">Check your setup with the camera</Link>
        </Button>
        <Button asChild variant="link" size="sm" className="mt-1 w-full">
          <Link to="/welcome">How it works</Link>
        </Button>
      </aside>
    </div>
  );
}
