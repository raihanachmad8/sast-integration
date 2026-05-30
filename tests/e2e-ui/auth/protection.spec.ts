import { test, expect } from '@playwright/test';
import { AUTH_PATHS, getPublicConfig, WORKSPACE_MODE } from './helpers';

test.describe('Route Protection', () => {
  test('should redirect unauthenticated user to /auth/signin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should redirect with redirect param', async ({ page }) => {
    await page.goto('/some-workspace');
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
  });

  test('should allow access to /auth/signin without redirect', async ({ page }) => {
    await page.goto(AUTH_PATHS.signin);
    await expect(page).toHaveURL(AUTH_PATHS.signin);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('should allow access to /auth/signup without redirect', async ({ page }) => {
    const config = await getPublicConfig(page);

    await page.goto(AUTH_PATHS.signup);
    await expect(page).toHaveURL(AUTH_PATHS.signup);
    await expect(page.getByRole('heading', { name: config.workspaceMode === WORKSPACE_MODE.SINGLE ? 'Invitation Only' : 'Create account' })).toBeVisible();
  });

  test('should allow access to /auth/invite without redirect', async ({ page }) => {
    await page.goto(AUTH_PATHS.invite);
    await expect(page).toHaveURL(AUTH_PATHS.invite);
  });
});
