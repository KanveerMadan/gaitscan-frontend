// MediaPipe Tasks in the browser is pinned to the server's mediapipe 1.0.1, and its wasm runtime is
// fetched by URL: a package bump without the URL (frontend #18, 2026-11-12) would pair new JavaScript
// with the old runtime, which the unit tests (MediaPipe mocked) wouldn't notice.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WASM } from "./pose";

const installed = JSON.parse(
  readFileSync(resolve("node_modules/@mediapipe/tasks-vision/package.json"), "utf8"),
).version;

test("the wasm runtime is the installed MediaPipe Tasks release", () => {
  expect(WASM).toBe(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${installed}/wasm`);
});

test("MediaPipe Tasks stays on the server's release (backend mediapipe==1.0.1)", () => {
  expect(installed).toBe("1.0.1");
});
