import { test, expect } from '@playwright/test';
import { gotoAuthPage } from '../auth/helpers';
import { OWNER_DEFAULTS, ORG_DEFAULTS } from '../../../drizzle/seeds/constants';

test.describe.configure({ mode: 'serial' });

/**
 * Helper that signs in as the organization owner and navigates directly
 * to the Members management page of the main organization workspace.
 *
 * Used by most tests in this file. Runs in serial mode because it relies
 * on the shared seeded admin account.
 */
async function signInAndGoToMembers(page: import('@playwright/test').Page) {
  await gotoAuthPage(page, '/auth/signin', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill(OWNER_DEFAULTS.EMAIL);
  await page.getByPlaceholder('Enter your password').fill(OWNER_DEFAULTS.PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait until we reach the workspace chooser (post-login landing)
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/workspaces');

  // Open the first workspace (assumed to be the seeded org workspace for OWNER_DEFAULTS)
  await page.locator('article').getByRole('button', { name: 'Open workspace' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/${ORG_DEFAULTS.SLUG}`), { timeout: 10_000 });

  // Navigate directly to members.
  // We wait for the authenticated shell (AppShell topbar) to be ready first,
  // then goto the target page. This is more resilient to session/refresh timing
  // after the auth security changes.
  await page.getByText('SAST Workspace').waitFor({ state: 'visible', timeout: 10_000 });
  await page.goto(`/${ORG_DEFAULTS.SLUG}/members`);

  // The main page heading is always rendered once the workspace guard passes.
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 15_000 });
}

/**
 * E2E UI tests for the Members management page (`/[workspace]/members`).
 *
 * Covers:
 * - Members table display and role badges
 * - Invitation flow (modal, button visibility)
 * - Tab switching between Members and Pending Invitations
 * - Permission-based UI elements (e.g. no "Remove" for owner)
 *
 * Note: These tests run in serial mode and share the seeded organization owner.
 */
test.describe('Members Page', () => {
  /**
   * Purpose: Verify that the members table loads correctly and the organization owner
   * is displayed with the correct "Owner" role badge.
   */
  test('should display members table with owner', async ({ page }) => {
    await signInAndGoToMembers(page);
    const ownerRow = page.getByRole('row').filter({ hasText: OWNER_DEFAULTS.EMAIL });
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });
    await expect(ownerRow.getByText('Owner', { exact: true })).toBeVisible();
  });

  /**
   * Purpose: Confirm that users with Owner or Manager role can see the "Invite member" button.
   */
  test('should show invite member button for owner', async ({ page }) => {
    await signInAndGoToMembers(page);
    await expect(page.getByRole('button', { name: /Invite member/ })).toBeVisible();
  });

  /**
   * Purpose: Verify that clicking the invite button successfully opens the invite modal
   * with the email input field visible.
   */
  test('should open invite modal', async ({ page }) => {
    await signInAndGoToMembers(page);
    await page.getByRole('button', { name: /Invite member/ }).click();
    await expect(page.getByPlaceholder('Email address')).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Verify that the Members page exposes both the "Members" tab
   * and the "Pending invitations" tab for users with appropriate permissions.
   */
  test('should expose both Members and Pending invitations tabs', async ({ page }) => {
    await signInAndGoToMembers(page);
    await expect(page.getByRole('tab', { name: /Members/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Pending invitations/ })).toBeVisible();
  });

  /**
   * Purpose: Verify that switching to the "Pending invitations" tab successfully loads
   * the tab content area.
   *
   * We deliberately avoid asserting on "No pending invitations" text because
   * other tests in the suite (or previous runs) may leave invitations in the database.
   */
  test('should switch to pending invitations tab', async ({ page }) => {
    await signInAndGoToMembers(page);
    await page.getByRole('tab', { name: /Pending invitations/ }).click();

    await expect(page.getByPlaceholder('Search pending invitations')).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Security / permission check — confirm that the owner row never shows
   * a "Remove" button (even the owner themselves cannot remove the owner).
   */
  test('should not show remove button for owner row', async ({ page }) => {
    await signInAndGoToMembers(page);
    const ownerRow = page.locator('tr').filter({ hasText: OWNER_DEFAULTS.EMAIL });
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });
    await expect(ownerRow.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  });
});
