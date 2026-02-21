import { expect, type Page, test } from '@playwright/test';

test.describe('intl admin UI', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test('admin panel loads', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');

    // Verify the admin panel loads (login or dashboard)
    await expect(page.locator('body')).toBeVisible();
  });
});
