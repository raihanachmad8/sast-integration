import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Schedules Page', () => {
  test('should render schedules page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should show schedules table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no schedules|empty|no scans/i').count();
    const hasAddButton = await page.locator('button:has-text("Add"), button:has-text("New Schedule"), button:has-text("Create")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasAddButton > 0).toBe(true);
  });

  test('should create a new schedule', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/schedules`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Add schedule/i }).click();
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
});
