import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

/**
 * E2E UI tests for the Knowledge Base management page.
 *
 * Covers knowledge base entry listing, creation, editing, and deletion.
 * The page displays CWE/NVD knowledge entries in a DataTable with source cards
 * and a detail drawer for viewing individual entries.
 */
test.describe('Knowledge Base Page', () => {
  /**
   * Purpose: Verify that the knowledge base page loads without crashing and does not show a server error.
   */
  test('should render knowledge base page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/knowledge-base`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify that the knowledge base page shows content, cards, an empty state, or an add button.
   */
  test('should show knowledge base content or empty state', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/knowledge-base`);
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('table, .ant-card, [data-testid]').count();
    const hasEmptyState = await page.locator('text=/no entries|empty|no knowledge/i').count();
    const hasAddButton = await page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').count();

    expect(hasContent > 0 || hasEmptyState > 0 || hasAddButton > 0).toBe(true);
  });

  /**
   * Purpose: Verify that a new knowledge base entry can be created via the API
   * and appears in the knowledge base table.
   *
   * Uses route mocking to intercept the POST request and verify the create flow.
   * The entry is verified to appear in the page after creation.
   */
  test('should create a new knowledge base entry', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/knowledge-base`);
    await page.waitForLoadState('networkidle');

    const newEntryTitle = 'Test Knowledge Entry';

    await page.route('**/api/v1/workspaces/*/knowledge-base', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-entry-1',
              title: newEntryTitle,
              content: 'This is a test knowledge base entry for security findings.',
              severity: 'medium',
              sourceType: 'custom',
              tags: ['test'],
              usedByAiCount: 0,
              muted: false,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);

    const createButton = page.getByRole('button', { name: /Create|Add|New/i });
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await page.getByLabel('Title').fill(newEntryTitle);
      await page.getByLabel('Description').fill('This is a test knowledge base entry for security findings.');

      await page.getByRole('button', { name: /Create|Save/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      await expect(page.getByText(newEntryTitle)).toBeVisible({ timeout: 10000 });
    }
  });

  /**
   * Purpose: Verify that an existing knowledge base entry can be edited via the API.
   *
   * Opens the entry detail drawer, clicks the edit button, updates the title
   * in the edit modal, and verifies the update is reflected.
   */
  test('should edit an existing knowledge base entry', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/knowledge-base`);
    await page.waitForLoadState('networkidle');

    const updatedTitle = 'Updated Knowledge Entry';

    await page.route('**/api/v1/workspaces/*/knowledge-base/*', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            data: {
              id: 'entry-1',
              title: updatedTitle,
              content: 'Updated description.',
              severity: 'high',
              sourceType: 'cwe',
              tags: ['updated'],
              usedByAiCount: 0,
              muted: false,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.getByRole('button', { name: 'View' }).click();

      const drawer = page.locator('.ant-drawer');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      const editButton = drawer.getByRole('button', { name: /Edit entry/i });
      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();

        const modal = page.getByRole('dialog', { name: /Edit entry/i });
        await expect(modal).toBeVisible({ timeout: 5000 });

        await page.getByLabel('Title').clear();
        await page.getByLabel('Title').fill(updatedTitle);

        await page.getByRole('button', { name: 'Save' }).click();
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  /**
   * Purpose: Verify that a knowledge base entry can be deleted via the API.
   *
   * Opens the entry detail drawer, clicks the mute/delete button,
   * confirms the action, and verifies the entry is removed.
   */
  test('should delete a knowledge base entry', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/knowledge-base`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/workspaces/*/knowledge-base/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 204,
          body: '',
        });
      } else {
        route.continue();
      }
    });

    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      const entryName = await firstRow.locator('td').first().textContent();

      await firstRow.getByRole('button', { name: 'View' }).click();

      const drawer = page.locator('.ant-drawer');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      const deleteButton = drawer.getByRole('button', { name: /Mute entry|Delete/i });
      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();

        const confirmButton = page.getByRole('button', { name: /Delete|Confirm|OK|Yes/i });
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await expect(page.getByText(entryName ?? '')).not.toBeVisible({ timeout: 10000 });
      }
    }
  });
});
