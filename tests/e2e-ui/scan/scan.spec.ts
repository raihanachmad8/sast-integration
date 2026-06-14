import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Scan Page', () => {
  test('should render scan page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/scan`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

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
