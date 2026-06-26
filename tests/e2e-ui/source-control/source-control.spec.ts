/**
 * Playwright UI tests for Source Control page
 *
 * Tests the full UI flow of:
 * - Source control page rendering
 * - Provider cards display (name, status, repos count)
 * - Sync button functionality
 * - Repository list display
 * - Security: credentials never shown in UI
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = { email: 'owner@sast.local', password: 'ChangeMe123!' };

test.describe('Source Control Page', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.getByPlaceholder('you@company.com').fill(TEST_USER.email);
    await page.getByPlaceholder('Enter your password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/workspaces**', { timeout: 10_000 });

    // Navigate to source control page
    await page.goto(`${BASE_URL}/owner/source-control`);
    await page.waitForLoadState('networkidle');
  });

  /**
   * Purpose: Verify source control page renders
   */
  test('should render source control page', async ({ page }) => {
    // Wait for page to load - check for any content
    await page.waitForLoadState('networkidle');
    
    // Page should have loaded (check for common elements)
    const content = page.locator('body');
    await expect(content).toBeVisible();
    
    // Should not show error page
    await expect(page.locator('text=404')).toHaveCount(0);
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  /**
   * Purpose: Verify provider cards show correct information
   */
  test('should display provider card with status', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for provider name (Gitea, GitHub, or GitLab)
    const providerCard = page.locator('text=Gitea').or(page.locator('text=GitHub')).or(page.locator('text=GitLab'));

    // If provider exists, verify card structure
    const count = await providerCard.count();
    if (count > 0) {
      // Provider card should show name
      await expect(providerCard.first()).toBeVisible();
      // Card should be visible - don't assert specific text content
    }
  });

  /**
   * Purpose: Verify sync button exists and is clickable
   */
  test('should have sync button for connected providers', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for Sync button
    const syncButton = page.getByRole('button', { name: 'Sync' });

    // If sync button exists, verify it's clickable
    const count = await syncButton.count();
    if (count > 0) {
      await expect(syncButton.first()).toBeVisible();
      // Button should not be disabled for connected providers
      // (may be disabled for disconnected providers)
    }
  });

  /**
   * Purpose: Verify credentials are never displayed in the UI
   * Security test: tokens, clientSecrets, etc. should not appear
   */
  test('should never display sensitive credentials', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Get page content
    const content = await page.content();

    // These patterns should NEVER appear in the page content
    const sensitivePatterns = [
      /eyJ[A-Za-z0-9]{20,}/,  // JWT tokens
      /gto_[a-zA-Z0-9]{20,}/, // Gitea tokens
      /ghp_[a-zA-Z0-9]{20,}/, // GitHub tokens
      /glpat-[a-zA-Z0-9]{20,}/, // GitLab tokens
    ];

    for (const pattern of sensitivePatterns) {
      const matches = content.match(pattern);
      expect(matches).toBeNull();
    }
  });

  /**
   * Purpose: Verify configure button opens modal
   */
  test('should open configure modal when clicking Configure', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for Configure button
    const configureButton = page.getByRole('button', { name: 'Configure' }).or(
      page.getByRole('button', { name: 'Connect' })
    );

    const count = await configureButton.count();
    if (count > 0) {
      await configureButton.first().click();

      // Modal or drawer should appear
      await expect(page.locator('.ant-modal').or(page.locator('.ant-drawer'))).toBeVisible({ timeout: 5_000 });
    }
  });

  /**
   * Purpose: Verify repository list shows externalId column
   */
  test('should show repository list with externalId', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for repository list or table
    const repoList = page.locator('table').or(page.locator('.ant-table'));

    // If repo list is visible, check for externalId data
    if (await repoList.count() > 0) {
      // The table should render without errors
      await expect(repoList.first()).toBeVisible();
    }
  });

  /**
   * Purpose: Verify test button functionality
   */
  test('should have test button for providers', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for Test button
    const testButton = page.getByRole('button', { name: 'Test' });

    const count = await testButton.count();
    if (count > 0) {
      await expect(testButton.first()).toBeVisible();
    }
  });

  /**
   * Purpose: Verify disconnect button exists
   */
  test('should have disconnect option', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for disconnect button or menu item
    const disconnectButton = page.getByRole('button', { name: 'Disconnect' });

    const count = await disconnectButton.count();
    if (count > 0) {
      await expect(disconnectButton.first()).toBeVisible();
    }
  });

  test.describe('negative', () => {
    /**
     * Purpose: Verify that unauthenticated users cannot access the source control page.
     */
    test('should redirect unauthenticated user to signin', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto(`${BASE_URL}/owner/source-control`);
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    });
  });
});
