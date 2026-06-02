import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for E2E smoke tests.
 *
 * Runs the Next.js dev server in full mock mode:
 * - Mock auth (DEV_USER, no Supabase session)
 * - Mock DB (in-memory, no real database)
 * - Mock AI (deterministic generators, no OpenAI calls)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // in-memory mock DB is shared state
  retries: process.env.CI ? 0 : 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npx next dev --port 3001",
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: "development",
      PORT: "3001",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
      NEXT_PUBLIC_USE_MOCK_AUTH: "true",
      USE_MOCK_AUTH: "true",
      USE_MOCK_DB: "true",
      USE_REAL_AI: "false",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-placeholder-value",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
      OPENAI_API_KEY: "sk-test-placeholder-not-real-key",
    },
  },
});

