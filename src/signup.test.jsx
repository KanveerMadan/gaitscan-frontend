// Sign-up and sign-in with browser autofill (2026-11-12 live report): a password manager or the
// browser's autofill can put values in the fields without the change events React listens for.
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

// What autofill does: the value lands in the DOM and no input or change event fires.
const autofill = (label, value) => {
  screen.getByLabelText(label).value = value;
};

const click = async (name) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
});

test("an autofilled sign-up form sends what is in the fields and keeps it after an error", async () => {
  window.history.pushState({}, "", "/signup");
  axios.post.mockRejectedValueOnce({
    response: { status: 409, data: { detail: "Could not create an account with these details." } },
  });
  render(<App />);
  autofill("Full name", "Kanveer");
  autofill("Email", "kanveer@example.com");
  autofill("Password", "twelve-chars");
  await click(/create account/i);
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/register", {
    full_name: "Kanveer",
    email: "kanveer@example.com",
    password: "twelve-chars",
  });
  expect(await screen.findByText("Could not create an account with these details.")).toBeInTheDocument();
  expect(screen.getByLabelText("Full name")).toHaveValue("Kanveer");
  expect(screen.getByLabelText("Email")).toHaveValue("kanveer@example.com");
});

test("an autofilled sign-in form sends what is in the fields", async () => {
  window.history.pushState({}, "", "/signin");
  axios.post.mockResolvedValueOnce({ data: { access_token: "tok", role: "patient", full_name: "A" } });
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  autofill("Email", "kanveer@example.com");
  autofill("Password", "twelve-chars");
  await click(/^sign in$/i);
  expect(axios.post).toHaveBeenCalledWith("http://api.test/auth/login", {
    email: "kanveer@example.com",
    password: "twelve-chars",
  });
});

test("a rejected email shows a plain message, not the validator's text", async () => {
  window.history.pushState({}, "", "/signup");
  axios.post.mockRejectedValueOnce({
    response: {
      status: 422,
      data: {
        detail: [
          {
            type: "value_error",
            loc: ["body", "email"],
            msg: "value is not a valid email address: An email address must have an @-sign.",
          },
        ],
      },
    },
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "kanveer@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "twelve-chars" } });
  await click(/create account/i);
  expect(await screen.findByText("Enter a valid email address, like name@example.com.")).toBeInTheDocument();
  expect(screen.queryByText(/@-sign|value is not a valid/i)).toBeNull();
});

test("a validation error on any other field falls back to the form's own message", async () => {
  window.history.pushState({}, "", "/signup");
  axios.post.mockRejectedValueOnce({
    response: {
      status: 422,
      data: {
        detail: [{ type: "string_type", loc: ["body", "password"], msg: "Input should be a valid string" }],
      },
    },
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "kanveer@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "twelve-chars" } });
  await click(/create account/i);
  expect(await screen.findByText("Registration failed. Please try again.")).toBeInTheDocument();
  expect(screen.queryByText(/input should be/i)).toBeNull();
});
