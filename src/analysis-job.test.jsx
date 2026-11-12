// An analysis in progress (2026-11-12 live reports): it survives moving around the app and reloading
// the page, and it never waits forever.
import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import { polling } from "./api/client";

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

const JOB = "11111111-2222-3333-4444-555555555555";
const STATUS_URL = `http://api.test/analyses/${JOB}`;
const RESULT = {
  pipeline_version: "2.0.0",
  status: "accepted",
  metrics: {
    cadence: { value: 109.1, n: 9, unit: "steps/min" },
    step_time: { value: 0.55, sd: 0.02, n: 9, unit: "s" },
  },
  quality: { fps: 30, steady_walking_s: 7.4, passes: 1, usable_frame_fraction: 0.49, steps_detected: 9 },
};
const ANALYSIS = { job_id: JOB, result: RESULT, report_url: `/report/${JOB}`, disclaimer: "x" };
const status = (s, extra = {}) => ({
  data: { job_id: JOB, status: s, rejection: null, error: null, analysis: null, ...extra },
});
const DONE = status("done", { analysis: ANALYSIS });
const SETTINGS = { retest_weeks: null, units: "metric", language: "en", theme: "system", goal_cadence: null };
const DEFAULTS = { ...polling };

// Status polls answer from `polls` in order (a function is called with the URL); anything else is
// an empty list (the History screen's sessions).
let polls;
function routeGets() {
  axios.get.mockImplementation((url) => {
    if (!url.includes("/analyses/")) return Promise.resolve({ data: [] });
    const next = polls.length > 1 ? polls.shift() : polls[0];
    return typeof next === "function" ? next(url) : next;
  });
}

async function upload() {
  axios.post.mockResolvedValueOnce({
    data: { job_id: JOB, status: "queued", status_url: `/analyses/${JOB}` },
  });
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
}

const go = async (name) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name }));
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(polling, DEFAULTS, { intervalMs: 10 });
  axios.defaults.headers.common = {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "tok", role: "patient", name: "Ana", recoveryCodesLeft: 8, settings: SETTINGS }),
  );
  window.history.pushState({}, "", "/");
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("an analysis keeps going on another page and its result is there when you come back", async () => {
  let finish;
  polls = [status("running"), () => new Promise((r) => (finish = r))];
  routeGets();
  render(<App />);
  await upload();
  expect(await screen.findByText(/finding the body/i)).toBeInTheDocument();

  await go(/settings/i);
  expect(await screen.findByRole("heading", { name: /settings/i })).toBeInTheDocument();
  // Still being analysed, and the app says so wherever you are.
  expect(screen.getByRole("status")).toHaveTextContent(/analysing your video/i);
  await go(/analyse/i);
  expect(screen.getByRole("heading", { name: /analysing your video/i })).toBeInTheDocument();
  expect(screen.queryByText(/drop your video here/i)).toBeNull();

  await go(/settings/i);
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  await act(async () => finish(DONE));
  expect(await screen.findByText(/your walk has been measured/i)).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: /view the result/i }));
  });
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledTimes(1); // one upload, not a second one on return
});

test("'Notify me when it's done' still notifies after moving to another page", async () => {
  const notes = [];
  const NotificationMock = vi.fn(function (title, opts) {
    notes.push({ title, ...opts });
  });
  NotificationMock.permission = "default";
  NotificationMock.requestPermission = vi.fn(async () => {
    NotificationMock.permission = "granted";
    return "granted";
  });
  vi.stubGlobal("Notification", NotificationMock);
  let finish;
  polls = [status("running"), () => new Promise((r) => (finish = r))];
  routeGets();
  render(<App />);
  await upload();
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: /notify me when it's done/i }));
  });
  await go(/settings/i);
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  await act(async () => finish(DONE));
  expect(notes).toEqual([
    expect.objectContaining({ title: "GaitScan", body: "Your walk has been measured." }),
  ]);
});

test("reloading the page picks the analysis up again", async () => {
  sessionStorage.setItem("gaitscan_job", JSON.stringify({ jobId: JOB }));
  polls = [status("running"), DONE];
  routeGets();
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith(STATUS_URL, expect.anything());
  expect(sessionStorage.getItem("gaitscan_job")).toBeNull();
});

test("a server restart during the analysis is waited out, not shown as a failure", async () => {
  const restarting = () => Promise.reject({ response: { status: 502, data: "Bad Gateway" } });
  polls = [status("running"), restarting, restarting, DONE];
  routeGets();
  render(<App />);
  await upload();
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
});

test("a status check that never answers ends in a clear error, not an endless spinner", async () => {
  Object.assign(polling, { requestTimeoutMs: 30, retryForMs: 100 });
  polls = [() => new Promise(() => {})];
  routeGets();
  render(<App />);
  await upload();
  expect(await screen.findByText(/lost contact with the server/i, {}, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByText(/history/i, { selector: "[role=alert] *, [role=alert]" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /analysing your video/i })).toBeNull();
});

test("an analysis that never finishes stops waiting after a deadline and says what to do", async () => {
  Object.assign(polling, { deadlineMs: 150 });
  polls = [status("running")];
  routeGets();
  render(<App />);
  await upload();
  expect(
    await screen.findByText(/taking much longer than it should/i, {}, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /analysing your video/i })).toBeNull();
  expect(sessionStorage.getItem("gaitscan_job")).toBeNull();
});

test("an upload that never reaches the server says so", async () => {
  polls = [DONE];
  routeGets();
  render(<App />);
  axios.post.mockRejectedValueOnce({ code: "ERR_NETWORK", message: "Network Error" });
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
  expect(await screen.findByText(/upload didn't reach the server/i)).toBeInTheDocument();
});
