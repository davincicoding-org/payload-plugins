import { loginAsDevUser } from '@davincicoding/payload-plugin-kit/testing/helpers';
import { expect, test } from '@playwright/test';

test.describe('notifications admin UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevUser(page);
  });

  test('admin panel loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard/);
  });

  test('notifications collection appears in nav', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav.getByText('Notifications')).toBeVisible();
  });
});
