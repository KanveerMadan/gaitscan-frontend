// The published cadence reference by age and sex (owner decision 2026-11-12): Mobbs et al. 2025,
// Sensors 25(2):581 (CC BY 4.0), Tables 4 and 5. Optional: no sex or no birth year, no reference.
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import { polling } from "./api/client";
import { cadenceReference } from "./lib/norms";

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

const YEAR = new Date().getFullYear();
const SETTINGS = { retest_weeks: null, units: "metric", language: "en", theme: "system", goal_cadence: null };
const ACC = {
  cadence: { status: "validated", error_95: 4.5, mdc_95: 4.6, unit: "steps/min", note: "" },
  step_time: { status: "validated", error_95: 0.024, mdc_95: 0.025, unit: "s", note: "" },
};
const result = (extra = {}) => ({
  pipeline_version: "2.0.0",
  model: { name: "pose_landmarker_full", version: "float16/1", sha256: "x", mediapipe: "1.0.1" },
  test: "walk",
  status: "accepted",
  metrics: {
    cadence: { value: 109.1, n: 9, unit: "steps/min" },
    step_time: { value: 0.55, sd: 0.02, n: 9, unit: "s" },
  },
  accuracy: ACC,
  quality: { fps: 30, steady_walking_s: 7.4, passes: 1, steps_detected: 9 },
  notes: [],
  passes: [],
  curves: {},
  ...extra,
});

function signIn(settings = {}, profiles = []) {
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({
      token: "tok",
      role: "patient",
      name: "Ana",
      recoveryCodesLeft: 8,
      settings: { ...SETTINGS, sex: null, birth_year: null, ...settings },
      profiles,
    }),
  );
}

async function analyse(res) {
  axios.post.mockResolvedValueOnce({ data: { job_id: "j", status: "queued", status_url: "/analyses/j" } });
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.includes("/analyses/")
        ? {
            job_id: "j",
            status: "done",
            analysis: { job_id: "j", result: res, report_url: "/report/j", disclaimer: "x" },
          }
        : [],
    }),
  );
  render(<App />);
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
  await screen.findByRole("heading", { name: "Measurements" });
}

beforeEach(() => {
  vi.resetAllMocks();
  polling.intervalMs = 10;
  axios.defaults.headers.common = {};
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("the reference is the study's mean ± 1 SD for that sex and age group", () => {
  expect(cadenceReference({ sex: "female", age: 45 })).toMatchObject({
    group: "41–50",
    mean: 115.14,
    sd: 8.75,
    n: 26,
    low: 106,
    high: 124,
  });
  expect(cadenceReference({ sex: "male", age: 25 })).toMatchObject({
    group: "21–30",
    mean: 105.22,
    sd: 7.77,
    n: 42,
    low: 97,
    high: 113,
  });
  expect(cadenceReference({ sex: "female", age: 18 })).toMatchObject({ group: "18–20", n: 11 });
  expect(cadenceReference({ sex: "female", age: 20 })).toMatchObject({ group: "18–20" });
  expect(cadenceReference({ sex: "female", age: 21 })).toMatchObject({ group: "21–30" });
});

test("no reference without both fields, outside 18-80, or for a group of fewer than 10 people", () => {
  expect(cadenceReference({ sex: null, age: 45 })).toBeNull();
  expect(cadenceReference({ sex: "female", age: null })).toBeNull();
  expect(cadenceReference({ sex: "female", age: 17 })).toBeNull();
  expect(cadenceReference({ sex: "female", age: 81 })).toBeNull();
  expect(cadenceReference({ sex: "male", age: 65 })).toBeNull(); // 6 men aged 61-70 in the study
  expect(cadenceReference({ sex: "female", age: 75 })).toBeNull(); // 3 women aged 71-80
  expect(cadenceReference({ sex: "female", age: 65 })).toMatchObject({ n: 11 });
});

test("a result shows the reference for the account holder's age and sex, with its source", async () => {
  signIn({ sex: "female", birth_year: YEAR - 45 });
  await analyse(result());
  const ref = screen.getByRole("region", { name: /cadence reference/i });
  expect(ref).toHaveTextContent(/women aged 41–50/i);
  expect(ref).toHaveTextContent(/106–124 steps\/min/);
  expect(ref).toHaveTextContent(/109\.1 steps\/min/); // your value, beside it, without a verdict
  expect(ref.textContent).not.toMatch(/normal|abnormal|below average|healthy range|too (low|high)/i);
  const source = within(ref).getByRole("link", { name: /mobbs/i });
  expect(source).toHaveAttribute("href", "https://doi.org/10.3390/s25020581");
});

test("no reference when sex or birth year is empty, or for a treadmill test", async () => {
  signIn({ sex: "female", birth_year: null });
  await analyse(result());
  expect(screen.queryByRole("region", { name: /cadence reference/i })).toBeNull();
});

test("no reference for a treadmill test: the study walked over the ground", async () => {
  signIn({ sex: "female", birth_year: YEAR - 45 });
  await analyse(result({ test: "treadmill" }));
  expect(screen.queryByRole("region", { name: /cadence reference/i })).toBeNull();
});

test("a session of another person on the account uses their age and sex, at the session's date", async () => {
  // Holder: a man of 45 (would be 100–118); the profile: a woman born 1971, 55 at the session.
  signIn({ sex: "male", birth_year: 1981 }, [{ id: 7, name: "Mum", birth_year: 1971, sex: "female" }]);
  window.history.pushState({}, "", "/sessions/s1");
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith("/sessions/s1")
        ? {
            id: "s1",
            patient_name: "Mum",
            profile_id: 7,
            created_at: "2026-09-01T10:00:00",
            pipeline_version: "2.0.0",
            legacy: false,
            result: result(),
            note: null,
            notes: null,
            tags: [],
          }
        : [],
    }),
  );
  render(<App />);
  const ref = await screen.findByRole("region", { name: /cadence reference/i });
  expect(ref).toHaveTextContent(/women aged 51–60/i);
  expect(ref).toHaveTextContent(/106–123 steps\/min/);
});

