// Phase 5: consent before the first analysis, privacy center, password reset and email verification.
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

const CONSENT = {
  active: false,
  version: "2026-10-27",
  text: "Before you analyse a video, please confirm:\n- I am 18 or older.",
  accepted_at: null,
  history: [],
};
const JOB = "11111111-2222-3333-4444-555555555555";
const ANALYSIS = {
  job_id: JOB,
  report_url: `/report/${JOB}`,
  disclaimer: "not a medical device",
  result: {
    status: "accepted",
    metrics: { cadence: { value: 109.1, n: 9, unit: "steps/min" } },
    quality: { fps: 30, steady_walking_s: 7, passes: 1, steps_detected: 9, strides: {} },
    notes: [],
  },
};
const signIn = () =>
  localStorage.setItem("gaitscan_user", JSON.stringify({ token: "tok", role: "patient", name: "Test" }));
const reject = (status, detail) => Promise.reject({ response: { status, data: { detail } } });

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

async function uploadVideo() {
  await act(async () => {
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["x"], "walk.mp4", { type: "video/mp4" })] },
    });
  });
}

test("the first upload asks for consent, then goes ahead once it is given", async () => {
  signIn();
  axios.post
    .mockImplementationOnce(() => reject(403, { code: "consent_required", message: "Please accept." }))
    .mockResolvedValueOnce({ data: { ...CONSENT, active: true } }) // POST /consent
    .mockResolvedValueOnce({ data: { job_id: JOB, status: "queued", status_url: `/analyses/${JOB}` } });
  axios.get
    .mockResolvedValueOnce({ data: CONSENT }) // GET /consent: the text to show
    .mockResolvedValueOnce({
      data: { job_id: JOB, status: "done", rejection: null, error: null, analysis: ANALYSIS },
    });
  render(<App />);
  await uploadVideo();
  expect(await screen.findByText(/I am 18 or older/)).toBeInTheDocument();
  const agree = screen.getByRole("button", { name: /agree and analyse/i });
  expect(agree).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /i have read/i }));
  await act(async () => {
    fireEvent.click(agree);
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/consent", { version: "2026-10-27" });
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
});

test("the privacy page exports data and withdraws consent", async () => {
  signIn();
  window.history.pushState({}, "", "/privacy");
  axios.get.mockImplementation(async (url) =>
    url.endsWith("/consent")
      ? { data: { ...CONSENT, active: true, accepted_at: "2026-10-27T09:00:00" } }
      : { data: new Blob(["{}"]) },
  );
  axios.delete.mockResolvedValueOnce({ data: { ...CONSENT, active: false } });
  global.URL.createObjectURL = vi.fn(() => "blob:x");
  global.URL.revokeObjectURL = vi.fn();
  render(<App />);
  expect(await screen.findByText(/consent given/i)).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));
  });
  expect(axios.get).toHaveBeenCalledWith("http://api.test/me/export", { responseType: "blob" });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /withdraw consent/i }));
  });
  expect(axios.delete).toHaveBeenCalledWith("http://api.test/consent");
  expect(await screen.findByText(/no active consent/i)).toBeInTheDocument();
});

test("deleting the account needs the password and a confirmation, then signs out", async () => {
  signIn();
  window.history.pushState({}, "", "/privacy");
  axios.get.mockResolvedValue({ data: CONSENT });
  axios.delete.mockResolvedValueOnce({ status: 204, data: "" });
  render(<App />);
  const del = await screen.findByRole("button", { name: /delete my account/i });
  expect(del).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "my-password-123" } });
  expect(del).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /permanently/i }));
  await act(async () => {
    fireEvent.click(del);
  });
  expect(axios.delete).toHaveBeenCalledWith("http://api.test/me", { data: { password: "my-password-123" } });
  expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  expect(localStorage.getItem("gaitscan_user")).toBeNull();
});

