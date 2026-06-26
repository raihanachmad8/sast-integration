import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Finding Detail Page', () => {
  /**
   * Purpose: Verify that clicking a finding row navigates to the finding detail page without a server error.
   */
  test('should render finding detail page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    // Navigate to findings list first
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    // Click first finding row if available
    const findingRow = page.locator('table tbody tr').first();
    test.skip(await findingRow.isVisible({ timeout: 5000 }).catch(() => false) === false, 'No findings rows present');

    await findingRow.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the finding detail full page renders all key sections
   * (header card, human decision, assignee, details sidebar) after navigating
   * from the findings list through the drawer's "Open full page" action.
   */
  test('should render finding detail with all sections', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();
    test.skip(await firstRow.isVisible({ timeout: 5000 }).catch(() => false) === false, 'No findings rows present');

    await firstRow.getByRole('button', { name: 'Review' }).click();

    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const openFullPageButton = drawer.getByRole('button', { name: /Open full page/i });
    await expect(openFullPageButton).toBeVisible({ timeout: 5000 });
    await openFullPageButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toMatch(/\/findings\/[^/]+$/);

    await expect(page.getByRole('heading', { name: 'Finding detail' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Human decision')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Assignee')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Details')).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that clicking the "Findings" breadcrumb on the detail page
   * navigates back to the findings list at /{workspace}/findings.
   */
  test('should navigate back to findings list from detail', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('table tbody tr').first();
    test.skip(await firstRow.isVisible({ timeout: 5000 }).catch(() => false) === false, 'No findings rows present');

    await firstRow.getByRole('button', { name: 'Review' }).click();

    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const openFullPageButton = drawer.getByRole('button', { name: /Open full page/i });
    await expect(openFullPageButton).toBeVisible({ timeout: 5000 });
    await openFullPageButton.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toMatch(/\/findings\/[^/]+$/);

    const findingsBreadcrumb = page.getByRole('link', { name: 'Findings' });
    await expect(findingsBreadcrumb).toBeVisible({ timeout: 10000 });
    await findingsBreadcrumb.click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toBe(`/${slug}/findings`);
  });
});
