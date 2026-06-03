import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Minimal E2E smoke tests for ProductMind in full mock mode.
 *
 * These tests run against the Next.js dev server with:
 * - Mock auth (DEV_USER — no sign-in required)
 * - Mock DB (in-memory — no real Supabase)
 * - Mock AI (deterministic — no OpenAI calls)
 *
 * Goal: protect core navigation, auth bypass, project CRUD, and AI features.
 * Not a substitute for unit tests — these catch integration regressions.
 */

/**
 * Run axe-core accessibility scan on the current page state.
 * Fails the test if any WCAG violations are found.
 */
async function expectAccessible(page: Page) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(
    accessibilityScanResults.violations,
    accessibilityScanResults.violations
      .map(
        (v) =>
          `[${v.id}] ${v.help} (${v.impact})\n` + v.nodes.map((n) => `  → ${n.html}`).join("\n"),
      )
      .join("\n\n"),
  ).toEqual([]);
}

/**
 * Helper: create a project and navigate to its detail page.
 * Returns the unique project name for downstream assertions.
 */
async function createProjectAndOpenDetail(
  page: import("@playwright/test").Page,
  prefix: string,
): Promise<string> {
  const projectName = `${prefix} ${Date.now()}`;

  await page.goto("/projects");
  await page.getByRole("button", { name: "New Project" }).click();
  await page.getByLabel("Project Name *").fill(projectName);
  await page.getByRole("button", { name: "Create Project" }).click();

  // Wait for form to close
  await expect(page.getByRole("button", { name: "New Project" })).toBeVisible({ timeout: 10_000 });

  // Navigate to the project detail page
  await page.getByRole("link", { name: projectName }).click();
  await expect(page.getByRole("heading", { name: projectName, level: 1 })).toBeVisible();

  return projectName;
}

