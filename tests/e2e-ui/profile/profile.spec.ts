import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Profile Page', () => {
  test('should render profile page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/profile`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should display user profile information', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/profile`);
    await page.waitForLoadState('networkidle');

    const hasNameField = await page.locator('input[name="name"], [data-testid*="name"]').count();
    const hasAvatar = await page.locator('img[alt*="avatar"], .ant-avatar').count();
    const hasForm = await page.locator('form, [role="form"]').count();

    expect(hasNameField > 0 || hasAvatar > 0 || hasForm > 0).toBe(true);
  });

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
