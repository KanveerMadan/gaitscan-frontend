// The installable app's icons (PWA manifest and the page head) point at files that exist.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pub = (f) => resolve(__dirname, "../public", f);
const manifest = JSON.parse(readFileSync(pub("manifest.json"), "utf8"));
const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");

test("every manifest icon exists, and one is maskable for Android's adaptive shapes", () => {
  for (const icon of manifest.icons) expect(existsSync(pub(icon.src)), icon.src).toBe(true);
  expect(manifest.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
});

test("the page head links the SVG favicon and an apple-touch icon that exist", () => {
  const hrefs = [...html.matchAll(/<link rel="(icon|apple-touch-icon)"[^>]*href="\/([^"]+)"/g)];
  expect(hrefs.map((m) => m[2])).toEqual(expect.arrayContaining(["favicon.svg", "apple-touch-icon.png"]));
  for (const [, , f] of hrefs) expect(existsSync(pub(f)), f).toBe(true);
});
