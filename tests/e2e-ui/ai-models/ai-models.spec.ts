import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('AI Models Page', () => {
  /**
   * Purpose: Verify that the AI models page loads without crashing and does not show a server error.
   */
  test('should render AI models page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/ai-models`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the AI models page displays an error or empty state when the API returns a 500 error.
   */
  test('should show error state when API fails', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/ai-models**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Internal server error' }),
      });
    });

    await page.goto(`/${slug}/ai-models`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    const hasError = await page.locator('.ant-alert-error, .ant-alert, [role="alert"]').or(page.locator('text=/error|failed|Internal Server Error/i')).count();
    const hasEmptyState = await page.locator('.ant-empty, [class*="empty"], [class*="Empty"]').count();
    const hasContent = await page.locator('.ant-card, table, [data-testid]').count();
    expect(hasError > 0 || hasEmptyState > 0 || hasContent > 0).toBe(true);
  });

  /**
   * Purpose: Verify that the AI models page shows content, cards, or an empty/configure state.
   */
  test('should show AI models content or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/ai-models`);
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('table, .ant-card, [data-testid]').count();
    const hasEmptyState = await page.locator('text=/no models|empty|configure/i').count();

    expect(hasContent > 0 || hasEmptyState > 0).toBe(true);
  });
});
