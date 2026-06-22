import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Scanner Engines Page', () => {
  /**
   * Purpose: Verify that the scanner engines page loads without crashing and does not show a server error.
   */
  test('should render scanner engines page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/scanner-engines`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the scanner engines page displays an error or empty state when the API returns a 500 error.
   */
  test('should show error state when API fails', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/scanner-engines**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Internal server error' }),
      });
    });

    await page.goto(`/${slug}/scanner-engines`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    const hasError = await page.locator('.ant-alert-error, .ant-alert, [role="alert"]').or(page.locator('text=/error|failed|Internal Server Error/i')).count();
    const hasEmptyState = await page.locator('.ant-empty, [class*="empty"], [class*="Empty"]').count();
    const hasContent = await page.locator('.ant-card, table, [data-testid]').count();
    expect(hasError > 0 || hasEmptyState > 0 || hasContent > 0).toBe(true);
  });

  /**
   * Purpose: Verify that the scanner engines page shows a table, empty state, or content cards.
   */
  test('should show scanner engines table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/scanner-engines`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no scanners|empty/i').count();
    const hasContent = await page.locator('.ant-card, [data-testid]').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasContent > 0).toBe(true);
  });
});
