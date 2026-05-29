import { test, expect, type Page } from '@playwright/test';
import { AUTH_PATHS, gotoAuthPage } from './helpers';

function collectDeprecatedAlertWarnings(page: Page) {
  const warnings: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (text.includes('[antd: Alert]') && text.includes('message is deprecated')) {
      warnings.push(text);
    }
  });
  return warnings;
}

test.describe('Password Reset Flow', () => {
  test('should render forgot password form', async ({ page }) => {
    await gotoAuthPage(page, AUTH_PATHS.forgotPassword, 'Send reset link');

    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  });

  test('should show forgot password API error without deprecated Alert warning', async ({ page }) => {
    const warnings = collectDeprecatedAlertWarnings(page);
    await page.route('**/api/v1/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Please wait before requesting another email' }),
      });
    });

    await gotoAuthPage(page, AUTH_PATHS.forgotPassword, 'Send reset link');
    await page.getByPlaceholder('you@company.com').fill('admin@sast.local');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Please wait before requesting another email' }))
      .toBeVisible();
    expect(warnings).toEqual([]);
  });

  test('should show invalid reset link without deprecated Alert warning', async ({ page }) => {
    const warnings = collectDeprecatedAlertWarnings(page);

    await page.goto(AUTH_PATHS.resetPassword);

    await expect(page.getByRole('alert').filter({ hasText: 'Invalid reset link' })).toBeVisible();
    expect(warnings).toEqual([]);
  });

  test('should reset password with token and navigate back to signin', async ({ page }) => {
    await page.route('**/api/v1/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Password reset successful', data: null }),
      });
    });

    await gotoAuthPage(page, `${AUTH_PATHS.resetPassword}?token=test-token`, 'Reset password');
    await page.getByPlaceholder('Minimum 8 characters').fill('new-password');
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(page.getByText('Password reset')).toBeVisible();
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(AUTH_PATHS.signin);
  });
});

test.describe('Email Verification Flow', () => {
  test('should verify email with token without deprecated Alert warning', async ({ page }) => {
    const warnings = collectDeprecatedAlertWarnings(page);
    await page.route((url) => url.pathname.endsWith('/api/v1/auth/verify-email'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Email verified successfully', data: null }),
      });
    });

    await page.goto(`${AUTH_PATHS.verifyEmail}?token=test-token`);

    await expect(page.getByText('Email verified')).toBeVisible();
    expect(warnings).toEqual([]);
  });
});
