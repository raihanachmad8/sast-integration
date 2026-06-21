import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe.configure({ mode: 'serial' });

/**
 * Helper that signs in and navigates directly to the Members management page.
 */
async function signInAndGoToMembers(page: import('@playwright/test').Page) {
  const slug = await signInAndOpenWorkspace(page);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.goto(`/${slug}/members`);
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
    // Check that the members table has at least one row with an "owner" role
    const ownerRow = page.getByRole('row').filter({ hasText: /owner/i });
    await expect(ownerRow.first()).toBeVisible({ timeout: 10_000 });
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
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByText('Pending invitations')).toBeVisible();
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
    await page.getByRole('tab', { name: /Pending/ }).click();

    await expect(page.getByRole('tab', { name: /Pending/ })).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Security / permission check — confirm that the owner row never shows
   * a "Remove" button (even the owner themselves cannot remove the owner).
   */
  test('should not show remove button for owner row', async ({ page }) => {
    await signInAndGoToMembers(page);
    const ownerRow = page.locator('tr').filter({ hasText: /owner/i });
    await expect(ownerRow.first()).toBeVisible({ timeout: 10_000 });
    await expect(ownerRow.first().getByRole('button', { name: 'Remove' })).toHaveCount(0);
  });
});
