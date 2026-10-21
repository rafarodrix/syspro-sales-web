import { defineConfig, devices } from "@playwright/test";

const port = 31987;
const baseURL = `http://127.0.0.1:${port}`;

process.env.BETTER_AUTH_URL = baseURL;
process.env.BETTER_AUTH_SECRET = "e2e-local-secret-with-at-least-32-characters";
process.env.DATABASE_URL ??= "file:./dev.db";
process.env.SEED_ADMIN_EMAIL ??= "e2e@trilink.local";
process.env.SEED_ADMIN_PASSWORD ??= "e2e-senha-forte-123";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Autentica uma vez e salva a sessão usada pelos testes de navegação.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