test.describe("smoke tests", () => {
  test("homepage loads and shows app branding", async ({ page }) => {
    await page.goto("/");
    // The nav bar contains the app name (scoped to <nav> to avoid matching footer/body copy)
    await expect(page.locator("nav").getByText("ProductMind")).toBeVisible();
    // In mock auth mode, the user is already authenticated —
    // so the nav should show "Dashboard" link instead of "Log in"
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();

    await expectAccessible(page);
  });

  test("dashboard loads without auth redirect", async ({ page }) => {
    await page.goto("/dashboard");
    // Should NOT redirect to /sign-in — mock auth is active
    await expect(page).toHaveURL(/\/dashboard/);
    // Dashboard heading contains the DEV_USER name
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");

    await expectAccessible(page);
  });

  test("create a project, verify it in the list, and open its detail page", async ({ page }) => {
    const projectName = `E2E Test Project ${Date.now()}`;

    await page.goto("/projects");

    // The projects page should load with the correct heading
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();

    // Click "New Project" to reveal the form
    await page.getByRole("button", { name: "New Project" }).click();

    // Fill the required name field (label is "Project Name *")
    await page.getByLabel("Project Name *").fill(projectName);

    // Submit the form
    await page.getByRole("button", { name: "Create Project" }).click();

    // After form submission, the form closes and the page refreshes.
    // Wait for the "New Project" button to reappear (form closed)
    // and then verify the project name appears in the project list.
    await expect(page.getByRole("button", { name: "New Project" })).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText(projectName)).toBeVisible();

    // Navigate to the project detail page
    await page.getByRole("link", { name: projectName }).click();
    await expect(page).toHaveURL(/\/projects\/.+/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: projectName, level: 1 })).toBeVisible();

    await expectAccessible(page);
  });

  test("edit a project name and verify the update persists", async ({ page }) => {
    const originalName = await createProjectAndOpenDetail(page, "E2E Edit Project");
    const updatedName = `${originalName} Updated`;

    // Click the edit link on the project detail page
    await page.getByRole("link", { name: "Edit" }).click();

    // Verify the edit page loaded
    await expect(page.getByRole("heading", { name: "Edit Project" })).toBeVisible();

    // Clear the name field and enter the updated name
    await page.getByLabel("Project Name *").fill(updatedName);

    // Submit the edit form
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Wait for the success confirmation (role="status" contains "✓ Project saved successfully.")
    await expect(page.getByText("Project saved successfully")).toBeVisible({
      timeout: 10_000,
    });

    // Navigate back to the project detail page
    await page.getByRole("link", { name: /Back to/ }).click();

    // Verify the project detail heading now shows the updated name
    await expect(page.getByRole("heading", { name: updatedName, level: 1 })).toBeVisible();

    await expectAccessible(page);
  });

  test("delete a project via confirm dialog and verify redirect", async ({ page }) => {
    const projectName = await createProjectAndOpenDetail(page, "E2E Delete Project");

    // Click the "Delete" button on the project detail page
    await page.getByRole("button", { name: "Delete" }).click();

    // The ConfirmDialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Confirm the deletion (scoped to dialog to avoid ambiguity)
    await dialog.getByRole("button", { name: "Delete Project" }).click();

    // After deletion, the server action redirects to /projects
    await expect(page).toHaveURL(/\/projects\/?$/, { timeout: 10_000 });

    // The deleted project should no longer appear in the list
    await expect(page.getByText(projectName)).not.toBeVisible();

    await expectAccessible(page);
  });

  test("add a feature and score it with mock AI", async ({ page }) => {
    await createProjectAndOpenDetail(page, "E2E Feature Project");

    const featureName = `E2E Feature ${Date.now()}`;
    // Description must exceed FEATURE_DESC_MIN (20 chars)
    const featureDesc =
      "This is a detailed feature description for E2E testing of the AI scoring pipeline.";

    // Navigate to the Feature Prioritizer from the project detail page
    await page.getByRole("link", { name: "Feature Prioritizer" }).click();
    await expect(page.getByRole("heading", { name: "Feature Ideas", level: 1 })).toBeVisible();

    // Open the add feature form.
    // When no features exist, both the header and the empty-state card show
    // an "Add Feature" button — both open the same form, so .first() is safe.
    await page.getByRole("button", { name: "Add Feature" }).first().click();

    // Fill the feature form
    await page.getByLabel("Feature Name *").fill(featureName);
    await page.getByLabel("Description *").fill(featureDesc);

    // Submit via the form-scoped button (distinguishes from header button)
    await page.locator("form").getByRole("button", { name: "Add Feature" }).click();

    // Verify the feature appears in the list
    await expect(page.getByText(featureName)).toBeVisible({ timeout: 10_000 });

    // Before scoring, the feature should show "Not scored"
    await expect(page.getByText("Not scored")).toBeVisible();

    // Trigger AI scoring
    await page.getByRole("button", { name: "AI Score All" }).click();

    // Wait for scoring to complete — the button re-enables after the fetch cycle
    await expect(page.getByRole("button", { name: "AI Score All" })).toBeEnabled({
      timeout: 15_000,
    });

    // After scoring, "Not scored" should no longer be visible — this proves
    // the mock AI scored the feature and the UI re-rendered with real scores.
    await expect(page.getByText("Not scored")).not.toBeVisible();

    await expectAccessible(page);
  });

  test("edit a feature name and delete a feature from the table", async ({ page }) => {
    await createProjectAndOpenDetail(page, "E2E Feature Edit Project");

    const featureName = `E2E Edit Feature ${Date.now()}`;
    const featureDesc =
      "This feature has a detailed description that exceeds the minimum length for E2E testing.";
    const updatedFeatureName = `${featureName} Updated`;

    // Navigate to the Feature Prioritizer
    await page.getByRole("link", { name: "Feature Prioritizer" }).click();
    await expect(page.getByRole("heading", { name: "Feature Ideas", level: 1 })).toBeVisible();

    // Add a feature
    await page.getByRole("button", { name: "Add Feature" }).first().click();
    await page.getByLabel("Feature Name *").fill(featureName);
    await page.getByLabel("Description *").fill(featureDesc);
    await page.locator("form").getByRole("button", { name: "Add Feature" }).click();

    // Wait for the feature to appear in the table
    await expect(page.getByText(featureName)).toBeVisible({ timeout: 10_000 });

    // Locate the feature row and hover to reveal action buttons
    const featureRow = page.getByRole("row").filter({ hasText: featureName });
    await featureRow.hover();

    // Click the scoped Edit button (aria-label includes the feature name)
    await featureRow.getByRole("button", { name: `Edit ${featureName}` }).click();

    // Verify the inline edit form appears with the original name pre-filled
    await expect(page.getByLabel("Feature Name *")).toHaveValue(featureName);

    // Update the feature name
    await page.getByLabel("Feature Name *").fill(updatedFeatureName);
    await page.getByRole("button", { name: "Save" }).click();

    // Verify the updated name appears in the table
    await expect(page.getByText(updatedFeatureName)).toBeVisible({
      timeout: 10_000,
    });

    // Locate the updated feature row and hover to reveal actions
    const updatedRow = page.getByRole("row").filter({ hasText: updatedFeatureName });
    await updatedRow.hover();

    // Click the scoped Delete button (aria-label now uses the updated name)
    await updatedRow.getByRole("button", { name: `Delete ${updatedFeatureName}` }).click();

    // Confirm deletion in the dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();

    // Verify the feature is gone
    await expect(page.getByText(updatedFeatureName)).not.toBeVisible({
      timeout: 10_000,
    });

    // Wait for any active toasts to finish their slide-up animation and
    // auto-dismiss before the axe scan. Every toast renders a dismiss button
    // with aria-label="Dismiss notification" — waiting for zero such buttons
    // ensures no toast is in the DOM regardless of message text.
    await expect(page.getByRole("button", { name: "Dismiss notification" })).toHaveCount(0, {
      timeout: 10_000,
    });

    await expectAccessible(page);
  });

  test("create a decision, edit it, verify the update, and delete it", async ({ page }) => {
    await createProjectAndOpenDetail(page, "E2E Decision Project");

    const decisionTitle = `E2E Decision ${Date.now()}`;
    const problemStatement =
      "Should we migrate the authentication layer to a passwordless flow based on passkeys and magic links?";

    // Navigate to the Decisions page from the project detail
    await page.getByRole("link", { name: "Decisions" }).click();
    await expect(page.getByRole("heading", { name: "Decisions", level: 1 })).toBeVisible();

    // Click "New Decision" to open the form
    await page.getByRole("button", { name: "New Decision" }).first().click();

    // Fill the decision form
    await page.getByLabel("Title").fill(decisionTitle);
    await page.getByLabel("Problem Statement").fill(problemStatement);

    // Submit the form
    await page.getByRole("button", { name: "Create Decision" }).click();

    // After creation, the form closes and the list updates via client-side fetch.
    // Wait for the decision title to appear in the list.
    await expect(page.getByText(decisionTitle)).toBeVisible({
      timeout: 10_000,
    });

    // ── Edit the decision ──
    const updatedDecisionTitle = `${decisionTitle} Updated`;

    // Scope the Edit button to the card containing our decision title
    const decisionCardForEdit = page.getByRole("link", { name: decisionTitle }).locator("..");
    await decisionCardForEdit.getByRole("button", { name: "Edit" }).click();

    // Verify the edit form loaded with the correct heading and pre-filled values
    await expect(page.getByRole("heading", { name: "Edit Decision" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue(decisionTitle);
    await expect(page.getByLabel("Problem Statement")).toHaveValue(problemStatement);

    // Update the title and save
    await page.getByLabel("Title").fill(updatedDecisionTitle);
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify the updated title appears in the list (proves PATCH executed,
    // updateDecision returned success, refreshDecisions ran, list re-rendered)
    await expect(page.getByText(updatedDecisionTitle)).toBeVisible({
      timeout: 10_000,
    });

    // ── Delete the updated decision ──
    // Scope the Delete button to the card with the UPDATED title
    const decisionCard = page.getByRole("link", { name: updatedDecisionTitle }).locator("..");
    await decisionCard.getByRole("button", { name: "Delete" }).click();

    // The ConfirmDialog should open
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Confirm the deletion (scoped to dialog)
    await dialog.getByRole("button", { name: "Delete" }).click();

    // The decision should no longer appear in the list
    await expect(page.getByText(updatedDecisionTitle)).not.toBeVisible({
      timeout: 10_000,
    });

    // Wait for any active toasts (created/updated/deleted) to auto-dismiss
    // before the axe scan. Toasts mid-animation can cause transient contrast
    // violations. Uses the structural "Dismiss notification" button pattern
    // proven in the feature edit test.
    await expect(page.getByRole("button", { name: "Dismiss notification" })).toHaveCount(0, {
      timeout: 10_000,
    });

    await expectAccessible(page);
  });
});
