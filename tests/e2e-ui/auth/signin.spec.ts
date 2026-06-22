import { test, expect } from '@playwright/test';
import { AUTH_PATHS, addMockRefreshCookie, getWorkspaceMode, gotoAuthPage, WORKSPACE_MODE } from './helpers';

/**
 * Playwright UI tests for the Sign-in page.
 *
 * Covers:
 * - Form rendering and basic validation
 * - Mode-aware behavior (signup link visibility in SINGLE vs MULTIPLE mode)
 * - Error states (invalid credentials, validation)
 * - Post-login redirect behavior
 */
test.describe('Signin Page', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
  });

  /**
   * Purpose: Basic smoke test to verify that the sign-in form renders with all essential elements.
   */
  test('should render signin form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  /**
   * Purpose: Verify that the "Create an account" link visibility correctly reflects
   * the current WORKSPACE_MODE (hidden in SINGLE mode, visible in MULTIPLE mode).
   */
  test('should match signup link to registration mode', async ({ page }) => {
    const workspaceMode = getWorkspaceMode();
    const signupLink = page.getByRole('link', { name: 'Create an account' });

    if (workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(signupLink).toHaveCount(0);
      return;
    }

    await expect(signupLink).toBeVisible();
  });

  /**
   * Purpose: Verify that submitting the sign-in form without filling any fields triggers visible validation errors.
   */
  test('should show validation errors when submitting empty form', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Ant Design shows validation messages in .ant-form-item-explain-error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Purpose: Verify that the UI shows a validation error when the user enters an email with invalid format.
   */
  test('should show validation error when email format is invalid', async ({ page }) => {
    await page.getByPlaceholder('you@company.com').fill('not-an-email');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Purpose: Verify that entering wrong credentials shows the proper "Invalid credentials" error message.
   * Mock returns 400 to avoid the 401 interceptor redirecting before error is displayed.
   */
  test('should show error on invalid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/signin', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials',
          data: null,
          meta: { timestamp: new Date().toISOString() },
          error: { code: 'AUTH', details: null },
        }),
      });
    });
    await page.getByPlaceholder('you@company.com').fill('wrong@example.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that clicking the signup link on the signin page navigates to the signup page
   * when registration mode is open (MULTIPLE mode only).
   */
  test('should navigate to signup page when registration is open', async ({ page }) => {
    const workspaceMode = getWorkspaceMode();
    const signupLink = page.locator(`a[href="${AUTH_PATHS.signup}"]`);

    if (workspaceMode === WORKSPACE_MODE.SINGLE) {
      await expect(signupLink).toHaveCount(0);
      return;
    }

    await signupLink.click();
    await expect(page).toHaveURL(AUTH_PATHS.signup, { timeout: 10000 });
  });

  /**
   * Purpose: Verify that clicking the "Forgot password?" link navigates to the password reset page.
   */
  test('should navigate to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(AUTH_PATHS.forgotPassword, { timeout: 10000 });
  });

  /**
   * Purpose: Verify that after successful sign-in, the user is redirected to the originally requested page
   * (passed via the `redirect` query parameter).
   *
   * Mocks signin + refresh + me APIs so session loads after full page reload.
   * Note: window.location.assign causes a full reload, losing the in-memory access token.
   */
  test('should redirect to requested path after successful signin', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Session retrieved',
          data: {
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
              slug: 'some-workspace',
              role: 'owner',
              permissions: [],
            },
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Token refreshed',
          data: {
            tokenType: 'Bearer',
            accessToken: 'test-access-token',
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            expiresIn: 900,
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await page.route('**/api/v1/auth/signin', async (route) => {
      await addMockRefreshCookie(page);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
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
              slug: 'some-workspace',
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

    await expect(page).toHaveURL(/\/some-workspace/, { timeout: 15000 });
  });

  /**
   * Purpose: Verify that after successful sign-in without a redirect parameter, the user is sent
   * to the workspace chooser page (/workspaces) for workspace selection.
   */
  test('should redirect to workspace chooser after successful signin without requested path', async ({ page }) => {
    // Mock /me so useSessionQuery fast path succeeds after redirect
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Session retrieved',
          data: {
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
              permissions: [],
            },
          },
           meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Token refreshed',
          data: {
            tokenType: 'Bearer',
            accessToken: 'test-access-token',
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            expiresIn: 900,
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await page.route('**/api/v1/auth/signin', async (route) => {
      await addMockRefreshCookie(page);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
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

    await expect(page).toHaveURL('/workspaces', { timeout: 15000 });
  });

  /**
   * Purpose: Verify that after sign-in when the user has no currentWorkspaceId, they are redirected
   * to the workspace chooser page to select a workspace.
   */
  test('should redirect to workspace chooser after successful signin without current workspace', async ({ page }) => {
    // Mock /me returning no workspace (user has no currentWorkspaceId)
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Session retrieved',
          data: {
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

    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Token refreshed',
          data: {
            tokenType: 'Bearer',
            accessToken: 'test-access-token',
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
            expiresIn: 900,
          },
          meta: { timestamp: new Date().toISOString() },
        }),
      });
    });

    await page.route('**/api/v1/auth/signin', async (route) => {
      await addMockRefreshCookie(page, { workspaceId: null });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
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

    await expect(page).toHaveURL('/workspaces', { timeout: 15000 });
  });
});

test.describe('Signin Page - Desktop only', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  /**
   * Purpose: Verify that the branding panel (product name and tagline) is visible on desktop viewports.
   */
  test('should show branding panel on desktop', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await expect(page.getByText('SAST Integration')).toBeVisible();
    await expect(page.getByText('Review scanner findings')).toBeVisible();
  });
});

test.describe('Signin Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  /**
   * Purpose: Verify that the branding panel is hidden on mobile viewports for a focused sign-in experience.
   */
  test('should hide branding panel on mobile', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Review scanner findings')).toBeHidden();
  });

  /**
   * Purpose: Verify that the sign-in form renders correctly on mobile viewports with all essential elements.
   */
  test('should render form on mobile', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.signin, 'Sign in');
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
