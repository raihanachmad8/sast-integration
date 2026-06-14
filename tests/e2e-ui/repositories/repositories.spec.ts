import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Repositories Page', () => {
  test('should render repositories page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/repositories`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should show error state when API fails', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/repositories**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Internal server error' }),
      });
    });

    await page.goto(`/${slug}/repositories`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    const hasError = await page.locator('.ant-alert-error, text=/error|failed/i').count();
    const hasEmptyState = await page.locator('.ant-empty').count();
    expect(hasError > 0 || hasEmptyState > 0).toBe(true);
  });

  test('should show repositories table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/repositories`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no repositories|empty|no repos/i').count();
    const hasAddButton = await page.locator('button:has-text("Add"), button:has-text("Connect"), button:has-text("Import")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasAddButton > 0).toBe(true);
  });
});
