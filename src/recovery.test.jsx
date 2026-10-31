// Recovery codes (Phase 9): password recovery without email.
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

const CODES = Array.from({ length: 8 }, (_, i) => `AB${i}C-DEFG-HJKM-NPQ${i}`);
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
  window.history.pushState({}, "", "/signin");
});

test("after sign-up the codes are shown once and must be saved before going on", async () => {
  axios.post.mockResolvedValueOnce({
    data: { access_token: "tok", role: "patient", full_name: "Ana", recovery_codes: CODES },
  });
  render(<App />);
  fireEvent.click(screen.getByRole("link", { name: /create one/i }));
  type("Email", "ana@example.com");
  type("Password", "a-long-enough-password");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
  });
  expect(await screen.findByRole("heading", { name: /save your recovery codes/i })).toBeInTheDocument();
  for (const c of CODES) expect(screen.getByText(c)).toBeInTheDocument();
  expect(screen.getByText(/can't be recovered/i)).toBeInTheDocument();
  const go = screen.getByRole("button", { name: /continue/i });
  expect(go).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /saved these codes/i }));
  await act(async () => {
    fireEvent.click(go);
  });
  expect(await screen.findByRole("heading", { name: /how gaitscan works/i })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("gaitscan_user")).recoveryCodesLeft).toBe(8);
});

test("a forgotten password is recovered with the email and a code, not by email", async () => {
  axios.post.mockResolvedValueOnce({ data: { message: "Password changed. You can now sign in." } });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
  expect(screen.getByRole("heading", { name: /recover your account/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /send link/i })).toBeNull();
  type("Email", "ana@example.com");
  type("Recovery code", CODES[2]);
  type("New password", "a-brand-new-password");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /set new password/i }));
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/recover", {
    email: "ana@example.com",
    code: CODES[2],
    new_password: "a-brand-new-password",
  });
  expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
});

test("signing in to an account with no codes asks for a set", async () => {
  axios.post
    .mockResolvedValueOnce({
      data: { access_token: "tok", role: "patient", full_name: "Ana", recovery_codes_left: 0 },
    })
    .mockResolvedValueOnce({ data: { recovery_codes: CODES } });
  render(<App />);
  type("Email", "ana@example.com");
  type("Password", "a-long-enough-password");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
  });
  expect(await screen.findByText(/no recovery codes/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /create recovery codes/i }));
  type("Your password", "a-long-enough-password");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /make codes/i }));
  });
  expect(axios.post).toHaveBeenLastCalledWith("http://api.test/auth/recovery-codes", {
    password: "a-long-enough-password",
  });
  for (const c of CODES) expect(await screen.findByText(c)).toBeInTheDocument();
});

test("the privacy page says how many codes are left and offers a new set", async () => {
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "tok", role: "patient", name: "Ana", recoveryCodesLeft: 5 }),
  );
  window.history.pushState({}, "", "/privacy");
  axios.get.mockResolvedValue({
    data: { active: true, version: "v", text: "t", accepted_at: null, history: [] },
  });
  render(<App />);
  expect(await screen.findByText(/5 of 8 recovery codes left/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /make a new set/i })).toBeInTheDocument();
});
