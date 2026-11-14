// History, progress, the Settings prompt and the clinician view for v3 results (Plan V3 Phase 11, FE-B;
// the owner's brief §4.2-4.4).
import { render, screen, act, within, fireEvent } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import RESULT from "./test-fixtures/result-v3.json";
import REFERENCES from "./test-fixtures/references.json";

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

const clone = (o) => JSON.parse(JSON.stringify(o));
const V2 = {
  ...clone(RESULT),
  gait_profile: null,
  pipeline_version: "2.0.0",
};

function keepAnEye() {
  const r = clone(RESULT);
  r.gait_profile.verdict.overall = "keep_an_eye";
  return r;
}

const SESSIONS = [
  {
    id: "s3",
    created_at: "2026-11-14T10:00:00",
    legacy: false,
    result: keepAnEye(),
    tags: [],
    notes: null,
    profile_id: null,
  },
  {
    id: "s2",
    created_at: "2026-10-20T10:00:00",
    legacy: false,
    result: RESULT,
    tags: [],
    notes: null,
    profile_id: null,
  },
  {
    id: "s1",
    created_at: "2026-09-01T10:00:00",
    legacy: false,
    result: V2,
    tags: [],
    notes: null,
    profile_id: null,
  },
]; // fmt: skip

const TRENDS = {
  sessions: [
    {
      id: "s1",
      created_at: "2026-09-01T10:00:00",
      overall: null,
      cadence: 104,
      step_time_cv: null,
      knee_rom: null,
      hip_rom: null,
      gps: null,
    },
    {
      id: "s2",
      created_at: "2026-10-20T10:00:00",
      overall: "typical",
      cadence: 106,
      step_time_cv: 2.8,
      knee_rom: 52,
      hip_rom: 49,
      gps: 6.5,
    },
    {
      id: "s3",
      created_at: "2026-11-14T10:00:00",
      overall: "keep_an_eye",
      cadence: 112,
      step_time_cv: 2.6,
      knee_rom: 44.8,
      hip_rom: 50.6,
      gps: 13.5,
    },
  ],
}; // fmt: skip

function signIn(settings = {}, role = "patient") {
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({
      token: "tok",
      role,
      name: "Ana",
      recoveryCodesLeft: 8,
      settings: { language: "en", units: "metric", ...settings },
      profiles: [],
    }),
  );
}

async function open(path, data) {
  window.history.pushState({}, "", path);
  axios.get.mockImplementation((url) => {
    if (url.includes("/report/")) return Promise.resolve({ data: new Blob(["%PDF"]) });
    if (url.endsWith("/references")) return Promise.resolve({ data: REFERENCES });
    return Promise.resolve({ data: data(url) });
  });
  await act(async () => {
    render(<App />);
  });
}

const history = (url) => (url.endsWith("/sessions") ? SESSIONS : url.includes("/me/trends") ? TRENDS : []);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  axios.defaults.headers.common = {};
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  signIn();
});

test("history rows show the overall verdict mark and the key numbers; earlier results keep theirs", async () => {
  await open("/history", history);
  const list = await screen.findByRole("list", { name: "Sessions" });
  const rows = within(list).getAllByRole("listitem");
  expect(within(rows[0]).getByRole("img", { name: "Worth keeping an eye on" })).toBeInTheDocument();
  expect(rows[0]).toHaveTextContent("Worth keeping an eye on");
  expect(rows[0]).toHaveTextContent(/Cadence: 110 steps\/min/);
  expect(rows[0]).toHaveTextContent(/Knee range: 44\.8°/);
  expect(within(rows[1]).getByRole("img", { name: "Typical" })).toBeInTheDocument();
  expect(rows[2]).toHaveTextContent(/Step time/); // a v2 result: as before
  expect(within(rows[2]).queryByRole("img")).toBeNull();
});

test("history search and the report download keep working, the report in the user's language", async () => {
  signIn({ language: "hi" });
  await open("/history", history);
  const list = await screen.findByRole("list", { name: "Sessions" });
  await act(async () => {
    fireEvent.click(within(list).getAllByRole("button", { name: /PDF|रिपोर्ट/ })[0]);
  });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/report\/s3\?lang=hi$/), {
    responseType: "blob",
  });
});

