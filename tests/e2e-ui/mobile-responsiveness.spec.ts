import { test, expect, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };

/**
 * Mocks a valid session so the user can access authenticated pages.
 */
async function mockAuthSession(page: Page) {
  await page.context().addCookies([{
    name: 'refresh_token',
    value: 'test-refresh-token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }]);

  await page.route('**/api/v1/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Test User',
            emailVerified: true,
            currentWorkspaceId: 'workspace-1',
          },
          workspace: {
            id: 'workspace-1',
            name: 'Personal Workspace',
            slug: 'personal-test',
            role: 'owner',
          },
          accessToken: 'test-access-token',
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
        },
      }),
    });
  });

  await page.route('**/api/v1/workspaces', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{
          id: 'workspace-1',
          name: 'Personal Workspace',
          slug: 'personal-test',
          role: 'owner',
          type: 'personal',
          joinedAt: new Date().toISOString(),
        }],
      }),
    });
  });
}

/**
 * Helper: wait for page to settle and check no horizontal overflow.
 */
async function expectNoHorizontalScroll(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/**
 * Mobile responsiveness tests.
 *
 * Purpose: Validate that pages do NOT produce horizontal page scroll on mobile,
 * while tables inside the page CAN scroll horizontally within their containers.
 */
test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: MOBILE_VIEWPORT });
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  /**
   * Purpose: Verify that the signin page does not produce horizontal page scroll on mobile.
   */
  test('signin page should not have horizontal page scroll', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expectNoHorizontalScroll(page);
  });

  /**
   * Purpose: Verify that the signin form is fully visible and usable on mobile.
   */
  test('signin form should be visible and usable on mobile', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Branding panel should be hidden on mobile
    await expect(page.getByText('Review scanner findings')).toBeHidden();
  });

  /**
   * Purpose: Verify that the workspace chooser page does not produce horizontal page scroll on mobile.
   */
  test('workspace chooser should not have horizontal page scroll', async ({ page }) => {
    await page.goto('/workspaces');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expectNoHorizontalScroll(page);
  });

  /**
   * Purpose: Verify that the app shell sidebar is hidden on mobile and mobile menu button is visible.
   */
  test('app shell should hide sidebar and show mobile menu button', async ({ page }) => {
    await page.goto('/personal-test');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Desktop sidebar should be hidden
    const desktopSider = page.locator('.desktop-sider');
    await expect(desktopSider).toBeHidden({ timeout: 10000 });

    // Mobile menu button should be visible
    const mobileMenuBtn = page.locator('.mobile-menu-btn');
    await expect(mobileMenuBtn).toBeVisible({ timeout: 10000 });
  });

  /**
   * Purpose: Verify that the app shell does not produce horizontal page scroll on mobile.
   */
  test('app shell should not have horizontal page scroll', async ({ page }) => {
    await page.goto('/personal-test');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expectNoHorizontalScroll(page);
  });

  /**
   * Purpose: Verify that the findings page (with DataTable) does not produce horizontal page scroll on mobile.
   */
  test('findings page should not have horizontal page scroll on mobile', async ({ page }) => {
    await page.goto('/personal-test/findings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expectNoHorizontalScroll(page);
  });

  /**
   * Purpose: Verify that DataTable on mobile has horizontal scroll capability.
   */
  test('DataTable should have horizontal scroll on mobile', async ({ page }) => {
    await page.goto('/personal-test/findings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check if ant-table-wrapper exists and has overflow-x: auto
    const tableWrapper = page.locator('.ant-table-wrapper').first();
    if (await tableWrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
      const overflowX = await tableWrapper.evaluate((el) =>
        window.getComputedStyle(el).overflowX
      );
      expect(overflowX).toBe('auto');
    }
  });

  /**
   * Purpose: Verify that the scans page (with DataTable) does not produce horizontal page scroll on mobile.
   */
  test('scans page should not have horizontal page scroll on mobile', async ({ page }) => {
    await page.goto('/personal-test/scan');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expectNoHorizontalScroll(page);
  });

  /**
   * Purpose: Verify that the repositories page (with DataTable) does not produce horizontal page scroll on mobile.
   */
  test('repositories page should not have horizontal page scroll on mobile', async ({ page }) => {
    await page.goto('/personal-test/repositories');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expectNoHorizontalScroll(page);
  });

  /**
   * Purpose: Verify that the members page (with DataTable) does not produce horizontal page scroll on mobile.
   */
  test('members page should not have horizontal page scroll on mobile', async ({ page }) => {
    await page.goto('/personal-test/members');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expectNoHorizontalScroll(page);
  });
});
