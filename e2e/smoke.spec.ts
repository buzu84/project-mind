import { test, expect } from "@playwright/test";

/**
 * Minimal E2E smoke tests for ProductMind in full mock mode.
 *
 * These tests run against the Next.js dev server with:
 * - Mock auth (DEV_USER — no sign-in required)
 * - Mock DB (in-memory — no real Supabase)
 * - Mock AI (deterministic — no OpenAI calls)
 *
 * Goal: protect core navigation, auth bypass, and project CRUD.
 * Not a substitute for unit tests — these catch integration regressions.
 */

test.describe("smoke tests", () => {
  test("homepage loads and shows app branding", async ({ page }) => {
    await page.goto("/");
    // The nav bar contains the app name (scoped to <nav> to avoid matching footer/body copy)
    await expect(page.locator("nav").getByText("ProductMind")).toBeVisible();
    // In mock auth mode, the user is already authenticated —
    // so the nav should show "Dashboard" link instead of "Log in"
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("dashboard loads without auth redirect", async ({ page }) => {
    await page.goto("/dashboard");
    // Should NOT redirect to /sign-in — mock auth is active
    await expect(page).toHaveURL(/\/dashboard/);
    // Dashboard heading contains the DEV_USER name
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Welcome back",
    );
  });

  test("create a project, verify it in the list, and open its detail page", async ({
    page,
  }) => {
    const projectName = `E2E Test Project ${Date.now()}`;

    await page.goto("/projects");

    // The projects page should load with the correct heading
    await expect(
      page.getByRole("heading", { name: "Projects", level: 1 }),
    ).toBeVisible();

    // Click "New Project" to reveal the form
    await page.getByRole("button", { name: "New Project" }).click();

    // Fill the required name field (label is "Project Name *")
    await page.getByLabel("Project Name *").fill(projectName);

    // Submit the form
    await page.getByRole("button", { name: "Create Project" }).click();

    // After form submission, the form closes and the page refreshes.
    // Wait for the "New Project" button to reappear (form closed)
    // and then verify the project name appears in the project list.
    await expect(
      page.getByRole("button", { name: "New Project" }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(projectName)).toBeVisible();

    // Navigate to the project detail page
    await page.getByRole("link", { name: projectName }).click();
    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(
      page.getByRole("heading", { name: projectName, level: 1 }),
    ).toBeVisible();
  });
});


