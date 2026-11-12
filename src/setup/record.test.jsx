// In-browser recording (Phase 9): only where the browser can record MP4; the recording goes through
// the normal upload and analysis. Not yet checked on phones, and the screen says so.
import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";
import App from "@/App";
import { recordingType } from "./record";

vi.mock("axios", () => {
  const m = {
    post: vi.fn(),
    get: vi.fn(async () => ({ data: [] })),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  };
  return { __esModule: true, default: m, ...m };
});

vi.mock("./pose", () => ({
  createPoseLandmarker: async () => ({ detectForVideo: () => ({ landmarks: [] }) }),
  ModelMismatch: class extends Error {},
}));

const track = { stop: vi.fn() };

class FakeRecorder {
  static last = null;
  static mp4 = true;
  static isTypeSupported(t) {
    return FakeRecorder.mp4 && t.startsWith("video/mp4");
  }
  constructor(stream, opts) {
    FakeRecorder.last = this;
    this.mimeType = opts.mimeType;
    this.state = "inactive";
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["video-bytes"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function mockCamera(mp4) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
    configurable: true,
  });
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
  FakeRecorder.mp4 = mp4;
  vi.stubGlobal("MediaRecorder", FakeRecorder);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem("gaitscan_user", JSON.stringify({ token: "tok", role: "patient", name: "Test" }));
  window.history.pushState({}, "", "/setup");
  URL.createObjectURL = vi.fn(() => "blob:recording");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => vi.unstubAllGlobals());

test("only MP4 recording is offered", () => {
  vi.stubGlobal("MediaRecorder", { isTypeSupported: (t) => t.startsWith("video/webm") });
  expect(recordingType()).toBeNull();
  vi.stubGlobal("MediaRecorder", { isTypeSupported: (t) => t.startsWith("video/mp4") });
  expect(recordingType()).toMatch(/^video\/mp4/);
  vi.stubGlobal("MediaRecorder", undefined);
  expect(recordingType()).toBeNull();
});

test("a recording is reviewed, then analysed like an uploaded video", async () => {
  mockCamera(true);
  axios.post.mockResolvedValueOnce({ data: { job_id: "j", status: "queued", status_url: "/analyses/j" } });
  axios.get.mockResolvedValue({ data: { job_id: "j", status: "running" } });
  render(<App />);
  // Found outside act(): inside it, React holds back the lazily loaded screen until act ends.
  const start = await screen.findByRole("button", { name: /start camera/i }, { timeout: 4000 });
  await act(async () => {
    fireEvent.click(start);
  });
  expect(screen.getByText(/hasn't been checked on phones yet/i)).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^record$/i }));
  });
  expect(FakeRecorder.last.mimeType).toMatch(/^video\/mp4/);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
  });
  expect(track.stop).toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /analyse this recording/i }));
  });
  expect(await screen.findByRole("heading", { name: /analysing your video/i })).toBeInTheDocument();
  const form = axios.post.mock.calls[0][1];
  expect(form.get("video").name).toBe("recording.mp4");
});

test("without MP4 recording the screen says to use the camera app", async () => {
  mockCamera(false);
  render(<App />);
  // Found outside act(): inside it, React holds back the lazily loaded screen until act ends.
  const start = await screen.findByRole("button", { name: /start camera/i }, { timeout: 4000 });
  await act(async () => {
    fireEvent.click(start);
  });
  expect(screen.queryByRole("button", { name: /^record$/i })).toBeNull();
  expect(screen.getByText(/can't record a video GaitScan can measure/i)).toBeInTheDocument();
});
