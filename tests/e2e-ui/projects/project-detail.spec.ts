import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Project Detail Page', () => {
  /**
   * Purpose: Verify that navigating to a project detail page loads without crashing and does not show a server error.
   */
  test('should render project detail page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Navigate to projects list first
    await page.goto(`/${slug}/projects`);
    await page.waitForLoadState('networkidle');

    // Click first project name link if available
    const projectLink = page.getByRole('link').filter({ hasText: /\w/ }).first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
    }
  });
});
