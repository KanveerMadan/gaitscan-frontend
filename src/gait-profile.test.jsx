// The result page for a v3 result (Plan V3 Phase 11, FE-A; the owner's brief §4.1): summary, timing,
// joint movement, quality. Both legs only (no left/right, no symmetry: decision A); pelvis oscillation
// is never shown; the verdict's words come from the API in English and Hindi (D4).
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

function session(result = RESULT) {
  return {
    id: "s1",
    patient_name: "Ana",
    created_at: "2026-11-14T10:00:00",
    pipeline_version: "3.0.0",
    legacy: false,
    result,
    note: null,
    notes: null,
    tags: [],
    profile_id: null,
  };
}

function signIn(settings = null) {
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "tok", role: "patient", name: "Ana", recoveryCodesLeft: 8, settings }),
  );
}

async function openSession(result = RESULT) {
  window.history.pushState({}, "", "/sessions/s1");
  axios.get.mockImplementation((url) => {
    if (url.endsWith("/sessions/s1")) return Promise.resolve({ data: session(result) });
    if (url.endsWith("/references")) return Promise.resolve({ data: REFERENCES });
    if (url.includes("/report/")) return Promise.resolve({ data: new Blob(["%PDF"]) });
    return Promise.resolve({ data: [] });
  });
  await act(async () => {
    render(<App />);
  });
  return screen.findByRole("region", { name: "Summary" });
}

// A walk with one key measure slightly outside, as the API presents it.
function keepAnEye() {
  const r = clone(RESULT);
  const v = r.gait_profile.verdict;
  v.overall = "keep_an_eye";
  v.headline = { en: "Worth keeping an eye on.", hi: "ध्यान रखने लायक।" };
  v.summary = {
    en: "Slightly outside the typical range — worth re-testing in 2–4 weeks.",
    hi: "सामान्य सीमा से थोड़ा बाहर — 2–4 हफ़्ते में दोबारा जाँचना अच्छा रहेगा।",
  };
  v.drivers = ["knee_rom"];
  v.metrics.knee_rom.level = "slightly_outside";
  v.metrics.knee_rom.direction = "below";
  v.observations = [
    {
      metric: "knee_rom",
      level: "slightly_outside",
      text: { en: "Knee range of motion is below the typical range: 44.8 ° (typical 46–69 °).", hi: "x" },
    },
  ];
  v.next_steps = { en: ["Re-test in 2–4 weeks, filmed the same way."], hi: ["x"] };
  return r;
}

function noVerdict() {
  const r = clone(RESULT);
  const v = r.gait_profile.verdict;
  Object.assign(v, {
    overall: null,
    no_verdict: "too_few_steps",
    headline: null,
    summary: {
      en: "Not enough steps were measured for an overall summary. The measurements that had enough data are shown.",
      hi: "x",
    },
    drivers: [],
    observations: [],
    next_steps: { en: [], hi: [] },
    tips: {
      en: [
        "Walk across the frame and back two or three times.",
        "Keep the whole body, feet included, in view all the time.",
      ],
      hi: ["x", "y"],
    },
  });
  return r;
}

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

test("the summary card shows the verdict with an icon and text, the GPS, the notice and a report download", async () => {
  const card = await openSession();
  expect(within(card).getByRole("img", { name: "Typical" })).toBeInTheDocument();
  expect(card).toHaveTextContent("Looks typical.");
  expect(card).toHaveTextContent("Your walk looks typical for the comparison group.");
  expect(card).toHaveTextContent("Experimental estimate from a phone video, not a medical assessment.");
  expect(card).toHaveTextContent(/Gait Profile Score/);
  expect(card).toHaveTextContent(/13\.5°/);
  expect(card).toHaveTextContent("compared with healthy adults measured by this app");
  expect(card).toHaveTextContent("All key measurements are within the typical range.");
  await act(async () => {
    fireEvent.click(within(card).getByRole("button", { name: /download report \(pdf\)/i }));
  });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/report\/s1\?lang=en$/), {
    responseType: "blob",
  });
});

test("findings and next steps come from the verdict, and the level is never colour alone", async () => {
  const card = await openSession(keepAnEye());
  expect(within(card).getByRole("img", { name: "Worth keeping an eye on" })).toBeInTheDocument();
  expect(card).toHaveTextContent("Slightly outside the typical range — worth re-testing in 2–4 weeks.");
  const findings = within(card).getByRole("list", { name: "Key findings" });
  expect(findings).toHaveTextContent(/Knee range of motion is below the typical range/);
  expect(within(findings).getByRole("img", { name: "Slightly outside" })).toBeInTheDocument();
  expect(card).toHaveTextContent("Re-test in 2–4 weeks, filmed the same way.");
});

