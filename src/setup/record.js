// Recording in the browser: MP4 only (the container the analysis reads reliably). Browsers that can
// only record WebM get no record button. The finished recording is handed to the upload screen, which
// analyses it exactly like an uploaded file.
const TYPES = ["video/mp4;codecs=avc1", "video/mp4"];
export const MAX_RECORDING_S = 25;

export function recordingType() {
  const MR = typeof window !== "undefined" ? window.MediaRecorder : undefined;
  if (!MR?.isTypeSupported) return null;
  return TYPES.find((t) => MR.isTypeSupported(t)) ?? null;
}

let pending = null;

export function handOver(file) {
  pending = file;
}

/** The recording waiting to be analysed, once. */
export function takeRecording() {
  const file = pending;
  pending = null;
  return file;
}
