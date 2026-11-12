// Owner decisions 2026-11-12: knee angle removed from the app (Phase 8 cancelled), and the Privacy page
// says how long data is kept (F06).
import { render, screen, act } from "@testing-library/react";
import axios from "axios";
import App from "./App";

vi.mock("axios", () => {
  const m = {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  };
  return { __esModule: true, default: m, ...m };
});

const KNEE = /knee (bend|angle|flexion)/i;
// A result stored before the decision, as an older API might still send it.
const OLD = {
  pipeline_version: "2.0.0",
  model: { name: "pose_landmarker_full", version: "float16/1", sha256: "x", mediapipe: "1.0.1" },
  test: "walk",
  status: "accepted",
  metrics: {
    cadence: { value: 109.1, n: 9, unit: "steps/min" },
    step_time: { value: 0.55, sd: 0.02, n: 9, unit: "s" },
    peak_knee_flexion: { left: { value: 56.7, sd: 0.4, n: 3, unit: "deg" }, right: null },
  },
  accuracy: { peak_knee_flexion: { status: "not_yet_validated", note: "No knee-angle reference yet." } },
  quality: { fps: 30, steady_walking_s: 7.4, passes: 1, steps_detected: 9 },
  notes: [],
  passes: [],
  curves: { knee_flexion: { unit: "deg", points: 101, left: Array(101).fill(20), right: null } },
};
const SESSION = {
  id: "s1",
  patient_name: "Ana",
  created_at: "2026-09-01T10:00:00",
  pipeline_version: "2.0.0",
  legacy: false,
  result: OLD,
  note: null,
  notes: null,
  tags: [],
};

function signIn() {
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "tok", role: "patient", name: "Ana", recoveryCodesLeft: 8, settings: null }),
  );
}

const open = async (path, data) => {
  window.history.pushState({}, "", path);
  axios.get.mockImplementation((url) => Promise.resolve({ data: data(url) }));
  await act(async () => {
    render(<App />);
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  axios.defaults.headers.common = {};
  signIn();
});

test("a session's page shows no knee angle, even from a result stored before", async () => {
  await open("/sessions/s1", (url) => (url.endsWith("/sessions/s1") ? SESSION : []));
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /cadence/i })).toBeInTheDocument();
  expect(screen.queryByRole("row", { name: /knee/i })).toBeNull();
  expect(screen.queryByRole("region", { name: /knee/i })).toBeNull();
  expect(document.body.textContent).not.toMatch(KNEE);
});

test("history shows no knee angle", async () => {
  await open("/history", (url) => (url.endsWith("/sessions") ? [SESSION] : []));
  expect(await screen.findByText(/cadence:/i)).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(KNEE);
});

test("Learn has no knee page", async () => {
  localStorage.clear();
  await open("/learn", () => []);
  expect(await screen.findByRole("link", { name: /cadence/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /knee/i })).toBeNull();
  await open("/learn/peak-knee-flexion", () => []);
  expect(await screen.findAllByText(/there's no page for that measurement/i)).not.toHaveLength(0);
});

test("the Privacy page says how long data is kept", async () => {
  await open("/privacy", (url) =>
    url.endsWith("/consent")
      ? { active: true, version: "2026-11-01", accepted_at: "2026-11-01T10:00:00" }
      : [],
  );
  const card = await screen.findByRole("region", { name: /how long your data is kept/i });
  expect(card).toHaveTextContent(/until you delete/i);
  expect(card).toHaveTextContent(/videos? (is|are) deleted as soon as/i);
  expect(card).toHaveTextContent(/share links/i);
});
