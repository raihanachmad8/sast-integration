import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Security Page', () => {
  /**
   * Purpose: Verify that navigating to the security page correctly redirects to the profile page.
   */
  test('should redirect security to profile', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/security`);
    await page.waitForLoadState('networkidle');

    // Security page redirects to profile
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toMatch(/profile/);
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that unauthenticated users cannot access the security page.
     */
    test('should redirect unauthenticated user to signin', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/workspace-1/security');
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    });
  });
});
