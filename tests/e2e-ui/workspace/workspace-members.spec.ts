import { test, expect } from '@playwright/test';
import { gotoAuthPage } from '../auth/helpers';
import { OWNER_DEFAULTS, ORG_DEFAULTS } from '../../../drizzle/seeds/constants';

test.describe.configure({ mode: 'serial' });

async function signInAndGoToMembers(page: import('@playwright/test').Page) {
  await gotoAuthPage(page, '/auth/signin', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill(OWNER_DEFAULTS.EMAIL);
  await page.getByPlaceholder('Enter your password').fill(OWNER_DEFAULTS.PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/workspaces');
  await page.locator('article').getByRole('button', { name: 'Open workspace' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/${ORG_DEFAULTS.SLUG}`), { timeout: 10_000 });
  await page.goto(`/${ORG_DEFAULTS.SLUG}/members`);
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 10_000 });
}

test.describe('Members Page', () => {
  test('should display members table with owner', async ({ page }) => {
    await signInAndGoToMembers(page);
    const ownerRow = page.getByRole('row').filter({ hasText: OWNER_DEFAULTS.EMAIL });
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });
    await expect(ownerRow.getByText('Owner', { exact: true })).toBeVisible();
  });

  test('should show invite member button for owner', async ({ page }) => {
    await signInAndGoToMembers(page);
    await expect(page.getByRole('button', { name: /Invite member/ })).toBeVisible();
  });

  test('should open invite modal', async ({ page }) => {
    await signInAndGoToMembers(page);
    await page.getByRole('button', { name: /Invite member/ }).click();
    await expect(page.getByPlaceholder('Email address')).toBeVisible({ timeout: 5_000 });
  });

  test('should show tabs for members and pending invitations', async ({ page }) => {
    await signInAndGoToMembers(page);
    await expect(page.getByRole('tab', { name: /Members/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Pending invitations/ })).toBeVisible();
  });

  test('should switch to pending invitations tab', async ({ page }) => {
    await signInAndGoToMembers(page);
    await page.getByRole('tab', { name: /Pending invitations/ }).click();
    await expect(page.getByText(/No pending invitations/)).toBeVisible({ timeout: 5_000 });
  });

  test('should not show remove button for owner row', async ({ page }) => {
    await signInAndGoToMembers(page);
    const ownerRow = page.locator('tr').filter({ hasText: OWNER_DEFAULTS.EMAIL });
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });
    await expect(ownerRow.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  });
});
