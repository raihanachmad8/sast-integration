import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Findings Page', () => {
  test('should render findings page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    // Wait for the workspace page to fully load before navigating
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should show findings table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no findings|empty/i').count();
    const hasScanButton = await page.locator('button:has-text("Scan"), button:has-text("New Scan")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasScanButton > 0).toBe(true);
  });

  test('should have severity filter options', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const severityFilter = page.locator('text=/severity/i').or(page.locator('[data-testid*="severity"]')).or(page.locator('select:has-text("Severity")'));
    await expect(severityFilter.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have status filter options', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const statusFilter = page.locator('text=/status/i').or(page.locator('[data-testid*="status"]')).or(page.locator('select:has-text("Status")'));
    await expect(statusFilter.first()).toBeVisible({ timeout: 10000 });
  });
});
