// Sign in with Google (Phase 9): shown only when VITE_GOOGLE_CLIENT_ID is set; Google's ID token goes to
// the backend's POST /auth/google, which checks it.
import { render, screen, act } from "@testing-library/react";
import axios from "axios";
import App from "./App";

vi.mock("axios", () => {
  const m = {
    post: vi.fn(),
    get: vi.fn(async () => ({ data: [] })),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  };
  return { __esModule: true, default: m, ...m };
});

const CODES = Array.from({ length: 8 }, (_, i) => `AB${i}C-DEFG-HJKM-NPQ${i}`);
let googleCallback;

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
  window.history.pushState({}, "", "/signin");
  window.google = {
    accounts: {
      id: {
        initialize: vi.fn((opts) => (googleCallback = opts.callback)),
        renderButton: vi.fn(),
      },
    },
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.google;
});

test("without a client ID there is no Google button", () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
  render(<App />);
  expect(screen.queryByTestId("google-signin")).toBeNull();
  expect(window.google.accounts.id.initialize).not.toHaveBeenCalled();
});

test("a new Google account is signed in after saving its recovery codes", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "123-test.apps.googleusercontent.com");
  axios.post.mockResolvedValueOnce({
    data: { access_token: "tok", role: "patient", full_name: "Ana", recovery_codes: CODES },
  });
  render(<App />);
  expect(await screen.findByTestId("google-signin")).toBeInTheDocument();
  expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
    expect.objectContaining({ client_id: "123-test.apps.googleusercontent.com" }),
  );
  await act(async () => {
    await googleCallback({ credential: "header.payload.signature-from-google" });
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/google", {
    credential: "header.payload.signature-from-google",
  });
  expect(await screen.findByRole("heading", { name: /save your recovery codes/i })).toBeInTheDocument();
});

test("an existing account signs straight in", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "123-test.apps.googleusercontent.com");
  axios.post.mockResolvedValueOnce({
    data: { access_token: "tok", role: "patient", full_name: "Ana", recovery_codes_left: 8 },
  });
  render(<App />);
  await screen.findByTestId("google-signin");
  await act(async () => {
    await googleCallback({ credential: "header.payload.signature-from-google" });
  });
  expect(await screen.findByRole("heading", { name: /upload a walking video/i })).toBeInTheDocument();
});

test("a refused Google sign-in shows the reason", async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "123-test.apps.googleusercontent.com");
  axios.post.mockRejectedValueOnce({
    response: { status: 400, data: { detail: "Google hasn't verified this email address." } },
  });
  render(<App />);
  await screen.findByTestId("google-signin");
  await act(async () => {
    await googleCallback({ credential: "header.payload.signature-from-google" });
  });
  expect(await screen.findByText(/hasn't verified this email/i)).toBeInTheDocument();
});
