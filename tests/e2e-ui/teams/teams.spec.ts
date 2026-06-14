import { test, expect } from '@playwright/test';
import { gotoAuthPage } from '../auth/helpers';
import { OWNER_DEFAULTS, ORG_DEFAULTS } from '../../../drizzle/seeds/constants';

test.describe.configure({ mode: 'serial' });

async function signInAndGoToTeams(page: import('@playwright/test').Page) {
  await gotoAuthPage(page, '/auth/signin', 'Sign in');
  await page.getByPlaceholder('you@company.com').fill(OWNER_DEFAULTS.EMAIL);
  await page.getByPlaceholder('Enter your password').fill(OWNER_DEFAULTS.PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/workspaces');

  await page.locator('article').getByRole('button', { name: 'Open workspace' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/${ORG_DEFAULTS.SLUG}`), { timeout: 10_000 });

  await page.getByText('SAST Workspace').waitFor({ state: 'visible', timeout: 10_000 });
  await page.goto(`/${ORG_DEFAULTS.SLUG}/teams`);

  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible({ timeout: 15_000 });
}

test.describe('Teams Page - Heading & Layout', () => {
  test('should display page heading and description', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
    await expect(page.getByText('Teams group people for project assignment')).toBeVisible();
  });

  test('should display New team button for owner', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByRole('button', { name: /New team/ })).toBeVisible();
  });
});

test.describe('Teams Page - Table', () => {
  test('should display table with columns: Team, Slug, Members, Projects', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByRole('columnheader', { name: 'Team' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Slug' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Projects' })).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await signInAndGoToTeams(page);
    await expect(page.getByPlaceholder('Search teams by name or slug...')).toBeVisible();
  });

  test('should display empty state when no teams exist', async ({ page }) => {
    await signInAndGoToTeams(page);
    const rowCount = await page.locator('tbody tr').count();
    if (rowCount === 0) {
      await expect(page.getByText('No teams found')).toBeVisible();
    }
  });
});

test.describe('Teams Page - Table Row Actions', () => {
  test('should show View and Edit action buttons on team rows', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await expect(firstRow.getByRole('button', { name: 'View' })).toBeVisible();
      await expect(firstRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    }
  });

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
  test('should open modal when clicking New team button', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByRole('dialog', { name: /New team/ })).toBeVisible({ timeout: 5_000 });
  });

  test('should display form fields: Team name, Slug, Description, Members', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByLabel('Team name')).toBeVisible();
    await expect(page.getByLabel('Slug')).toBeVisible();
    await expect(page.getByLabel('Description (optional)')).toBeVisible();
    await expect(page.getByText('Select workspace members to add')).toBeVisible();
  });

  test('should auto-generate slug from team name', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await page.getByLabel('Team name').fill('Security Operations');
    await expect(page.getByLabel('Slug')).toHaveValue('security-operations');
  });

  test('should validate required Team name field', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await page.getByRole('button', { name: 'Create team' }).click();
    await expect(page.getByText('Team name is required')).toBeVisible({ timeout: 5_000 });
  });

  test('should close modal on Cancel button', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByRole('dialog', { name: /New team/ })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: /New team/ })).not.toBeVisible({ timeout: 5_000 });
  });

  test('should have Create team as submit button text', async ({ page }) => {
    await signInAndGoToTeams(page);
    await page.getByRole('button', { name: /New team/ }).click();
    await expect(page.getByRole('button', { name: 'Create team' })).toBeVisible();
  });
});

test.describe('Teams Page - Team Detail Drawer', () => {
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

  test('should display members list in drawer', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'View' }).click();
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/Members \(\d+\)/)).toBeVisible();
    }
  });

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
  test('should open edit modal when clicking Edit button in table row', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByRole('dialog', { name: /Edit team/ })).toBeVisible({ timeout: 5_000 });
    }
  });

  test('should have Save team as submit button in edit mode', async ({ page }) => {
    await signInAndGoToTeams(page);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByRole('button', { name: 'Save team' })).toBeVisible({ timeout: 5_000 });
    }
  });

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
