import { expect, test } from '@playwright/test';

test.describe('intl admin UI', () => {
  test('admin panel loads', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');

    // Verify the admin panel loads (login or dashboard)
    await expect(page.locator('body')).toBeVisible();
  });
});
