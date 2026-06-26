import { test, expect } from '@playwright/test';
import { AUTH_PATHS, getWorkspaceMode, gotoAuthPage, WORKSPACE_MODE } from './helpers';

/**
 * Navigates to the signup page and handles the two different experiences:
 *
 * - SINGLE mode: Shows "Invitation Only" screen (no self-service signup).
 * - MULTIPLE mode: Shows the normal signup form.
 *
 * This helper centralizes the mode branching logic so individual tests stay cleaner.
 */
async function gotoSignupForCurrentMode(page: import('@playwright/test').Page) {
  const workspaceMode = getWorkspaceMode();

  if (workspaceMode === WORKSPACE_MODE.SINGLE) {
    await page.goto(AUTH_PATHS.signup);
    await expect(page.getByText('Invitation Only')).toBeVisible({ timeout: 10_000 });
    return;
  }

  await gotoAuthPage(page, AUTH_PATHS.signup, 'Create account');
  return { workspaceMode };
}

/**
 * Playwright UI tests for the Signup / Registration page.
 *
 * These tests validate both modes:
 * - MULTIPLE mode: Full self-service registration flow
 * - SINGLE mode: "Invitation Only" experience (no signup form)
 */
test.describe('Signup Page', () => {
  /**
   * Purpose: Verify that the signup form renders correctly in MULTIPLE mode,
   * and that in SINGLE mode the form is hidden (showing "Invitation Only" instead).
   */
  test('should render signup form', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0);
      return;
    }

    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Minimum 8 characters')).toBeVisible();
    await expect(page.getByPlaceholder('Repeat your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  /**
   * Purpose: Verify that the "Sign in" link is shown in MULTIPLE mode
   * and hidden in SINGLE mode (consistent with registration policy).
   */
  test('should show link to signin', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
      return;
    }

    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  /**
   * Purpose: Verify that submitting the registration form with empty/invalid fields
   * shows appropriate client-side validation messages.
   */
  test('should show validation errors on empty submit', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: 'Create account' }).click();
    // Ant Design shows validation messages in .ant-form-item-explain-error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Purpose: Verify that the UI shows a clear validation message when the user enters a name that is too short.
   */
  test('should show validation error when name is too short', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await page.getByPlaceholder('John Doe').fill('A');
    await page.getByPlaceholder('you@company.com').fill('test@test.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Purpose: Verify that the UI rejects passwords shorter than the minimum required length with an appropriate error.
   */
  test('should show validation error when password is too short', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('you@company.com').fill('test@test.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Purpose: Verify that the UI shows a validation error when the user enters an invalid email format during registration.
   */
  test('should show validation error when email format is invalid', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('you@company.com').fill('bad-email');
    await page.getByPlaceholder('Minimum 8 characters').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Purpose: Verify that in MULTIPLE mode, users can navigate from the signup page back to the signin page.
   */
  test('should allow navigation back to signin page in multiple mode', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    const link = page.locator(`a[href="${AUTH_PATHS.signin}"]`);
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(AUTH_PATHS.signin, { timeout: 15000 });
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that submitting the signup form with mismatched passwords shows a validation error.
     */
    test('should show validation error when passwords do not match', async ({ page }) => {
      const config = await gotoSignupForCurrentMode(page);
      if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

      await page.getByPlaceholder('John Doe').fill('Test User');
      await page.getByPlaceholder('you@company.com').fill('test@example.com');
      await page.getByPlaceholder('Minimum 8 characters').fill('Password123!');
      await page.getByPlaceholder('Repeat your password').fill('DifferentPassword!');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
    });
  });
});
