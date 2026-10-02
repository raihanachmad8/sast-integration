import { test, expect } from '@playwright/test';

test.describe('Teams CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to teams
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to teams
    await page.click('text=Teams');
    await page.waitForURL('**/teams');
  });

  test('should display teams list', async ({ page }) => {
    await expect(page.locator('text=Teams')).toBeVisible();
    await expect(page.locator('text=New team')).toBeVisible();
  });

  test('should create a new team', async ({ page }) => {
    // Click new team button
    await page.click('text=New team');
    
    // Fill form
    await page.fill('input[placeholder="e.g. Backend Team"]', 'Test Team');
    await page.fill('textarea[placeholder="Optional description"]', 'Test team description');
    
    // Submit
    await page.click('text=Create team');
    
    // Should show success message
    await expect(page.locator('text=Team "Test Team" created')).toBeVisible();
  });

  test('should edit a team', async ({ page }) => {
    // Click on first team
    await page.click('text=Edit >> nth=0');
    
    // Should navigate to edit page
    await expect(page).toHaveURL(/.*\/teams\/.*\/edit/);
    
    // Update name
    await page.fill('input[placeholder="e.g. Backend Team"]', 'Updated Team');
    
    // Save
    await page.click('text=Save team');
    
    // Should show success message
    await expect(page.locator('text=Team "Updated Team" updated')).toBeVisible();
  });

  test('should delete a team', async ({ page }) => {
    // Click on first team to view detail
    await page.click('text=View >> nth=0');
    
    // Should navigate to detail page or open drawer
    // Click delete button
    await page.click('text=Delete');
    
    // Confirm deletion
    await page.click('button:has-text("Delete"):not([disabled])');
    
    // Should show success message
    await expect(page.locator('text=deleted')).toBeVisible();
  });
});
