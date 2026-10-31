// Phase 6 checks on the production build: every screen fits a phone without sideways scrolling, and
// axe finds no serious or critical WCAG 2.1 A/AA problems. The API is mocked at the network layer.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const API = "http://api.e2e.test";
const SESSION = "11111111-2222-3333-4444-555555555555";
const RESULT = {
  pipeline_version: "2.0.0",
  model: { name: "pose_landmarker_full", version: "float16/1", sha256: "x", mediapipe: "1.0.1" },
  status: "accepted",
  test: "walk",
  rejection: null,
  metrics: {
    cadence: { value: 109.1, n: 9, unit: "steps/min" },
    step_time: { value: 0.55, sd: 0.02, n: 9, unit: "s" },
    peak_knee_flexion: { left: { value: 56.7, sd: 0.4, n: 3, unit: "deg" }, right: null },
  },
  accuracy: {
    cadence: { status: "validated", error_95: 4.5, mdc_95: 4.6, unit: "steps/min", note: "" },
    step_time: { status: "validated", error_95: 0.024, mdc_95: 0.025, unit: "s", note: "" },
    peak_knee_flexion: { status: "not_yet_validated", note: "No knee-angle reference yet." },
  },
  quality: { fps: 30, steady_walking_s: 7.4, passes: 2, steps_detected: 9, strides: { left: 3, right: 2 } },
  notes: [],
  passes: [],
  pass_variability: null,
  curves: {},
};

const SESSION_OUT = {
  id: SESSION,
  created_at: "2026-10-20T10:00:00Z",
  legacy: false,
  note: null,
  notes: null,
  patient_name: null,
  pipeline_version: "2.0.0",
  result: RESULT,
  tags: [],
};

async function mockApi(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/auth/login")
      return json({
        access_token: "e2e-token",
        token_type: "bearer",
        role: "patient",
        full_name: "E2E Walker",
      });
    if (url.pathname === "/sessions") return json([SESSION_OUT]);
    if (url.pathname === `/sessions/${SESSION}`)
      return json({ ...SESSION_OUT, disclaimer: "not a medical device" });
    if (url.pathname === `/sessions/${SESSION}/shares`) return json([]);
    if (url.pathname === "/consent")
      return json({
        accepted_at: "2026-10-20T09:00:00Z",
        active: true,
        history: [],
        text: "Consent.",
        version: "1",
      });
    return json({ detail: "not mocked" }, 404);
  });
}

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill("walker@example.com");
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Upload a walking video" })).toBeVisible();
}

const SCREENS: [string, RegExp][] = [
  ["/", /upload a walking video/i],
  ["/history", /your walking/i],
  [`/sessions/${SESSION}`, /measurements/i],
  ["/privacy", /privacy/i],
];

async function noSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(width);
}

test.describe("at phone width", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("the landing and sign-in pages fit without sideways scrolling", async ({ page }) => {
    for (const path of ["/", "/signin", "/signup"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await noSidewaysScroll(page);
    }
  });

  test("every screen fits, and every section link is on screen", async ({ page }) => {
    await mockApi(page);
    await signIn(page);
    for (const [path, heading] of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await noSidewaysScroll(page);
    }
    const nav = page.getByRole("navigation", { name: "Sections" });
    for (const name of ["Analyse", "History", "Privacy"]) {
      const box = await nav.getByRole("link", { name }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    }
  });
});

async function seriousProblems(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

for (const scheme of ["light", "dark"] as const) {
  test(`no serious accessibility problems (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await mockApi(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await seriousProblems(page), "landing").toEqual([]);
    await page.getByRole("region", { name: "How accurate it is" }).scrollIntoViewIfNeeded();
    expect(await seriousProblems(page), "landing, scrolled").toEqual([]);
    await page.goto("/signin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await seriousProblems(page), "sign in").toEqual([]);
    await page.goto("/demo");
    await expect(page.getByRole("heading").first()).toBeVisible();
    expect(await seriousProblems(page), "demo").toEqual([]);
    for (const path of ["/learn", "/learn/cadence", "/learn/peak-knee-flexion"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await seriousProblems(page), path).toEqual([]);
    }
    await signIn(page);
    for (const [path, heading] of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      expect(await seriousProblems(page), path).toEqual([]);
    }
  });
}
