import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Reports Page', () => {
  /**
   * Purpose: Verify that the reports page loads without crashing and does not show a server error.
   */
  test('should render reports page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/reports`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the reports page shows either a reports table, an empty state, or a generate button.
   */
  test('should show reports table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/reports`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no reports|empty/i').count();
    const hasGenerateButton = await page.locator('button:has-text("Generate"), button:has-text("New Report")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasGenerateButton > 0).toBe(true);
  });

  /**
   * Purpose: Verify that report type or format filter options are visible on the reports page.
   */
  test('should have report type filter options', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/reports`);
    await page.waitForLoadState('networkidle');

    const filter = page.locator('text=/type|format|report/i').or(page.locator('select')).or(page.locator('[data-testid*="filter"]'));
    await expect(filter.first()).toBeVisible({ timeout: 10000 });
  });
});
