import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Webhooks Page', () => {
  test('should render webhooks page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should show webhooks table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no webhooks|empty/i').count();
    const hasAddButton = await page.locator('button:has-text("Add"), button:has-text("New Webhook"), button:has-text("Create")').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasAddButton > 0).toBe(true);
  });

  test('should create a new webhook', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New webhook/i }).click();
    await expect(page.getByRole('dialog', { name: /New webhook/i })).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Name').fill('Test Webhook');
    await page.getByLabel('URL').fill('https://hooks.example.com/test');
    await page.getByLabel('Events').click();
    await page.getByText('Scan completed').click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog', { name: /New webhook/i })).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Test Webhook')).toBeVisible({ timeout: 10000 });
  });

  test('should edit an existing webhook', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Edit' }).click();
      await expect(page.getByRole('dialog', { name: /Edit webhook/i })).toBeVisible({ timeout: 5000 });

      await page.getByLabel('Name').clear();
      await page.getByLabel('Name').fill('Updated Webhook');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('dialog', { name: /Edit webhook/i })).not.toBeVisible({ timeout: 10000 });

      await expect(page.getByText('Updated Webhook')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should delete a webhook', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      const webhookName = await firstRow.locator('td').first().textContent();
      await firstRow.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('dialog', { name: /Delete/i })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Delete' }).last().click();
      await expect(page.getByText(webhookName ?? '')).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('should test webhook connection', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/workspaces/*/webhooks/*/test', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, status: 200 }),
      });
    });

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Test' }).click();
      await expect(page.getByText(/Test delivered|success/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show empty state when no webhooks exist', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/workspaces/*/webhooks*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [], meta: { page: 1, perPage: 10, total: 0 } }),
        });
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No webhooks configured.')).toBeVisible({ timeout: 10000 });
  });
});
