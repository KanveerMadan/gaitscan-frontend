// The v3 result page end to end (Plan V3 Phase 11, FE-A): upload -> result summary -> report download,
// and the page at a phone's width (360 px) without sideways scrolling. The API is mocked at the
// network layer with the backend's own output (src/test-fixtures).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const API = "http://api.e2e.test";
const JOB = "22222222-3333-4444-5555-666666666666";
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../src/test-fixtures/${name}`, import.meta.url), "utf8"));
const RESULT = fixture("result-v3.json");
const REFERENCES = fixture("references.json");
const SHOTS = process.env.E2E_SHOTS; // a folder: save screenshots for a look by eye

async function mockApi(page: Page, reports: string[]) {
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
      const analysis = { job_id: JOB, report_url: `/report/${JOB}`, disclaimer: "", result: RESULT };
      return polls < 2
        ? json({ job_id: JOB, status: "running", rejection: null, error: null, analysis: null })
        : json({ job_id: JOB, status: "done", rejection: null, error: null, analysis });
    }
    if (url.pathname === "/references") return json(REFERENCES);
    if (url.pathname.startsWith("/report/")) {
      reports.push(url.pathname + url.search);
      return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4" });
    }
    return json({ detail: "not mocked" }, 404);
  });
}

async function signInAndUpload(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill("walker@example.com");
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Upload a walking video" })).toBeVisible();
  await page
    .locator("#file-input")
    .setInputFiles({ name: "walk.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(64) });
}

test("upload a walk, see the gait profile summary and download the report", async ({ page }) => {
  const reports: string[] = [];
  await mockApi(page, reports);
  await signInAndUpload(page);
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary).toContainText("Looks typical.");
  await expect(summary.getByRole("img", { name: "Typical" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Timing and rhythm" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Knee angle over the gait cycle" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/desktop.png`, fullPage: true });
  const download = page.waitForEvent("download");
  await summary.getByRole("button", { name: "Download report (PDF)" }).click();
  await download;
  expect(reports).toEqual([`/report/${JOB}?lang=en`]);
});

test("the result page fits a 360 px phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await mockApi(page, []);
  await signInAndUpload(page);
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("Looks typical.");
  await expect(page.getByRole("figure", { name: "Hip angle over the gait cycle" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mobile.png`, fullPage: true });
});
