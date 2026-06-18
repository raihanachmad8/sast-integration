import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Arena Page', () => {
  test('should render arena page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/arena`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should display arena heading or coming soon', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/arena`);
    await page.waitForLoadState('networkidle');

    const hasHeading = await page.getByRole('heading', { name: /Arena/i }).count();
    const hasComingSoon = await page.locator('text=/coming soon/i').count();
    expect(hasHeading > 0 || hasComingSoon > 0).toBe(true);
  });
});
