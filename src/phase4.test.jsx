// Phase 4: dashboard, session detail (notes and tags), comparison against repeatability.
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import axios from "axios";
import App from "./App";

vi.mock("axios", () => {
  const m = {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  };
  return { __esModule: true, default: m, ...m };
});

const accuracy = {
  cadence: { status: "validated", error_95: 4.7, mdc_95: 4.4, unit: "steps/min", note: "" },
  step_time: { status: "validated", error_95: 0.024, mdc_95: 0.023, unit: "s", note: "" },
  peak_knee_flexion: { status: "not_yet_validated", note: "No knee-angle reference yet." },
};
const curve = (peak) =>
  Array.from({ length: 101 }, (_, i) => Math.round(peak * Math.sin((Math.PI * i) / 100)));

function session(id, created_at, cadence, stepTime, extra = {}) {
  return {
    id,
    patient_name: "Anonymous",
    created_at,
    pipeline_version: "2.0.0",
    legacy: false,
    note: null,
    notes: null,
    tags: [],
    result: {
      pipeline_version: "2.0.0",
      model: {},
      status: "accepted",
      test: "walk",
      metrics: {
        cadence: { value: cadence, n: 9, unit: "steps/min" },
        step_time: { value: stepTime, sd: 0.02, n: 9, unit: "s" },
        peak_knee_flexion: { left: { value: 58, sd: 1, n: 3, unit: "deg" }, right: null },
      },
      accuracy,
      quality: { fps: 30, steady_walking_s: 7, passes: 2, steps_detected: 9, strides: { left: 3, right: 3 } },
      notes: [],
      passes: [],
      pass_variability: null,
      curves: { knee_flexion: { unit: "deg", points: 101, left: curve(58), right: null } },
    },
    ...extra,
  };
}

const NEW = session("new", "2026-10-20T09:00:00", 116.0, 0.517, {
  tags: ["new shoes"],
  notes: "After physio",
});
const OLD = session("old", "2026-09-01T09:00:00", 110.0, 0.545);
const SAME = session("same", "2026-10-21T09:00:00", 112.0, 0.536);

function routes(sessions) {
  axios.get.mockImplementation(async (url) => {
    if (url.endsWith("/sessions")) return { data: sessions };
    const id = url.split("/sessions/")[1];
    const s = sessions.find((x) => x.id === id);
    if (s) return { data: { ...s, disclaimer: "not a medical device" } };
    throw Object.assign(new Error("404"), {
      response: { status: 404, data: { detail: "Session not found" } },
    });
  });
}

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.setItem("gaitscan_user", JSON.stringify({ token: "tok", role: "patient", name: "Test" }));
  window.history.pushState({}, "", "/");
});

async function openHistory() {
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: /history/i }));
  });
}

test("the dashboard shows the latest results and when the last test was", async () => {
  routes([NEW, OLD]);
  render(<App />);
  await openHistory();
  const latest = await screen.findByRole("region", { name: /latest/i });
  expect(latest.textContent).toMatch(/116 steps\/min/);
  expect(latest.textContent).toMatch(/20 Oct 2026/);
  expect(within(screen.getByRole("list", { name: "Sessions" })).getByText("new shoes")).toBeInTheDocument();
});

test("a session's page lets the owner add notes and tags", async () => {
  routes([NEW, OLD]);
  axios.patch.mockResolvedValue({ data: { ...OLD, notes: "Tired today", tags: ["evening"] } });
  render(<App />);
  await openHistory();
  await act(async () => {
    fireEvent.click(await screen.findByRole("link", { name: /1 sept? 2026/i }));
  });
  await screen.findByRole("heading", { name: "Measurements" });
  fireEvent.change(screen.getByLabelText(/^notes/i), { target: { value: "Tired today" } });
  fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: "evening" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /save notes/i }));
  });
  expect(axios.patch).toHaveBeenCalledWith("http://api.test/sessions/old", {
    notes: "Tired today",
    tags: ["evening"],
  });
  expect(await screen.findByText(/saved/i)).toBeInTheDocument();
});

test("comparing two sessions says whether a difference is larger than repeat walks differ", async () => {
  routes([NEW, OLD]);
  render(<App />);
  await openHistory();
  fireEvent.click(await screen.findByRole("checkbox", { name: /20 oct 2026/i }));
  fireEvent.click(screen.getByRole("checkbox", { name: /1 sept? 2026/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: /compare/i }));
  });
  const row = await screen.findByRole("row", { name: /cadence/i });
  expect(row.textContent).toMatch(/\+6(\.0)? steps\/min/);
  expect(row.textContent).toMatch(/larger than/i);
  expect(screen.queryByRole("region", { name: /knee/i })).toBeNull(); // removed 2026-11-12
});

test("a difference within repeat-walk variation is labelled as such", async () => {
  routes([SAME, NEW]);
  window.history.pushState({}, "", "/compare/new/same");
  render(<App />);
  const row = await screen.findByRole("row", { name: /cadence/i });
  expect(row.textContent).toMatch(/within/i);
  expect(within(row).queryByText(/larger than/i)).toBeNull();
});

test("a session can be deleted from its page after a confirmation", async () => {
  routes([NEW, OLD]);
  axios.delete = vi.fn(async () => ({ status: 204 }));
  window.history.pushState({}, "", "/sessions/old");
  render(<App />);
  await screen.findByRole("heading", { name: "Measurements" });
  fireEvent.click(screen.getByRole("button", { name: /delete this session/i }));
  expect(axios.delete).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /yes, delete it/i }));
  });
  expect(axios.delete).toHaveBeenCalledWith("http://api.test/sessions/old");
  expect(await screen.findByRole("heading", { name: /your walking/i })).toBeInTheDocument();
});
