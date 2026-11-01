// Treadmill mode (Phase 9): choose the treadmill test and enter the belt speed when uploading; the
// result says where each value comes from and that none is validated yet; trends stay overground.
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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

const NOTE = "Not yet validated on treadmill walking.";
const TREADMILL = {
  test: "treadmill",
  metrics: {
    cadence: { value: 108, n: 20, unit: "steps/min" },
    step_time: { value: 0.556, sd: 0.01, n: 20, unit: "s" },
    peak_knee_flexion: { left: null, right: null },
    belt_speed: { value: 1.25, unit: "m/s", source: "entered" },
    step_length: { value: 0.694, n: 20, unit: "m" },
  },
  accuracy: Object.fromEntries(
    ["cadence", "step_time", "peak_knee_flexion", "belt_speed", "step_length"].map((k) => [
      k,
      { status: "not_yet_validated", note: NOTE },
    ]),
  ),
  quality: { steps_detected: 20, in_place_s: 11.2 },
  notes: ["Measured on a treadmill."],
  passes: [],
};
const signIn = (units = "metric") =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({
      token: "t",
      role: "patient",
      name: "Ana",
      recoveryCodesLeft: 8,
      settings: { retest_weeks: null, units, language: "en", theme: "system", goal_cadence: null },
      profiles: [],
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
});

async function upload() {
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
}

function done(result) {
  axios.post.mockResolvedValueOnce({ data: { job_id: "j", status: "queued", status_url: "/analyses/j" } });
  axios.get.mockResolvedValueOnce({
    data: { job_id: "j", status: "done", analysis: { job_id: "j", result } },
  });
}

test("the treadmill test sends the belt speed, and floor points aren't offered", async () => {
  signIn();
  window.history.pushState({}, "", "/");
  done(TREADMILL);
  render(<App />);
  fireEvent.click(await screen.findByRole("radio", { name: /on a treadmill/i }));
  expect(screen.queryByRole("checkbox", { name: /marked two points on the floor/i })).toBeNull();
  fireEvent.change(screen.getByLabelText(/belt speed/i), { target: { value: "4.5" } });
  await upload();
  const form = axios.post.mock.calls[0][1];
  expect([form.get("test"), form.get("belt_speed_kmh")]).toEqual(["treadmill", "4.5"]);
});

test("without a belt speed the treadmill test asks for one and sends nothing", async () => {
  signIn();
  window.history.pushState({}, "", "/");
  render(<App />);
  fireEvent.click(await screen.findByRole("radio", { name: /on a treadmill/i }));
  await upload();
  expect(screen.getByText(/enter the belt speed/i)).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test("with imperial units the belt speed is entered in mph and sent in km/h", async () => {
  signIn("imperial");
  window.history.pushState({}, "", "/");
  done(TREADMILL);
  render(<App />);
  fireEvent.click(await screen.findByRole("radio", { name: /on a treadmill/i }));
  fireEvent.change(screen.getByLabelText(/belt speed \(mph\)/i), { target: { value: "3" } });
  await upload();
  expect(axios.post.mock.calls[0][1].get("belt_speed_kmh")).toBe("4.83");
});

test("a treadmill result says where its values come from and that none is validated", async () => {
  signIn();
  window.history.pushState({}, "", "/");
  done(TREADMILL);
  render(<App />);
  fireEvent.click(await screen.findByRole("radio", { name: /on a treadmill/i }));
  fireEvent.change(screen.getByLabelText(/belt speed/i), { target: { value: "4.5" } });
  await upload();
  const table = await screen.findByRole("region", { name: /measurements/i });
  expect(within(table).getByText(/belt speed \(entered\)/i)).toBeInTheDocument();
  expect(within(table).getByText(/step length \(from the belt speed\)/i)).toBeInTheDocument();
  expect(within(table).queryByText(/floor calibration/i)).toBeNull();
  expect(screen.getByRole("region", { name: /headline/i }).textContent).toMatch(/treadmill/i);
  expect(screen.getByRole("region", { name: /headline/i }).textContent).not.toMatch(/±/);
});

test("history marks treadmill sessions and keeps them out of the cadence trend", async () => {
  signIn();
  window.history.pushState({}, "", "/history");
  const walk = (id, date, cadence) => ({
    id,
    created_at: date,
    legacy: false,
    tags: [],
    pipeline_version: "2.0.0",
    result: { test: "walk", metrics: { cadence: { value: cadence, unit: "steps/min" } } },
  });
  axios.get.mockResolvedValue({
    data: [
      { ...walk("t1", "2026-10-20T09:00:00Z", 0), result: TREADMILL },
      walk("w2", "2026-10-10T09:00:00Z", 104),
      walk("w1", "2026-10-01T09:00:00Z", 101),
    ],
  });
  render(<App />);
  const list = await screen.findByRole("list", { name: /sessions/i });
  expect(within(within(list).getAllByRole("listitem")[0]).getByText(/treadmill/i)).toBeInTheDocument();
  expect(screen.getByRole("region", { name: /latest/i }).textContent).toMatch(/104/);
});
