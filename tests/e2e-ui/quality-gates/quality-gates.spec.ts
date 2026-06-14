import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from '../auth/helpers';

test.describe('Quality Gates Page', () => {
  test('should render quality gates page', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/quality-gates`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('should display quality gate configuration form', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/quality-gates`);
    await page.waitForLoadState('networkidle');

    const hasForm = await page.locator('form, [role="form"]').count();
    const hasSwitch = await page.locator('[role="switch"], .ant-switch').count();
    const hasSaveButton = await page.locator('button:has-text("Save")').count();

    expect(hasForm > 0 || hasSwitch > 0 || hasSaveButton > 0).toBe(true);
  });

  test('should have save button for quality gate settings', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto(`/${slug}/quality-gates`);
    await page.waitForLoadState('networkidle');

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
  });
});
