import { test, expect } from '@playwright/test';
import { gotoAuthPage } from '../auth/helpers';

test.describe.configure({ mode: 'serial' });

async function signInToWorkspaceChooser(page: import('@playwright/test').Page) {
  await gotoAuthPage(page, '/auth/signin?redirect=/workspaces', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill('admin@sast.local');
  await page.getByPlaceholder('Enter your password').fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/workspaces/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Choose workspace' })).toBeVisible({ timeout: 10_000 });
}

test.describe('Workspace Chooser Page', () => {
  test('should redirect unauthenticated user to signin', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should show workspace chooser after signin', async ({ page }) => {
    await signInToWorkspaceChooser(page);
  });

  test('should show logout button', async ({ page }) => {
    await signInToWorkspaceChooser(page);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 10000 });
  });

  test('should create a new workspace from the chooser', async ({ page }, testInfo) => {
    await signInToWorkspaceChooser(page);

    const workspaceName = `Playwright Team ${Date.now()} ${testInfo.workerIndex}`;
    await page.getByRole('button', { name: /Create (organization )?workspace/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Create workspace' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Workspace name').fill(workspaceName);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });
  });

  test('should switch between workspaces from the navigation switcher', async ({ page }, testInfo) => {
    await signInToWorkspaceChooser(page);

    const workspaceName = `Switch Team ${Date.now()} ${testInfo.workerIndex}`;
    await page.getByRole('button', { name: /Create (organization )?workspace/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create workspace' });
    await dialog.getByLabel('Workspace name').fill(workspaceName);
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });

    await page.getByText(workspaceName).click();
    await expect(page).toHaveURL(/\/switch-team-/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: new RegExp(workspaceName, 'i') }).click();
    await page.getByRole('menuitem', { name: 'Personal Workspace' }).click();

    await expect(page).toHaveURL(/\/personal/, { timeout: 15_000 });
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
