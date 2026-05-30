import { test, expect } from '@playwright/test';
import { getPublicConfig, gotoAuthPage, WORKSPACE_MODE } from '../auth/helpers';

test.describe.configure({ mode: 'serial' });

/**
 * Signs the user in and navigates them to the Workspace Chooser page (`/workspaces`).
 *
 * Purpose:
 * - In MULTIPLE mode: Creates a fresh user via signup so the test starts with a clean personal workspace (better isolation).
 * - In SINGLE mode: Uses the seeded admin user (self-service creation is disabled in this mode).
 *
 * This helper is deliberately mode-aware because the platform's behavior and available features
 * change significantly depending on `WORKSPACE_MODE`.
 *
 * @param page - Playwright Page object
 * @returns The public config containing the current `workspaceMode`
 */
async function signInToWorkspaceChooser(page: import('@playwright/test').Page) {
  const config = await getPublicConfig(page);

  const credentials =
    config.workspaceMode === WORKSPACE_MODE.MULTIPLE
      ? {
          email: `workspace-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
          password: 'Password123!',
          name: 'Playwright User',
        }
      : {
          email: 'admin@sast.local',
          password: 'ChangeMe123!',
          name: 'Admin',
        };

  await page.context().clearCookies();

  // In multiple mode we create a fresh user so the test has a clean personal workspace.
  if (config.workspaceMode === WORKSPACE_MODE.MULTIPLE) {
    const signup = await page.request.post('/api/v1/auth/signup', {
      data: credentials,
    });
    expect(signup.ok()).toBe(true);
  }

  await gotoAuthPage(page, '/auth/signin?redirect=/workspaces', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill(credentials.email);
  await page.getByPlaceholder('Enter your password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/workspaces');
  await expect(page.getByRole('heading', { name: /Choose workspace|Workspace access required/ })).toBeVisible({ timeout: 10_000 });

  return config;
}

/**
 * Test suite for the Workspace Chooser page (`/workspaces`).
 *
 * This page is the entry point after login in MULTIPLE mode,
 * and the only workspace view in SINGLE mode.
 *
 * These tests cover:
 * - Unauthenticated access protection
 * - Post-login workspace display behavior (mode-dependent)
 * - Navigation into a workspace
 * - Authenticated route guards
 */
test.describe('Workspace Chooser Page', () => {
  /**
   * Purpose: Verify that unauthenticated users are properly redirected
   * when trying to access the protected workspace chooser page.
   */
  test('should redirect unauthenticated user to signin', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  /**
   * Purpose: End-to-end verification that a user can successfully complete the
   * full post-authentication flow and reach the workspace chooser page.
   *
   * This test validates:
   * - Successful sign-in
   * - Correct redirect to /workspaces
   * - Presence of the workspace chooser heading (mode-dependent)
   *
   * It serves as a foundational smoke test that other workspace-related tests depend on.
   */
  test('should show workspace chooser after signin', async ({ page }) => {
    await signInToWorkspaceChooser(page);

    // The heading text differs based on WORKSPACE_MODE
    await expect(page.getByRole('heading', { name: /Choose workspace|Workspace access required/ })).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Purpose: Verify that the "Back to sign in" button is visible on the chooser page
   * for authenticated users (important for user experience when they want to switch accounts).
   */
  test('should show back to sign in button', async ({ page }) => {
    await signInToWorkspaceChooser(page);
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Validate the core business rule around personal workspace creation
   * depending on WORKSPACE_MODE.
   *
   * - SINGLE mode: User should only see the organization workspace and cannot create a personal one.
   * - MULTIPLE mode: Fresh user should see exactly one personal workspace and no creation button.
   */
  test('should show the expected workspace(s) and correct creation behavior based on mode', async ({ page }) => {
    const config = await signInToWorkspaceChooser(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      // In single mode the seeded admin only has access to the organization workspace.
      // Self-service personal workspace creation is intentionally disabled.
      await expect(page.getByRole('button', { name: 'Create personal workspace' })).toHaveCount(0);
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Open workspace' })).toBeVisible();
      return;
    }

    // In multiple mode, a freshly signed-up user should have exactly one personal workspace
    // and should not be able to create additional ones via the UI.
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Personal Workspace' })).toBeVisible();
    await expect(
      page.getByText('Each account owns one personal workspace. Additional workspace access is added by invitation.')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Create (organization )?workspace/ })).toHaveCount(0);
  });

  /**
   * Purpose: Verify that clicking "Open workspace" on the chooser successfully
   * navigates the user into their workspace and lands on the Dashboard.
   */
  test('should successfully open the available workspace and land on dashboard', async ({ page }) => {
    const config = await signInToWorkspaceChooser(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await page.locator('article').getByRole('button', { name: 'Open workspace' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 });
      return;
    }

    // In multiple mode we open the user's personal workspace
    await page
      .locator('article')
      .filter({ hasText: 'Personal Workspace' })
      .getByRole('button', { name: 'Open workspace' })
      .click();

    await expect(page).toHaveURL(/\/personal-/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
  });
});

/**
 * Route protection tests for already authenticated users.
 *
 * These ensure that users who are already logged in cannot access
 * authentication pages (signin/signup) and are redirected back to the workspace area.
 */
test.describe('Authenticated Route Guards', () => {
  test('should redirect already authenticated user away from sign-in page', async ({ page }) => {
    await signInToWorkspaceChooser(page);

    await page.goto('/auth/signin');
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
  });

  test('should redirect already authenticated user away from sign-up page', async ({ page }) => {
    await signInToWorkspaceChooser(page);

    await page.goto('/auth/signup');
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
  });
});
