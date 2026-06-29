import { test, expect } from '@playwright/test';
import { signInAndOpenWorkspace } from './auth/helpers';

test.describe('InfiniteSelect - Popover stays open during scroll', () => {
  test('filter dropdown stays open when scrolling to load more', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find filter buttons (InfiniteSelect renders as Button with Popover)
    const buttons = page.locator('.ant-btn');
    const count = await buttons.count();
    let filterClicked = false;

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      if (text && /All (project|repository|member)/i.test(text)) {
        await btn.click();
        await page.waitForTimeout(500);

        const popover = page.locator('.ant-popover:visible');
        if (await popover.isVisible()) {
          // Scroll to bottom
          const scrollArea = popover.locator('div[style*="overflow-y"], div[style*="overflowY"]').first();
          if (await scrollArea.isVisible()) {
            await scrollArea.evaluate((el) => { el.scrollTop = el.scrollHeight; });
          }
          await page.waitForTimeout(2000);

          // Verify popover is STILL open
          await expect(popover).toBeVisible();
          filterClicked = true;
          break;
        }
      }
    }

    expect(filterClicked).toBeTruthy();
  });

  test('search works inside filter popover', async ({ page }) => {
    const slug = await signInAndOpenWorkspace(page);
    await page.goto(`/${slug}/findings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const buttons = page.locator('.ant-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      if (text && /All (project|repository|member)/i.test(text)) {
        await btn.click();
        await page.waitForTimeout(500);

        const popover = page.locator('.ant-popover:visible');
        if (await popover.isVisible()) {
          const searchInput = popover.locator('input[placeholder="Search..."]');
          await expect(searchInput).toBeVisible();
          await searchInput.fill('test');
          await expect(searchInput).toHaveValue('test');
          break;
        }
      }
    }
  });
});
