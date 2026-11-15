// The public example result (/demo) and the walkthrough's last step show a Phase 11 result: the
// simulated walker's gait profile, verdict, joint charts and an example PDF, without an account and
// without waiting for the API (the typical bands ship with the example).
import { render, screen, within, fireEvent } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import example from "./onboarding/example-result.json";

vi.mock("axios", () => {
  const m = {
    post: vi.fn(),
    get: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  };
  return { __esModule: true, default: m, ...m };
});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function open(path) {
  window.history.pushState({}, "", path);
  render(<App />);
}

test("the example is a Phase 11 result from the simulated walker", () => {
  expect(example.pipeline_version).toBe("3.0.0");
  expect(example.gait_profile.verdict.overall).toBeTruthy();
  expect(example.gait_profile.kinematics.arm_swing_deg.value).toBeGreaterThan(0);
});

test("/demo shows the summary with its verdict, the joint charts and the example reports, with no account", async () => {
  open("/demo");
  const summary = await screen.findByRole("region", { name: "Summary" });
  expect(within(summary).getByRole("img", { name: "Worth keeping an eye on" })).toBeInTheDocument();
  expect(summary).toHaveTextContent("Worth keeping an eye on.");
  expect(summary).toHaveTextContent(/Knee range of motion is below the typical range/);
  expect(within(summary).getByRole("link", { name: /example report \(PDF\)/i })).toHaveAttribute(
    "href",
    "/example-report.pdf",
  );
  expect(within(summary).getByRole("link", { name: /हिन्दी/ })).toHaveAttribute(
    "href",
    "/example-report-hi.pdf",
  );
  expect(screen.getByText(/simulated walker/i)).toBeInTheDocument();
  const joints = screen.getByRole("region", { name: "Joint movement" });
  for (const joint of ["Knee", "Hip", "Ankle"])
    expect(
      within(joints).getByRole("figure", { name: `${joint} angle over the gait cycle` }),
    ).toBeInTheDocument();
  expect(within(joints).getByRole("img", { name: "Skeleton at heel strike" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Timing and rhythm" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Measurements" })).toBeNull(); // the pre-Phase 11 table
  expect(screen.queryByRole("note", { name: "Age-matched comparisons" })).toBeNull(); // no account
  expect(axios.get).not.toHaveBeenCalled(); // the typical bands ship with the example
});

test("arm swing shows its upper-arm error range and stays information only", async () => {
  open("/demo");
  const joints = await screen.findByRole("region", { name: "Joint movement" });
  const arm = within(joints).getByRole("row", { name: /arm swing/i });
  expect(arm).toHaveTextContent("±7.0°");
  expect(arm).toHaveTextContent("Information");
  expect(joints).toHaveTextContent("Arm swing is measured on the upper arm (shoulder to elbow)");
  fireEvent.click(within(arm).getByRole("button", { name: /what this means/i }));
  expect(arm).toHaveTextContent(/upper arm/);
});

test("the walkthrough's example step shows the same result", async () => {
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "t", role: "patient", name: "Ana", recoveryCodesLeft: 8, settings: null }),
  );
  open("/welcome");
  fireEvent.click(await screen.findByRole("button", { name: /next/i }));
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  expect(await screen.findByRole("region", { name: "Summary" })).toHaveTextContent(
    "Worth keeping an eye on.",
  );
});
