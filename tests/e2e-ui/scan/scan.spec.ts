import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Scan Page', () => {
  /**
   * Purpose: Verify that the scan page loads without crashing and does not show a server error.
   */
  test('should render scan page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/scan`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the scan page shows either a scan table, an empty state, or a scan button.
   */
  test('should show scan table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/scan`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no scans|empty/i').count();
    const hasScanButton = await page.locator('button:has-text("Scan"), button:has-text("New Scan")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasScanButton > 0).toBe(true);
  });

  /**
   * Purpose: Verify that a scan trigger button (Scan, New Scan, or Run Scan) is visible on the page.
   */
  test('should have scan trigger button', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/scan`);
    await page.waitForLoadState('networkidle');

    const scanButton = page.locator('button:has-text("Scan"), button:has-text("New Scan"), button:has-text("Run Scan")');
    await expect(scanButton.first()).toBeVisible({ timeout: 10000 });
  });
});
