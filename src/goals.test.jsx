// Goals, history search and filters, and the "analysis done" notification (Phase 9).
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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

const DEFAULTS = { retest_weeks: null, units: "metric", language: "en", theme: "system", goal_cadence: null };
const signIn = (settings = DEFAULTS) =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "tok", role: "patient", name: "Ana", recoveryCodesLeft: 8, settings }),
  );
const ACC = { cadence: { status: "validated", error_95: 4.5, mdc_95: 4.6, unit: "steps/min" } };
const session = (id, created_at, cadence, tags = [], notes = null) => ({
  id,
  created_at,
  legacy: false,
  tags,
  notes,
  result: { metrics: { cadence: { value: cadence, unit: "steps/min" } }, accuracy: ACC },
});
const SESSIONS = [
  session("c", "2026-10-20T09:00:00Z", 108, ["evening"], "After a long day"),
  session("b", "2026-09-20T09:00:00Z", 101, ["morning"], null),
  session("a", "2026-08-20T09:00:00Z", 99, ["morning", "new shoes"], "Felt stiff"),
];

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
  polling.intervalMs = 5;
});

test("a cadence goal is set and cleared in settings", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  axios.get.mockResolvedValue({ data: DEFAULTS });
  axios.patch.mockResolvedValueOnce({ data: { ...DEFAULTS, goal_cadence: 112 } });
  axios.patch.mockResolvedValueOnce({ data: DEFAULTS });
  render(<App />);
  fireEvent.change(await screen.findByLabelText(/cadence goal/i), { target: { value: "112" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));
  });
  expect(axios.patch).toHaveBeenCalledWith("http://api.test/me/settings", { goal_cadence: 112 });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /clear goal/i }));
  });
  expect(axios.patch).toHaveBeenLastCalledWith("http://api.test/me/settings", { goal_cadence: null });
});

test("the dashboard compares the latest cadence with the goal, allowing for measurement noise", async () => {
  signIn({ ...DEFAULTS, goal_cadence: 112 });
  window.history.pushState({}, "", "/history");
  axios.get.mockResolvedValue({ data: SESSIONS });
  render(<App />);
  const card = await screen.findByRole("region", { name: /cadence goal/i });
  expect(card.textContent).toMatch(/112 steps\/min/);
  expect(card.textContent).toMatch(/4 steps\/min below/);
  expect(card.textContent).toMatch(/within measurement noise/i); // |108 - 112| < 4.6
});

test("no goal card without a goal", async () => {
  signIn();
  window.history.pushState({}, "", "/history");
  axios.get.mockResolvedValue({ data: SESSIONS });
  render(<App />);
  await screen.findByRole("region", { name: /latest results/i });
  expect(screen.queryByRole("region", { name: /cadence goal/i })).toBeNull();
});

test("sessions can be searched by notes and tags and filtered by tag", async () => {
  signIn();
  window.history.pushState({}, "", "/history");
  axios.get.mockResolvedValue({ data: SESSIONS });
  render(<App />);
  const list = await screen.findByRole("list", { name: /sessions/i });
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  fireEvent.change(screen.getByRole("searchbox", { name: /search sessions/i }), {
    target: { value: "stiff" },
  });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  fireEvent.change(screen.getByRole("searchbox", { name: /search sessions/i }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /^morning$/i }));
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByRole("button", { name: /^morning$/i })).toHaveAttribute("aria-pressed", "true");
});

test("a finished analysis can notify a hidden tab", async () => {
  signIn();
  window.history.pushState({}, "", "/");
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
  axios.post.mockResolvedValueOnce({ data: { job_id: "j", status: "queued", status_url: "/analyses/j" } });
  let resolveDone;
  axios.get
    .mockResolvedValueOnce({ data: { job_id: "j", status: "running" } })
    .mockImplementationOnce(() => new Promise((r) => (resolveDone = r)));
  render(<App />);
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: /notify me when it's done/i }));
  });
  expect(NotificationMock.requestPermission).toHaveBeenCalled();
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  await vi.waitFor(() => expect(resolveDone).toBeTypeOf("function")); // the second poll is in flight
  await act(async () => {
    resolveDone({
      data: {
        job_id: "j",
        status: "done",
        analysis: { job_id: "j", result: { metrics: { cadence: { value: 109, unit: "steps/min" } } } },
      },
    });
  });
  expect(notes).toHaveLength(1);
  expect(notes[0].title).toMatch(/GaitScan/);
  expect(notes[0].body).toMatch(/measured/i);
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  vi.unstubAllGlobals();
});
