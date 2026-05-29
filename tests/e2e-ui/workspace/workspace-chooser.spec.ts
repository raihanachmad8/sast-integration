import { test, expect } from '@playwright/test';

test.describe('Workspace Chooser Page', () => {
  test('should redirect unauthenticated user to signin', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should show workspace chooser after signin', async ({ page }) => {
    // Mock signin
    await page.goto('/auth/signin');
    await page.getByPlaceholder('you@company.com').fill('admin@sast.local');
    await page.getByPlaceholder('Enter your password').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should redirect to /workspaces
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Choose workspace' })).toBeVisible({ timeout: 10000 });
  });

  test('should show logout button', async ({ page }) => {
    await page.goto('/workspaces');
    // Will redirect to signin if not authenticated, so we check from signin flow
    await page.goto('/auth/signin');
    await page.getByPlaceholder('you@company.com').fill('admin@sast.local');
    await page.getByPlaceholder('Enter your password').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Route Guards - Authenticated', () => {
  test('should redirect authenticated user away from signin page', async ({ page }) => {
    // First signin
    await page.goto('/auth/signin');
    await page.getByPlaceholder('you@company.com').fill('admin@sast.local');
    await page.getByPlaceholder('Enter your password').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 15000 });

    // Try to go back to signin
    await page.goto('/auth/signin');
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
  });

  test('should redirect authenticated user away from signup page', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.getByPlaceholder('you@company.com').fill('admin@sast.local');
    await page.getByPlaceholder('Enter your password').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 15000 });

    await page.goto('/auth/signup');
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
  });
});
