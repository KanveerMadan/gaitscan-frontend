// Loading, empty and error states (Phase 6 leftovers, Phase 9): a failed request says so and offers
// to try again; it is never shown as an empty list.
import { render, screen, fireEvent, act } from "@testing-library/react";
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

const fail = () => Promise.reject({ response: { status: 500, data: {} } });
const as = (role) =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "t", role, name: "Ana", recoveryCodesLeft: 8 }),
  );
const SESSION = {
  id: "s1",
  created_at: "2026-10-20T09:00:00Z",
  legacy: false,
  tags: [],
  disclaimer: "x",
  pipeline_version: "2.0.0",
  result: { metrics: { cadence: { value: 110, unit: "steps/min" } } },
};

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
});

test("history that fails to load says so, not 'no sessions yet', and can try again", async () => {
  as("patient");
  window.history.pushState({}, "", "/history");
  axios.get.mockImplementationOnce(fail).mockResolvedValueOnce({ data: [SESSION] });
  render(<App />);
  expect(await screen.findByText(/couldn't load your sessions/i)).toBeInTheDocument();
  expect(screen.queryByText(/no sessions yet/i)).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
  });
  expect(await screen.findByRole("list", { name: /sessions/i })).toBeInTheDocument();
});

test("a clinician's patient list that fails to load says so and can try again", async () => {
  as("clinician");
  window.history.pushState({}, "", "/patients");
  axios.get.mockImplementationOnce(fail).mockResolvedValueOnce({ data: [] });
  render(<App />);
  expect(await screen.findByText(/couldn't load your patients/i)).toBeInTheDocument();
  expect(screen.queryByText(/no patients yet/i)).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
  });
  expect(await screen.findByText(/no patients yet/i)).toBeInTheDocument();
});

test("a failed invite code says so", async () => {
  as("clinician");
  window.history.pushState({}, "", "/patients");
  axios.get.mockResolvedValue({ data: [] });
  axios.post.mockImplementationOnce(fail);
  render(<App />);
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: /invite patient/i }));
  });
  expect(await screen.findByText(/couldn't create an invite code/i)).toBeInTheDocument();
});

test("share links that fail to load say so", async () => {
  as("patient");
  window.history.pushState({}, "", "/sessions/s1");
  axios.get.mockImplementation(async (url) => {
    if (url.endsWith("/shares")) return fail();
    return { data: SESSION };
  });
  render(<App />);
  expect(await screen.findByText(/couldn't load your share links/i)).toBeInTheDocument();
});
