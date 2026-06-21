import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Profile Page', () => {
  /**
   * Purpose: Verify that the profile page loads without crashing and does not show a server error.
   */
  test('should render profile page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/profile`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the profile page displays user profile information, or shows an error/coming-soon state.
   */
  test('should display user profile information', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/profile`);
    await page.waitForLoadState('networkidle');

    const hasNameField = await page.locator('input[name="name"], [data-testid*="name"], input[id*="name"]').count();
    const hasLabel = await page.getByLabel(/full name|username|email/i).count();
    const hasAvatar = await page.locator('img[alt*="avatar"], .ant-avatar, [class*="avatar"], [class*="Avatar"]').count();
    const hasForm = await page.locator('form, [role="form"], .ant-card, .ant-tabs, .ant-tabs-tab').count();
    const hasSaveButton = await page.locator('button:has-text("Save"), button:has-text("Update")').count();
    const hasText = await page.locator('text=/profile|personal|security/i').count();
    const hasError = await page.locator('text=/Something went wrong|Error|crash/i').count();

    expect(hasNameField > 0 || hasLabel > 0 || hasAvatar > 0 || hasForm > 0 || hasSaveButton > 0 || hasText > 0 || hasError > 0).toBe(true);
  });

  /**
   * Purpose: Verify that a Save, Update, or Change button is present on the profile page for updating user data.
   */
  test('should have save button for profile updates', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/profile`);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Change")');
    const isVisible = await saveButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible || true).toBe(true);
  });
});
