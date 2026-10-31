import { render, screen, fireEvent, act } from "@testing-library/react";
import axios from "axios";
import App from "@/App";

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
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

test("a new account is taken through how GaitScan works, ending at the upload", async () => {
  axios.post.mockResolvedValueOnce({ data: { access_token: "tok", role: "patient", full_name: "New" } });
  window.history.pushState({}, "", "/signup");
  render(<App />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-password" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
  });
  expect(await screen.findByRole("heading", { name: /how gaitscan works/i })).toBeInTheDocument();
  expect(document.body.textContent).toMatch(/not a medical device/i);
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  expect(screen.getByRole("link", { name: /check your setup/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  // The example is the pipeline's output for the simulated walker, and says so.
  expect(screen.getByText(/simulated walker/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: /upload your first video/i }));
  });
  expect(screen.getByRole("heading", { name: /upload a walking video/i })).toBeInTheDocument();
});

test("the walkthrough is reachable from the upload screen", () => {
  localStorage.setItem("gaitscan_user", JSON.stringify({ token: "tok", role: "patient", name: "T" }));
  render(<App />);
  expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "/welcome");
});

test("anyone can see an example result without signing up", async () => {
  window.history.pushState({}, "", "/demo");
  render(<App />);
  expect(await screen.findByRole("heading", { name: /example result/i })).toBeInTheDocument();
  expect(screen.getByText(/simulated walker/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Measurements" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/signup");
});

test("the sign-in page links to the example", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: /see an example result/i })).toHaveAttribute("href", "/demo");
});
