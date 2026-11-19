import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const testURL = "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // All browsers edit the same test note; each scenario starts with a stable version.
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "artifacts/qa/report", open: "never" }]],
  outputDir: "artifacts/qa/results",
  use: {
    baseURL: testURL,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npm run dev -- --port 3101",
    url: testURL,
    reuseExistingServer: false,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      MOMENTS_NOTE_DIR: resolve("artifacts/qa/test-note-data"),
      MOMENTS_AI_PORT: "39282",
    },
    timeout: 120_000,
  },
});
