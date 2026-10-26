// The browser runs the same pinned pose model as the server (gaitscan gaitcore/model.py): the file is
// fetched from MediaPipe's public bucket and refused unless its SHA-256 matches. MediaPipe Tasks
// (version pinned to the server's mediapipe 1.0.1) is loaded only when the camera check starts.
export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
export const MODEL_SHA256 = "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

export async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class ModelMismatch extends Error {}

export async function createPoseLandmarker() {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`model download failed (${res.status})`);
  const buffer = await res.arrayBuffer();
  if ((await sha256Hex(buffer)) !== MODEL_SHA256)
    throw new ModelMismatch("pose model is not the pinned file");
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM);
  // Same settings as the server (gaitcore/landmarks.py): two poses so a second person is noticed.
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: new Uint8Array(buffer), delegate: "CPU" },
    runningMode: "VIDEO",
    numPoses: 2,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}
