import { render, screen } from "@testing-library/react";
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
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("signed-out visitors see what GaitScan does, how accurate it is, and can sign in right there", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: /measure how you walk/i })).toBeInTheDocument();
  const accuracy = screen.getByRole("region", { name: /how accurate/i });
  // The figures the API sends with every result (backend gaitcore/accuracy.py, from make evaluate).
  expect(accuracy.textContent).toContain(`± ${example.accuracy.cadence.error_95} steps/min`);
  expect(accuracy.textContent).toContain(`± ${example.accuracy.step_time.error_95} s`);
  expect(accuracy.textContent).toMatch(/not yet validated/i);
  expect(accuracy.textContent).toMatch(/Topham et al\. 2023/);
  expect(screen.getByRole("note").textContent).toMatch(/not a medical device/i);
  expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /example result/i })[0]).toHaveAttribute("href", "/demo");
});
