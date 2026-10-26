import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "@/App";
import { sha256Hex } from "./pose";

vi.mock("axios", () => {
  const m = {
    post: vi.fn(),
    get: vi.fn(async () => ({ data: [] })),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: vi.fn() } },
  };
  return { __esModule: true, default: m, ...m };
});

beforeEach(() => {
  localStorage.setItem("gaitscan_user", JSON.stringify({ token: "tok", role: "patient", name: "Test" }));
  window.history.pushState({}, "", "/setup");
});

test("the setup check asks before using the camera and says how to fix a refusal", async () => {
  const getUserMedia = vi.fn(async () => {
    throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
  });
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  render(<App />);
  expect(screen.getByRole("heading", { name: /check your setup/i })).toBeInTheDocument();
  expect(getUserMedia).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /start camera/i }));
  });
  expect(getUserMedia).toHaveBeenCalled();
  expect(await screen.findByText(/camera access was blocked/i)).toBeInTheDocument();
});

test("the setup check is reachable from the upload screen", () => {
  window.history.pushState({}, "", "/");
  render(<App />);
  expect(screen.getByRole("link", { name: /check your setup/i })).toHaveAttribute("href", "/setup");
});

test("model bytes are checked against the pinned SHA-256", async () => {
  const abc = new TextEncoder().encode("abc");
  expect(await sha256Hex(abc.buffer)).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
