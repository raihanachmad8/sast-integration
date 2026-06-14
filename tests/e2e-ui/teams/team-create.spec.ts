import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

/**
 * E2E UI tests for the dedicated team creation page (`/[workspace]/teams/new`).
 *
 * Tests:
 * - Team creation form rendering
 * - Form validation on empty submission
 * - Successful team creation and redirect
 * - Cancel navigation back to teams list
 */
test.describe('Team Creation Page', () => {
  /**
   * Purpose: Verify that the team creation form loads with the correct heading and form fields.
   */
  test('should render team creation form', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/teams/new`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Create Team|New Team/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Team name')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Slug')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Description')).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Purpose: Verify that submitting the form empty triggers validation errors.
   */
  test('should show validation errors when submitting empty form', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/teams/new`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Create team|Submit/ }).click();

    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Purpose: Verify that filling the form and submitting creates a team and redirects to teams list.
   */
  test('should create team and redirect to teams list', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/teams/new`);
    await page.waitForLoadState('networkidle');

    const teamName = `Test Team ${Date.now()}`;
    await page.getByLabel('Team name').fill(teamName);
    await page.getByRole('button', { name: /Create team|Submit/ }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(`/${slug}/teams`);
  });

  /**
   * Purpose: Verify that clicking cancel navigates back to the teams list.
   */
  test('should navigate back to teams list when cancel clicked', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/teams/new`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Cancel|Back/ }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(`/${slug}/teams`);
  });
});