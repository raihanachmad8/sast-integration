import { expect, type Page } from '@playwright/test';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';

export { WORKSPACE_MODE };

export const AUTH_PATHS = {
  signin: '/auth/signin',
  signup: '/auth/signup',
  invite: '/auth/invite',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
} as const;

export async function getPublicConfig(page: Page) {
  const response = await page.request.get('/api/v1/config');
  expect(response.ok()).toBe(true);
  const json = await response.json();
  return json.data as { workspaceMode: string };
}

export async function gotoAuthPage(page: Page, path: string, submitButtonName: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await waitForAuthFormReady(page, submitButtonName);
}

async function waitForAuthFormReady(page: Page, submitButtonName: string) {
  const button = page.getByRole('button', { name: submitButtonName });
  const firstTextbox = page.getByRole('textbox').first();

  await expect(firstTextbox).toBeVisible();
  await firstTextbox.focus();
  await expect(firstTextbox).toBeFocused();
  await expect(button).toBeVisible();
  await expect
    .poll(async () => {
      const box = await button.boundingBox();
      return box?.width ?? 0;
    }, { timeout: 5000 })
    .toBeGreaterThan(200);
}
