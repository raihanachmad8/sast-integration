import { test, expect } from '@playwright/test';
import { AUTH_PATHS, getPublicConfig, WORKSPACE_MODE } from './helpers';

/**
 * Tests for unauthenticated route protection.
 *
 * These tests verify that unauthenticated users are correctly redirected
 * when trying to access protected areas of the application.
 */
test.describe('Route Protection', () => {
  /**
   * Purpose: Verify that unauthenticated users trying to access the home page are redirected to the sign-in page.
   */
  test('should redirect unauthenticated user to /auth/signin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  /**
   * Purpose: Verify that when an unauthenticated user tries to access a protected route, the original URL is preserved in the redirect parameter.
   */
  test('should preserve redirect parameter when redirecting unauthenticated user', async ({ page }) => {
    await page.goto('/some-workspace');
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
  });

  /**
   * Purpose: Verify that the sign-in page itself is publicly accessible without causing a redirect loop.
   */
  test('should allow direct access to signin page', async ({ page }) => {
    await page.goto(AUTH_PATHS.signin);
    await expect(page).toHaveURL(AUTH_PATHS.signin);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  /**
   * Purpose: Verify that the signup page is publicly accessible, and shows the correct UI based on current WORKSPACE_MODE.
   */
  test('should allow direct access to signup page with correct mode-based UI', async ({ page }) => {
    const config = await getPublicConfig(page);

    await page.goto(AUTH_PATHS.signup);
    await expect(page).toHaveURL(AUTH_PATHS.signup);
    await expect(page.getByRole('heading', { name: config.workspaceMode === WORKSPACE_MODE.SINGLE ? 'Invitation Only' : 'Create account' })).toBeVisible();
  });

  /**
   * Purpose: Verify that the invitation acceptance page is publicly accessible (no authentication required).
   */
  test('should allow direct access to invitation page', async ({ page }) => {
    await page.goto(AUTH_PATHS.invite);
    await expect(page).toHaveURL(AUTH_PATHS.invite);
  });
});
