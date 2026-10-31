// Settings and re-test reminders (Phase 9): no email, so reminders are a calendar file and a
// "next walking test" card; settings are the re-test interval, display units and theme.
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import { calendarFile, nextTestDue } from "./lib/reminders";
import { MeasurementTable } from "./measurements";
import { AuthContext } from "./auth-context";

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

const DEFAULTS = { retest_weeks: null, units: "metric", language: "en", theme: "system" };
const signIn = (settings = DEFAULTS) =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "tok", role: "patient", name: "Ana", recoveryCodesLeft: 8, settings }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
  document.documentElement.className = "";
});

test("the next test is due the chosen number of weeks after the last one", () => {
  expect(nextTestDue("2026-10-20T09:00:00Z", 2).toISOString().slice(0, 10)).toBe("2026-11-03");
  expect(nextTestDue("2026-10-20T09:00:00Z", null)).toBeNull();
  expect(nextTestDue(null, 2)).toBeNull();
});

test("the calendar file repeats every chosen number of weeks from the due date", () => {
  const ics = calendarFile(new Date(Date.UTC(2026, 10, 3)), 4);
  expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(ics).toContain("DTSTART;VALUE=DATE:20261103\r\n");
  expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=4\r\n");
  expect(ics).toContain("SUMMARY:GaitScan walking test\r\n");
  expect(ics).toMatch(/END:VCALENDAR\r\n$/);
});

test("the settings page saves the theme and applies it at once", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  axios.get.mockResolvedValue({ data: DEFAULTS });
  axios.patch.mockResolvedValue({ data: { ...DEFAULTS, theme: "dark" } });
  render(<App />);
  fireEvent.click(await screen.findByRole("radio", { name: "Dark" }));
  await act(async () => {});
  expect(axios.patch).toHaveBeenCalledWith("http://api.test/me/settings", { theme: "dark" });
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(JSON.parse(localStorage.getItem("gaitscan_user")).settings.theme).toBe("dark");
});

test("choosing a re-test interval saves it and offers a calendar reminder", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  axios.get.mockResolvedValue({ data: DEFAULTS });
  axios.patch.mockResolvedValue({ data: { ...DEFAULTS, retest_weeks: 4 } });
  render(<App />);
  fireEvent.change(await screen.findByLabelText(/walk again every/i), { target: { value: "4" } });
  await act(async () => {});
  expect(axios.patch).toHaveBeenCalledWith("http://api.test/me/settings", { retest_weeks: 4 });
  expect(screen.getByRole("button", { name: /add to calendar/i })).toBeInTheDocument();
});

test("the dashboard shows when the next walking test is due", async () => {
  signIn({ ...DEFAULTS, retest_weeks: 2 });
  window.history.pushState({}, "", "/history");
  axios.get.mockResolvedValue({
    data: [
      {
        id: "s1",
        created_at: "2026-10-20T09:00:00Z",
        legacy: false,
        result: { metrics: { cadence: { value: 110, unit: "steps/min" } } },
        tags: [],
      },
    ],
  });
  render(<App />);
  const card = await screen.findByRole("region", { name: /next walking test/i });
  expect(card.textContent).toMatch(/3 Nov 2026/);
  expect(within(card).getByRole("button", { name: /add to calendar/i })).toBeInTheDocument();
});

test("without an interval the dashboard offers to set one", async () => {
  signIn();
  window.history.pushState({}, "", "/history");
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  const card = await screen.findByRole("region", { name: /next walking test/i });
  expect(within(card).getByRole("link", { name: /set a reminder/i })).toHaveAttribute("href", "/settings");
});

test("imperial units show calibrated distances in feet and miles per hour", () => {
  const result = {
    metrics: {
      cadence: { value: 110, unit: "steps/min" },
      step_length: { value: 0.7, sd: 0.02, unit: "m" },
      walking_speed: { value: 1.28, unit: "m/s" },
    },
  };
  render(
    <AuthContext.Provider value={{ user: { settings: { ...DEFAULTS, units: "imperial" } } }}>
      <MeasurementTable result={result} />
    </AuthContext.Provider>,
  );
  expect(screen.getByRole("row", { name: /step length/i }).textContent).toMatch(/2\.30 ± 0\.07 ft/);
  expect(screen.getByRole("row", { name: /walking speed/i }).textContent).toMatch(/2\.86 mph/);
  expect(screen.getByRole("row", { name: /cadence/i }).textContent).toMatch(/110 steps\/min/);
});
