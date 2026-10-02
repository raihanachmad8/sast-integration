import { test, expect } from '@playwright/test';

test.describe('Projects CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to projects
    await page.goto('/auth/signin');
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to projects
    await page.click('text=Projects');
    await page.waitForURL('**/projects');
  });

  test('should display projects list', async ({ page }) => {
    await expect(page.locator('text=Projects')).toBeVisible();
    await expect(page.locator('text=New project')).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    // Click new project button
    await page.click('text=New project');
    
    // Fill form
    await page.fill('input#name', 'Test Project');
    await page.fill('textarea#description', 'Test description');
    await page.fill('input#lead', 'Test Lead');
    
    // Submit
    await page.click('text=Create project');
    
    // Should show success message
    await expect(page.locator('text=Project "Test Project" created')).toBeVisible();
  });

  test('should edit a project', async ({ page }) => {
    // Click on first project
    await page.click('text=Edit >> nth=0');
    
    // Should navigate to edit page
    await expect(page).toHaveURL(/.*\/projects\/.*\/edit/);
    
    // Update name
    await page.fill('input#name', 'Updated Project');
    
    // Save
    await page.click('text=Save project');
    
    // Should show success message
    await expect(page.locator('text=Project "Updated Project" updated')).toBeVisible();
  });

  test('should delete a project', async ({ page }) => {
    // Click on first project to view detail
    await page.click('text=View >> nth=0');
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/.*\/projects\/[^/]+$/);
    
    // Click delete button
    await page.click('text=Delete');
    
    // Confirm deletion
    await page.click('button:has-text("Delete"):not([disabled])');
    
    // Should show success message and redirect
    await expect(page.locator('text=deleted')).toBeVisible();
    await expect(page).toHaveURL(/.*\/projects/);
  });
});

test.describe('Project API Tokens', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to projects
    await page.goto('/auth/signin');
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to projects
    await page.click('text=Projects');
    await page.waitForURL('**/projects');
    
    // Click on first project
    await page.click('text=View >> nth=0');
    
    // Click API Tokens tab
    await page.click('text=API Tokens');
  });

  test('should display API tokens tab', async ({ page }) => {
    await expect(page.locator('text=API Tokens')).toBeVisible();
    await expect(page.locator('text=Create token')).toBeVisible();
  });

  test('should create a new API token', async ({ page }) => {
    // Click create token button
    await page.click('text=Create token');
    
    // Fill form
    await page.fill('input#name', 'Test Token');
    
    // Submit
    await page.click('text=Create');
    
    // Should show token value (shown once only)
    await expect(page.locator('text=Token created')).toBeVisible();
  });

  test('should revoke an API token', async ({ page }) => {
    // Click revoke button on first token
    await page.click('text=Revoke >> nth=0');
    
    // Confirm
    await page.click('button:has-text("Revoke"):not([disabled])');
    
    // Should show success
    await expect(page.locator('text=revoked')).toBeVisible();
  });
});