test("Settings: sex and birth year are optional, saved when given and removable", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  const saved = { ...SETTINGS, sex: null, birth_year: null };
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith("/me/settings") ? saved : [] }));
  axios.patch.mockImplementation((url, body) => Promise.resolve({ data: { ...saved, ...body } }));
  render(<App />);
  const card = await screen.findByRole("region", { name: /about you/i });
  expect(card).toHaveTextContent(/optional/i);
  expect(within(card).getByRole("link", { name: /mobbs/i })).toBeInTheDocument();
  await act(async () => {
    fireEvent.change(within(card).getByLabelText(/^sex/i), { target: { value: "female" } });
  });
  expect(axios.patch).toHaveBeenLastCalledWith("http://api.test/me/settings", { sex: "female" });
  fireEvent.change(within(card).getByLabelText(/year of birth/i), { target: { value: "1981" } });
  await act(async () => {
    fireEvent.click(within(card).getByRole("button", { name: /save year/i }));
  });
  expect(axios.patch).toHaveBeenLastCalledWith("http://api.test/me/settings", { birth_year: 1981 });
  await act(async () => {
    fireEvent.click(within(card).getByRole("button", { name: /remove both/i }));
  });
  expect(axios.patch).toHaveBeenLastCalledWith("http://api.test/me/settings", {
    sex: null,
    birth_year: null,
  });
});

test("Settings: a person on the account can be given a sex, or none", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  const mum = { id: 7, name: "Mum", birth_year: 1971, sex: null };
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith("/me/settings")
        ? { ...SETTINGS, sex: null, birth_year: null }
        : url.endsWith("/profiles")
          ? [mum]
          : [],
    }),
  );
  axios.patch.mockImplementation((url, body) => Promise.resolve({ data: { ...mum, ...body } }));
  axios.post.mockImplementation((url, body) => Promise.resolve({ data: { id: 8, ...body } }));
  render(<App />);
  const people = await screen.findByRole("region", { name: /people you measure/i });
  await act(async () => {
    fireEvent.change(await within(people).findByLabelText(/sex of mum/i), { target: { value: "female" } });
  });
  expect(axios.patch).toHaveBeenLastCalledWith("http://api.test/profiles/7", { sex: "female" });
  fireEvent.change(within(people).getByLabelText("Name"), { target: { value: "Dad" } });
  fireEvent.change(within(people).getByLabelText("Year of birth"), { target: { value: "1969" } });
  fireEvent.change(within(people).getByLabelText(/^sex \(optional\)/i), { target: { value: "male" } });
  fireEvent.click(within(people).getByRole("checkbox"));
  await act(async () => {
    fireEvent.click(within(people).getByRole("button", { name: /add person/i }));
  });
  expect(axios.post).toHaveBeenLastCalledWith("http://api.test/profiles", {
    name: "Dad",
    birth_year: 1969,
    is_adult: true,
    sex: "male",
  });
});
