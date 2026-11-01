// Other adults on one account (Phase 9): add them in settings (adults only), choose who is walking
// when uploading, and see one person's walking at a time in history.
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

const SETTINGS = { retest_weeks: null, units: "metric", language: "en", theme: "system", goal_cadence: null };
const MUM = { id: 5, name: "Mum", birth_year: 1960 };
const signIn = (profiles = []) =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({
      token: "t",
      role: "patient",
      name: "Ana",
      recoveryCodesLeft: 8,
      settings: SETTINGS,
      profiles,
    }),
  );
const session = (id, created_at, cadence, profile_id = null) => ({
  id,
  created_at,
  legacy: false,
  tags: [],
  profile_id,
  patient_name: profile_id ? "Mum" : "Ana",
  pipeline_version: "2.0.0",
  result: { metrics: { cadence: { value: cadence, unit: "steps/min" } } },
});

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
});

test("settings adds another adult only once they're confirmed as 18 or over", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  axios.get.mockImplementation(async (url) => ({ data: url.endsWith("/profiles") ? [] : SETTINGS }));
  axios.post.mockResolvedValueOnce({ data: MUM });
  render(<App />);
  const people = await screen.findByRole("region", { name: /people you measure/i });
  fireEvent.change(within(people).getByLabelText(/^name/i), { target: { value: "Mum" } });
  fireEvent.change(within(people).getByLabelText(/year of birth/i), { target: { value: "1960" } });
  const add = within(people).getByRole("button", { name: /add person/i });
  expect(add).toBeDisabled();
  fireEvent.click(within(people).getByRole("checkbox", { name: /18 or over/i }));
  expect(add).toBeEnabled();
  await act(async () => {
    fireEvent.click(add);
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/profiles", {
    name: "Mum",
    birth_year: 1960,
    is_adult: true,
  });
  expect(within(people).getByText("Mum")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("gaitscan_user")).profiles).toEqual([MUM]);
});

test("a birth year under 18 is refused before anything is sent", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  axios.get.mockImplementation(async (url) => ({ data: url.endsWith("/profiles") ? [] : SETTINGS }));
  render(<App />);
  const people = await screen.findByRole("region", { name: /people you measure/i });
  fireEvent.change(within(people).getByLabelText(/^name/i), { target: { value: "Kid" } });
  fireEvent.change(within(people).getByLabelText(/year of birth/i), {
    target: { value: String(new Date().getFullYear() - 10) },
  });
  fireEvent.click(within(people).getByRole("checkbox", { name: /18 or over/i }));
  expect(within(people).getByRole("button", { name: /add person/i })).toBeDisabled();
  expect(within(people).getByText(/for adults/i)).toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test("the upload asks who is walking and sends their profile", async () => {
  signIn([MUM]);
  window.history.pushState({}, "", "/");
  axios.post.mockResolvedValueOnce({ data: { job_id: "j", status: "queued", status_url: "/analyses/j" } });
  axios.get.mockResolvedValueOnce({
    data: { job_id: "j", status: "done", analysis: { job_id: "j", result: session("j", "", 100).result } },
  });
  render(<App />);
  fireEvent.change(await screen.findByLabelText(/who is walking/i), { target: { value: "5" } });
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
  expect(axios.post.mock.calls[0][1].get("profile_id")).toBe("5");
});

test("without other people there is no choice, and nothing extra is sent", async () => {
  signIn();
  window.history.pushState({}, "", "/");
  render(<App />);
  await screen.findByRole("heading", { name: /upload a walking video/i });
  expect(screen.queryByLabelText(/who is walking/i)).toBeNull();
});

test("history shows one person at a time, the account holder first", async () => {
  signIn([MUM]);
  window.history.pushState({}, "", "/history");
  axios.get.mockResolvedValue({
    data: [session("m1", "2026-10-20T09:00:00Z", 95, 5), session("a1", "2026-10-10T09:00:00Z", 112)],
  });
  render(<App />);
  const list = await screen.findByRole("list", { name: /sessions/i });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("region", { name: /latest/i }).textContent).toMatch(/112/);
  fireEvent.change(screen.getByLabelText(/whose walking/i), { target: { value: "5" } });
  expect(within(screen.getByRole("list", { name: /sessions/i })).getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("region", { name: /latest/i }).textContent).toMatch(/95/);
});