test("forgot password sends a link and shows the server's answer", async () => {
  axios.post.mockResolvedValueOnce({
    data: { message: "If an account uses this email address, we've sent it a link." },
  });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/password-reset", { email: "a@b.com" });
  expect(await screen.findByText(/we've sent it a link/i)).toBeInTheDocument();
});

test("the reset link's page sets the new password with the token from the fragment", async () => {
  window.history.pushState({}, "", "/reset-password#token=abcdefghijklmnopqrstuvwxyz0123");
  axios.post.mockResolvedValueOnce({ data: { message: "Password changed. You can now sign in." } });
  render(<App />);
  fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "a-new-long-password" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /set new password/i }));
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/password-reset/confirm", {
    token: "abcdefghijklmnopqrstuvwxyz0123",
    new_password: "a-new-long-password",
  });
  expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
});

test("the verification link's page confirms the address", async () => {
  window.history.pushState({}, "", "/verify-email#token=abcdefghijklmnopqrstuvwxyz0123");
  axios.post.mockResolvedValueOnce({ data: { message: "Email address confirmed." } });
  render(<App />);
  expect(await screen.findByText("Email address confirmed.")).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/verify-email", {
    token: "abcdefghijklmnopqrstuvwxyz0123",
  });
});

test("changing the password keeps this session with the fresh token", async () => {
  signIn();
  axios.post.mockResolvedValueOnce({
    data: { message: "Password changed.", access_token: "fresh", role: "patient", full_name: "Test" },
  });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /change password/i }));
  fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password-1" } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "a-new-long-password" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
  });
  expect(JSON.parse(localStorage.getItem("gaitscan_user")).token).toBe("fresh");
});

test("a shared link opens the measurements read-only, without signing in", async () => {
  window.history.pushState({}, "", "/shared#token=abcdefghijklmnopqrstuvwxyz0123");
  axios.post.mockResolvedValueOnce({
    data: { created_at: "2026-10-20T09:00:00", result: ANALYSIS.result, disclaimer: "not a medical device" },
  });
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith("http://api.test/shared", {
    token: "abcdefghijklmnopqrstuvwxyz0123",
  });
  expect(screen.getByText(/shared with you/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /save notes/i })).toBeNull();
});

test("an expired shared link says so", async () => {
  window.history.pushState({}, "", "/shared#token=abcdefghijklmnopqrstuvwxyz0123");
  axios.post.mockImplementationOnce(() => reject(404, "This link is invalid, has expired or was withdrawn."));
  render(<App />);
  expect(await screen.findByText(/has expired or was withdrawn/)).toBeInTheDocument();
});

test("the owner creates a share link from the session page and can withdraw it", async () => {
  signIn();
  window.history.pushState({}, "", "/sessions/s1");
  const session = {
    id: "s1",
    created_at: "2026-10-20T09:00:00",
    legacy: false,
    patient_name: "T",
    pipeline_version: "2.0.0",
    note: null,
    notes: null,
    tags: [],
    result: ANALYSIS.result,
    disclaimer: "x",
  };
  let shares = [];
  axios.get.mockImplementation(async (url) =>
    url.endsWith("/shares") ? { data: shares } : { data: session },
  );
  axios.post.mockImplementationOnce(async () => {
    shares = [
      { id: 7, created_at: "2026-10-27T09:00:00", expires_at: "2026-11-03T09:00:00+00:00", revoked: false },
    ];
    return { data: { ...shares[0], url: "http://app.test/shared#token=secret-token-value-1234567890" } };
  });
  axios.delete.mockImplementationOnce(async () => {
    shares = [{ ...shares[0], revoked: true }];
    return { status: 204 };
  });
  render(<App />);
  await screen.findByRole("heading", { name: "Measurements" });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /create a link/i }));
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/sessions/s1/shares", { days: 7 });
  expect(screen.getByDisplayValue(/shared#token=secret-token-value/)).toBeInTheDocument();
  expect(screen.getByText(/expires 3 Nov 2026/i)).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /withdraw/i }));
  });
  expect(axios.delete).toHaveBeenCalledWith("http://api.test/shares/7");
  expect(await screen.findByText(/withdrawn/i)).toBeInTheDocument();
});