test("the progress view plots the trends, says what changed since the last test and shows the goal", async () => {
  signIn({ goal_cadence: 115 });
  await open("/history", history);
  const progress = await screen.findByRole("region", { name: "Progress" });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/me\/trends$/));
  for (const name of [
    "Cadence",
    "Step-time variability",
    "Knee range of motion",
    "Hip range of motion",
    "Gait Profile Score",
  ]) {
    expect(within(progress).getByRole("figure", { name: `${name} over time` })).toBeInTheDocument();
  } // fmt: skip
  const change = within(progress).getByRole("list", { name: "Change since last test" });
  const knee = within(change)
    .getByText(/Knee range of motion/)
    .closest("li");
  expect(within(knee).getByRole("img", { name: "down" })).toBeInTheDocument();
  expect(knee).toHaveTextContent("52.0° → 44.8°");
  const cadence = within(change)
    .getByText(/^Cadence/)
    .closest("li");
  expect(within(cadence).getByRole("img", { name: "up" })).toBeInTheDocument();
  const hip = within(change)
    .getByText(/Hip range of motion/)
    .closest("li");
  expect(within(hip).getByRole("img", { name: "no change" })).toBeInTheDocument(); // within ±4°
  expect(progress).toHaveTextContent("Cadence goal: 115 steps/min");
});

test("the progress view needs two tests with a gait profile", async () => {
  await open("/history", (url) =>
    url.endsWith("/sessions")
      ? SESSIONS.slice(1)
      : url.includes("/me/trends")
        ? { sessions: TRENDS.sessions.slice(0, 2) }
        : [],
  );
  await screen.findByRole("list", { name: "Sessions" });
  expect(screen.queryByRole("region", { name: "Progress" })).toBeNull();
});

test("a result without age or sex gently suggests adding them in Settings", async () => {
  await open("/sessions/s2", (url) => (url.endsWith("/sessions/s2") ? SESSIONS[1] : []));
  const prompt = await screen.findByRole("note", { name: "Age-matched comparisons" });
  expect(prompt).toHaveTextContent("Add your birth year and sex in Settings for age-matched comparisons.");
  expect(within(prompt).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
});

test("no prompt once both are set, or for a clinician", async () => {
  signIn({ sex: "female", birth_year: 1981 });
  await open("/sessions/s2", (url) => (url.endsWith("/sessions/s2") ? SESSIONS[1] : []));
  await screen.findByRole("region", { name: "Summary" });
  expect(screen.queryByRole("note", { name: "Age-matched comparisons" })).toBeNull();
});

test("Settings says where age and sex are used now", async () => {
  await open("/settings", (url) => (url.endsWith("/profiles") ? [] : { language: "en", units: "metric" }));
  const card = await screen.findByRole("region", { name: "About you" });
  expect(card).not.toHaveTextContent(/aren't in shared links or reports/);
  expect(card).toHaveTextContent(/PDF reports/);
  expect(card).toHaveTextContent(/Shared links compare with all adults/);
});

test("a clinician opens a patient's session from their list", async () => {
  signIn({}, "clinician");
  window.history.pushState({}, "", "/clinician");
  axios.get.mockImplementation((url) => {
    if (url.endsWith("/clinician/patients"))
      return Promise.resolve({
        data: [
          {
            patient_id: 7,
            name: "Ravi",
            email: "r@example.com",
            session_count: 1,
            latest_session_at: null,
            linked_since: null,
          },
        ],
      }); // fmt: skip
    if (url.endsWith("/clinician/patients/7/sessions"))
      return Promise.resolve({
        data: { patient: { id: 7, name: "Ravi", email: "r@example.com" }, sessions: [SESSIONS[0]] },
      });
    return Promise.resolve({ data: [] });
  });
  await act(async () => {
    render(<App />);
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: /Ravi/ }));
  });
  const list = await screen.findByRole("list", { name: "Sessions" });
  expect(within(list).getByRole("link", { name: /14 Nov 2026/ })).toHaveAttribute("href", "/sessions/s3");
});
