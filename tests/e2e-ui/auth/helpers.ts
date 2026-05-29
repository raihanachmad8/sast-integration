import { expect, type Page } from '@playwright/test';

export const AUTH_PATHS = {
  signin: '/auth/signin',
  signup: '/auth/signup',
  invite: '/auth/invite',
} as const;

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
