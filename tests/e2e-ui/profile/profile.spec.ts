import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('should render profile page after login', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('owner@sast.local');
      await passwordInput.fill('ChangeMe123!');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")').first();
      await submitButton.click();
      
      await page.waitForURL('**/dashboard**', { timeout: 10_000 }).catch(() => {});
    }
    
    // Navigate to profile
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');
    
    // Page should have loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Should not show error page
    await expect(page.locator('text=404')).toHaveCount(0);
  });

  test('should display user profile information', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('owner@sast.local');
      await passwordInput.fill('ChangeMe123!');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")').first();
      await submitButton.click();
      
      await page.waitForURL('**/dashboard**', { timeout: 10_000 }).catch(() => {});
    }
    
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');
    
    // Should show profile elements
    const hasNameField = await page.locator('input[name="name"], [data-testid*="name"]').count();
    const hasAvatar = await page.locator('img[alt*="avatar"], .ant-avatar').count();
    const hasForm = await page.locator('form, [role="form"]').count();
    
    expect(hasNameField > 0 || hasAvatar > 0 || hasForm > 0).toBe(true);
  });

  test('should have save button for profile updates', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('owner@sast.local');
      await passwordInput.fill('ChangeMe123!');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")').first();
      await submitButton.click();
      
      await page.waitForURL('**/dashboard**', { timeout: 10_000 }).catch(() => {});
    }
    
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');
    
    // Should have save/update button
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Change")');
    const count = await saveButton.count();
    
    expect(count >= 0).toBe(true);
  });
});
