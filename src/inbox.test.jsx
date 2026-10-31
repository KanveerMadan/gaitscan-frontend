// Professional inbox (Phase 9): a clinician's inbox of linked patients' sessions, and a comment
// thread on each session for the patient and their clinician.
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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

const as = (role) =>
  localStorage.setItem(
    "gaitscan_user",
    JSON.stringify({ token: "t", role, name: "Dr Bo", recoveryCodesLeft: 8 }),
  );
const SESSION = {
  id: "s1",
  created_at: "2026-10-20T09:00:00Z",
  legacy: false,
  tags: [],
  notes: "mine",
  disclaimer: "x",
  pipeline_version: "2.0.0",
  result: { metrics: { cadence: { value: 110, unit: "steps/min" } } },
};
const THREAD = [
  {
    id: 1,
    body: "Cadence is up.",
    author_role: "clinician",
    author_name: "Dr Bo",
    mine: false,
    created_at: "2026-10-21T09:00:00Z",
  },
];

function routes(extra = {}) {
  axios.get.mockImplementation(async (url) => {
    for (const [suffix, data] of Object.entries(extra)) if (url.endsWith(suffix)) return { data };
    if (url.endsWith("/comments")) return { data: THREAD };
    if (url.endsWith("/shares")) return { data: [] };
    if (url.endsWith("/sessions/s1")) return { data: SESSION };
    return { data: [] };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  axios.defaults.headers.common = {};
  localStorage.clear();
});

test("a clinician's inbox lists new sessions, links to them and is marked as seen", async () => {
  as("clinician");
  window.history.pushState({}, "", "/inbox");
  routes({
    "/clinician/inbox": {
      seen_at: null,
      items: [
        {
          session_id: "s1",
          patient_id: 7,
          patient_name: "Ana",
          created_at: "2026-10-20T09:00:00Z",
          cadence: 110,
          comments: 2,
          last_comment_at: null,
          new: true,
        },
        {
          session_id: "s0",
          patient_id: 8,
          patient_name: "Raj",
          created_at: "2026-10-01T09:00:00Z",
          cadence: 98,
          comments: 0,
          last_comment_at: null,
          new: false,
        },
      ],
    },
  });
  axios.post.mockResolvedValue({ status: 204 });
  render(<App />);
  const list = await screen.findByRole("list", { name: /inbox/i });
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0].textContent).toMatch(/Ana/);
  expect(within(items[0]).getByText(/new/i)).toBeInTheDocument();
  expect(within(items[1]).queryByText(/^new$/i)).toBeNull();
  expect(within(items[0]).getByRole("link")).toHaveAttribute("href", "/sessions/s1");
  expect(axios.post).toHaveBeenCalledWith("http://api.test/clinician/inbox/seen");
});

test("the session page shows the comment thread and adds a comment", async () => {
  as("patient");
  window.history.pushState({}, "", "/sessions/s1");
  routes();
  axios.post.mockResolvedValueOnce({
    data: {
      id: 2,
      body: "Thanks!",
      author_role: "patient",
      author_name: "Ana",
      mine: true,
      created_at: "2026-10-22T09:00:00Z",
    },
  });
  render(<App />);
  const thread = await screen.findByRole("region", { name: /comments/i });
  expect(await within(thread).findByText("Cadence is up.")).toBeInTheDocument();
  fireEvent.change(within(thread).getByLabelText(/add a comment/i), { target: { value: "Thanks!" } });
  await act(async () => {
    fireEvent.click(within(thread).getByRole("button", { name: /send/i }));
  });
  expect(axios.post).toHaveBeenCalledWith("http://api.test/sessions/s1/comments", { body: "Thanks!" });
  expect(within(thread).getByText("Thanks!")).toBeInTheDocument();
});

test("a clinician sees a patient's session read-only, with comments", async () => {
  as("clinician");
  window.history.pushState({}, "", "/sessions/s1");
  routes();
  render(<App />);
  expect(await screen.findByRole("region", { name: /comments/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete this session/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /create a link/i })).toBeNull();
  expect(screen.queryByLabelText(/notes/i)).toBeNull();
  expect(screen.getByRole("link", { name: /inbox/i })).toHaveAttribute("href", "/inbox");
});
