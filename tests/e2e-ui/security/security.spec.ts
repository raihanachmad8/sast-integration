import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Security Page', () => {
  test('should redirect security to profile', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/security`);
    await page.waitForLoadState('networkidle');

    // Security page redirects to profile
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toMatch(/profile/);
  });
});
