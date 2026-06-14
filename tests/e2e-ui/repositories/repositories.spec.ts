import { test, expect } from '@playwright/test';

test.describe('Repositories Page', () => {
  test('should render repositories page', async ({ page }) => {
    await page.goto('http://localhost:3000/repositories');
    await page.waitForLoadState('networkidle');
    
    // Page should have loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show error page
    await expect(page.locator('text=404')).toHaveCount(0);
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });
});
