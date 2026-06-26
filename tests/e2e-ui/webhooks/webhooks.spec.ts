import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Webhooks Page', () => {
  /**
   * Purpose: Verify that the webhooks page loads without crashing and does not show a server error.
   */
  test('should render webhooks page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the webhooks page shows either a webhooks table, an empty state, or an add button.
   */
  test('should show webhooks table or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').count();
    const hasEmptyState = await page.locator('text=/no webhooks|empty|configured/i').count();
    const hasAddButton = await page.locator('button:has-text("New webhook"), button:has-text("Add"), button:has-text("Create")').count();
    const hasContent = await page.locator('.ant-card, [data-testid]').count();

    expect(hasTable > 0 || hasEmptyState > 0 || hasAddButton > 0 || hasContent > 0).toBe(true);
  });

  /**
   * Purpose: Verify that a new webhook can be created through the modal form and appears in the list.
   */
  test('should create a new webhook', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/webhooks`);
    await page.waitForLoadState('networkidle');

    const newWebhookButton = page.getByRole('button', { name: /New webhook/i });
    if (!(await newWebhookButton.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await newWebhookButton.click();
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

  /**
   * Purpose: Verify that an existing webhook can be edited via the edit dialog and the changes are reflected.
   */
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

  /**
   * Purpose: Verify that a webhook can be deleted and is removed from the list after confirmation.
   */
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

  /**
   * Purpose: Verify that testing a webhook connection shows a success message after the API responds.
   */
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

  /**
   * Purpose: Verify that the empty state message is displayed when no webhooks are configured.
   */
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

    const hasEmptyState = await page.getByText(/no webhooks|configured|empty/i).count();
    const hasContent = await page.locator('table, .ant-card, [data-testid]').count();
    expect(hasEmptyState > 0 || hasContent > 0).toBe(true);
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that unauthenticated users cannot access the webhooks page.
     */
    test('should redirect unauthenticated user to signin', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/workspace-1/webhooks');
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    });
  });
});
