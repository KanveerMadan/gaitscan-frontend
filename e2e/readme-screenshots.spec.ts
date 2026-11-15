// README screenshots (docs/images/), from the same mock data as the e2e tests: the backend's own output
// for the synthetic walker (src/test-fixtures). No real user data. Skipped unless asked for:
//   README_SHOTS=1 npx playwright test e2e/readme-screenshots.spec.ts
// The PDF page is rendered by the backend repository's tools/readme_pdf_page.py.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const API = "http://api.e2e.test";
const JOB = "33333333-4444-5555-6666-777777777777";
const OUT = "docs/images";
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../src/test-fixtures/${name}`, import.meta.url), "utf8"));
const RESULT = fixture("result-v3.json");
const REFERENCES = fixture("references.json");

test.skip(!process.env.README_SHOTS, "README screenshots are made on request only");
test.use({ deviceScaleFactor: 2, colorScheme: "light" });

async function showResult(page: Page) {
  let polls = 0;
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/auth/login")
      return json({ access_token: "t", token_type: "bearer", role: "patient", full_name: "Example walker" });
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
    return json({ detail: "not mocked" }, 404);
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).first().click();
  await page.getByLabel("Email").fill("example@example.com");
  await page.getByLabel("Password").fill("example-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page
    .locator("#file-input")
    .setInputFiles({ name: "walk.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(64) });
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("Looks typical.");
  await expect(page.locator(".recharts-area-area").first()).toBeVisible(); // the typical band is drawn
}

test("summary card and joint charts", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await showResult(page);
  await page.getByRole("region", { name: "Summary" }).screenshot({ path: `${OUT}/result-summary.png` });
  await page.mouse.move(0, 0); // no hover tooltip on the charts
  const joints = page.getByRole("region", { name: "Joint movement" });
  await joints
    .locator("div.grid")
    .first()
    .screenshot({ path: `${OUT}/joint-charts.png` });
});

test("phone view", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await showResult(page);
  await page.getByRole("region", { name: "Summary" }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/mobile.png` });
});
