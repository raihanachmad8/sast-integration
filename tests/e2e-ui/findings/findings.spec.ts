import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Findings Page', () => {
  /**
   * Purpose: Verify that the findings page loads without crashing and does not show a server error.
   */
  test('should render findings page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    // Wait for the workspace page to fully load before navigating
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the findings page shows either a findings table, an empty state, or a scan button.
   */
  test('should show findings table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no findings|empty/i').count();
    const hasScanButton = await page.locator('button:has-text("Scan"), button:has-text("New Scan")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasScanButton > 0).toBe(true);
  });

  /**
   * Purpose: Verify that a severity filter option is visible on the findings page for filtering results.
   */
  test('should have severity filter options', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const severityFilter = page.locator('text=/severity/i').or(page.locator('[data-testid*="severity"]')).or(page.locator('select:has-text("Severity")'));
    await expect(severityFilter.first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that a status filter option is visible on the findings page for filtering results.
   */
  test('should have status filter options', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const statusFilter = page.locator('text=/status/i').or(page.locator('[data-testid*="status"]')).or(page.locator('select:has-text("Status")'));
    await expect(statusFilter.first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that a finding can be accepted (verdict accepted) via the bulk action bar.
   * Selects a finding row, clicks Accept, and confirms the success message appears.
   */
  test('should verify a finding', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/workspaces/*/findings/*', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: { id: 'finding-1', status: 'resolved' } }),
        });
      } else {
        route.continue();
      }
    });

    const firstRow = page.locator('table tbody tr').first();
    test.skip(await firstRow.isVisible({ timeout: 5000 }).catch(() => false) === false, 'No findings rows present');

    const checkbox = firstRow.locator('input[type="checkbox"], .ant-checkbox-input').first();
    await checkbox.click({ timeout: 5000 });

    const acceptButton = page.locator('button:has-text("Accept")');
    await expect(acceptButton).toBeVisible({ timeout: 5000 });
    await acceptButton.click();

    await expect.poll(async () => {
      const msg = page.locator('.ant-message-success');
      return await msg.count();
    }, { timeout: 10000 }).toBeGreaterThan(0);
  });

  /**
   * Purpose: Verify that a finding can be resolved via the drawer action.
   * Opens the finding detail drawer, clicks Resolve, confirms, and checks success message.
   */
  test('should resolve a finding', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/workspaces/*/findings/*', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: { id: 'finding-1', status: 'resolved' } }),
        });
      } else {
        route.continue();
      }
    });

    const firstRow = page.locator('table tbody tr').first();
    test.skip(await firstRow.isVisible({ timeout: 5000 }).catch(() => false) === false, 'No findings rows present');

    await firstRow.getByRole('button', { name: 'Review' }).click();

    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const resolveButton = drawer.getByRole('button', { name: /Resolve/i });
    await expect(resolveButton).toBeVisible({ timeout: 5000 });
    await resolveButton.click();

    const modal = page.getByRole('dialog', { name: /Resolve Finding/i });
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.getByRole('button', { name: 'Resolve' }).click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    await expect.poll(async () => {
      const msg = page.locator('.ant-message-success');
      return await msg.count();
    }, { timeout: 10000 }).toBeGreaterThan(0);
  });
});
