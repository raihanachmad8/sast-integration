import { test, expect, type Page } from '@playwright/test';
import { AUTH_PATHS, getPublicConfig, gotoAuthPage, WORKSPACE_MODE } from './helpers';

async function addMockRefreshCookie(page: Page) {
  await page.context().addCookies([{
    name: 'refresh_token',
    value: 'test-refresh-token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }]);
}

test.describe('Signin Page', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
  });

  test('should render signin form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('should match signup link to registration mode', async ({ page }) => {
    const config = await getPublicConfig(page);
    const signupLink = page.getByRole('link', { name: 'Create an account' });

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(signupLink).toHaveCount(0);
      return;
    }

    await expect(signupLink).toBeVisible();
  });

  test('should show validation error on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Ant Design shows validation messages in .ant-form-item-explain-error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error on invalid email', async ({ page }) => {
    await page.getByPlaceholder('you@company.com').fill('not-an-email');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('you@company.com').fill('wrong@example.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to signup page when registration is open', async ({ page }) => {
    const config = await getPublicConfig(page);
    const signupLink = page.locator(`a[href="${AUTH_PATHS.signup}"]`);

    if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(signupLink).toHaveCount(0);
      return;
    }

    await signupLink.click();
    await expect(page).toHaveURL(AUTH_PATHS.signup, { timeout: 10000 });
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(AUTH_PATHS.forgotPassword, { timeout: 10000 });
  });

  test('should redirect to requested path after successful signin', async ({ page }) => {
    await page.route('**/api/v1/auth/signin', async (route) => {
      await addMockRefreshCookie(page);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'refresh_token=test-refresh-token; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            tokenType: 'Bearer',
            accessToken: 'test-access-token',
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            expiresIn: 900,
            user: {
              id: 'user-1',
              email: 'user@example.com',
              name: 'Test User',
              emailVerified: true,
              currentWorkspaceId: 'workspace-1',
            },
            workspace: {
              id: 'workspace-1',
              name: 'Personal Workspace',
              slug: 'personal-test',
              role: 'owner',
            },
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await gotoAuthPage(page, `${AUTH_PATHS.signin}?redirect=/some-workspace`, 'Sign in');
    await page.getByPlaceholder('you@company.com').fill('user@example.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/some-workspace', { timeout: 10000 });
  });

  test('should redirect to workspace chooser after successful signin without requested path', async ({ page }) => {
    await page.route('**/api/v1/auth/signin', async (route) => {
      await addMockRefreshCookie(page);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'refresh_token=test-refresh-token; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            tokenType: 'Bearer',
            accessToken: 'test-access-token',
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            expiresIn: 900,
            user: {
              id: 'user-1',
              email: 'user@example.com',
              name: 'Test User',
              emailVerified: true,
              currentWorkspaceId: 'workspace-1',
            },
            workspace: {
              id: 'workspace-1',
              name: 'Personal Workspace',
              slug: 'personal-test',
              role: 'owner',
            },
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await page.getByPlaceholder('you@company.com').fill('user@example.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });

  test('should redirect to workspace chooser after successful signin without current workspace', async ({ page }) => {
    await page.route('**/api/v1/auth/signin', async (route) => {
      await addMockRefreshCookie(page);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'refresh_token=test-refresh-token; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            tokenType: 'Bearer',
            accessToken: 'test-access-token',
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            expiresIn: 900,
            user: {
              id: 'user-1',
              email: 'user@example.com',
              name: 'Test User',
              emailVerified: true,
              currentWorkspaceId: null,
            },
            workspace: null,
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await page.getByPlaceholder('you@company.com').fill('user@example.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });
});

test.describe('Signin Page - Desktop only', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('should show branding panel on desktop', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await expect(page.getByText('SAST Integration')).toBeVisible();
    await expect(page.getByText('Review scanner findings')).toBeVisible();
  });
});

test.describe('Signin Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should hide branding panel on mobile', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Review scanner findings')).toBeHidden();
  });

  test('should render form on mobile', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
