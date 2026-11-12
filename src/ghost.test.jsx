// Ghost replay (Phase 9): a session's stride outline (backend result.curves.stride_outline), replayed
// on its own and, when comparing, the earlier session as a ghost under the later one.
import { render, screen, within } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import { STRIDE } from "./landing/walker";

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

const NAMES = ["hip", "knee", "ankle", "heel", "toe"];
const sample = (track) => Array.from({ length: 101 }, (_, i) => track[Math.round((i / 100) * 119) % 120]);
const OUTLINE = {
  points: Object.fromEntries(
    ["L", "R"].flatMap((s) => NAMES.map((n) => [`${s}_${n}`, sample(STRIDE.points[`${s}_${n}`])])),
  ),
  strides: 6,
  trail_strike: 0.5,
};
const session = (id, created_at, outline) => ({
  id,
  created_at,
  legacy: false,
  pipeline_version: "2.0.0",
  disclaimer: "not a medical device",
  tags: [],
  result: {
    status: "accepted",
    metrics: { cadence: { value: 110, unit: "steps/min" } },
    quality: {},
    curves: outline === undefined ? {} : { stride_outline: outline },
  },
});

function routes(byId) {
  axios.get.mockImplementation(async (url) => {
    const id = url.split("/").pop();
    if (byId[id]) return { data: byId[id] };
    if (url.endsWith("/shares")) return { data: [] };
    return { data: [] };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.setItem("gaitscan_user", JSON.stringify({ token: "t", role: "patient", name: "Ana" }));
});

test("comparing two sessions replays both strides, the earlier as a ghost", async () => {
  routes({
    a: session("a", "2026-09-01T09:00:00Z", OUTLINE),
    b: session("b", "2026-10-20T09:00:00Z", OUTLINE),
  });
  window.history.pushState({}, "", "/compare/a/b");
  render(<App />);
  const replay = await screen.findByRole("region", { name: /stride replay/i });
  expect(replay.textContent).toMatch(/1 Sept? 2026/);
  expect(replay.textContent).toMatch(/20 Oct 2026/);
  expect(within(replay).getByRole("button", { name: /pause/i })).toBeInTheDocument();
  expect(within(replay).getByRole("slider", { name: /stride phase/i })).toBeInTheDocument();
  expect(replay.textContent).toMatch(/isn't validated/i);
});

test("a session without a stride outline says why", async () => {
  routes({
    a: session("a", "2026-09-01T09:00:00Z", undefined),
    b: session("b", "2026-10-20T09:00:00Z", OUTLINE),
  });
  window.history.pushState({}, "", "/compare/a/b");
  render(<App />);
  const replay = await screen.findByRole("region", { name: /stride replay/i });
  expect(replay.textContent).toMatch(/analysed before stride outlines were kept/i);
});

test("a session's own page replays its stride", async () => {
  routes({ b: session("b", "2026-10-20T09:00:00Z", OUTLINE) });
  window.history.pushState({}, "", "/sessions/b");
  render(<App />);
  const replay = await screen.findByRole("region", { name: /stride replay/i });
  expect(within(replay).getByRole("slider", { name: /stride phase/i })).toBeInTheDocument();
});

test("no replay when the legs couldn't be told apart", async () => {
  routes({ b: session("b", "2026-10-20T09:00:00Z", null) });
  window.history.pushState({}, "", "/sessions/b");
  render(<App />);
  const replay = await screen.findByRole("region", { name: /stride replay/i });
  expect(replay.textContent).toMatch(/left and right legs couldn't be told apart/i);
});
