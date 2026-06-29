import { test, expect } from '@playwright/test';
import { gotoAuthPage, signInAndOpenWorkspace } from './helpers';

/**
 * Playwright UI tests for the Sign-in page.
 *
 * Covers:
 * - Form rendering and basic validation
 * - Real auth flow sign-in and workspace redirect
 * - Error states (invalid credentials, empty form validation)
 */
test.describe('Sign In', () => {
  test.setTimeout(60_000);

  test.describe('positive', () => {
    /**
     * Purpose: Verify that the sign-in form renders with all essential elements.
     */
    test('should render sign in form', async ({ page }) => {
      await gotoAuthPage(page, '/auth/signin', 'Sign in');
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    });

    /**
     * Purpose: Verify that a real sign-in completes and the user lands inside a workspace.
     */
    test('should sign in and redirect to workspace', async ({ page }) => {
      const slug = await signInAndOpenWorkspace(page);
      expect(slug).toBeTruthy();
    });
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that submitting invalid credentials shows an error message from the real API.
     */
    test('should show error on invalid credentials', async ({ page }) => {
      await gotoAuthPage(page, '/auth/signin', 'Sign in');
      await page.getByPlaceholder('you@company.com').fill('wrong@example.com');
      await page.getByPlaceholder('Enter your password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText(/invalid credentials|incorrect/i)).toBeVisible({ timeout: 10000 });
    });

    /**
     * Purpose: Verify that submitting the form without filling any fields triggers visible validation errors.
     */
    test('should show validation errors when form submitted empty', async ({ page }) => {
      await gotoAuthPage(page, '/auth/signin', 'Sign in');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe('Sign In - Desktop only', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  /**
   * Purpose: Verify that the branding panel is visible on desktop viewports.
   */
  test('should show branding panel on desktop', async ({ page }) => {
    await gotoAuthPage(page, '/auth/signin', 'Sign in');
    await expect(page.getByText('SAST Integration')).toBeVisible();
    await expect(page.getByText('Review scanner findings')).toBeVisible();
  });
});

test.describe('Sign In - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  /**
   * Purpose: Verify that the branding panel is hidden on mobile viewports.
   */
  test('should hide branding panel on mobile', async ({ page }) => {
    await gotoAuthPage(page, '/auth/signin', 'Sign in');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Review scanner findings')).toBeHidden();
  });
});
