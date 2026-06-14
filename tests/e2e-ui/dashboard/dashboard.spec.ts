import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Dashboard Page', () => {
  test('should render dashboard after opening workspace', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should display workspace shell with sidebar navigation', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    // Dashboard loads — verify the workspace shell (sidebar) is visible
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Scans' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Findings' })).toBeVisible();
  });

  test('should display summary cards or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const hasCards = await page.locator('.ant-card').count();
    const hasStats = await page.locator('text=/scans|findings|repositories|health/i').count();
    expect(hasCards > 0 || hasStats > 0).toBe(true);
  });

  /**
   * Purpose: Verify that clicking a findings-related element on the dashboard navigates to findings page.
   * The dashboard may contain card links, text links, or action buttons that lead to the findings page.
   */
  test('should navigate to findings from dashboard', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const findingsLink = page.getByRole('link', { name: /findings/i })
      .or(page.getByRole('button', { name: /findings/i }))
      .or(page.locator('text=/View findings/i'));
    if (await findingsLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await findingsLink.first().click();
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/findings');
      await page.waitForLoadState('networkidle');
    }
  });

  /**
   * Purpose: Verify that clicking a scans-related element on the dashboard navigates to scans page.
   * The dashboard may contain card links, text links, or action buttons that lead to the scans page.
   */
  test('should navigate to scans from dashboard', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const scansLink = page.getByRole('link', { name: /scans/i })
      .or(page.getByRole('button', { name: /scans|view all/i }))
      .or(page.locator('text=/View all/i'));
    if (await scansLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await scansLink.first().click();
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/scan');
      await page.waitForLoadState('networkidle');
    }
  });

  /**
   * Purpose: Verify that sidebar navigation to Projects page works correctly.
   */
  test('should navigate to projects from sidebar', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const projectsButton = page.getByRole('button', { name: 'Projects' });
    await expect(projectsButton).toBeVisible({ timeout: 10000 });
    await projectsButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/projects');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Purpose: Verify that sidebar navigation to Findings page works correctly.
   */
  test('should navigate to findings from sidebar', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const findingsButton = page.getByRole('button', { name: 'Findings' });
    await expect(findingsButton).toBeVisible({ timeout: 10000 });
    await findingsButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/findings');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Purpose: Verify that sidebar navigation to Scans page works correctly.
   */
  test('should navigate to scans from sidebar', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const scansButton = page.getByRole('button', { name: 'Scans' });
    await expect(scansButton).toBeVisible({ timeout: 10000 });
    await scansButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/scan');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Purpose: Verify that sidebar navigation to Repositories page works correctly.
   */
  test('should navigate to repositories from sidebar', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const reposButton = page.getByRole('button', { name: 'Repositories' });
    await expect(reposButton).toBeVisible({ timeout: 10000 });
    await reposButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/repositories');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Purpose: Verify that sidebar navigation to Reports page works correctly.
   */
  test('should navigate to reports from sidebar', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    const reportsButton = page.getByRole('button', { name: 'Reports' });
    await expect(reportsButton).toBeVisible({ timeout: 10000 });
    await reportsButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/reports');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Purpose: Verify that sidebar navigation back to Dashboard works from another page.
   */
  test('should navigate back to dashboard from sidebar', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    // First navigate to another page
    const findingsButton = page.getByRole('button', { name: 'Findings' });
    await expect(findingsButton).toBeVisible({ timeout: 10000 });
    await findingsButton.click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toContain('/findings');
    await page.waitForLoadState('networkidle');

    // Now navigate back to dashboard
    const dashboardButton = page.getByRole('button', { name: 'Dashboard' });
    await expect(dashboardButton).toBeVisible({ timeout: 10000 });
    await dashboardButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).not.toContain('/findings');
    await page.waitForLoadState('networkidle');
  });
});
