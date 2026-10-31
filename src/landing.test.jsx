import { render, screen } from "@testing-library/react";
import App from "./App";
import example from "./onboarding/example-result.json";
import { TRACE } from "./landing/walker";

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
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("signed-out visitors see what GaitScan does, how accurate it is, and where to sign in", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: /the way you walk/i })).toBeInTheDocument();
  const accuracy = screen.getByRole("region", { name: /how accurate/i });
  // The figures the API sends with every result (backend gaitcore/accuracy.py, from make evaluate).
  expect(accuracy.textContent).toContain(`± ${example.accuracy.cadence.error_95} steps/min`);
  expect(accuracy.textContent).toContain(`± ${example.accuracy.step_time.error_95} s`);
  expect(accuracy.textContent).toMatch(/not yet validated/i);
  expect(accuracy.textContent).toMatch(/Topham et al\. 2023/);
  expect(screen.getByRole("note").textContent).toMatch(/not a medical device/i);
  expect(screen.getAllByRole("link", { name: /^sign in$/i })[0]).toHaveAttribute("href", "/signin");
  expect(screen.getAllByRole("link", { name: /measure my walk/i })[0]).toHaveAttribute("href", "/signup");
  expect(screen.getAllByRole("link", { name: /example result/i })[0]).toHaveAttribute("href", "/demo");
});

test("the walking figure's numbers are the pipeline's measurement of the simulated walker", () => {
  render(<App />);
  const how = screen.getByRole("region", { name: /how it works/i });
  // tools/export_walker.py: the walker's true cadence and what the pipeline measured for it.
  expect(how.textContent).toContain(
    `set to ${TRACE.true_cadence} steps per minute, the pipeline measured ${TRACE.cadence}`,
  );
  expect(screen.getAllByRole("img", { name: /walking/i }).length).toBeGreaterThan(0);
});

test("no beta badge next to the name", () => {
  render(<App />);
  expect(document.body.textContent).not.toMatch(/\bbeta\b/i);
});
