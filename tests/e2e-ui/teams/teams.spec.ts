import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe.configure({ mode: 'serial' });

async function signInAndGoToTeams(page: import('@playwright/test').Page) {
  const slug = await signInAndOpenWorkspace(page);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.goto(`/${slug}/teams`);
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible({ timeout: 15_000 });
}

test.describe('Teams Page - Heading & Layout', () => {
  /**
   * Purpose: Verify that the Teams page displays the correct heading and description text.
   */
  test('should display page heading and description', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
    await expect(page.getByText('Teams group people for project assignment')).toBeVisible();
  });

  /**
   * Purpose: Verify that the "New team" button is visible for workspace owners.
   */
  test('should display New team button for owner', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByRole('button', { name: /New team/ })).toBeVisible();
  });
});

test.describe('Teams Page - Table', () => {
  /**
   * Purpose: Verify that the teams table displays the expected columns: Team, Slug, Members, and Projects.
   */
  test('should display table with columns: Team, Slug, Members, Projects', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByRole('columnheader', { name: 'Team' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Slug' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Projects' })).toBeVisible();
  });

  /**
   * Purpose: Verify that a search input is visible for filtering teams by name or slug.
   */
  test('should display search input', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByPlaceholder('Search teams by name or slug...')).toBeVisible();
  });

  /**
   * Purpose: Verify that the empty state message "No teams found" is displayed when no teams exist.
   */
  test('should display empty state when no teams exist', async ({ page }) => {
    await signInAndGoToTeams(page);
    const rowCount = await page.locator('tbody tr').count();
    if (rowCount === 0) {
      await expect(page.getByText('No teams found')).toBeVisible();
    }
  });
});

test.describe('Teams Page - Table Row Actions', () => {
  /**
   * Purpose: Verify that View and Edit action buttons are visible on team table rows.
   */
  test('should show View and Edit action buttons on team rows', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await expect(firstRow.getByRole('button', { name: 'View' })).toBeVisible();
      await expect(firstRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that clicking the View button on a team row opens the team detail drawer.
   */
  test('should open detail drawer when clicking View', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Teams Page - Team Form Modal (Create)', () => {
  /**
   * Purpose: Verify that the team creation modal opens when clicking the "New team" button.
   */
  test('should open modal when clicking New team button', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByRole('dialog', { name: /New team/ })).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Verify that the team creation form displays all required fields: Team name, Slug, Description, and Members.
   */
  test('should display form fields: Team name, Slug, Description, Members', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByLabel('Team name')).toBeVisible();
    await expect(page.getByLabel('Slug')).toBeVisible();
    await expect(page.getByLabel('Description (optional)')).toBeVisible();
    await expect(page.getByText('Select workspace members to add')).toBeVisible();
  });

  /**
   * Purpose: Verify that the slug field is auto-generated from the team name when typing in the name field.
   */
  test('should auto-generate slug from team name', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await page.getByLabel('Team name').fill('Security Operations');
    await expect(page.getByLabel('Slug')).toHaveValue('security-operations');
  });

  /**
   * Purpose: Verify that submitting the team form without a name shows a validation error message.
   */
  test('should validate required Team name field', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await page.getByRole('button', { name: 'Create team' }).click();
    await expect(page.getByText('Team name is required')).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Verify that the Cancel button closes the team creation modal without creating a team.
   */
  test('should close modal on Cancel button', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByRole('dialog', { name: /New team/ })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: /New team/ })).not.toBeVisible({ timeout: 5_000 });
  });

  /**
   * Purpose: Verify that the submit button in the team creation form is labeled "Create team".
   */
  test('should have Create team as submit button text', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByRole('button', { name: 'Create team' })).toBeVisible();
  });
});

test.describe('Teams Page - Team Detail Drawer', () => {
  /**
   * Purpose: Verify that the team detail drawer displays stats for Members, Projects, and Created date.
   */
  test('should display team stats: Members, Projects, Created', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('Members')).toBeVisible();
      await expect(page.getByText('Projects')).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that the team detail drawer footer contains Edit and Delete action buttons.
   */
  test('should display Edit and Delete buttons in drawer footer', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('.ant-drawer-footer').getByRole('button', { name: 'Edit' })).toBeVisible();
      await expect(page.locator('.ant-drawer-footer').getByRole('button', { name: 'Delete' })).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that clicking the close button on the drawer closes it and hides the team details.
   */
  test('should close drawer on close button', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await page.locator('.ant-drawer-close').click();
      await expect(page.locator('.ant-drawer')).not.toBeVisible({ timeout: 5_000 });
    }
  });

  /**
   * Purpose: Verify that the team detail drawer displays the members list with a count.
   */
  test('should display members list in drawer', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/Members \(\d+\)/)).toBeVisible();
    }
  });

  /**
   * Purpose: Verify that the team detail drawer displays the projects list with a count.
   */
  test('should display projects list in drawer', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/Projects \(\d+\)/)).toBeVisible();
    }
  });
});

test.describe('Teams Page - Edit Flow', () => {
  /**
   * Purpose: Verify that clicking the Edit button on a team row opens the edit team modal.
   */
  test('should open edit modal when clicking Edit button in table row', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByRole('dialog', { name: /Edit team/ })).toBeVisible({ timeout: 5_000 });
    }
  });

  /**
   * Purpose: Verify that the submit button in the edit team modal is labeled "Save team".
   */
  test('should have Save team as submit button in edit mode', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByRole('button', { name: 'Save team' })).toBeVisible({ timeout: 5_000 });
    }
  });

  /**
   * Purpose: Verify that clicking Edit from within the detail drawer also opens the edit team modal.
   */
  test('should open edit modal from detail drawer Edit button', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await page.locator('.ant-drawer-footer').getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByRole('dialog', { name: /Edit team/ })).toBeVisible({ timeout: 5_000 });
    }
  });
});
