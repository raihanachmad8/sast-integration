/**
 * Shared helpers for Playwright UI auth-related tests.
 *
 * Contains reusable functions for navigation, config checking,
 * and common setup patterns used across signin, signup, and protection tests.
 */
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

/**
 * Fetches the public configuration from the API.
 *
 * Used to determine runtime settings such as WORKSPACE_MODE during tests.
 *
 * @param page - Playwright Page object
 * @returns The public config data (e.g. { workspaceMode: 'single' | 'multiple' })
 */
export async function getPublicConfig(page: Page) {
  const response = await page.request.get('/api/v1/config');
  expect(response.ok()).toBe(true);
  const json = await response.json();
  return json.data as { workspaceMode: string };
}

/**
 * Navigates to an authentication page and waits until the form is ready for interaction.
 *
 * This helper ensures the page has fully loaded and the form elements are interactable
 * before the test proceeds (important for Ant Design forms).
 *
 * @param page - Playwright Page object
 * @param path - The URL path to navigate to (e.g. AUTH_PATHS.signin)
 * @param submitButtonName - The visible text of the submit button to wait for
 */
export async function gotoAuthPage(page: Page, path: string, submitButtonName: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await waitForAuthFormReady(page, submitButtonName);
}

/**
 * Internal helper that waits until the authentication form is fully ready.
 *
 * It ensures:
 * - The first input field is visible and focused
 * - The submit button is visible
 * - The button has a reasonable width (to avoid flaky clicks on Ant Design forms during initial render)
 *
 * @param page - Playwright Page object
 * @param submitButtonName - Text of the submit button to wait for
 */
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
