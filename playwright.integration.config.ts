import { defineConfig, devices } from "@playwright/test";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw new Error(
    "Use npm run test:integration para iniciar emuladores isolados.",
  );
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "firebase.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  outputDir: "test-results/integration",
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "firebase-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "firebase-mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5174",
    url: "http://127.0.0.1:5174",
    env: { VITE_USE_EMULATORS: "1" },
    reuseExistingServer: false,
  },
});
