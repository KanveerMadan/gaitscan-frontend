import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BellSimple, DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { api, downloadReport, errorMessage, waitForAnalysis } from "@/api/client";
import { CalibrationStep } from "@/calibration";
import { ConsentCard } from "@/components/consent-card";
import { useAuth } from "@/auth-context";
import { useT } from "@/i18n";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { WalkerCanvas } from "@/landing/walker-canvas";
import { takeRecording } from "@/setup/record";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeasurementTable, ResultHeadline, PassTable, QualitySummary } from "@/measurements";

const STEPS = ["analyse.step1", "analyse.step2", "analyse.step3"];

// Treadmill belt speeds the backend accepts (app/api/analysis.py BELT_KMH_RANGE): walking, not running.
const BELT_KMH = [0.5, 10];
const KMH_PER_MPH = 1.609344;

export function AnalyseScreen() {
  const t = useT();
  const { user } = useAuth() ?? {};
  const profiles = user?.profiles ?? [];
  const imperial = user?.settings?.units === "imperial";
  const [testType, setTestType] = useState("walk"); // "walk" | "treadmill"
  const [belt, setBelt] = useState(""); // as typed, in km/h or mph (Settings units)
  const [profileId, setProfileId] = useState(null); // null: the account holder
  const [stage, setStage] = useState("upload");
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [calibrate, setCalibrate] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [needsConsent, setNeedsConsent] = useState(null); // { file, calibration } waiting for consent
  // "Analysis done" notification: asked for only when the user clicks, shown only if the tab is hidden.
  const [notifying, setNotifying] = useState(false);
  const notifyRef = useRef(false);
  const canNotify = typeof Notification !== "undefined" && Notification.permission !== "denied";
  const askToNotify = async () => {
    const answer = await Notification.requestPermission();
    notifyRef.current = answer === "granted";
    setNotifying(notifyRef.current);
  };
  const notifyDone = (text) => {
    if (notifyRef.current && document.hidden && Notification.permission === "granted")
      new Notification("GaitScan", { body: text });
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(mp4|mov|avi)$/i)) {
      setError("Please upload a .mp4, .mov or .avi video file.");
      return;
    }
    setError(null);
    if (testType === "treadmill") {
      const kmh = Number(belt) * (imperial ? KMH_PER_MPH : 1);
      if (!belt || !(kmh >= BELT_KMH[0] && kmh <= BELT_KMH[1])) {
        const range = imperial
          ? `${(BELT_KMH[0] / KMH_PER_MPH).toFixed(1)} to ${(BELT_KMH[1] / KMH_PER_MPH).toFixed(1)} mph`
          : `${BELT_KMH[0]} to ${BELT_KMH[1]} km/h`;
        setError(`Enter the belt speed the treadmill shows, from ${range}, then choose the video again.`);
        return;
      }
      analyse(file, null, { test: "treadmill", belt_speed_kmh: String(Number(kmh.toFixed(2))) });
      return;
    }
    if (calibrate) {
      setPendingFile(file);
      setStage("calibrate");
      return;
    }
    analyse(file);
  };

  const analyse = async (file, calibration = null, fields = {}) => {
    setStage("processing");
    setProgress("Uploading video…");
    try {
      const job = await api.submitAnalysis(file, calibration ?? undefined, profileId, fields);
      setProgress("Waiting for the analysis to start…");
      const done = await waitForAnalysis(job.job_id, (s) => {
        if (s.status === "running") setProgress("Finding the body in every frame and measuring the steps…");
      });
      notifyDone(
        done.status === "done" ? "Your walk has been measured." : "Your video couldn't be measured: see why.",
      );
      if (done.status === "done" && done.analysis) {
        setResults(done.analysis);
        setStage("results");
        return;
      }
      setError(done.rejection?.message || done.error || "Analysis failed. Please try again.");
    } catch (err) {
      if (err?.response?.status === 403 && err.response.data?.detail?.code === "consent_required") {
        setNeedsConsent({ file, calibration });
        setStage("consent");
        return;
      }
      setError(errorMessage(err, "Analysis failed. Please try again."));
    }
    setStage("upload");
  };

  // A recording made on the setup screen starts its analysis as soon as this screen opens.
  const [recorded] = useState(() => takeRecording());
  useEffect(() => {
    if (recorded) analyse(recorded);
    // once, for the recording handed over on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === "consent" && needsConsent) {
    return (
      <ConsentCard
        onAccepted={() => {
          const { file, calibration } = needsConsent;
          setNeedsConsent(null);
          analyse(file, calibration);
        }}
        onCancel={() => {
          setNeedsConsent(null);
          setStage("upload");
        }}
      />
    );
  }

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
        <h1 className="text-xl font-semibold tracking-tight">{t("analyse.analysing")}</h1>
        <p className="text-sm text-muted-foreground">{progress}</p>
        {canNotify && (
          <div>
            {notifying ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BellSimple aria-hidden /> We'll let you know when it's done, if you switch to another tab.
              </p>
            ) : (
              <Button variant="outline" size="sm" onClick={askToNotify}>
                <BellSimple aria-hidden />
                Notify me when it's done
              </Button>
            )}
          </div>
        )}
        <figure className="mt-4 w-full max-w-2xl overflow-hidden rounded-lg bg-stage">
          <div className="h-[26rem]">
            <WalkerCanvas skeleton signal events label="An illustration of what the analysis does" />
          </div>
          <figcaption className="border-t border-stage-border px-4 py-3 font-mono text-[10px] tracking-[0.12em] text-stage-muted uppercase">
            What happens to your video, shown on the simulated walker: points in every frame, one peak per
            step
          </figcaption>
        </figure>
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
            {t("analyse.another")}
          </Button>
          <Button size="sm" onClick={() => downloadReport(results.job_id)}>
            <DownloadSimple aria-hidden />
            {t("analyse.pdf")}
          </Button>
        </div>
        <ResultHeadline result={results.result} />
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("analyse.title")}</h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{t("analyse.intro")}</p>
        </div>
        {error && <Alert variant="destructive">{error}</Alert>}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("analyse.what")}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              ["walk", t("analyse.walk")],
              ["treadmill", t("analyse.treadmill")],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="test-type"
                  value={value}
                  checked={testType === value}
                  onChange={() => setTestType(value)}
                  className="size-4 accent-[var(--primary)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {testType === "treadmill" && (
          <div className="flex flex-col gap-2">
            <div className="grid max-w-xs gap-2">
              <label htmlFor="belt-speed" className="text-sm font-medium">
                {t("analyse.belt", { unit: imperial ? "mph" : "km/h" })}
              </label>
              <Input
                id="belt-speed"
                inputMode="decimal"
                value={belt}
                onChange={(e) => setBelt(e.target.value.replace(",", "."))}
              />
            </div>
            <p className="max-w-[60ch] text-xs text-muted-foreground">{t("analyse.beltNote")}</p>
          </div>
        )}
        {profiles.length > 0 && (
          <div className="grid max-w-xs gap-2">
            <label htmlFor="who-is-walking" className="text-sm font-medium">
              {t("analyse.who")}
            </label>
            <select
              id="who-is-walking"
              className="h-10 rounded-md border border-input bg-surface px-3 text-sm"
              value={profileId ?? ""}
              onChange={(e) => setProfileId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t("analyse.you")}</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
            "group relative isolate flex h-80 flex-col items-center justify-end gap-2 overflow-hidden rounded-lg bg-stage px-6 pb-8 text-center text-stage-foreground transition-shadow",
            dragOver ? "ring-2 ring-stage-accent" : "hover:ring-1 hover:ring-stage-border",
          )}
        >
          {/* What the video should look like: someone walking across a side-on frame. */}
          <span className="absolute inset-x-0 top-0 -z-10 h-[78%] opacity-70 transition-opacity group-hover:opacity-100">
            <WalkerCanvas frame skeleton decorative />
          </span>
          <span className="flex items-center gap-2 text-base font-medium">
            <UploadSimple size={20} className="text-stage-accent" aria-hidden />
            {t("analyse.drop")}
          </span>
          <span className="text-xs text-stage-muted">{t("analyse.formats")}</span>
        </button>
        <input
          id="file-input"
          type="file"
          accept=".mp4,.mov,.avi"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {testType === "walk" && (
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={calibrate}
              onChange={(e) => setCalibrate(e.target.checked)}
            />
            {t("analyse.calibrate")}
          </label>
        )}
      </div>
      <aside className="self-start rounded-lg border bg-surface p-5">
        <h2 className="text-sm font-semibold">{t("analyse.howTo")}</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-4 text-sm text-muted-foreground">
          {STEPS.map((s) => (
            <li key={s}>{t(s)}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">{t("analyse.sideOn")}</p>
        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <Link to="/setup">{t("analyse.checkSetup")}</Link>
        </Button>
        <Button asChild variant="link" size="sm" className="mt-1 w-full">
          <Link to="/welcome">{t("analyse.howItWorks")}</Link>
        </Button>
      </aside>
    </div>
  );
}
