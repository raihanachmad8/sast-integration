import { test, expect } from '@playwright/test';
import { AUTH_PATHS, getPublicConfig, gotoAuthPage, WORKSPACE_MODE } from './helpers';

async function gotoSignupForCurrentMode(page: import('@playwright/test').Page) {
  const config = await getPublicConfig(page);

  if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
    await page.goto(AUTH_PATHS.signup);
    await expect(page.getByText('Invitation Only')).toBeVisible({ timeout: 10_000 });
    return config;
  }

  await gotoAuthPage(page, AUTH_PATHS.signup, 'Create account');
  return config;
}

test.describe('Signup Page', () => {
  test('should render signup form', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0);
      return;
    }

    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Minimum 8 characters')).toBeVisible();
    await expect(page.getByPlaceholder('Repeat your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('should show link to signin', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
      return;
    }

    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('should show validation errors on empty submit', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Please enter your full name')).toBeVisible({ timeout: 5000 });
  });

  test('should show error on short name', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await page.getByPlaceholder('John Doe').fill('A');
    await page.getByPlaceholder('you@company.com').fill('test@test.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error on short password', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('you@company.com').fill('test@test.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error on invalid email', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('you@company.com').fill('bad-email');
    await page.getByPlaceholder('Minimum 8 characters').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to signin page', async ({ page }) => {
    const config = await gotoSignupForCurrentMode(page);
    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) return;

    const link = page.locator(`a[href="${AUTH_PATHS.signin}"]`);
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(AUTH_PATHS.signin, { timeout: 15000 });
  });
});
