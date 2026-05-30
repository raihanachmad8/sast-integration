import { test, expect } from '@playwright/test';
import { getPublicConfig, gotoAuthPage, WORKSPACE_MODE } from '../auth/helpers';

test.describe.configure({ mode: 'serial' });

async function signInToWorkspaceChooser(page: import('@playwright/test').Page) {
  const config = await getPublicConfig(page);
  const credentials = config.workspaceMode === WORKSPACE_MODE.MULTIPLE
    ? {
        email: `workspace-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        password: 'Password123!',
        name: 'Playwright User',
      }
    : {
        email: 'admin@sast.local',
        password: 'ChangeMe123!',
        name: 'Admin',
      };

  await page.context().clearCookies();

  if (config.workspaceMode === WORKSPACE_MODE.MULTIPLE) {
    const signup = await page.request.post('/api/v1/auth/signup', {
      data: credentials,
    });
    expect(signup.ok()).toBe(true);
  }

  await gotoAuthPage(page, '/auth/signin?redirect=/workspaces', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill(credentials.email);
  await page.getByPlaceholder('Enter your password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/workspaces');
  await expect(page.getByRole('heading', { name: /Choose workspace|Workspace access required/ })).toBeVisible({ timeout: 10_000 });
  return config;
}

test.describe('Workspace Chooser Page', () => {
  test('should redirect unauthenticated user to signin', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should show workspace chooser after signin', async ({ page }) => {
    await signInToWorkspaceChooser(page);
  });

  test('should show back to sign in button', async ({ page }) => {
    await signInToWorkspaceChooser(page);
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible({ timeout: 10000 });
  });

  test('should show one personal workspace and no create workspace button', async ({ page }) => {
    const config = await signInToWorkspaceChooser(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      // Single mode: the seeded owner has the organization workspace; no self-service creation.
      await expect(page.getByRole('button', { name: 'Create personal workspace' })).toHaveCount(0);
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Open workspace' })).toBeVisible();
      return;
    }

    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Personal Workspace' })).toBeVisible();
    await expect(page.getByText('Each account owns one personal workspace. Additional workspace access is added by invitation.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create (organization )?workspace/ })).toHaveCount(0);
  });

  test('should open the personal workspace', async ({ page }) => {
    const config = await signInToWorkspaceChooser(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await page.locator('article').getByRole('button', { name: 'Open workspace' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 });
      return;
    }

    await page.locator('article').filter({ hasText: 'Personal Workspace' }).getByRole('button', { name: 'Open workspace' }).click();
    await expect(page).toHaveURL(/\/personal-/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Route Guards - Authenticated', () => {
  test('should redirect authenticated user away from signin page', async ({ page }) => {
    await signInToWorkspaceChooser(page);

    // Try to go back to signin
    await page.goto('/auth/signin');
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
  });

  test('should redirect authenticated user away from signup page', async ({ page }) => {
    await signInToWorkspaceChooser(page);

    await page.goto('/auth/signup');
    await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
  });
});
