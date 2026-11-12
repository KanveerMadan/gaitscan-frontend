import { expect, test } from "@playwright/test";

const API = "http://api.e2e.test";
const JOB = "11111111-2222-3333-4444-555555555555";
const ANALYSIS = {
  job_id: JOB,
  report_url: `/report/${JOB}`,
  disclaimer: "not a medical device",
  result: {
    pipeline_version: "2.0.0",
    model: { name: "pose_landmarker_full", version: "float16/1", sha256: "x", mediapipe: "1.0.1" },
    status: "accepted",
    test: "walk",
    metrics: {
      cadence: { value: 109.1, n: 9, unit: "steps/min" },
      step_time: { value: 0.55, sd: 0.02, n: 9, unit: "s" },
      peak_knee_flexion: { left: { value: 56.7, sd: 0.4, n: 3, unit: "deg" }, right: null },
    },
    accuracy: {
      cadence: { status: "validated", error_95: 4.5, mdc_95: 4.6, unit: "steps/min", note: "" },
      step_time: { status: "validated", error_95: 0.024, mdc_95: 0.023, unit: "s", note: "" },
      peak_knee_flexion: { status: "not_yet_validated", note: "No knee-angle reference yet." },
    },
    quality: { fps: 30, steady_walking_s: 7.4, passes: 2, steps_detected: 9, strides: { left: 3, right: 2 } },
    notes: [],
    passes: [],
    pass_variability: null,
    curves: {},
  },
};

test("sign in, upload a walking video, wait for the analysis, see measurements with error ranges", async ({
  page,
}) => {
  let polls = 0;
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/auth/login")
      return json({ access_token: "e2e-token", token_type: "bearer", role: "patient", full_name: "E2E" });
    if (url.pathname === "/analyses")
      return json({ job_id: JOB, status: "queued", status_url: `/analyses/${JOB}` }, 202);
    if (url.pathname === `/analyses/${JOB}`) {
      polls += 1;
      return polls < 2
        ? json({ job_id: JOB, status: "running", rejection: null, error: null, analysis: null })
        : json({ job_id: JOB, status: "done", rejection: null, error: null, analysis: ANALYSIS });
    }
    return json({ detail: "not mocked" }, 404);
  });

  await page.goto("/");
  await expect(page.getByRole("note")).toContainText("not a medical device");
  await page.getByRole("link", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill("walker@example.com");
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Upload a walking video" })).toBeVisible();
  await page
    .locator("#file-input")
    .setInputFiles({ name: "walk.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(64) });

  await expect(page.getByRole("heading", { name: "Measurements" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cadence/ })).toContainText("109.1 steps/min");
  await expect(page.getByRole("row", { name: /Cadence/ })).toContainText("± 4.5 steps/min");
  await expect(page.getByRole("row", { name: /knee/i })).toHaveCount(0); // removed 2026-11-12
  expect(polls).toBe(2);
});
