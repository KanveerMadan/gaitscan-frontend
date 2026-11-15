import { render, screen, within } from "@testing-library/react";
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

function open(path) {
  localStorage.clear();
  window.history.pushState({}, "", path);
  render(<App />);
}

test("the Learn index lists every measurement GaitScan can show, without signing in", async () => {
  open("/learn");
  const list = await screen.findByRole("list", { name: /measurements/i });
  for (const [name, href] of [
    [/cadence/i, "/learn/cadence"],
    [/step time/i, "/learn/step-time"],
    [/step length/i, "/learn/step-length"],
    [/walking speed/i, "/learn/walking-speed"],
  ])
    expect(within(list).getByRole("link", { name })).toHaveAttribute("href", href);
});

test("a validated measurement's page gives the API's error range and cites its sources", async () => {
  open("/learn/cadence");
  expect(await screen.findByRole("heading", { level: 1, name: /cadence/i })).toBeInTheDocument();
  const main = screen.getByRole("main");
  expect(main.textContent).toContain(`± ${example.accuracy.cadence.error_95} steps/min`);
  expect(main.textContent).toContain(`${example.accuracy.cadence.mdc_95} steps/min`);
  const sources = screen.getByRole("region", { name: /sources/i });
  expect(within(sources).getByRole("link", { name: /10\.1038\/s41597-023-02161-8/ })).toHaveAttribute(
    "href",
    "https://doi.org/10.1038/s41597-023-02161-8",
  );
  expect(sources.textContent).toMatch(/Tudor-Locke/);
});

test("an unvalidated measurement's page says so up front", async () => {
  open("/learn/walking-speed");
  expect(await screen.findByRole("heading", { level: 1, name: /walking speed/i })).toBeInTheDocument();
  expect(screen.getByRole("main").textContent).toMatch(/not yet validated/i);
});

test("an unknown measurement points back to the list", async () => {
  open("/learn/stride-score");
  expect(await screen.findByText(/no page for that measurement/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /all measurements/i })).toHaveAttribute("href", "/learn");
});

test("the example result links each measurement to its Learn page", async () => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  open("/demo");
  const timing = await screen.findByRole("region", { name: "Timing and rhythm" });
  expect(within(timing).getByRole("link", { name: /^cadence$/i })).toHaveAttribute("href", "/learn/cadence");
  expect(within(timing).getByRole("link", { name: /^step time$/i })).toHaveAttribute(
    "href",
    "/learn/step-time",
  );
});
