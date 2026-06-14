import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

/**
 * E2E UI tests for the dedicated project creation page (`/[workspace]/projects/new`).
 *
 * Tests:
 * - Project creation form rendering
 * - Form validation on empty submission
 * - Successful project creation and redirect
 * - Cancel navigation back to projects list
 */
test.describe('Project Creation Page', () => {
  /**
   * Purpose: Verify that the project creation form loads with the correct heading and form fields.
   */
  test('should render project creation form', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/projects/new`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Create Project|New Project/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Project name')).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Purpose: Verify that submitting the form empty triggers validation errors.
   */
  test('should show validation errors when submitting empty form', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/projects/new`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Create project|Submit/ }).click();

    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Purpose: Verify that filling the form and submitting creates a project and redirects to projects list.
   */
  test('should create project and redirect to projects list', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/projects/new`);
    await page.waitForLoadState('networkidle');

    const projectName = `Test Project ${Date.now()}`;
    await page.getByLabel('Project name').fill(projectName);
    await page.getByRole('button', { name: /Create project|Submit/ }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(`/${slug}/projects`);
  });

  /**
   * Purpose: Verify that clicking cancel navigates back to the projects list.
   */
  test('should navigate back to projects list when cancel clicked', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.goto(`/${slug}/projects/new`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Cancel|Back/ }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(`/${slug}/projects`);
  });
});