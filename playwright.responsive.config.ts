import { defineConfig } from "@playwright/test";

const sizes = [
  [320, 568], [360, 640], [390, 844], [430, 932],
  [568, 320], [844, 390], [768, 1024], [820, 1180],
  [900, 600], [901, 600], [1024, 768], [1280, 720],
  [1366, 600], [1440, 900], [1920, 1080], [390, 300], [640, 360],
];

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "responsive.spec.ts",
  workers: 2,
  timeout: 90_000,
  outputDir: "test-results/responsive",
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    ...sizes.map(([width, height]) => ({
      name: `${width}x${height}`,
      use: { viewport: { width, height } },
    })),
    { name: "webkit-phone", use: { browserName: "webkit", isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } } },
    { name: "webkit-tablet", use: { browserName: "webkit", isMobile: true, hasTouch: true, viewport: { width: 820, height: 1180 } } },
    {
      name: "content-stress",
      testMatch: "responsive-content.spec.ts",
      use: { viewport: { width: 320, height: 568 } },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
