import { test, expect } from '@playwright/test';

test.describe('AI Models Page', () => {
  test('should render AI models page after login', async ({ page }) => {
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
    
    await page.goto('http://localhost:3000/ai-models');
    await page.waitForLoadState('networkidle');
    
    // Page should have loaded without errors
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=404')).toHaveCount(0);
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });
});
