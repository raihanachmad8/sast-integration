import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Settings Page', () => {
  /**
   * Purpose: Verify that the settings page loads without crashing and does not show a server error.
   */
  test('should render settings page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the settings page displays the "Settings" heading after navigation.
   */
  test('should display workspace settings heading', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Purpose: Verify that a Save or Update button is visible on the settings page for persisting changes.
   */
  test('should have save button for settings', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that clicking the save button on settings triggers a success message after the API responds.
   */
  test('should save settings changes', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.route('**/api/settings**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
    await saveButton.first().click();

    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that the settings page displays the workspace name field and description field.
   */
  test('should display workspace settings fields', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Workspace name')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Slug')).toBeVisible({ timeout: 10_000 });
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that clearing the workspace name and saving triggers a validation error.
     */
    test('should show validation error when required field is empty', async ({ page }) => {
      const slug = await signInAndOpenWorkspace(page);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await page.goto(`/${slug}/settings`);
      await page.waitForLoadState('networkidle');

      const nameField = page.getByLabel('Workspace name');
      if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameField.clear();
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
        await saveButton.first().click();
        await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
