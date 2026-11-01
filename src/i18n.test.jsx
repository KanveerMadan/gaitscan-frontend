// Hindi interface (Phase 9): the language setting switches the app's own text; English stays the
// default and the fallback for anything not yet translated. The Hindi text is a draft until reviewed.
import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import en from "./i18n/en";
import hi from "./i18n/hi";

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
const signIn = (language = "en") =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({
      token: "t",
      role: "patient",
      name: "Ana",
      recoveryCodesLeft: 8,
      settings: { ...SETTINGS, language },
      profiles: [],
    }),
  );
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
});

test("Hindi has every English string, with the same placeholders, and nothing extra", () => {
  expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    expect(hi[key].trim(), key).not.toBe("");
    expect(placeholders(hi[key]), key).toEqual(placeholders(en[key]));
  }
});

test("with Hindi chosen the app's own text is in Hindi and the page says so", async () => {
  signIn("hi");
  window.history.pushState({}, "", "/");
  render(<App />);
  expect(await screen.findByRole("heading", { name: hi["analyse.title"] })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: hi["nav.history"] })).toBeInTheDocument();
  expect(screen.getByRole("note").textContent).toBe(hi["disclaimer"]);
  expect(document.documentElement.lang).toBe("hi");
});

test("English is the default", async () => {
  signIn();
  window.history.pushState({}, "", "/");
  render(<App />);
  expect(await screen.findByRole("heading", { name: en["analyse.title"] })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
});

test("settings switches the language at once and saves it", async () => {
  signIn();
  window.history.pushState({}, "", "/settings");
  axios.get.mockImplementation(async (url) => ({ data: url.endsWith("/profiles") ? [] : SETTINGS }));
  axios.patch.mockResolvedValue({ data: { ...SETTINGS, language: "hi" } });
  render(<App />);
  const hindi = await screen.findByRole("radio", { name: "हिन्दी" });
  await act(async () => {
    fireEvent.click(hindi);
  });
  expect(axios.patch).toHaveBeenCalledWith("http://api.test/me/settings", { language: "hi" });
  expect(await screen.findByRole("heading", { name: hi["settings.title"] })).toBeInTheDocument();
  expect(screen.getByText(hi["i18n.draft"])).toBeInTheDocument();
});