test("the timing section has levels, typical ranges, error ranges, confidence and what each means", async () => {
  await openSession();
  const timing = screen.getByRole("region", { name: "Timing and rhythm" });
  const cadence = within(timing).getByRole("row", { name: /cadence/i });
  expect(cadence).toHaveTextContent("110 steps/min");
  expect(cadence).toHaveTextContent("88.8 to 142 steps/min");
  expect(within(cadence).getByRole("img", { name: "Typical" })).toBeInTheDocument();
  expect(cadence).toHaveTextContent("±4.5 steps/min");
  expect(cadence).toHaveTextContent("High");
  const stance = within(timing).getByRole("row", { name: /^stance/i });
  expect(stance).toHaveTextContent("Information");
  expect(stance).toHaveTextContent("Not yet validated");
  fireEvent.click(within(timing).getByRole("button", { name: "What this means: Cadence" }));
  expect(timing).toHaveTextContent("Steps per minute.");
});

test("a measurement without enough data says so instead of a number", async () => {
  const r = clone(RESULT);
  r.gait_profile.timing.double_support_pct.value = null;
  delete r.gait_profile.verdict.metrics.double_support_pct;
  await openSession(r);
  const row = within(screen.getByRole("region", { name: "Timing and rhythm" })).getByRole("row", {
    name: /double support/i,
  });
  expect(row).toHaveTextContent("Not enough data");
});

test("joint movement shows a chart with a text summary per joint, key events, ranges and snapshots", async () => {
  await openSession();
  const joints = screen.getByRole("region", { name: "Joint movement" });
  for (const joint of ["Knee", "Hip", "Ankle"]) {
    const fig = within(joints).getByRole("figure", { name: `${joint} angle over the gait cycle` });
    expect(fig).toHaveTextContent(/This walk \(both legs\): from .*° to .*°/);
    expect(fig).toHaveTextContent(/typical band/i);
  }
  expect(within(joints).getByRole("row", { name: /knee bend in swing/i })).toHaveTextContent("56.7°");
  expect(within(joints).getByRole("row", { name: /hip range of motion/i })).toHaveTextContent("±4.0°");
  expect(joints).toHaveTextContent(/9° more than a sensor worn on the thigh/);
  expect(within(joints).getByRole("row", { name: /arm swing/i })).toHaveTextContent("Information");
  expect(within(joints).getByRole("img", { name: "Skeleton at heel strike" })).toBeInTheDocument();
  expect(within(joints).getByRole("img", { name: "Skeleton at toe-off" })).toBeInTheDocument();
  expect(joints).toHaveTextContent(/Separate values for each leg, and symmetry, aren't shown/);
});

test("the profile never shows pelvis oscillation or per-side values", async () => {
  await openSession();
  for (const name of ["Summary", "Timing and rhythm", "Joint movement"]) {
    const region = screen.getByRole("region", { name });
    expect(region.textContent).not.toMatch(/pelvi/i);
    expect(region.textContent).not.toMatch(/\b(left|right)\b/i);
  }
});

test("quality and confidence are collapsible, and closed when the result has a verdict", async () => {
  await openSession();
  const details = screen.getByRole("group", { name: /recording quality and data confidence/i });
  expect(details).not.toHaveAttribute("open");
  expect(details).toHaveTextContent(/18 steps, 15 strides/);
  expect(details).toHaveTextContent(/leg landmark visibility/i);
});

test("without a verdict the page says why and how to re-record, and opens the quality section", async () => {
  const card = await openSession(noVerdict());
  expect(within(card).getByRole("img", { name: "No overall summary" })).toBeInTheDocument();
  expect(card).toHaveTextContent("No overall summary");
  expect(card).toHaveTextContent(/Not enough steps were measured for an overall summary/);
  const tips = within(card).getByRole("list", { name: "Recording tips" });
  expect(tips).toHaveTextContent("Walk across the frame and back two or three times.");
  expect(screen.getByRole("group", { name: /recording quality and data confidence/i })).toHaveAttribute(
    "open",
  );
});

test("in Hindi the verdict and the section titles are in Hindi, and the report is asked for in Hindi", async () => {
  signIn({ language: "hi" });
  const card = await openSession();
  expect(card).toHaveTextContent("सामान्य सीमा में है।");
  expect(screen.getByRole("region", { name: "समय और लय" })).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(within(card).getByRole("button", { name: /PDF/ }));
  });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/report\/s1\?lang=hi$/), {
    responseType: "blob",
  });
});

test("a result stored before the gait profile keeps the earlier page", async () => {
  const r = clone(RESULT);
  r.gait_profile = null;
  r.pipeline_version = "2.0.0";
  window.history.pushState({}, "", "/sessions/s1");
  axios.get.mockImplementation((url) =>
    Promise.resolve({ data: url.endsWith("/sessions/s1") ? session(r) : [] }),
  );
  await act(async () => {
    render(<App />);
  });
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Timing and rhythm" })).toBeNull();
});
