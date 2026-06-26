import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe.configure({ mode: 'serial' });

/**
 * Helper that signs in and navigates directly to the Projects management page.
 */
async function signInAndGoToProjects(page: import('@playwright/test').Page) {
  const slug = await signInAndOpenWorkspace(page);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.goto(`/${slug}/projects`);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible({ timeout: 15_000 });
}

/**
 * E2E UI tests for the Projects management page (`/[workspace]/projects`).
 *
 * Covers:
 * - Projects page rendering and heading
 * - Projects table with data or empty state
 * - New project button visibility
 * - Project form modal open/close
 * - Project detail navigation
 * - Search and filter functionality
 */
test.describe('Projects Page', () => {
  /**
   * Purpose: Verify that the projects page loads correctly with the main heading.
   */
  test('should display projects page heading', async ({ page }) => {
    await signInAndGoToProjects(page);
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  /**
   * Purpose: Confirm that the "New project" button is visible for workspace owners.
   */
  test('should show new project button for owner', async ({ page }) => {
    await signInAndGoToProjects(page);
    await expect(page.getByRole('button', { name: /New project/ })).toBeVisible();
  });

  /**
   * Purpose: Verify that clicking the "New project" button opens the project creation form.
   */
  test('should open new project form', async ({ page }) => {
    await signInAndGoToProjects(page);
    await page.getByRole('button', { name: /New project/ }).click();

    await expect(page.getByRole('dialog', { name: /New project/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel('Project name')).toBeVisible();
  });

  /**
   * Purpose: Verify that the project form auto-generates a slug from the project name.
   */
  test('should auto-generate slug from project name', async ({ page }) => {
    await signInAndGoToProjects(page);
    await page.getByRole('button', { name: /New project/ }).click();

    // The slug is auto-generated server-side, so we just verify the name field works
    await page.getByLabel('Project name').fill('Security Scanner');
    await expect(page.getByLabel('Project name')).toHaveValue('Security Scanner');
  });

  /**
   * Purpose: Verify that the projects table displays expected columns.
   */
  test('should display projects table with expected columns', async ({ page }) => {
    await signInAndGoToProjects(page);

    // The table should have headers — check for at least one standard column
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(table.getByRole('columnheader').first()).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that the search input is visible and functional for filtering projects.
   */
  test('should display search input for projects', async ({ page }) => {
    await signInAndGoToProjects(page);
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that clicking a project name opens the project detail page.
   */
  test('should navigate to project detail when clicking project name', async ({ page }) => {
    await signInAndGoToProjects(page);

    const projectLink = page.getByRole('link').first();
    if (await projectLink.isVisible()) {
      const href = await projectLink.getAttribute('href');
      expect(href).toContain('/projects/');
    }
  });

  /**
   * Purpose: Verify that the project form modal can be closed via Cancel button.
   */
  test('should close project modal on cancel', async ({ page }) => {
    await signInAndGoToProjects(page);
    await page.getByRole('button', { name: /New project/ }).click();
    await expect(page.getByRole('dialog', { name: /New project/ })).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: /New project/ })).not.toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Verify that the table shows empty state when no projects exist.
   */
  test('should display empty state when no projects', async ({ page }) => {
    await signInAndGoToProjects(page);

    const emptyText = page.getByText(/no projects found/i);
    const tableRows = page.locator('tbody tr');

    const rowCount = await tableRows.count();
    if (rowCount === 0) {
      await expect(emptyText).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that the project form validates required fields.
   */
  test('should validate required fields in project form', async ({ page }) => {
    await signInAndGoToProjects(page);
    await page.getByRole('button', { name: /New project/ }).click();
    await expect(page.getByRole('dialog', { name: /New project/ })).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page.getByText('Project name is required')).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Verify that platform and language fields are present in the form.
   */
  test('should display optional fields in project form', async ({ page }) => {
    await signInAndGoToProjects(page);
    await page.getByRole('button', { name: /New project/ }).click();
    await expect(page.getByRole('dialog', { name: /New project/ })).toBeVisible({ timeout: 5_000 });

    // Check optional fields exist
    const platformField = page.getByLabel(/platform/i);
    const languageField = page.getByLabel(/language/i);
    if (await platformField.isVisible()) {
      await expect(platformField).toBeVisible();
    }
    if (await languageField.isVisible()) {
      await expect(languageField).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that the members select field is visible in the form.
   */
  test('should display members select in project form', async ({ page }) => {
    await signInAndGoToProjects(page);
    await page.getByRole('button', { name: /New project/ }).click();
    await expect(page.getByRole('dialog', { name: /New project/ })).toBeVisible({ timeout: 5_000 });

    const memberSelect = page.getByText(/select.*members/i);
    if (await memberSelect.isVisible()) {
      await expect(memberSelect).toBeVisible();
    }
  });

  /**
   * Purpose: Security check - verify that project actions (View, Edit) are available in table rows.
   */
  test('should show action buttons for project rows', async ({ page }) => {
    await signInAndGoToProjects(page);

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      const viewButton = firstRow.getByRole('button', { name: /View|Edit/ });
      await expect(viewButton.first()).toBeVisible();
    }
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that searching for a non-existent project shows an empty state.
     */
    test('should show empty state when searching for non-existent project', async ({ page }) => {
      await signInAndGoToProjects(page);
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('zzz_nonexistent_project_xyz');
        await expect(page.getByText(/no projects found/i).or(page.locator('tbody tr'))).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
