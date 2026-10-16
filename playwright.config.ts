import { defineConfig, devices } from "@playwright/test";

const port = 31987;
const baseURL = `http://127.0.0.1:${port}`;

process.env.BETTER_AUTH_URL = baseURL;
process.env.BETTER_AUTH_SECRET = "e2e-local-secret-with-at-least-32-characters";
process.env.DATABASE_URL ??= "file:./dev.db";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
