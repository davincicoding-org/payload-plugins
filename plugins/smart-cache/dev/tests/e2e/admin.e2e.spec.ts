import { expect, test } from '@playwright/test';

test.describe('smart-cache admin UI', () => {
  test('admin panel loads successfully', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });
});
