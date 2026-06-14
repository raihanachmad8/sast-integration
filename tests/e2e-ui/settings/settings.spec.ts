import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Settings Page', () => {
  test('should render settings page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should display workspace settings heading', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({ timeout: 10_000 });
  });

  test('should have save button for settings', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/settings`);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
  });
});
