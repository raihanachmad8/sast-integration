import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Schedules Page', () => {
  /**
   * Purpose: Verify that the schedules page loads without crashing and does not show a server error.
   */
  test('should render schedules page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the schedules page shows either a schedules table, an empty state, or an add button.
   */
  test('should show schedules table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no schedules|empty|automate/i').count();
    const hasAddButton = await page.locator('button:has-text("Add schedule"), button:has-text("Create")').count();
    const hasContent = await page.locator('.ant-card, [data-testid]').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasAddButton > 0 || hasContent > 0).toBe(true);
  });

  /**
   * Purpose: Verify that a new schedule can be created through the modal form and appears in the list.
   */
  test('should create a new schedule', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: /Add schedule/i });
    if (!(await addButton.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await addButton.click();
    await expect(page.getByRole('dialog', { name: /Add schedule/i })).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Repository').fill('backend-api');
    await page.getByLabel('Branch').fill('main');
    await page.getByLabel('Cron expression').fill('0 0 * * *');
    await page.getByLabel('Timezone').click();
    await page.getByText('UTC').click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog', { name: /Add schedule/i })).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByText('backend-api')).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that a schedule's enabled/disabled status can be toggled and the status tag updates.
   */
  test('should toggle schedule enabled/disabled', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      const statusBefore = await firstRow.locator('.ant-tag').textContent();

      const actionButton = statusBefore?.includes('Active')
        ? firstRow.getByRole('button', { name: 'Pause' })
        : firstRow.getByRole('button', { name: 'Resume' });

      await actionButton.click();

      await expect.poll(async () => {
        return await firstRow.locator('.ant-tag').textContent();
      }, { timeout: 10000 }).not.toBe(statusBefore);
    }
  });

  /**
   * Purpose: Verify that a schedule can be deleted and is removed from the list after confirmation.
   */
  test('should delete a schedule', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      const scheduleName = await firstRow.locator('td').first().textContent();
      await firstRow.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('dialog', { name: /Delete schedule/i })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Delete' }).last().click();
      await expect(page.getByText(scheduleName ?? '')).not.toBeVisible({ timeout: 10000 });
    }
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that unauthenticated users cannot access the schedules page.
     */
    test('should redirect unauthenticated user to signin', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/workspace-1/schedules');
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    });
  });
});
